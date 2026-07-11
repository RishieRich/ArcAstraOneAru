"""Single-instance lock so overlapping scheduled runs no-op cleanly."""
import os
import time
from pathlib import Path

from .settings import app_data_dir

STALE_AFTER_SECONDS = 2 * 60 * 60  # a sync should never take 2h; treat older locks as crashed runs


def lock_path() -> Path:
    return app_data_dir() / "connector.lock"


def acquire_lock() -> bool:
    """Try to take the lock. Returns False if another run holds it."""
    path = lock_path()
    path.parent.mkdir(parents=True, exist_ok=True)

    if path.exists():
        try:
            age = time.time() - path.stat().st_mtime
            if age < STALE_AFTER_SECONDS:
                return False
            path.unlink()  # stale lock from a crashed run
        except OSError:
            return False

    try:
        fd = os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
    except FileExistsError:
        return False
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        f.write(str(os.getpid()))
    return True


def release_lock() -> None:
    try:
        lock_path().unlink()
    except OSError:
        pass
