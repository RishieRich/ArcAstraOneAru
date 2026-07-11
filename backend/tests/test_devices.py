def test_register_with_invalid_pairing_code_returns_404(client):
    resp = client.post(
        "/v1/devices/register",
        json={"pairing_code": "does-not-exist", "company_guid": "g1"},
    )
    assert resp.status_code == 404


def test_register_success_returns_token_once(client, make_tenant):
    tenant = make_tenant()
    resp = client.post(
        "/v1/devices/register",
        json={
            "pairing_code": tenant["pairing_code"],
            "company_guid": "guid-1",
            "machine_label": "test-machine",
        },
    )
    assert resp.status_code == 200
    assert "device_token" in resp.json()
    assert len(resp.json()["device_token"]) > 20


def test_pairing_code_is_single_use(client, make_tenant):
    tenant = make_tenant()
    body = {"pairing_code": tenant["pairing_code"], "company_guid": "guid-1"}
    first = client.post("/v1/devices/register", json=body)
    second = client.post("/v1/devices/register", json=body)
    assert first.status_code == 200
    assert second.status_code == 400


def test_second_device_with_mismatched_company_guid_is_rejected(client, make_tenant):
    tenant = make_tenant()
    client.post(
        "/v1/devices/register",
        json={"pairing_code": tenant["pairing_code"], "company_guid": "guid-A"},
    )
    # simulate a second pairing code for the SAME tenant with a different GUID
    from app.db import get_connection
    from app.security import hash_token
    import secrets
    from datetime import datetime, timedelta, timezone

    raw_code = secrets.token_urlsafe(9)
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(
            "insert into pairing_codes (code_hash, tenant_id, expires_at) values (%s, %s, %s)",
            (hash_token(raw_code), tenant["tenant_id"], datetime.now(timezone.utc) + timedelta(hours=1)),
        )
        conn.commit()

    resp = client.post(
        "/v1/devices/register",
        json={"pairing_code": raw_code, "company_guid": "guid-B-different"},
    )
    assert resp.status_code == 403
