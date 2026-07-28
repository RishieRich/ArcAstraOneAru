import logging

from arq_connector.tally import launcher
from arq_connector.tally.detect import (
    DoctorResult,
    EXIT_HEALTHY,
    EXIT_NO_COMPANY,
    EXIT_NOT_RUNNING,
)

LOGGER = logging.getLogger("test")

SETTINGS = {
    "tally_host": "localhost",
    "tally_port": 9000,
    "company_name": "ARQ Code Test",
    "auto_start_tally": True,
    "tally_exe_path": "",
}


def test_find_tally_exe_prefers_configured_path(tmp_path):
    exe = tmp_path / "tally.exe"
    exe.write_bytes(b"")
    assert launcher.find_tally_exe(str(exe)) == str(exe)


def test_find_tally_exe_rejects_missing_configured_path(tmp_path):
    assert launcher.find_tally_exe(str(tmp_path / "nope.exe")) is None


def test_disabled_setting_returns_original_result(monkeypatch):
    calls = []
    monkeypatch.setattr(launcher, "start_tally", lambda p: calls.append(p) or True)
    original = DoctorResult(exit_code=EXIT_NOT_RUNNING, message="not running")

    result = launcher.ensure_tally_ready({**SETTINGS, "auto_start_tally": False}, original, LOGGER)

    assert result is original
    assert calls == []


def test_not_running_launches_then_waits_until_healthy(monkeypatch):
    launched = []
    monkeypatch.setattr(launcher, "find_tally_exe", lambda p: r"C:\fake\tally.exe")
    monkeypatch.setattr(launcher, "start_tally", lambda p: launched.append(p) or True)
    healthy = DoctorResult(exit_code=EXIT_HEALTHY, message="ok")
    monkeypatch.setattr(launcher, "wait_until_healthy",
                        lambda host, port, company, **kw: healthy)

    original = DoctorResult(exit_code=EXIT_NOT_RUNNING, message="not running")
    result = launcher.ensure_tally_ready(SETTINGS, original, LOGGER)

    assert launched == [r"C:\fake\tally.exe"]
    assert result.exit_code == EXIT_HEALTHY


def test_no_company_waits_without_launching_second_instance(monkeypatch):
    launched = []
    monkeypatch.setattr(launcher, "start_tally", lambda p: launched.append(p) or True)
    healthy = DoctorResult(exit_code=EXIT_HEALTHY, message="ok")
    monkeypatch.setattr(launcher, "wait_until_healthy",
                        lambda host, port, company, **kw: healthy)

    original = DoctorResult(exit_code=EXIT_NO_COMPANY, message="company loading")
    result = launcher.ensure_tally_ready(SETTINGS, original, LOGGER)

    assert launched == []  # Tally already running: must NOT start another one
    assert result.exit_code == EXIT_HEALTHY


def test_exe_not_found_returns_original_failure(monkeypatch):
    monkeypatch.setattr(launcher, "find_tally_exe", lambda p: None)
    original = DoctorResult(exit_code=EXIT_NOT_RUNNING, message="not running")

    result = launcher.ensure_tally_ready(SETTINGS, original, LOGGER)

    assert result is original


def test_wait_until_healthy_polls_until_ok(monkeypatch):
    results = iter([
        DoctorResult(exit_code=EXIT_NOT_RUNNING, message="starting"),
        DoctorResult(exit_code=EXIT_NO_COMPANY, message="loading"),
        DoctorResult(exit_code=EXIT_HEALTHY, message="ok"),
    ])
    monkeypatch.setattr(launcher, "run_doctor",
                        lambda host, port, configured_company, configured_guid="": next(results))

    result = launcher.wait_until_healthy("localhost", 9000, "ARQ Code Test",
                                         timeout=60, poll_interval=0, sleep=lambda s: None)

    assert result.exit_code == EXIT_HEALTHY


def test_wait_until_healthy_matches_on_stored_guid(monkeypatch):
    seen = []

    def fake_doctor(host, port, configured_company, configured_guid=""):
        seen.append(configured_guid)
        return DoctorResult(exit_code=EXIT_HEALTHY, message="ok")

    monkeypatch.setattr(launcher, "run_doctor", fake_doctor)
    launcher.wait_until_healthy("localhost", 9000, "ARQ Code Test", guid="abc-123",
                                timeout=1, poll_interval=0, sleep=lambda s: None)

    assert seen == ["abc-123"]


def test_ensure_tally_ready_passes_startup_wait_from_settings(monkeypatch):
    captured = {}
    monkeypatch.setattr(launcher, "find_tally_exe", lambda p: r"C:\fake\tally.exe")
    monkeypatch.setattr(launcher, "start_tally", lambda p: True)

    def fake_wait(host, port, company, guid="", timeout=0.0, **kw):
        captured["timeout"] = timeout
        captured["guid"] = guid
        return DoctorResult(exit_code=EXIT_HEALTHY, message="ok")

    monkeypatch.setattr(launcher, "wait_until_healthy", fake_wait)
    settings = {**SETTINGS, "company_guid": "guid-9", "tally_startup_wait_seconds": 240}

    launcher.ensure_tally_ready(
        settings, DoctorResult(exit_code=EXIT_NOT_RUNNING, message="not running"), LOGGER)

    assert captured == {"timeout": 240.0, "guid": "guid-9"}
