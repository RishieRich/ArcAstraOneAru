"""The connector's window: pick company, register once, Push Now, auto-sync.

Pure tkinter/ttk — no extra UI dependencies, keeps the exe small. All
Tally/network work happens on a worker thread so the window never freezes;
results come back to the UI via root.after polling of a queue.
"""
import platform
import queue
import sys
import threading
import tkinter as tk
import tkinter.font as tkfont
from datetime import datetime
from pathlib import Path
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

# ── palette (matched to the ARQ logo: silver wordmark + orange on black) ──
INK = "#16181d"          # near-black
HEADER_BG = "#0b0c0f"    # the logo's black
ACCENT = "#ee8b18"       # ARQ orange
ACCENT_DARK = "#cf7407"
BG = "#f3f4f6"           # app background
CARD = "#ffffff"
MUTED = "#6b7280"
OK_GREEN = "#15803d"
ERR_RED = "#b91c1c"
BORDER = "#e2e4e9"

FONT = "Segoe UI"


def _asset(name: str) -> Path:
    if getattr(sys, "frozen", False):  # PyInstaller one-file bundle
        return Path(sys._MEIPASS) / "assets" / name
    return Path(__file__).parent / "assets" / name


class Card(tk.Frame):
    """White rounded-feel section with a small caption."""

    def __init__(self, parent, title: str):
        super().__init__(parent, bg=CARD, highlightbackground=BORDER,
                         highlightthickness=1)
        caption = tk.Label(self, text=title.upper(), bg=CARD, fg=MUTED,
                           font=(FONT, 8, "bold"), anchor="w")
        caption.pack(fill="x", padx=14, pady=(10, 2))
        self.body = tk.Frame(self, bg=CARD)
        self.body.pack(fill="x", padx=14, pady=(0, 12))


class ConnectorApp:
    def __init__(self, root: tk.Tk):
        self.root = root
        self.settings = load_settings()
        self.logger = setup_logging(self.settings.get("log_level", "INFO"))
        self.results: queue.Queue = queue.Queue()
        self.companies: dict[str, str] = {}  # name -> guid

        root.title("ARQ Tally Connector")
        root.configure(bg=BG)
        root.resizable(False, False)
        try:
            root.iconbitmap(str(_asset("arq.ico")))
        except tk.TclError:
            pass  # icon missing in dev checkout — cosmetic only

        self._style()
        self._build_ui()
        self._refresh_registration_state()
        self._refresh_autosync_state()
        self.root.after(100, self._poll_results)
        self._refresh_companies()

    def _style(self):
        style = ttk.Style(self.root)
        style.theme_use("clam")
        style.configure("TCombobox", fieldbackground="white", padding=4)
        style.configure("TEntry", padding=4)
        style.configure("TSpinbox", padding=3)
        style.configure("TCheckbutton", background=CARD, foreground=INK,
                        font=(FONT, 9))
        style.map("TCheckbutton", background=[("active", CARD)])

    # ── UI construction ────────────────────────────────────────────────

    def _build_ui(self):
        self._build_header()

        outer = tk.Frame(self.root, bg=BG)
        outer.pack(fill="both", expand=True, padx=16, pady=(12, 8))

        # connection card
        conn = Card(outer, "Connection")
        conn.pack(fill="x", pady=(0, 10))
        grid = conn.body
        tk.Label(grid, text="Backend URL", bg=CARD, fg=INK, font=(FONT, 9)).grid(
            row=0, column=0, sticky="w", pady=3)
        self.url_var = tk.StringVar(value=self.settings["api_base_url"])
        ttk.Entry(grid, textvariable=self.url_var, width=40, font=(FONT, 9)).grid(
            row=0, column=1, columnspan=2, sticky="we", padx=(12, 0), pady=3)
        tk.Label(grid, text="Tally company", bg=CARD, fg=INK, font=(FONT, 9)).grid(
            row=1, column=0, sticky="w", pady=3)
        self.company_var = tk.StringVar(value=self.settings["company_name"])
        self.company_box = ttk.Combobox(grid, textvariable=self.company_var,
                                        width=28, state="readonly", font=(FONT, 9))
        self.company_box.grid(row=1, column=1, sticky="we", padx=(12, 6), pady=3)
        self.refresh_btn = self._flat_button(grid, "Refresh", self._refresh_companies,
                                             primary=False)
        self.refresh_btn.grid(row=1, column=2, sticky="e", pady=3)
        grid.columnconfigure(1, weight=1)

        # registration card
        reg = Card(outer, "One-time registration")
        reg.pack(fill="x", pady=(0, 10))
        rgrid = reg.body
        tk.Label(rgrid, text="Pairing code", bg=CARD, fg=INK, font=(FONT, 9)).grid(
            row=0, column=0, sticky="w", pady=3)
        self.pairing_var = tk.StringVar()
        self.pairing_entry = ttk.Entry(rgrid, textvariable=self.pairing_var,
                                       width=26, font=(FONT, 9))
        self.pairing_entry.grid(row=0, column=1, sticky="w", padx=(12, 6), pady=3)
        self.register_btn = self._flat_button(rgrid, "Register", self._register,
                                              primary=False)
        self.register_btn.grid(row=0, column=2, sticky="e", pady=3)
        self.reg_status = tk.Label(rgrid, text="", bg=CARD, fg=MUTED, font=(FONT, 8))
        self.reg_status.grid(row=1, column=0, columnspan=3, sticky="w")
        rgrid.columnconfigure(1, weight=1)

        # the button
        self.push_btn = tk.Button(
            outer, text="⭡  Push Now", command=self._push_now,
            bg=ACCENT, fg="white", activebackground=ACCENT_DARK,
            activeforeground="white", relief="flat", cursor="hand2",
            font=(FONT, 12, "bold"), pady=10,
        )
        self.push_btn.pack(fill="x", pady=(2, 12))

        # auto-sync card
        auto = Card(outer, "Auto-sync")
        auto.pack(fill="x", pady=(0, 10))
        agrid = auto.body
        tk.Label(agrid, text="Every", bg=CARD, fg=INK, font=(FONT, 9)).grid(
            row=0, column=0, sticky="w")
        self.interval_var = tk.IntVar(value=int(self.settings["interval_hours"]))
        ttk.Spinbox(agrid, from_=1, to=24, textvariable=self.interval_var,
                    width=4, font=(FONT, 9)).grid(row=0, column=1, padx=6)
        tk.Label(agrid, text="hours", bg=CARD, fg=INK, font=(FONT, 9)).grid(
            row=0, column=2, sticky="w")
        self.enable_btn = self._flat_button(agrid, "Enable", self._enable_autosync,
                                            primary=True)
        self.enable_btn.grid(row=0, column=3, padx=(16, 6))
        self.disable_btn = self._flat_button(agrid, "Disable", self._disable_autosync,
                                             primary=False)
        self.disable_btn.grid(row=0, column=4)
        self.autostart_var = tk.BooleanVar(value=bool(self.settings.get("auto_start_tally", True)))
        ttk.Checkbutton(
            agrid, text="Open Tally automatically if it's closed when a sync runs",
            variable=self.autostart_var, command=self._save_current_settings,
        ).grid(row=1, column=0, columnspan=5, sticky="w", pady=(8, 0))
        self.auto_status = tk.Label(agrid, text="", bg=CARD, fg=MUTED, font=(FONT, 8))
        self.auto_status.grid(row=2, column=0, columnspan=5, sticky="w", pady=(4, 0))

        # activity log
        act = Card(outer, "Activity")
        act.pack(fill="x")
        self.status = tk.Text(act.body, height=6, width=58, state="disabled",
                              wrap="word", relief="flat", bg="#f8fafc", fg=INK,
                              font=(FONT, 9), padx=8, pady=6)
        self.status.pack(fill="x")
        self.status.tag_configure("ok", foreground=OK_GREEN)
        self.status.tag_configure("err", foreground=ERR_RED)
        self.status.tag_configure("muted", foreground=MUTED)

        tk.Label(
            self.root,
            text="Read-only toward Tally  •  token kept in Windows Credential Manager  •  logs in %LOCALAPPDATA%\\ARQ\\logs",
            bg=BG, fg=MUTED, font=(FONT, 8),
        ).pack(pady=(0, 10))

    def _build_header(self):
        header = tk.Frame(self.root, bg=HEADER_BG)
        header.pack(fill="x")
        inner = tk.Frame(header, bg=HEADER_BG)
        inner.pack(fill="x", padx=16, pady=12)

        try:
            # the real ARQ logo, rendered to PNG at build time by make_icon.ps1
            self._logo_img = tk.PhotoImage(file=str(_asset("arq_logo.png")))
            tk.Label(inner, image=self._logo_img, bg=HEADER_BG, bd=0).pack(side="left")
        except tk.TclError:
            logo = tk.Canvas(inner, width=40, height=40, bg=HEADER_BG,
                             highlightthickness=0)
            logo.pack(side="left")
            self._draw_logo(logo)

        titles = tk.Frame(inner, bg=HEADER_BG)
        titles.pack(side="left", padx=(12, 0))
        tk.Label(titles, text="ARQ Tally Connector", bg=HEADER_BG, fg="#f2f3f5",
                 font=(FONT, 13, "bold")).pack(anchor="w")
        tk.Label(titles, text="Tally  →  secure cloud sync", bg=HEADER_BG,
                 fg="#9aa1ac", font=(FONT, 9)).pack(anchor="w")

        tk.Label(inner, text=f"v{__version__}", bg=HEADER_BG, fg="#5d636d",
                 font=(FONT, 8)).pack(side="right", anchor="n")

    @staticmethod
    def _draw_logo(canvas: tk.Canvas):
        # fallback if the logo asset is missing: rounded orange tile + monogram
        r, x0, y0, x1, y1 = 10, 1, 1, 39, 39
        points = [x0 + r, y0, x1 - r, y0, x1, y0, x1, y0 + r, x1, y1 - r, x1, y1,
                  x1 - r, y1, x0 + r, y1, x0, y1, x0, y1 - r, x0, y0 + r, x0, y0]
        canvas.create_polygon(points, smooth=True, fill=ACCENT, outline="")
        bold = tkfont.Font(family=FONT, size=11, weight="bold")
        canvas.create_text(20, 20, text="ARQ", fill="white", font=bold)

    def _flat_button(self, parent, text, command, primary: bool) -> tk.Button:
        if primary:
            return tk.Button(parent, text=text, command=command, bg=ACCENT,
                             fg="white", activebackground=ACCENT_DARK,
                             activeforeground="white", relief="flat",
                             cursor="hand2", font=(FONT, 9), padx=14, pady=3)
        return tk.Button(parent, text=text, command=command, bg="#e2e8f0",
                         fg=INK, activebackground="#cbd5e1", relief="flat",
                         cursor="hand2", font=(FONT, 9), padx=14, pady=3)

    # ── helpers ────────────────────────────────────────────────────────

    def _log_status(self, message: str, tag: str = "muted"):
        stamp = datetime.now().strftime("%H:%M")
        self.status.configure(state="normal")
        self.status.insert("end", f"{stamp}  ", "muted")
        self.status.insert("end", message + "\n", tag)
        self.status.see("end")
        self.status.configure(state="disabled")

    def _save_current_settings(self):
        self.settings["api_base_url"] = self.url_var.get().strip()
        self.settings["company_name"] = self.company_var.get().strip()
        self.settings["interval_hours"] = int(self.interval_var.get())
        self.settings["auto_start_tally"] = bool(self.autostart_var.get())
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
            self.reg_status.configure(text="✓ Registered — this machine holds a device token.",
                                      fg=OK_GREEN)
            self.pairing_entry.configure(state="disabled")
            self.register_btn.configure(state="disabled")
        else:
            self.reg_status.configure(text="Not registered yet — enter the pairing code from your admin.",
                                      fg=MUTED)
            self.pairing_entry.configure(state="normal")
            self.register_btn.configure(state="normal")

    def _refresh_autosync_state(self):
        if scheduler.task_exists():
            self.auto_status.configure(text="✓ Auto-sync is ON — runs even when this window is closed.",
                                       fg=OK_GREEN)
        else:
            self.auto_status.configure(text="Auto-sync is OFF.", fg=MUTED)

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
                    n = len(found)
                    self._log_status(f"Found {n} open compan{'y' if n == 1 else 'ies'} in Tally.",
                                     "ok" if n else "muted")
                    self._busy(False)
                    self._refresh_registration_state()
            except (TallyConnectionError, TallyGatewayError, OSError) as e:
                def done(err=e):
                    self._log_status(f"Could not reach Tally: {err}", "err")
                    self._busy(False)
                    self._refresh_registration_state()
            self.results.put(done)
        self._run_in_thread(work)

    def _register(self):
        pairing_code = self.pairing_var.get().strip()
        company = self.company_var.get().strip()
        if not pairing_code or not company:
            self._log_status("Pick a company and enter the pairing code first.", "err")
            return
        guid = self.companies.get(company)
        if not guid:
            self._log_status("Company GUID unknown — press Refresh with Tally open, then retry.", "err")
            return
        self._save_current_settings()

        def work():
            try:
                token = register_device(self.url_var.get().strip(), pairing_code,
                                        guid, platform.node())
                credentials.save_token(token)
                self.logger.info("device registered")
                def done():
                    self.pairing_var.set("")
                    self._log_status("Registered ✓ — token stored in Windows Credential Manager.", "ok")
                    self._busy(False)
                    self._refresh_registration_state()
            except PushError as e:
                def done(err=e):
                    self._log_status(f"Registration failed: {err}", "err")
                    self._busy(False)
                    self._refresh_registration_state()
            self.results.put(done)
        self._run_in_thread(work)

    def _push_now(self):
        if not self.company_var.get().strip():
            self._log_status("Pick a company first.", "err")
            return
        self._save_current_settings()
        self._log_status("Pushing…")

        def work():
            outcome = run_sync(self.settings, self.logger)
            def done():
                self._log_status(("✓ " if outcome.ok else "✗ ") + outcome.message,
                                 "ok" if outcome.ok else "err")
                self._busy(False)
            self.results.put(done)
        self._run_in_thread(work)

    def _enable_autosync(self):
        self._save_current_settings()
        try:
            scheduler.create_task(int(self.interval_var.get()))
            self._log_status(f"Auto-sync enabled — every {int(self.interval_var.get())} hour(s).", "ok")
        except RuntimeError as e:
            self._log_status(str(e), "err")
        self._refresh_autosync_state()

    def _disable_autosync(self):
        try:
            scheduler.delete_task()
            self._log_status("Auto-sync disabled.")
        except RuntimeError as e:
            self._log_status(str(e), "err")
        self._refresh_autosync_state()


def launch():
    root = tk.Tk()
    ConnectorApp(root)
    root.mainloop()
