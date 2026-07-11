import json
from decimal import Decimal

import httpx
import pytest

from arq_connector.sync.pusher import (
    PushError,
    build_payload,
    parse_tally_date,
    push_snapshot,
    register_device,
)

SNAPSHOT = {
    "company": {"name": "ARQ Code Test", "guid": "guid-123"},
    "ledgers": [
        {"tally_guid": "lg-1", "name": "Alpha Customer", "parent_group": "Sundry Debtors",
         "closing_balance": Decimal("-508989.00"), "alter_id": 210}
    ],
    "bills": [
        {"party_guid": None, "party_name": "Alpha Customer", "bill_ref": "2",
         "bill_date": "1-Apr-26", "due_date": "1-Apr-26",
         "pending_amount": Decimal("-508989.00"), "overdue_days": 62}
    ],
    "pulled_at": "2026-07-11T18:00:00",
    "connector_version": "0.1.0",
}


def test_parse_tally_date_report_format():
    assert parse_tally_date("1-Apr-26") == "2026-04-01"


def test_parse_tally_date_full_year_and_compact_formats():
    assert parse_tally_date("1-Apr-2026") == "2026-04-01"
    assert parse_tally_date("20260401") == "2026-04-01"


def test_parse_tally_date_blank_and_garbage():
    assert parse_tally_date(None) is None
    assert parse_tally_date("") is None
    assert parse_tally_date("not-a-date") is None


def test_build_payload_matches_backend_schema():
    payload = build_payload(SNAPSHOT, sync_run_id="11111111-1111-1111-1111-111111111111")

    assert payload["sync_run_id"] == "11111111-1111-1111-1111-111111111111"
    assert payload["company_guid"] == "guid-123"
    assert payload["ledgers"][0] == {
        "tally_guid": "lg-1", "name": "Alpha Customer", "parent_group": "Sundry Debtors",
        "closing_balance": "-508989.00", "alter_id": 210,
    }
    assert payload["bills"][0] == {
        "party_guid": None, "party_name": "Alpha Customer", "bill_ref": "2",
        "bill_date": "2026-04-01", "due_date": "2026-04-01",
        "pending_amount": "-508989.00", "overdue_days": 62,
    }
    json.dumps(payload)  # must be JSON-serializable as-is


def test_build_payload_generates_uuid_when_not_given():
    a = build_payload(SNAPSHOT)["sync_run_id"]
    b = build_payload(SNAPSHOT)["sync_run_id"]
    assert a != b and len(a) == 36


def test_push_snapshot_success():
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/v1/sync"
        assert request.headers["authorization"] == "Bearer tok-1"
        body = json.loads(request.content)
        return httpx.Response(200, json={
            "sync_run_id": body["sync_run_id"], "status": "success",
            "counts": {"ledgers": 1, "bills": 1},
        })

    result = push_snapshot("http://test", "tok-1", SNAPSHOT, transport=httpx.MockTransport(handler))
    assert result["status"] == "success"


def test_push_snapshot_surfaces_backend_rejection():
    transport = httpx.MockTransport(
        lambda request: httpx.Response(403, json={"detail": "company_guid mismatch"})
    )
    with pytest.raises(PushError, match="403.*company_guid mismatch"):
        push_snapshot("http://test", "tok-1", SNAPSHOT, transport=transport)


def test_register_device_returns_token():
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/v1/devices/register"
        body = json.loads(request.content)
        assert body == {"pairing_code": "code-1", "company_guid": "g", "machine_label": "m"}
        return httpx.Response(200, json={"device_token": "raw-token"})

    token = register_device("http://test", "code-1", "g", "m", transport=httpx.MockTransport(handler))
    assert token == "raw-token"


def test_register_device_surfaces_error():
    transport = httpx.MockTransport(
        lambda request: httpx.Response(400, json={"detail": "Pairing code already used"})
    )
    with pytest.raises(PushError, match="400.*already used"):
        register_device("http://test", "code-1", "g", "m", transport=transport)
