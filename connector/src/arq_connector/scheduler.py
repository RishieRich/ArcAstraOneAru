"""Windows Task Scheduler integration for unattended syncs.

Creates a current-user task (no admin rights needed) that runs
`<this exe> run` every N hours. schtasks is used directly — no extra
dependencies. CREATE_NO_WINDOW stops a console flashing when the GUI
(a windowed exe) shells out.
"""
import subprocess
import sys
from pathlib import Path

TASK_NAME = "ARQ Tally Connector Sync"

_NO_WINDOW = 0x08000000  # subprocess.CREATE_NO_WINDOW


def _run_command_for_task() -> str:
    """The command the scheduled task should execute."""
    if getattr(sys, "frozen", False):  # PyInstaller exe
        return f'"{sys.executable}" run'
    # dev mode: run via the venv's python
    return f'"{sys.executable}" -m arq_connector.cli run'


def _schtasks(*args: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["schtasks", *args],
        capture_output=True,
        text=True,
        creationflags=_NO_WINDOW,
    )


def create_task(interval_hours: int) -> None:
    result = _schtasks(
        "/Create",
        "/TN", TASK_NAME,
        "/TR", _run_command_for_task(),
        "/SC", "HOURLY",
        "/MO", str(interval_hours),
        "/F",  # overwrite if it already exists (e.g. frequency change)
    )
    if result.returncode != 0:
        raise RuntimeError(f"Could not create scheduled task: {result.stderr.strip() or result.stdout.strip()}")


def delete_task() -> None:
    result = _schtasks("/Delete", "/TN", TASK_NAME, "/F")
    if result.returncode != 0 and "cannot find" not in result.stderr.lower():
        raise RuntimeError(f"Could not delete scheduled task: {result.stderr.strip() or result.stdout.strip()}")


def task_exists() -> bool:
    return _schtasks("/Query", "/TN", TASK_NAME).returncode == 0
