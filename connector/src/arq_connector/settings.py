"""App settings, stored as JSON in %LOCALAPPDATA%\\ARQ\\settings.json.

The GUI writes these (company pick, backend URL, sync frequency); headless
`run` mode reads them. No secrets ever go in here — the device token lives
in Windows Credential Manager (see security/credentials.py).
"""
import json
import os
from pathlib import Path

DEFAULTS = {
    "tally_host": "localhost",
    "tally_port": 9000,
    "company_name": "",
    "api_base_url": "http://127.0.0.1:8000",
    "interval_hours": 3,
    "log_level": "INFO",
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
                settings.update(json.load(f))
        except (json.JSONDecodeError, OSError):
            pass  # corrupt/unreadable file -> fall back to defaults
    return settings


def save_settings(settings: dict) -> None:
    path = settings_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    merged = dict(DEFAULTS)
    merged.update(settings)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(merged, f, indent=2)
