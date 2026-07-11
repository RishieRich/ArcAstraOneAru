import json
from pathlib import Path

from arq_connector.sync import snapshot as snapshot_mod
from arq_connector.tally.client import TallyClient
from arq_connector.tally.detect import DoctorResult, EXIT_HEALTHY
from arq_connector.tally.parsers import CompanyRef

FIXTURES = Path(__file__).parent / "fixtures"
LEDGERS_XML = (FIXTURES / "debtor_ledgers.xml").read_text(encoding="utf-8")


def test_pull_snapshot_raises_when_unhealthy(monkeypatch):
    monkeypatch.setattr(
        snapshot_mod,
        "run_doctor",
        lambda host, port, configured_company: DoctorResult(exit_code=10, message="not running"),
    )
    try:
        snapshot_mod.pull_snapshot(host="localhost", port=9000, company_name="ARQ AA")
        assert False, "expected SnapshotError"
    except snapshot_mod.SnapshotError as e:
        assert "not running" in str(e)


def test_pull_snapshot_assembles_structure(monkeypatch):
    matched = CompanyRef(name="ARQ Code Test", guid="test-guid-123", starting_from="20260401")
    monkeypatch.setattr(
        snapshot_mod,
        "run_doctor",
        lambda host, port, configured_company: DoctorResult(
            exit_code=EXIT_HEALTHY, message="ok", companies=[matched], matched_company=matched
        ),
    )
    # first post_envelope call = ledgers, second = bills; bills fixture unavailable so return empty envelope
    responses = iter([LEDGERS_XML, "<ENVELOPE></ENVELOPE>"])
    monkeypatch.setattr(TallyClient, "post_envelope", lambda self, xml: next(responses))

    result = snapshot_mod.pull_snapshot(host="localhost", port=9000, company_name="ARQ Code Test")

    assert result["company"]["name"] == "ARQ Code Test"
    assert result["company"]["guid"] == "test-guid-123"
    assert len(result["ledgers"]) == 1
    assert result["ledgers"][0]["name"] == "Alpha Customer"
    assert result["bills"] == []
    assert "pulled_at" in result
    assert result["connector_version"]


def test_write_snapshot_serializes_decimal_and_is_valid_json(tmp_path):
    snapshot = {
        "company": {"name": "ARQ Code Test", "guid": "g"},
        "ledgers": [{"name": "Alpha Customer", "closing_balance": __import__("decimal").Decimal("0.00")}],
        "bills": [],
        "pulled_at": "2026-07-11T17:00:00",
        "connector_version": "0.1.0",
    }
    out_path = tmp_path / "snapshot.json"
    snapshot_mod.write_snapshot(snapshot, out_path)

    loaded = json.loads(out_path.read_text(encoding="utf-8"))
    assert loaded["ledgers"][0]["closing_balance"] == "0.00"
    assert loaded["company"]["name"] == "ARQ Code Test"
