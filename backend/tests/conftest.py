import os
import sys
import uuid
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


# --- SLICE-07: isolated test database guard ---------------------------------
# Every test in this suite ultimately calls app.db.get_connection(), which reads
# DATABASE_URL from the environment at call time. Until this guard, that meant
# `python -m pytest` here silently used whatever DATABASE_URL backend/.env
# supplied -- in practice the same Neon database the running product uses
# (AGENTS.md already documents this as "backend tests hit the live Neon DB --
# they are not hermetic"). Require a separate, explicit ARQ_TEST_DATABASE_URL
# and fail before any module that could open a connection is even imported.
def _require_isolated_test_database() -> str:
    from dotenv import load_dotenv

    # Populate os.environ from backend/.env for anything not already exported
    # by the shell, so we can see what DATABASE_URL *would* resolve to -- but
    # this must never be allowed to win over an already-exported
    # ARQ_TEST_DATABASE_URL, and it must happen before app.db's own
    # load_dotenv() call so the comparison below sees the real product value.
    # Guard-focused subprocess tests need to simulate an absent value even
    # when a developer has correctly stored the real test URL in `.env`.
    # Skipping dotenv never bypasses the checks below: the subprocess must
    # still provide a non-empty, distinct ARQ_TEST_DATABASE_URL or collection
    # fails before app.db is imported.
    if os.environ.get("ARQ_TEST_IGNORE_DOTENV") != "1":
        load_dotenv(Path(__file__).resolve().parent.parent / ".env")

    test_url = os.environ.get("ARQ_TEST_DATABASE_URL")
    if not test_url or not test_url.strip():
        raise RuntimeError(
            "ARQ_TEST_DATABASE_URL is not set. Backend integration tests require an "
            "explicit, isolated Postgres database -- never the product DATABASE_URL. "
            "Set ARQ_TEST_DATABASE_URL to a dedicated test database (a separate Neon "
            "branch/project, or a local Postgres instance) before running "
            "`python -m pytest`. See "
            "docs/specs/changes/003-essential-tally-data-foundation/TASKS.md SLICE-07."
        )

    product_url = os.environ.get("DATABASE_URL")
    if product_url and test_url.strip() == product_url.strip():
        raise RuntimeError(
            "ARQ_TEST_DATABASE_URL is identical to DATABASE_URL. Tests must run "
            "against a database separate from the product connection string -- "
            "refusing to start rather than writing/deleting rows in the live database."
        )

    # Every app module that later calls app.db.get_database_url() must resolve
    # the isolated test database from here on, not the product one.
    os.environ["DATABASE_URL"] = test_url
    return test_url


_require_isolated_test_database()

from app.db import get_connection  # noqa: E402  (must follow the guard above)
from app.main import app  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402


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
            cur.execute(
                "delete from financial_transaction_lines where tenant_id = %s",
                (tenant_id,),
            )
            cur.execute(
                "delete from financial_transactions where tenant_id = %s",
                (tenant_id,),
            )
            cur.execute("delete from financial_imports where tenant_id = %s", (tenant_id,))
            cur.execute("delete from bills where tenant_id = %s", (tenant_id,))
            cur.execute("delete from ledgers where tenant_id = %s", (tenant_id,))
            cur.execute("delete from sync_runs where tenant_id = %s", (tenant_id,))
            cur.execute("delete from devices where tenant_id = %s", (tenant_id,))
            cur.execute("delete from pairing_codes where tenant_id = %s", (tenant_id,))
            cur.execute("delete from tenants where id = %s", (tenant_id,))
        conn.commit()
