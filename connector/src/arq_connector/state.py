"""Last-run state, stored in %LOCALAPPDATA%\\ARQ\\state.json.

Deliberately a separate file from settings.json. Settings are operator intent
and must survive; state is disposable bookkeeping that every unattended `run`
rewrites. Keeping them apart means a corrupted state file can never cost the
client their company binding.

Its real job is visibility: without it, an unattended sync leaves no trace the
operator can see, and "is the auto-push actually working?" can only be answered
by reading the log file.
"""
import json
import os
import tempfile
from datetime import datetime
from pathlib import Path

from .settings import app_data_dir


def state_path() -> Path:
    return app_data_dir() / "state.json"


def load_state() -> dict:
    path = state_path()
    if not path.exists():
        return {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            stored = json.load(f)
    except (json.JSONDecodeError, OSError):
        return {}
    return stored if isinstance(stored, dict) else {}


def record_run(ok: bool, message: str, ledgers: int = 0, bills: int = 0,
               source: str = "scheduled") -> None:
    """Note the outcome of one sync. Never raises — bookkeeping must not be
    able to fail a sync that already succeeded."""
    try:
        now = datetime.now().isoformat(timespec="seconds")
        state = load_state()
        state.update({
            "last_attempt_at": now,
            "last_ok": ok,
            "last_message": message,
            "last_source": source,
        })
        if ok:
            state.update({
                "last_success_at": now,
                "last_ledgers": ledgers,
                "last_bills": bills,
            })

        path = state_path()
        path.parent.mkdir(parents=True, exist_ok=True)
        fd, tmp_name = tempfile.mkstemp(dir=str(path.parent), prefix=".state-", suffix=".tmp")
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as f:
                json.dump(state, f, indent=2)
            os.replace(tmp_name, path)
        except BaseException:
            Path(tmp_name).unlink(missing_ok=True)
            raise
    except OSError:
        pass


def humanize_age(iso_timestamp: str | None, now: datetime | None = None) -> str:
    """'2026-07-29T14:03:11' -> 'just now' / '2 hours ago' / '3 days ago'."""
    if not iso_timestamp:
        return "never"
    try:
        then = datetime.fromisoformat(iso_timestamp)
    except ValueError:
        return "unknown"

    seconds = ((now or datetime.now()) - then).total_seconds()
    if seconds < 0:          # clock moved backwards; don't claim the future
        return "just now"
    if seconds < 90:
        return "just now"
    minutes = seconds / 60
    if minutes < 60:
        return f"{int(minutes)} min ago"
    hours = minutes / 60
    if hours < 24:
        n = int(hours)
        return f"{n} hour ago" if n == 1 else f"{n} hours ago"
    days = int(hours / 24)
    return "1 day ago" if days == 1 else f"{days} days ago"
