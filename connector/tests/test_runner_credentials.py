import logging

from arq_connector import runner


def test_sync_reports_credential_manager_failure(monkeypatch):
    monkeypatch.setattr(
        runner.credentials,
        "load_token",
        lambda: (_ for _ in ()).throw(RuntimeError("credential backend failed")),
    )
    settings = {
        "company_name": "Acme",
        "company_guid": "guid-acme",
        "tally_host": "localhost",
        "tally_port": 9000,
    }

    outcome = runner._run_sync(settings, logging.getLogger("test"))

    assert outcome.ok is False
    assert "Credential Manager" in outcome.message
    assert "credential backend failed" not in outcome.message
