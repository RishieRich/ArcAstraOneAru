"""The connector's window: pick company, register once, Push Now, auto-sync.

All Tally/network work happens on a worker thread so the window never
freezes; results come back to the UI via root.after polling of a queue.
"""
import platform
import queue
import threading
import tkinter as tk
from tkinter import ttk

from . import __version__, scheduler
from .logging_setup import setup_logging
from .runner import run_sync
from .security import credentials
from .settings import load_settings, save_settings
from .sync.pusher import PushError, register_device
from .tally.client import TallyClient, TallyConnectionError, TallyGatewayError
from .tally.envelopes import LIST_OF_COMPANIES
from .tally.parsers import parse_companies

PAD = {"padx": 8, "pady": 4}


class ConnectorApp:
    def __init__(self, root: tk.Tk):
        self.root = root
        self.settings = load_settings()
        self.logger = setup_logging(self.settings.get("log_level", "INFO"))
        self.results: queue.Queue = queue.Queue()
        self.companies: dict[str, str] = {}  # name -> guid

        root.title(f"ARQ Tally Connector v{__version__}")
        root.resizable(False, False)
        self._build_ui()
        self._refresh_registration_state()
        self._refresh_autosync_state()
        self.root.after(100, self._poll_results)
        self._refresh_companies()

    # ── UI construction ────────────────────────────────────────────────

    def _build_ui(self):
        frame = ttk.Frame(self.root, padding=12)
        frame.grid(sticky="nsew")

        # backend URL
        ttk.Label(frame, text="Backend URL:").grid(row=0, column=0, sticky="w", **PAD)
        self.url_var = tk.StringVar(value=self.settings["api_base_url"])
        ttk.Entry(frame, textvariable=self.url_var, width=42).grid(row=0, column=1, columnspan=2, sticky="we", **PAD)

        # company picker
        ttk.Label(frame, text="Tally company:").grid(row=1, column=0, sticky="w", **PAD)
        self.company_var = tk.StringVar(value=self.settings["company_name"])
        self.company_box = ttk.Combobox(frame, textvariable=self.company_var, width=32, state="readonly")
        self.company_box.grid(row=1, column=1, sticky="we", **PAD)
        self.refresh_btn = ttk.Button(frame, text="Refresh", command=self._refresh_companies)
        self.refresh_btn.grid(row=1, column=2, **PAD)

        # registration
        reg = ttk.LabelFrame(frame, text="One-time registration", padding=8)
        reg.grid(row=2, column=0, columnspan=3, sticky="we", **PAD)
        ttk.Label(reg, text="Pairing code:").grid(row=0, column=0, sticky="w", **PAD)
        self.pairing_var = tk.StringVar()
        self.pairing_entry = ttk.Entry(reg, textvariable=self.pairing_var, width=24)
        self.pairing_entry.grid(row=0, column=1, **PAD)
        self.register_btn = ttk.Button(reg, text="Register", command=self._register)
        self.register_btn.grid(row=0, column=2, **PAD)
        self.reg_status = ttk.Label(reg, text="")
        self.reg_status.grid(row=1, column=0, columnspan=3, sticky="w", **PAD)

        # push
        self.push_btn = ttk.Button(frame, text="Push Now", command=self._push_now)
        self.push_btn.grid(row=3, column=0, columnspan=3, sticky="we", padx=8, pady=10)

        # auto-sync
        auto = ttk.LabelFrame(frame, text="Auto-sync", padding=8)
        auto.grid(row=4, column=0, columnspan=3, sticky="we", **PAD)
        ttk.Label(auto, text="Every").grid(row=0, column=0, sticky="w", **PAD)
        self.interval_var = tk.IntVar(value=int(self.settings["interval_hours"]))
        ttk.Spinbox(auto, from_=1, to=24, textvariable=self.interval_var, width=4).grid(row=0, column=1, **PAD)
        ttk.Label(auto, text="hours").grid(row=0, column=2, sticky="w", **PAD)
        self.enable_btn = ttk.Button(auto, text="Enable Auto-Sync", command=self._enable_autosync)
        self.enable_btn.grid(row=0, column=3, **PAD)
        self.disable_btn = ttk.Button(auto, text="Disable", command=self._disable_autosync)
        self.disable_btn.grid(row=0, column=4, **PAD)
        self.auto_status = ttk.Label(auto, text="")
        self.auto_status.grid(row=1, column=0, columnspan=5, sticky="w", **PAD)

        # status area
        self.status = tk.Text(frame, height=6, width=56, state="disabled", wrap="word")
        self.status.grid(row=5, column=0, columnspan=3, sticky="we", **PAD)

    # ── helpers ────────────────────────────────────────────────────────

    def _log_status(self, message: str):
        self.status.configure(state="normal")
        self.status.insert("end", message + "\n")
        self.status.see("end")
        self.status.configure(state="disabled")

    def _save_current_settings(self):
        self.settings["api_base_url"] = self.url_var.get().strip()
        self.settings["company_name"] = self.company_var.get().strip()
        self.settings["interval_hours"] = int(self.interval_var.get())
        save_settings(self.settings)

    def _busy(self, busy: bool):
        state = "disabled" if busy else "normal"
        for btn in (self.push_btn, self.register_btn, self.refresh_btn):
            btn.configure(state=state)

    def _run_in_thread(self, fn):
        self._busy(True)
        threading.Thread(target=fn, daemon=True).start()

    def _poll_results(self):
        try:
            while True:
                callback = self.results.get_nowait()
                callback()
        except queue.Empty:
            pass
        self.root.after(100, self._poll_results)

    def _refresh_registration_state(self):
        if credentials.load_token():
            self.reg_status.configure(text="✓ Registered — this machine has a device token.")
            self.pairing_entry.configure(state="disabled")
            self.register_btn.configure(state="disabled")
        else:
            self.reg_status.configure(text="Not registered yet. Enter the pairing code from your admin.")
            self.pairing_entry.configure(state="normal")
            self.register_btn.configure(state="normal")

    def _refresh_autosync_state(self):
        if scheduler.task_exists():
            self.auto_status.configure(text="✓ Auto-sync is ON (Windows scheduled task active).")
        else:
            self.auto_status.configure(text="Auto-sync is OFF.")

    # ── actions (worker-thread + UI-callback pairs) ────────────────────

    def _refresh_companies(self):
        def work():
            host, port = self.settings["tally_host"], int(self.settings["tally_port"])
            try:
                client = TallyClient(host=host, port=port)
                companies = parse_companies(client.post_envelope(LIST_OF_COMPANIES))
                found = {c.name: c.guid for c in companies if c.name}
                def done():
                    self.companies = found
                    self.company_box.configure(values=list(found))
                    if found and not self.company_var.get():
                        self.company_var.set(next(iter(found)))
                    self._log_status(f"Found {len(found)} open compan{'y' if len(found) == 1 else 'ies'} in Tally.")
                    self._busy(False)
                    self._refresh_registration_state()
            except (TallyConnectionError, TallyGatewayError, OSError) as e:
                def done(err=e):
                    self._log_status(f"Could not reach Tally: {err}")
                    self._busy(False)
                    self._refresh_registration_state()
            self.results.put(done)
        self._run_in_thread(work)

    def _register(self):
        pairing_code = self.pairing_var.get().strip()
        company = self.company_var.get().strip()
        if not pairing_code or not company:
            self._log_status("Pick a company and enter the pairing code first.")
            return
        guid = self.companies.get(company)
        if not guid:
            self._log_status("Company GUID unknown — press Refresh with Tally open, then retry.")
            return
        self._save_current_settings()

        def work():
            try:
                token = register_device(self.url_var.get().strip(), pairing_code, guid, platform.node())
                credentials.save_token(token)
                self.logger.info("device registered")
                def done():
                    self.pairing_var.set("")
                    self._log_status("Registered ✓ — token stored in Windows Credential Manager.")
                    self._busy(False)
                    self._refresh_registration_state()
            except PushError as e:
                def done(err=e):
                    self._log_status(f"Registration failed: {err}")
                    self._busy(False)
                    self._refresh_registration_state()
            self.results.put(done)
        self._run_in_thread(work)

    def _push_now(self):
        if not self.company_var.get().strip():
            self._log_status("Pick a company first.")
            return
        self._save_current_settings()
        self._log_status("Pushing…")

        def work():
            outcome = run_sync(self.settings, self.logger)
            def done():
                self._log_status(("✓ " if outcome.ok else "✗ ") + outcome.message)
                self._busy(False)
            self.results.put(done)
        self._run_in_thread(work)

    def _enable_autosync(self):
        self._save_current_settings()
        try:
            scheduler.create_task(int(self.interval_var.get()))
            self._log_status(f"Auto-sync enabled: every {int(self.interval_var.get())} hour(s).")
        except RuntimeError as e:
            self._log_status(str(e))
        self._refresh_autosync_state()

    def _disable_autosync(self):
        try:
            scheduler.delete_task()
            self._log_status("Auto-sync disabled.")
        except RuntimeError as e:
            self._log_status(str(e))
        self._refresh_autosync_state()


def launch():
    root = tk.Tk()
    ConnectorApp(root)
    root.mainloop()
