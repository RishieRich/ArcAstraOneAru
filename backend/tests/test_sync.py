import uuid

from app.db import get_connection


def _register(client, tenant, company_guid="guid-1"):
    resp = client.post(
        "/v1/devices/register",
        json={"pairing_code": tenant["pairing_code"], "company_guid": company_guid},
    )
    assert resp.status_code == 200
    return resp.json()["device_token"]


def test_sync_without_token_is_401(client):
    resp = client.post(
        "/v1/sync",
        json={"sync_run_id": str(uuid.uuid4()), "company_guid": "g", "ledgers": [], "bills": []},
    )
    assert resp.status_code == 401


def test_sync_with_garbage_token_is_401(client):
    resp = client.post(
        "/v1/sync",
        headers={"Authorization": "Bearer not-a-real-token"},
        json={"sync_run_id": str(uuid.uuid4()), "company_guid": "g", "ledgers": [], "bills": []},
    )
    assert resp.status_code == 401


def test_sync_with_wrong_company_guid_is_403(client, make_tenant):
    tenant = make_tenant()
    token = _register(client, tenant, company_guid="guid-1")
    resp = client.post(
        "/v1/sync",
        headers={"Authorization": f"Bearer {token}"},
        json={"sync_run_id": str(uuid.uuid4()), "company_guid": "guid-WRONG", "ledgers": [], "bills": []},
    )
    assert resp.status_code == 403


def test_sync_writes_rows_and_is_idempotent(client, make_tenant):
    tenant = make_tenant()
    token = _register(client, tenant, company_guid="guid-1")
    run_id = str(uuid.uuid4())
    payload = {
        "sync_run_id": run_id,
        "company_guid": "guid-1",
        "ledgers": [
            {"tally_guid": "lg-1", "name": "Test Party", "parent_group": "Sundry Debtors",
             "closing_balance": 500, "alter_id": 1}
        ],
        "bills": [
            {"party_guid": "lg-1", "party_name": "Test Party", "bill_ref": "INV-1",
             "pending_amount": 500, "overdue_days": 2}
        ],
    }

    first = client.post("/v1/sync", headers={"Authorization": f"Bearer {token}"}, json=payload)
    assert first.status_code == 200
    assert first.json()["counts"] == {"ledgers": 1, "bills": 1}

    # re-send the same sync_run_id: must not double-insert bills
    second = client.post(
        "/v1/sync",
        headers={"Authorization": f"Bearer {token}"},
        json={**payload, "bills": []},  # even with a different body, idempotency wins
    )
    assert second.status_code == 200
    assert second.json() == first.json()

    with get_connection() as conn, conn.cursor() as cur:
        cur.execute("select count(*) from bills where sync_run_id = %s", (run_id,))
        assert cur.fetchone()[0] == 1


def test_two_tenants_cannot_see_each_others_data(client, make_tenant):
    tenant_a = make_tenant("tenant-a")
    tenant_b = make_tenant("tenant-b")
    token_a = _register(client, tenant_a, company_guid="guid-a")
    token_b = _register(client, tenant_b, company_guid="guid-b")

    client.post(
        "/v1/sync",
        headers={"Authorization": f"Bearer {token_a}"},
        json={
            "sync_run_id": str(uuid.uuid4()),
            "company_guid": "guid-a",
            "ledgers": [],
            "bills": [{"party_name": "A-Party", "pending_amount": 111}],
        },
    )
    client.post(
        "/v1/sync",
        headers={"Authorization": f"Bearer {token_b}"},
        json={
            "sync_run_id": str(uuid.uuid4()),
            "company_guid": "guid-b",
            "ledgers": [],
            "bills": [{"party_name": "B-Party", "pending_amount": 222}],
        },
    )

    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(
            "select party_name from bills where tenant_id = %s", (tenant_a["tenant_id"],)
        )
        a_rows = [r[0] for r in cur.fetchall()]
        cur.execute(
            "select party_name from bills where tenant_id = %s", (tenant_b["tenant_id"],)
        )
        b_rows = [r[0] for r in cur.fetchall()]

    assert a_rows == ["A-Party"]
    assert b_rows == ["B-Party"]


def test_revoked_device_is_rejected(client, make_tenant):
    tenant = make_tenant()
    token = _register(client, tenant, company_guid="guid-1")

    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(
            "update devices set revoked_at = now() where tenant_id = %s", (tenant["tenant_id"],)
        )
        conn.commit()

    resp = client.post(
        "/v1/sync",
        headers={"Authorization": f"Bearer {token}"},
        json={"sync_run_id": str(uuid.uuid4()), "company_guid": "guid-1", "ledgers": [], "bills": []},
    )
    assert resp.status_code == 401
