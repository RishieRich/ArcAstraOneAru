"""App settings, stored as JSON in %LOCALAPPDATA%\\ARQ\\settings.json.

The GUI writes these (company pick, backend URL, sync frequency); headless
`run` mode reads them. No secrets ever go in here — the device token lives
in Windows Credential Manager (see security/credentials.py).

Writes are atomic. The client's company binding lives in this file and is
meant to be set exactly once; a half-written file would silently fall back to
DEFAULTS on the next unattended run and strand the sync with no company.
"""
import json
import os
import tempfile
from pathlib import Path

# The backend the shipped exe talks to. Set this to the Vercel URL before
# running build.ps1 — an exe built with the localhost default will fail on any
# machine but this one. Override at build time with ARQ_API_BASE_URL if you
# prefer not to edit the file.
DEFAULT_API_BASE_URL = os.environ.get(
    "ARQ_API_BASE_URL", "https://arcastraone.vercel.app"
)

DEFAULTS = {
    "tally_host": "localhost",
    "tally_port": 9000,
    "company_name": "",
    # A company's real identity, and what the backend binds the tenant to. Kept
    # alongside the name so a rename inside Tally can't force the operator to
    # re-pick the company (see tally/detect.py).
    "company_guid": "",
    "api_base_url": DEFAULT_API_BASE_URL,
    "interval_hours": 3,
    # Grace period after logon before the first sync: the machine is still
    # busy starting up, and Tally needs longer than we do.
    "logon_delay_minutes": 10,
    "log_level": "INFO",
    "auto_start_tally": True,   # scheduled runs may launch Tally if it's closed
    "tally_exe_path": "",       # blank = auto-detect common install locations
    "tally_startup_wait_seconds": 180,
}


def app_data_dir() -> Path:
    local_appdata = os.environ.get("LOCALAPPDATA", str(Path.home() / "AppData" / "Local"))
    return Path(local_appdata) / "ARQ"


def settings_path() -> Path:
    return app_data_dir() / "settings.json"


def load_settings() -> dict:
    path = settings_path()
    settings = dict(DEFAULTS)
    if path.exists():
        try:
            with open(path, "r", encoding="utf-8") as f:
                stored = json.load(f)
            if isinstance(stored, dict):
                settings.update(stored)
        except (json.JSONDecodeError, OSError):
            pass  # corrupt/unreadable file -> fall back to defaults
    return settings


def save_settings(settings: dict) -> None:
    """Write settings atomically: full file or nothing, never a truncated one."""
    path = settings_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    merged = dict(DEFAULTS)
    merged.update(settings)

    fd, tmp_name = tempfile.mkstemp(dir=str(path.parent), prefix=".settings-", suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(merged, f, indent=2)
            f.flush()
            os.fsync(f.fileno())  # the rename is only atomic if the bytes landed first
        os.replace(tmp_name, path)
    except BaseException:
        Path(tmp_name).unlink(missing_ok=True)
        raise
