import pytest

from arq_connector import registration


def test_deregister_clears_local_identity_status_and_schedule(monkeypatch):
    calls = []
    settings = {
        "company_name": "Old Company",
        "company_guid": "old-guid",
        "api_base_url": "https://example.test",
        "interval_hours": 6,
    }

    monkeypatch.setattr(
        registration.credentials, "delete_token", lambda: calls.append("token"))
    monkeypatch.setattr(
        registration, "save_settings", lambda saved: calls.append(("settings", dict(saved))))
    monkeypatch.setattr(
        registration.state, "clear_state", lambda: calls.append("state"))
    monkeypatch.setattr(registration.scheduler, "task_exists", lambda: True)
    monkeypatch.setattr(
        registration.scheduler, "delete_task", lambda: calls.append("schedule"))

    result = registration.deregister_local_device(settings)

    assert result.warnings == ()
    assert calls[0] == "token"
    assert calls[1][0] == "settings"
    assert calls[1][1]["company_name"] == ""
    assert calls[1][1]["company_guid"] == ""
    assert calls[1][1]["api_base_url"] == "https://example.test"
    assert calls[1][1]["interval_hours"] == 6
    assert calls[2:] == ["state", "schedule"]


def test_deregister_does_not_change_identity_when_token_delete_fails(monkeypatch):
    settings = {"company_name": "Keep Me", "company_guid": "keep-guid"}
    monkeypatch.setattr(
        registration.credentials,
        "delete_token",
        lambda: (_ for _ in ()).throw(RuntimeError("credential store unavailable")),
    )

    with pytest.raises(RuntimeError, match="credential store unavailable"):
        registration.deregister_local_device(settings)

    assert settings == {"company_name": "Keep Me", "company_guid": "keep-guid"}


def test_deregister_reports_cleanup_warnings_after_token_is_removed(monkeypatch):
    settings = {"company_name": "Old", "company_guid": "old-guid"}
    monkeypatch.setattr(registration.credentials, "delete_token", lambda: None)
    monkeypatch.setattr(
        registration,
        "save_settings",
        lambda _saved: (_ for _ in ()).throw(OSError("settings locked")),
    )
    monkeypatch.setattr(
        registration.state,
        "clear_state",
        lambda: (_ for _ in ()).throw(OSError("state locked")),
    )
    monkeypatch.setattr(registration.scheduler, "task_exists", lambda: True)
    monkeypatch.setattr(
        registration.scheduler,
        "delete_task",
        lambda: (_ for _ in ()).throw(RuntimeError("task locked")),
    )

    result = registration.deregister_local_device(settings)

    assert settings["company_name"] == ""
    assert settings["company_guid"] == ""
    assert len(result.warnings) == 3
    assert "settings locked" in result.warnings[0]
    assert "state locked" in result.warnings[1]
    assert "task locked" in result.warnings[2]
