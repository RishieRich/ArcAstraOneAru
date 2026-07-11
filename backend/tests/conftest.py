import sys
import uuid
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db import get_connection
from app.main import app


@pytest.fixture()
def client():
    return TestClient(app)


@pytest.fixture()
def make_tenant():
    """Factory fixture: create a throwaway tenant + pairing code, clean up after the test."""
    created_tenant_ids = []

    def _make(name_prefix: str = "pytest-tenant"):
        from app.admin import hash_token
        import secrets
        from datetime import datetime, timedelta, timezone

        name = f"{name_prefix}-{uuid.uuid4().hex[:8]}"
        raw_code = secrets.token_urlsafe(9)
        expires_at = datetime.now(timezone.utc) + timedelta(hours=1)

        with get_connection() as conn, conn.cursor() as cur:
            cur.execute("insert into tenants (name) values (%s) returning id", (name,))
            (tenant_id,) = cur.fetchone()
            cur.execute(
                "insert into pairing_codes (code_hash, tenant_id, expires_at) values (%s, %s, %s)",
                (hash_token(raw_code), tenant_id, expires_at),
            )
            conn.commit()

        created_tenant_ids.append(tenant_id)
        return {"tenant_id": tenant_id, "name": name, "pairing_code": raw_code}

    yield _make

    with get_connection() as conn, conn.cursor() as cur:
        for tenant_id in created_tenant_ids:
            cur.execute("delete from bills where tenant_id = %s", (tenant_id,))
            cur.execute("delete from ledgers where tenant_id = %s", (tenant_id,))
            cur.execute("delete from sync_runs where tenant_id = %s", (tenant_id,))
            cur.execute("delete from devices where tenant_id = %s", (tenant_id,))
            cur.execute("delete from pairing_codes where tenant_id = %s", (tenant_id,))
            cur.execute("delete from tenants where id = %s", (tenant_id,))
        conn.commit()
