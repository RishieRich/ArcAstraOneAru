"""Windows Task Scheduler integration for unattended syncs.

Creates a current-user task (no admin rights needed) that runs `<this exe> run`
on two triggers: shortly after the client logs in, and every N hours after
that. schtasks is used directly — no extra dependencies.

The task is defined as XML rather than with schtasks' command-line flags,
because the flags cannot express the three settings that decide whether an
unattended sync actually happens on a real client machine:

  * StartWhenAvailable — the PC is off overnight and misses slots; without
    this the missed run is simply dropped and the books go stale until the
    next scheduled time. With it, the sync fires as soon as the PC is back.
  * DisallowStartIfOnBatteries=false — the default is *true*, so on a laptop
    running unplugged (most of our clients) the sync silently never runs.
  * a logon trigger with a delay — "the machine is on, so push" needs a
    trigger tied to the session starting, not just a wall-clock schedule.

CREATE_NO_WINDOW stops a console flashing when the GUI (a windowed exe)
shells out.
"""
import os
import subprocess
import sys
import tempfile
from datetime import datetime
from pathlib import Path
from xml.sax.saxutils import escape

TASK_NAME = "ARQ Tally Connector Sync"

# Bumped whenever the task definition below changes in a way that existing
# installs need. The GUI compares it against the registered task and silently
# re-registers a stale one — clients never learn what a scheduled task is, so
# they will never go and fix it themselves.
TASK_DEFINITION_VERSION = "arq-task-v2"

_NO_WINDOW = 0x08000000  # subprocess.CREATE_NO_WINDOW


def _run_command_for_task() -> tuple[str, str]:
    """(command, arguments) the scheduled task should execute."""
    if getattr(sys, "frozen", False):  # PyInstaller exe
        return sys.executable, "run"
    # dev mode: run via the venv's python
    return sys.executable, "-m arq_connector.cli run"


def _current_user() -> str:
    """DOMAIN\\user for the task principal. On a workgroup PC the 'domain' is
    the machine name, which is exactly what Task Scheduler expects."""
    domain = os.environ.get("USERDOMAIN") or os.environ.get("COMPUTERNAME", "")
    user = os.environ.get("USERNAME", "")
    return f"{domain}\\{user}" if domain and user else user


def _schtasks(*args: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["schtasks", *args],
        capture_output=True,
        text=True,
        stdin=subprocess.DEVNULL,  # windowed exe: no valid std handles
        creationflags=_NO_WINDOW,
    )


def build_task_xml(interval_hours: int, logon_delay_minutes: int, command: str,
                   arguments: str, user: str,
                   start_boundary: str | None = None) -> str:
    """The Task Scheduler 1.2 document registered for TASK_NAME.

    Element order inside <Settings> follows what Task Scheduler itself emits;
    it round-trips through schtasks unchanged.
    """
    start = start_boundary or datetime.now().replace(
        second=0, microsecond=0).isoformat(timespec="seconds")
    workdir = str(Path(command).parent)

    # No <Duration> under <Repetition> means "indefinitely" — the task keeps
    # repeating every interval for as long as it is registered.
    return f"""<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo>
    <Description>ARQ Astra: pushes TallyPrime receivables to the ARQ cloud dashboard. Read-only toward Tally. [{TASK_DEFINITION_VERSION}]</Description>
    <Author>{escape(user)}</Author>
  </RegistrationInfo>
  <Triggers>
    <LogonTrigger>
      <Enabled>true</Enabled>
      <Delay>PT{int(logon_delay_minutes)}M</Delay>
      <UserId>{escape(user)}</UserId>
    </LogonTrigger>
    <TimeTrigger>
      <StartBoundary>{start}</StartBoundary>
      <Enabled>true</Enabled>
      <Repetition>
        <Interval>PT{int(interval_hours)}H</Interval>
        <StopAtDurationEnd>false</StopAtDurationEnd>
      </Repetition>
    </TimeTrigger>
  </Triggers>
  <Principals>
    <Principal id="Author">
      <UserId>{escape(user)}</UserId>
      <LogonType>InteractiveToken</LogonType>
      <RunLevel>LeastPrivilege</RunLevel>
    </Principal>
  </Principals>
  <Settings>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <AllowHardTerminate>true</AllowHardTerminate>
    <StartWhenAvailable>true</StartWhenAvailable>
    <RunOnlyIfNetworkAvailable>false</RunOnlyIfNetworkAvailable>
    <IdleSettings>
      <StopOnIdleEnd>false</StopOnIdleEnd>
      <RestartOnIdle>false</RestartOnIdle>
    </IdleSettings>
    <AllowStartOnDemand>true</AllowStartOnDemand>
    <Enabled>true</Enabled>
    <Hidden>false</Hidden>
    <RunOnlyIfIdle>false</RunOnlyIfIdle>
    <WakeToRun>false</WakeToRun>
    <ExecutionTimeLimit>PT1H</ExecutionTimeLimit>
    <Priority>7</Priority>
    <RestartOnFailure>
      <Interval>PT10M</Interval>
      <Count>3</Count>
    </RestartOnFailure>
  </Settings>
  <Actions Context="Author">
    <Exec>
      <Command>{escape(command)}</Command>
      <Arguments>{escape(arguments)}</Arguments>
      <WorkingDirectory>{escape(workdir)}</WorkingDirectory>
    </Exec>
  </Actions>
</Task>
"""


def create_task(interval_hours: int, logon_delay_minutes: int = 10) -> None:
    command, arguments = _run_command_for_task()
    xml = build_task_xml(
        interval_hours=interval_hours,
        logon_delay_minutes=logon_delay_minutes,
        command=command,
        arguments=arguments,
        user=_current_user(),
    )

    # schtasks /XML is strict about encoding: UTF-16 with a BOM, matching the
    # declaration in the document. UTF-8 gets rejected as malformed.
    fd, xml_path = tempfile.mkstemp(prefix="arq-task-", suffix=".xml")
    try:
        with os.fdopen(fd, "w", encoding="utf-16") as f:
            f.write(xml)
        result = _schtasks("/Create", "/TN", TASK_NAME, "/XML", xml_path, "/F")
    finally:
        Path(xml_path).unlink(missing_ok=True)

    if result.returncode != 0:
        raise RuntimeError(
            f"Could not create scheduled task: {result.stderr.strip() or result.stdout.strip()}"
        )


def delete_task() -> None:
    result = _schtasks("/Delete", "/TN", TASK_NAME, "/F")
    if result.returncode != 0 and "cannot find" not in result.stderr.lower():
        raise RuntimeError(f"Could not delete scheduled task: {result.stderr.strip() or result.stdout.strip()}")


def task_exists() -> bool:
    return _schtasks("/Query", "/TN", TASK_NAME).returncode == 0


def run_task_now() -> None:
    """Fire the scheduled task immediately.

    Worth having its own button: it exercises the real unattended path — the
    registered command line, in a detached session — rather than the in-process
    push, which is what the operator actually needs proof of.
    """
    result = _schtasks("/Run", "/TN", TASK_NAME)
    if result.returncode != 0:
        raise RuntimeError(f"Could not start the scheduled task: {result.stderr.strip() or result.stdout.strip()}")


def _registered_task_xml() -> str:
    """Best-effort read of the registered definition. schtasks emits this in
    whatever the console encoding is, so decode defensively — callers only
    substring-match ASCII markers against it."""
    result = subprocess.run(
        ["schtasks", "/Query", "/TN", TASK_NAME, "/XML", "ONE"],
        capture_output=True,
        stdin=subprocess.DEVNULL,
        creationflags=_NO_WINDOW,
    )
    if result.returncode != 0:
        return ""
    raw = result.stdout
    for encoding in ("utf-16", "utf-8", "mbcs"):
        try:
            text = raw.decode(encoding)
        except (UnicodeDecodeError, LookupError):
            continue
        if "<Task" in text:
            return text
    return raw.decode("latin-1", errors="ignore")


def task_needs_refresh() -> bool:
    """True when a registered task is stale and should be re-created.

    Two cases matter in the field: the task predates a change to the definition
    above, or the client moved/reinstalled the exe and the registered command
    now points at a path that no longer exists.
    """
    xml = _registered_task_xml()
    if not xml:
        return False  # no task registered, or unreadable — nothing to refresh
    if TASK_DEFINITION_VERSION not in xml:
        return True
    command, _ = _run_command_for_task()
    return command not in xml
