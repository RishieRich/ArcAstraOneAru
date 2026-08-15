"""The connector's window: set the company once, register once, then leave it.

Pure tkinter/ttk — no extra UI dependencies, keeps the exe small. All
Tally/network work happens on a worker thread so the window never freezes;
results come back to the UI via root.after polling of a queue.

The window is a setup and diagnostics tool, not something the client is meant
to open daily: the scheduled task does the actual work. So the layout puts the
one-time setup at the top, the live status where it can be read at a glance,
and hides the fields nobody should be editing behind Advanced.
"""
import platform
import queue
import sys
import threading
import tkinter as tk
from datetime import datetime
from pathlib import Path
from tkinter import messagebox, ttk

from . import __version__, registration, scheduler, state
from .logging_setup import setup_logging
from .runner import run_sync
from .security import credentials
from .settings import load_settings, save_settings
from .sync.pusher import PushError, register_device
from .tally.client import TallyClient, TallyConnectionError, TallyGatewayError
from .tally.detect import find_company
from .tally.envelopes import LIST_OF_COMPANIES
from .tally.parsers import parse_companies

# ── palette (matched to the ARQ logo: silver wordmark + orange on black) ──
INK = "#16181d"          # near-black
HEADER_BG = "#0b0c0f"    # the logo's black — make_icon.ps1 paints the same
ACCENT = "#ee8b18"       # ARQ orange
ACCENT_DARK = "#cf7407"
BG = "#f3f4f6"           # app background
CARD = "#ffffff"
MUTED = "#6b7280"
OK_GREEN = "#15803d"
WARN_AMBER = "#b45309"
ERR_RED = "#b91c1c"
BORDER = "#e2e4e9"

FONT = "Segoe UI"

STATUS_POLL_MS = 30_000  # re-read last-sync state so a background run shows up


def _asset(name: str) -> Path:
    if getattr(sys, "frozen", False):  # PyInstaller one-file bundle
        return Path(sys._MEIPASS) / "assets" / name
    return Path(__file__).parent / "assets" / name


class Card(tk.Frame):
    """White section with a small caption."""

    def __init__(self, parent, title: str):
        super().__init__(parent, bg=CARD, highlightbackground=BORDER,
                         highlightthickness=1)
        tk.Label(self, text=title.upper(), bg=CARD, fg=MUTED,
                 font=(FONT, 8, "bold"), anchor="w").pack(
            fill="x", padx=14, pady=(10, 2))
        self.body = tk.Frame(self, bg=CARD)
        self.body.pack(fill="x", padx=14, pady=(0, 12))


class ConnectorApp:
    def __init__(self, root: tk.Tk):
        self.root = root
        self.settings = load_settings()
        self.logger = setup_logging(self.settings.get("log_level", "INFO"))
        self.results: queue.Queue = queue.Queue()
        self.companies: dict[str, str] = {}  # name -> guid
        self._advanced_open = False
        self._last_status_message = ""

        root.title("ARQ Tally Connector")
        root.configure(bg=BG)
        root.resizable(False, True)
        root.minsize(610, 520)
        try:
            root.iconbitmap(str(_asset("arq.ico")))
        except tk.TclError:
            pass  # icon missing in dev checkout — cosmetic only

        self._style()
        self._build_ui()
        self._refresh_registration_state()
        self._refresh_autosync_state()
        self._refresh_last_sync()
        self.root.after(100, self._poll_results)
        self.root.after(STATUS_POLL_MS, self._poll_state)
        self._repair_scheduled_task()
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
        self._build_status_strip()

        body = tk.Frame(self.root, bg=BG)
        body.pack(fill="both", expand=True)
        self.content_canvas = tk.Canvas(
            body, bg=BG, highlightthickness=0, bd=0, height=1)
        self.content_scrollbar = ttk.Scrollbar(
            body, orient="vertical", command=self.content_canvas.yview)
        self.content_canvas.configure(yscrollcommand=self.content_scrollbar.set)
        self.content_scrollbar.pack(side="right", fill="y")
        self.content_canvas.pack(side="left", fill="both", expand=True)

        self.scroll_content = tk.Frame(self.content_canvas, bg=BG)
        self._content_window = self.content_canvas.create_window(
            (0, 0), window=self.scroll_content, anchor="nw")
        self.scroll_content.bind("<Configure>", self._sync_scroll_region)
        self.content_canvas.bind("<Configure>", self._resize_scroll_content)
        self.content_canvas.bind("<Enter>", self._bind_mousewheel)
        self.content_canvas.bind("<Leave>", self._unbind_mousewheel)

        outer = tk.Frame(self.scroll_content, bg=BG)
        outer.pack(fill="both", expand=True, padx=16, pady=(12, 8))

        self._build_setup_card(outer)
        self._build_push(outer)
        self._build_autosync_card(outer)
        self._build_activity_card(outer)
        self._build_advanced(outer)

        tk.Label(
            self.scroll_content,
            text="Read-only toward Tally  •  token kept in Windows Credential Manager"
                 "  •  logs in %LOCALAPPDATA%\\ARQ\\logs",
            bg=BG, fg=MUTED, font=(FONT, 8),
        ).pack(pady=(0, 10))
        self.root.after_idle(self._fit_content_to_screen)

    def _sync_scroll_region(self, _event=None):
        self.content_canvas.configure(scrollregion=self.content_canvas.bbox("all"))

    def _resize_scroll_content(self, event):
        self.content_canvas.itemconfigure(self._content_window, width=event.width)

    def _fit_content_to_screen(self):
        """Show all content when it fits, otherwise leave room for Windows chrome."""
        self.root.update_idletasks()
        chrome_height = self.root.winfo_reqheight() - self.content_canvas.winfo_reqheight()
        available = max(360, self.root.winfo_screenheight() - chrome_height - 90)
        desired = self.scroll_content.winfo_reqheight()
        self.content_canvas.configure(height=min(desired, available))
        self._sync_scroll_region()

    def _bind_mousewheel(self, _event=None):
        self.content_canvas.bind_all("<MouseWheel>", self._on_mousewheel)

    def _unbind_mousewheel(self, _event=None):
        self.content_canvas.unbind_all("<MouseWheel>")

    def _on_mousewheel(self, event):
        if self.scroll_content.winfo_reqheight() <= self.content_canvas.winfo_height():
            return
        direction = -1 if event.delta > 0 else 1
        self.content_canvas.yview_scroll(direction * 3, "units")

    def _build_header(self):
        header = tk.Frame(self.root, bg=HEADER_BG)
        header.pack(fill="x")
        inner = tk.Frame(header, bg=HEADER_BG)
        inner.pack(fill="x", padx=18, pady=14)

        try:
            # The real ARQ artwork, cropped and scaled by make_icon.ps1 onto
            # this exact background so it reads as part of the bar.
            self._logo_img = tk.PhotoImage(file=str(_asset("arq_logo.png")))
            tk.Label(inner, image=self._logo_img, bg=HEADER_BG, bd=0).pack(side="left")
        except tk.TclError:
            tk.Label(inner, text="ARQ", bg=HEADER_BG, fg=ACCENT,
                     font=(FONT, 20, "bold")).pack(side="left")

        divider = tk.Frame(inner, bg="#26292f", width=1, height=42)
        divider.pack(side="left", padx=16, fill="y")

        titles = tk.Frame(inner, bg=HEADER_BG)
        titles.pack(side="left")
        tk.Label(titles, text="Tally Connector", bg=HEADER_BG, fg="#f2f3f5",
                 font=(FONT, 14, "bold")).pack(anchor="w")
        tk.Label(titles, text="Keeps your receivables synced to the ARQ dashboard",
                 bg=HEADER_BG, fg="#9aa1ac", font=(FONT, 9)).pack(anchor="w")

        tk.Label(inner, text=f"v{__version__}", bg=HEADER_BG, fg="#5d636d",
                 font=(FONT, 8)).pack(side="right", anchor="n")

    def _build_status_strip(self):
        strip = tk.Frame(self.root, bg="#1a1d23")
        strip.pack(fill="x")
        inner = tk.Frame(strip, bg="#1a1d23")
        inner.pack(padx=18, pady=7, anchor="w")
        self.pill_tally = self._pill(inner)
        self.pill_device = self._pill(inner)
        self.pill_auto = self._pill(inner)
        self._set_pill(self.pill_tally, "Checking Tally…", MUTED)
        self._set_pill(self.pill_device, "Device", MUTED)
        self._set_pill(self.pill_auto, "Auto-sync", MUTED)

    def _pill(self, parent) -> tk.Label:
        label = tk.Label(parent, bg="#1a1d23", font=(FONT, 9), anchor="w")
        label.pack(side="left", padx=(0, 22))
        return label

    @staticmethod
    def _set_pill(label: tk.Label, text: str, color: str):
        label.configure(text=f"● {text}", fg=color)

    def _build_setup_card(self, outer):
        card = Card(outer, "Connect this PC")
        card.pack(fill="x", pady=(0, 10))
        grid = card.body

        tk.Label(grid, text="Tally company", bg=CARD, fg=INK, font=(FONT, 9)).grid(
            row=0, column=0, sticky="w", pady=3)
        self.company_var = tk.StringVar(value=self.settings["company_name"])
        self.company_box = ttk.Combobox(grid, textvariable=self.company_var,
                                        width=30, state="readonly", font=(FONT, 9))
        self.company_box.grid(row=0, column=1, sticky="we", padx=(12, 6), pady=3)
        self.company_box.bind("<<ComboboxSelected>>", self._on_company_selected)
        self.refresh_btn = self._flat_button(grid, "Refresh", self._refresh_companies,
                                             primary=False)
        self.refresh_btn.grid(row=0, column=2, sticky="e", pady=3)

        tk.Label(grid,
                 text="Picked once. The company is remembered by its Tally ID, so renaming "
                      "it in Tally will not break the sync.",
                 bg=CARD, fg=MUTED, font=(FONT, 8), wraplength=470,
                 justify="left").grid(row=1, column=0, columnspan=3, sticky="w",
                                      pady=(0, 8))

        tk.Label(grid, text="Pairing code", bg=CARD, fg=INK, font=(FONT, 9)).grid(
            row=2, column=0, sticky="w", pady=3)
        self.pairing_var = tk.StringVar()
        self.pairing_entry = ttk.Entry(grid, textvariable=self.pairing_var,
                                       width=30, font=(FONT, 9))
        self.pairing_entry.grid(row=2, column=1, sticky="we", padx=(12, 6), pady=3)
        actions = tk.Frame(grid, bg=CARD)
        actions.grid(row=2, column=2, sticky="e", pady=3)
        self.register_btn = self._flat_button(actions, "Register", self._register,
                                              primary=True)
        self.register_btn.pack(side="left")
        self.deregister_btn = self._flat_button(
            actions, "Reset registration", self._deregister, primary=False, danger=True)
        self.deregister_btn.pack(side="left", padx=(6, 0))
        self.reg_status = tk.Label(grid, text="", bg=CARD, fg=MUTED, font=(FONT, 8),
                                   wraplength=520, justify="left")
        self.reg_status.grid(row=3, column=0, columnspan=3, sticky="w")
        tk.Label(
            grid,
            text="Switching account or company? Reset registration first, then use a "
                 "fresh one-time code.",
            bg=CARD, fg=MUTED, font=(FONT, 8), wraplength=520, justify="left",
        ).grid(row=4, column=0, columnspan=3, sticky="w", pady=(5, 0))
        grid.columnconfigure(1, weight=1)

    def _build_push(self, outer):
        self.push_btn = tk.Button(
            outer, text="↑   Push Now", command=self._push_now,
            bg=ACCENT, fg="white", activebackground=ACCENT_DARK,
            activeforeground="white", relief="flat", cursor="hand2",
            font=(FONT, 12, "bold"), pady=10,
        )
        self.push_btn.pack(fill="x", pady=(2, 4))
        self.last_sync_label = tk.Label(outer, text="", bg=BG, fg=MUTED,
                                        font=(FONT, 9))
        self.last_sync_label.pack(pady=(0, 10))

    def _build_autosync_card(self, outer):
        card = Card(outer, "Automatic sync")
        card.pack(fill="x", pady=(0, 10))
        grid = card.body

        row = tk.Frame(grid, bg=CARD)
        row.grid(row=0, column=0, sticky="we")
        tk.Label(row, text="Every", bg=CARD, fg=INK, font=(FONT, 9)).pack(side="left")
        self.interval_var = tk.IntVar(value=int(self.settings["interval_hours"]))
        ttk.Spinbox(row, from_=1, to=24, textvariable=self.interval_var,
                    width=4, font=(FONT, 9)).pack(side="left", padx=6)
        tk.Label(row, text="hours", bg=CARD, fg=INK, font=(FONT, 9)).pack(side="left")
        self.enable_btn = self._flat_button(row, "Turn on", self._enable_autosync,
                                            primary=True)
        self.enable_btn.pack(side="left", padx=(16, 6))
        self.disable_btn = self._flat_button(row, "Turn off", self._disable_autosync,
                                             primary=False)
        self.disable_btn.pack(side="left")

        self.autostart_var = tk.BooleanVar(value=bool(self.settings.get("auto_start_tally", True)))
        ttk.Checkbutton(
            grid, text="Open Tally by itself if it is closed when a sync is due",
            variable=self.autostart_var, command=self._save_current_settings,
        ).grid(row=1, column=0, sticky="w", pady=(8, 0))

        self.auto_status = tk.Label(grid, text="", bg=CARD, fg=MUTED, font=(FONT, 8),
                                    wraplength=470, justify="left")
        self.auto_status.grid(row=2, column=0, sticky="w", pady=(6, 0))

        self.test_btn = self._flat_button(grid, "Run a background sync now",
                                          self._run_scheduled_now, primary=False)
        self.test_btn.grid(row=3, column=0, sticky="w", pady=(8, 0))
        grid.columnconfigure(0, weight=1)

    def _build_activity_card(self, outer):
        card = Card(outer, "Activity")
        card.pack(fill="x", pady=(0, 8))
        self.status = tk.Text(card.body, height=6, width=58, state="disabled",
                              wrap="word", relief="flat", bg="#f8fafc", fg=INK,
                              font=(FONT, 9), padx=8, pady=6)
        self.status.pack(fill="x")
        self.status.tag_configure("ok", foreground=OK_GREEN)
        self.status.tag_configure("err", foreground=ERR_RED)
        self.status.tag_configure("muted", foreground=MUTED)

    def _build_advanced(self, outer):
        self.advanced_toggle = tk.Label(
            outer, text="▸  Advanced", bg=BG, fg=MUTED, font=(FONT, 9),
            cursor="hand2")
        self.advanced_toggle.pack(anchor="w")
        self.advanced_toggle.bind("<Button-1>", lambda _e: self._toggle_advanced())

        self.advanced_frame = tk.Frame(outer, bg=CARD, highlightbackground=BORDER,
                                       highlightthickness=1)
        body = tk.Frame(self.advanced_frame, bg=CARD)
        body.pack(fill="x", padx=14, pady=12)

        self.url_var = tk.StringVar(value=self.settings["api_base_url"])
        self.host_var = tk.StringVar(value=self.settings["tally_host"])
        self.port_var = tk.StringVar(value=str(self.settings["tally_port"]))
        self.tally_exe_var = tk.StringVar(value=self.settings.get("tally_exe_path", ""))

        fields = (
            ("Backend URL", self.url_var,
             "Production is preconfigured. Change this only when ARQ support asks you to."),
            ("Tally host", self.host_var, ""),
            ("Tally port", self.port_var, ""),
            ("Tally program path", self.tally_exe_var,
             "Leave blank to auto-detect. Set it if auto-start cannot find tally.exe."),
        )
        for i, (label, var, hint) in enumerate(fields):
            tk.Label(body, text=label, bg=CARD, fg=INK, font=(FONT, 9)).grid(
                row=i * 2, column=0, sticky="w", pady=2)
            ttk.Entry(body, textvariable=var, width=44, font=(FONT, 9)).grid(
                row=i * 2, column=1, sticky="we", padx=(12, 0), pady=2)
            if hint:
                tk.Label(body, text=hint, bg=CARD, fg=MUTED, font=(FONT, 8),
                         wraplength=440, justify="left").grid(
                    row=i * 2 + 1, column=1, sticky="w", padx=(12, 0))
        body.columnconfigure(1, weight=1)

        self._flat_button(body, "Save", self._save_advanced, primary=False).grid(
            row=len(fields) * 2, column=1, sticky="e", pady=(10, 0))

    def _toggle_advanced(self):
        self._advanced_open = not self._advanced_open
        if self._advanced_open:
            self.advanced_frame.pack(fill="x", pady=(6, 0))
            self.advanced_toggle.configure(text="▾  Advanced")
        else:
            self.advanced_frame.pack_forget()
            self.advanced_toggle.configure(text="▸  Advanced")
        self.root.geometry("")  # let the window re-fit its new content

    def _flat_button(self, parent, text, command, primary: bool,
                     danger: bool = False) -> tk.Button:
        if primary:
            return tk.Button(parent, text=text, command=command, bg=ACCENT,
                             fg="white", activebackground=ACCENT_DARK,
                             activeforeground="white", relief="flat",
                             cursor="hand2", font=(FONT, 9), padx=14, pady=3)
        if danger:
            return tk.Button(parent, text=text, command=command, bg="#fee2e2",
                             fg=ERR_RED, activebackground="#fecaca",
                             activeforeground=ERR_RED, relief="flat",
                             cursor="hand2", font=(FONT, 9), padx=12, pady=3)
        return tk.Button(parent, text=text, command=command, bg="#e2e8f0",
                         fg=INK, activebackground="#cbd5e1", relief="flat",
                         cursor="hand2", font=(FONT, 9), padx=14, pady=3)

    # ── helpers ────────────────────────────────────────────────────────

    def _log_status(self, message: str, tag: str = "muted"):
        if message == self._last_status_message:
            return  # repeated Refresh clicks should not flood the activity box
        self._last_status_message = message
        stamp = datetime.now().strftime("%H:%M")
        self.status.configure(state="normal")
        self.status.insert("end", f"{stamp}  ", "muted")
        self.status.insert("end", message + "\n", tag)
        self.status.see("end")
        self.status.configure(state="disabled")

    def _save_current_settings(self):
        self.settings["company_name"] = self.company_var.get().strip()
        guid = self.companies.get(self.company_var.get().strip())
        if guid:
            self.settings["company_guid"] = guid
        try:
            self.settings["interval_hours"] = int(self.interval_var.get())
        except (tk.TclError, ValueError):
            pass  # mid-edit spinbox; keep the stored value
        self.settings["auto_start_tally"] = bool(self.autostart_var.get())
        save_settings(self.settings)

    def _save_advanced(self):
        self.settings["api_base_url"] = self.url_var.get().strip()
        self.settings["tally_host"] = self.host_var.get().strip() or "localhost"
        self.settings["tally_exe_path"] = self.tally_exe_var.get().strip()
        try:
            self.settings["tally_port"] = int(self.port_var.get().strip())
        except ValueError:
            self._log_status("Tally port must be a number — keeping the previous value.", "err")
            self.port_var.set(str(self.settings["tally_port"]))
        self._save_current_settings()
        self._log_status("Advanced settings saved.", "ok")

    def _busy(self, busy: bool):
        state_ = "disabled" if busy else "normal"
        for btn in (self.push_btn, self.register_btn, self.deregister_btn,
                    self.refresh_btn, self.test_btn):
            btn.configure(state=state_)
        if busy:
            self.company_box.configure(state="disabled")
        if not busy:
            self._refresh_registration_state()

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

    def _poll_state(self):
        """A scheduled run can land while this window is open — show it."""
        self._refresh_last_sync()
        self.root.after(STATUS_POLL_MS, self._poll_state)

    # ── status refreshers ──────────────────────────────────────────────

    def _refresh_registration_state(self):
        try:
            token = credentials.load_token()
        except Exception as exc:
            self.logger.error("could not read device credential: %s", type(exc).__name__)
            self.reg_status.configure(
                text="Windows Credential Manager is unavailable. Registration controls are "
                     "paused; restart the app or contact ARQ support.",
                fg=ERR_RED,
            )
            self.company_box.configure(state="disabled")
            self.pairing_entry.configure(state="disabled")
            self.register_btn.configure(state="disabled")
            self.deregister_btn.configure(state="disabled")
            self._set_pill(self.pill_device, "Credential error", ERR_RED)
            self._log_status(
                "Could not read the saved device registration from Windows Credential Manager.",
                "err",
            )
            return

        if token:
            company = self.settings.get("company_name") or self.company_var.get().strip()
            self.reg_status.configure(
                text=f"✓ Registration is saved on this PC{f' for {company}' if company else ''}. "
                     "Its device token is protected by Windows Credential Manager.",
                fg=OK_GREEN)
            self.company_box.configure(state="disabled")
            self.pairing_entry.configure(state="disabled")
            self.register_btn.configure(state="disabled")
            self.deregister_btn.configure(state="normal")
            self._set_pill(self.pill_device, "Device registered", OK_GREEN)
        else:
            self.reg_status.configure(
                text="Not registered — select the intended Tally company and enter a fresh "
                     "pairing code from your ARQ admin.",
                fg=MUTED)
            self.company_box.configure(state="readonly")
            self.pairing_entry.configure(state="normal")
            self.register_btn.configure(state="normal")
            self.deregister_btn.configure(state="disabled")
            self._set_pill(self.pill_device, "Not registered", WARN_AMBER)

    def _refresh_autosync_state(self):
        if scheduler.task_exists():
            hours = self.settings.get("interval_hours", 3)
            delay = self.settings.get("logon_delay_minutes", 10)
            self.auto_status.configure(
                text=f"✓ On — every {hours} hour(s), and {delay} minutes after you sign in to "
                     f"Windows. Missed runs (PC off or asleep) go out as soon as it is back on. "
                     f"This window does not need to stay open.",
                fg=OK_GREEN)
            self._set_pill(self.pill_auto, f"Auto-sync every {hours}h", OK_GREEN)
        else:
            self.auto_status.configure(
                text="Off — nothing will be pushed unless somebody presses Push Now.",
                fg=WARN_AMBER)
            self._set_pill(self.pill_auto, "Auto-sync off", WARN_AMBER)

    def _refresh_last_sync(self):
        snapshot = state.load_state()
        if not snapshot.get("last_attempt_at"):
            self.last_sync_label.configure(text="No sync has run yet on this PC.", fg=MUTED)
            return
        when = state.humanize_age(snapshot.get("last_attempt_at"))
        if snapshot.get("last_ok"):
            self.last_sync_label.configure(
                text=f"✓ Last sync {when} — {snapshot.get('last_ledgers', 0)} ledgers, "
                     f"{snapshot.get('last_bills', 0)} bills",
                fg=OK_GREEN)
        else:
            succeeded = state.humanize_age(snapshot.get("last_success_at"))
            self.last_sync_label.configure(
                text=f"✗ Last attempt {when} failed  •  last good sync: {succeeded}",
                fg=ERR_RED)

    def _repair_scheduled_task(self):
        """Silently re-register a task left behind by an older build, or one
        pointing at an exe that has since moved. Clients will never do this
        themselves — they do not know the task exists."""
        try:
            if scheduler.task_needs_refresh():
                scheduler.create_task(
                    int(self.settings.get("interval_hours", 3)),
                    int(self.settings.get("logon_delay_minutes", 10)),
                )
                self.logger.info("scheduled task re-registered with the current definition")
                self._log_status("Auto-sync schedule updated to the latest settings.", "ok")
                self._refresh_autosync_state()
        except (RuntimeError, OSError) as e:
            self.logger.warning("could not refresh scheduled task: %s", e)

    # ── actions (worker-thread + UI-callback pairs) ────────────────────

    def _on_company_selected(self, _event=None):
        self._save_current_settings()
        guid = self.companies.get(self.company_var.get().strip())
        if guid:
            self._log_status(f"Company set — remembered by ID {guid[:8]}…", "ok")

    def _adopt_stored_company(self, found: dict[str, str]):
        """Bind the stored company to its GUID if we only had a name.

        Covers upgrades from a build that never stored the GUID, so those
        clients get rename-proof matching without touching anything.
        """
        if self.settings.get("company_guid"):
            return
        refs = [type("Ref", (), {"name": n, "guid": g})() for n, g in found.items()]
        matched, _ = find_company(refs, self.settings.get("company_name", ""), "")
        if matched is not None and matched.guid:
            self.settings["company_guid"] = matched.guid
            self.settings["company_name"] = matched.name
            save_settings(self.settings)
            self.logger.info("stored company pinned by GUID")

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
                    self._adopt_stored_company(found)
                    n = len(found)
                    self._log_status(
                        f"Found {n} open compan{'y' if n == 1 else 'ies'} in Tally.",
                        "ok" if n else "muted")
                    self._set_pill(
                        self.pill_tally,
                        f"Tally connected ({n})" if n else "Tally open, no company",
                        OK_GREEN if n else WARN_AMBER)
                    self._busy(False)
            except (TallyConnectionError, TallyGatewayError, OSError) as e:
                self.logger.warning("Tally company discovery failed: %s", type(e).__name__)

                def done(err=e):
                    self._log_status(str(err), "err")
                    self._set_pill(self.pill_tally, "Tally not reachable", ERR_RED)
                    self._busy(False)
            self.results.put(done)
        self._run_in_thread(work)

    def _deregister(self):
        confirmed = messagebox.askyesno(
            "Reset registration on this PC?",
            "This removes the ARQ device token stored on this PC, clears the saved "
            "company choice, and turns automatic sync off.\n\n"
            "It does not change anything in Tally or delete dashboard data. The old "
            "one-time pairing code stays used; you will need a fresh code from your "
            "ARQ admin and must select the intended Tally company again.\n\n"
            "Continue?",
            icon="warning",
            default=messagebox.NO,
            parent=self.root,
        )
        if not confirmed:
            return

        self._log_status("Resetting registration on this PC…")

        def work():
            try:
                result = registration.deregister_local_device(self.settings)

                def done():
                    self.company_var.set("")
                    self.pairing_var.set("")
                    self._log_status(
                        "Registration reset — select the intended company and enter a fresh code.",
                        "ok",
                    )
                    for warning in result.warnings:
                        self._log_status(warning, "err")
                    self._busy(False)
                    self._refresh_autosync_state()
                    self._refresh_last_sync()
                    self.company_box.focus_set()
            except Exception as exc:
                def done(err=exc):
                    self._log_status(f"Could not reset registration on this PC: {err}", "err")
                    self._busy(False)
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
            self._log_status("Company ID unknown — press Refresh with Tally open, then retry.", "err")
            return
        self._save_current_settings()

        def work():
            try:
                token = register_device(self.settings["api_base_url"], pairing_code,
                                        guid, platform.node())
            except PushError as e:
                def done(err=e):
                    self._log_status(f"Registration failed: {err}", "err")
                    self._busy(False)
            except Exception as e:
                self.logger.error("unexpected registration failure: %s", type(e).__name__)

                def done(err=e):
                    self._log_status(f"Registration could not finish: {err}", "err")
                    self._busy(False)
            else:
                try:
                    credentials.save_token(token)
                except Exception as e:
                    # The backend has already consumed the one-time code by
                    # the time it returns the token. Never leave the GUI busy
                    # or suggest retrying that now-spent code.
                    self.logger.error(
                        "device credential could not be stored: %s", type(e).__name__)

                    def done():
                        self._log_status(
                            "ARQ accepted the code, but Windows Credential Manager could not "
                            "save the device. That code is now spent; restart the app and ask "
                            "your ARQ admin for a fresh code.",
                            "err",
                        )
                        self._busy(False)
                else:
                    self.logger.info("device registered")

                    def done():
                        self.pairing_var.set("")
                        self._log_status(
                            "Registered ✓ — token stored in Windows Credential Manager.", "ok")
                        self._busy(False)
                        self._start_autosync_after_registration()
            self.results.put(done)
        self._run_in_thread(work)

    def _start_autosync_after_registration(self):
        """Turn automatic sync on as soon as the device is paired.

        Registration is the moment the connector becomes able to push, and a
        client who never finds the Turn on button would otherwise end up with
        an exe that only works while somebody is clicking it.
        """
        if scheduler.task_exists():
            return
        try:
            scheduler.create_task(int(self.settings.get("interval_hours", 3)),
                                  int(self.settings.get("logon_delay_minutes", 10)))
            self._log_status("Automatic sync switched on for you.", "ok")
        except (RuntimeError, OSError) as e:
            self._log_status(f"Could not switch automatic sync on: {e}", "err")
        self._refresh_autosync_state()

    def _push_now(self):
        if not self.company_var.get().strip():
            self._log_status("Pick a company first.", "err")
            return
        self._save_current_settings()
        self._log_status("Pushing…")

        def work():
            outcome = run_sync(self.settings, self.logger, source="manual")

            def done():
                self._log_status(("✓ " if outcome.ok else "✗ ") + outcome.message,
                                 "ok" if outcome.ok else "err")
                self._busy(False)
                self._refresh_last_sync()
                # run_sync may have pinned the GUID or picked up a rename.
                self.company_var.set(self.settings.get("company_name", ""))
            self.results.put(done)
        self._run_in_thread(work)

    def _run_scheduled_now(self):
        """Fire the registered task, which is the path unattended syncs take."""
        if not scheduler.task_exists():
            self._log_status("Turn automatic sync on first.", "err")
            return
        try:
            scheduler.run_task_now()
            self._log_status("Background sync started — it runs outside this window; "
                             "the result appears above in a moment.", "ok")
        except RuntimeError as e:
            self._log_status(str(e), "err")

    def _enable_autosync(self):
        self._save_current_settings()
        try:
            scheduler.create_task(int(self.interval_var.get()),
                                  int(self.settings.get("logon_delay_minutes", 10)))
            self._log_status(f"Automatic sync on — every {int(self.interval_var.get())} hour(s).", "ok")
        except (RuntimeError, tk.TclError) as e:
            self._log_status(str(e), "err")
        self._refresh_autosync_state()

    def _disable_autosync(self):
        try:
            scheduler.delete_task()
            self._log_status("Automatic sync off.")
        except RuntimeError as e:
            self._log_status(str(e), "err")
        self._refresh_autosync_state()


def launch():
    root = tk.Tk()
    ConnectorApp(root)
    root.mainloop()
