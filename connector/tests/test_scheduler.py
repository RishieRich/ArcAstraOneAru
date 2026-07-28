"""The scheduled task definition.

Every assertion here is a setting that, if wrong, silently stops unattended
syncs on a real client machine rather than failing loudly — which is exactly
the kind of thing nobody notices until the dashboard is a week stale.

The document these produce was round-tripped through `schtasks /Create /XML`
and read back on Windows 11; Task Scheduler preserved all of it.
"""
from xml.etree import ElementTree as ET

from arq_connector import scheduler

NS = {"t": "http://schemas.microsoft.com/windows/2004/02/mit/task"}


def build(interval_hours=3, logon_delay_minutes=10):
    return scheduler.build_task_xml(
        interval_hours=interval_hours,
        logon_delay_minutes=logon_delay_minutes,
        command=r"C:\ARQ Astra\arq-connector.exe",
        arguments="run",
        user="TESTPC\\owner",
        start_boundary="2026-07-29T09:00:00",
    )


def parse(xml: str) -> ET.Element:
    return ET.fromstring(xml)


def text(root: ET.Element, path: str) -> str | None:
    node = root.find(path, NS)
    return None if node is None else node.text


def test_document_is_well_formed_task_scheduler_xml():
    root = parse(build())
    assert root.tag.endswith("}Task")
    assert root.get("version") == "1.2"


def test_logon_trigger_waits_before_the_first_sync():
    root = parse(build(logon_delay_minutes=10))
    assert text(root, ".//t:LogonTrigger/t:Delay") == "PT10M"
    assert text(root, ".//t:LogonTrigger/t:Enabled") == "true"


def test_repeats_on_the_configured_interval_forever():
    root = parse(build(interval_hours=3))
    assert text(root, ".//t:TimeTrigger/t:Repetition/t:Interval") == "PT3H"
    # No <Duration> means "indefinitely". A duration here would quietly stop
    # the repetition after that window and the syncs would just end.
    assert root.find(".//t:TimeTrigger/t:Repetition/t:Duration", NS) is None


def test_missed_runs_are_caught_up():
    # The PC is off overnight. Without this the skipped slots are dropped.
    assert text(parse(build()), ".//t:Settings/t:StartWhenAvailable") == "true"


def test_runs_on_battery():
    # Task Scheduler defaults both of these to true, which stops the sync dead
    # on any unplugged laptop.
    root = parse(build())
    assert text(root, ".//t:Settings/t:DisallowStartIfOnBatteries") == "false"
    assert text(root, ".//t:Settings/t:StopIfGoingOnBatteries") == "false"


def test_does_not_wait_for_an_idle_machine():
    root = parse(build())
    assert text(root, ".//t:Settings/t:RunOnlyIfIdle") == "false"
    assert text(root, ".//t:Settings/t:IdleSettings/t:StopOnIdleEnd") == "false"


def test_overlapping_runs_are_dropped_not_queued():
    assert text(parse(build()), ".//t:Settings/t:MultipleInstancesPolicy") == "IgnoreNew"


def test_runs_as_the_interactive_user():
    # Session 0 would lose the device token, which lives in this user's
    # Windows Credential Manager.
    root = parse(build())
    assert text(root, ".//t:Principal/t:LogonType") == "InteractiveToken"
    assert text(root, ".//t:Principal/t:RunLevel") == "LeastPrivilege"
    assert text(root, ".//t:Principal/t:UserId") == "TESTPC\\owner"


def test_action_invokes_the_headless_run():
    root = parse(build())
    assert text(root, ".//t:Exec/t:Command") == r"C:\ARQ Astra\arq-connector.exe"
    assert text(root, ".//t:Exec/t:Arguments") == "run"
    assert text(root, ".//t:Exec/t:WorkingDirectory") == r"C:\ARQ Astra"


def test_definition_is_stamped_for_upgrade_detection():
    assert scheduler.TASK_DEFINITION_VERSION in build()


def test_special_characters_in_the_user_name_are_escaped():
    xml = scheduler.build_task_xml(
        interval_hours=3, logon_delay_minutes=10,
        command=r"C:\Program Files\ARQ & Co\arq-connector.exe",
        arguments="run", user="PC\\o'brien & sons",
        start_boundary="2026-07-29T09:00:00")

    root = parse(xml)  # would raise if the escaping were wrong
    assert text(root, ".//t:Exec/t:Command") == r"C:\Program Files\ARQ & Co\arq-connector.exe"


def test_stale_definition_is_flagged_for_refresh(monkeypatch):
    monkeypatch.setattr(scheduler, "_registered_task_xml",
                        lambda: "<Task><Description>arq-task-v1</Description></Task>")
    assert scheduler.task_needs_refresh() is True


def test_moved_exe_is_flagged_for_refresh(monkeypatch):
    monkeypatch.setattr(scheduler, "_run_command_for_task",
                        lambda: (r"D:\New Home\arq-connector.exe", "run"))
    monkeypatch.setattr(
        scheduler, "_registered_task_xml",
        lambda: f"<Task>{scheduler.TASK_DEFINITION_VERSION}"
                r"<Command>C:\Old\arq-connector.exe</Command></Task>")
    assert scheduler.task_needs_refresh() is True


def test_current_definition_needs_no_refresh(monkeypatch):
    monkeypatch.setattr(scheduler, "_run_command_for_task",
                        lambda: (r"C:\ARQ Astra\arq-connector.exe", "run"))
    monkeypatch.setattr(
        scheduler, "_registered_task_xml",
        lambda: f"<Task>{scheduler.TASK_DEFINITION_VERSION}"
                r"<Command>C:\ARQ Astra\arq-connector.exe</Command></Task>")
    assert scheduler.task_needs_refresh() is False


def test_no_registered_task_is_not_a_refresh(monkeypatch):
    monkeypatch.setattr(scheduler, "_registered_task_xml", lambda: "")
    assert scheduler.task_needs_refresh() is False
