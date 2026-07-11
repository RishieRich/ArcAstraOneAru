"""Auto-start TallyPrime when a scheduled sync finds it closed.

Launching the Tally *application* is allowed — the read-only rule forbids
writing data INTO Tally (import/alter envelopes), not starting the program.
TallyPrime reopens the company list it had loaded last time by default, so
after launch we poll `doctor` until the configured company shows up (first
start can take a while on slow disks — be patient, not clever).
"""
import logging
import os
import subprocess
import time
from pathlib import Path

from .detect import DoctorResult, EXIT_HEALTHY, EXIT_NOT_RUNNING, run_doctor

# Checked in order. The GUI also lets the operator set an explicit path
# (settings["tally_exe_path"]) which wins over auto-detection.
COMMON_TALLY_PATHS = (
    r"C:\Program Files\TallyPrime\tally.exe",
    r"C:\Program Files (x86)\TallyPrime\tally.exe",
    r"C:\TallyPrime\tally.exe",
    r"C:\Tally.ERP9\tally.exe",
    r"C:\Program Files\Tally.ERP9\tally.exe",
)

STARTUP_WAIT_SECONDS = 120   # total time to wait for Tally + company to come up
POLL_INTERVAL_SECONDS = 5

_NO_WINDOW = 0x08000000  # subprocess.CREATE_NO_WINDOW (for the flag-safe shell, not Tally itself)


def find_tally_exe(configured_path: str = "") -> str | None:
    """Explicit setting wins; otherwise check the usual install locations."""
    if configured_path:
        return configured_path if Path(configured_path).exists() else None
    for path in COMMON_TALLY_PATHS:
        if Path(path).exists():
            return path
    return None


def start_tally(exe_path: str) -> bool:
    """Launch TallyPrime detached, in its own directory (tally.ini lives there).

    os.startfile (ShellExecute — the programmatic double-click) is the primary
    path: launching a GUI child via Popen from a *windowed* PyInstaller exe
    proved unreliable in live testing (CreateProcess succeeded but Tally never
    appeared), while ShellExecute sidesteps handle/job inheritance entirely.
    """
    workdir = os.path.dirname(exe_path)
    try:
        os.startfile(exe_path, cwd=workdir)  # noqa: S606 — deliberate app launch
        return True
    except OSError:
        pass
    try:
        subprocess.Popen(
            [exe_path],
            cwd=workdir,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            creationflags=subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP,
            close_fds=True,
        )
        return True
    except OSError:
        return False


def wait_until_healthy(host: str, port: int, company: str,
                       timeout: float = STARTUP_WAIT_SECONDS,
                       poll_interval: float = POLL_INTERVAL_SECONDS,
                       sleep=time.sleep) -> DoctorResult:
    """Poll doctor until the configured company is up or we run out of patience."""
    deadline = time.monotonic() + timeout
    result = run_doctor(host=host, port=port, configured_company=company)
    while result.exit_code != EXIT_HEALTHY and time.monotonic() < deadline:
        sleep(poll_interval)
        result = run_doctor(host=host, port=port, configured_company=company)
    return result


def ensure_tally_ready(settings: dict, doctor: DoctorResult,
                       logger: logging.Logger) -> DoctorResult:
    """Given a failed doctor result, try to rescue the run. Never raises.

    - Tally not running  -> launch it, then wait for the company to load.
    - Tally running but company missing -> just wait (it may still be starting
      up); launching a SECOND Tally instance would make things worse.

    Returns the final DoctorResult — healthy if the rescue worked, or the
    most-informative failure if it didn't.
    """
    if not settings.get("auto_start_tally", True):
        return doctor

    launched = False
    if doctor.exit_code == EXIT_NOT_RUNNING:
        exe_path = find_tally_exe(settings.get("tally_exe_path", ""))
        if not exe_path:
            logger.warning("auto-start: tally.exe not found in known locations")
            return doctor
        logger.info("auto-start: launching Tally from %s", exe_path)
        if not start_tally(exe_path):
            logger.error("auto-start: failed to launch Tally")
            return doctor
        launched = True

    result = wait_until_healthy(
        host=settings["tally_host"],
        port=int(settings["tally_port"]),
        company=settings["company_name"],
    )
    logger.info("auto-start: doctor exit=%s after wait", result.exit_code)

    if launched and result.exit_code != EXIT_HEALTHY:
        # We got Tally open but the company never loaded. Live-tested cause:
        # educational-mode Tally waits at its startup screen for a keypress,
        # ignoring tally.ini's preload. Licensed installs with
        # "Default Companies=Yes" + "Load=<company number>" go straight in.
        return DoctorResult(
            exit_code=result.exit_code,
            message=(
                result.message
                + " | Auto-start opened Tally but the company didn't load itself. "
                  "Licensed Tally: set 'Default Companies=Yes' and 'Load=<company number>' "
                  "in tally.ini. Educational Tally: someone must press a key at Tally's "
                  "startup screen after each launch."
            ),
            companies=result.companies,
            matched_company=result.matched_company,
        )
    return result
