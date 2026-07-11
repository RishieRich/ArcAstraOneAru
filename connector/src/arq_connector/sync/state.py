import json
import os
from pathlib import Path


def default_state_path() -> Path:
    local_appdata = os.environ.get("LOCALAPPDATA", str(Path.home() / "AppData" / "Local"))
    return Path(local_appdata) / "ARQ" / "state.json"


def load_state(path: Path | None = None) -> dict:
    path = path or default_state_path()
    if not path.exists():
        return {"last_alter_ids": {}, "last_run_at": None}
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_state(state: dict, path: Path | None = None) -> None:
    path = path or default_state_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(state, f, indent=2)


def record_alter_ids(state: dict, master_type: str, ledgers: list) -> dict:
    """Update state['last_alter_ids'][master_type] to the max ALTERID seen this pull."""
    alter_ids = [l.alter_id for l in ledgers if l.alter_id is not None]
    if alter_ids:
        state.setdefault("last_alter_ids", {})[master_type] = max(alter_ids)
    return state
