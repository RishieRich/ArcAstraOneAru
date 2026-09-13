"""SLICE-07: prove the isolated-test-database guard in conftest.py fails
*before* any database connection is attempted, for both unsafe configurations.

Each case runs a fresh subprocess (`pytest --collect-only`) with a controlled
environment, because the guard runs at collection time in this same
conftest.py -- we cannot exercise "missing config" by mutating the process
that is itself relying on valid config to be running at all. No real database
is touched in either case: the guard raises during module import, well before
app.db.get_connection() is ever called.
"""
import os
import subprocess
import sys
import uuid
from pathlib import Path

from app.db import get_connection

BACKEND_DIR = Path(__file__).resolve().parent.parent


def _env_without(*keys: str) -> dict:
    env = os.environ.copy()
    for key in keys:
        env.pop(key, None)
    return env


def _collect_only(env: dict) -> subprocess.CompletedProcess:
    return subprocess.run(
        [sys.executable, "-m", "pytest", "tests/test_isolated_test_db_guard.py",
         "--collect-only", "-q"],
        cwd=BACKEND_DIR,
        env=env,
        capture_output=True,
        text=True,
        timeout=60,
    )


def test_missing_arq_test_database_url_fails_before_connecting():
    env = _env_without("ARQ_TEST_DATABASE_URL")
    env["ARQ_TEST_IGNORE_DOTENV"] = "1"
    result = _collect_only(env)

    assert result.returncode != 0, (
        "collection should fail without ARQ_TEST_DATABASE_URL, but it succeeded:\n"
        f"stdout={result.stdout}\nstderr={result.stderr}"
    )
    combined = result.stdout + result.stderr
    assert "ARQ_TEST_DATABASE_URL is not set" in combined, combined
    # A connection attempt would surface as a psycopg OperationalError (DNS
    # failure, auth failure, timeout, ...) or the retry-sleep from
    # app.db.get_connection. Neither should appear -- the guard must raise
    # before app.db is even imported.
    assert "psycopg" not in combined.lower() or "OperationalError" not in combined
    assert "get_connection" not in combined


def test_test_database_url_equal_to_database_url_fails_before_connecting():
    env = os.environ.copy()
    same_value = "postgresql://guard-test-sentinel-value/irrelevant"
    env["DATABASE_URL"] = same_value
    env["ARQ_TEST_DATABASE_URL"] = same_value
    result = _collect_only(env)

    assert result.returncode != 0, (
        "collection should fail when ARQ_TEST_DATABASE_URL == DATABASE_URL, "
        f"but it succeeded:\nstdout={result.stdout}\nstderr={result.stderr}"
    )
    combined = result.stdout + result.stderr
    assert "identical to DATABASE_URL" in combined, combined


def test_isolated_database_create_read_cleanup():
    """Prove the configured isolated database can create, read, and clean up."""
    marker = f"slice-07-live-check-{uuid.uuid4().hex}"
    tenant_id = None

    try:
        with get_connection() as conn, conn.cursor() as cur:
            cur.execute(
                "insert into tenants (name) values (%s) returning id",
                (marker,),
            )
            (tenant_id,) = cur.fetchone()
            cur.execute(
                "select name from tenants where id = %s",
                (tenant_id,),
            )
            assert cur.fetchone() == (marker,)
            conn.commit()
    finally:
        if tenant_id is not None:
            with get_connection() as conn, conn.cursor() as cur:
                cur.execute("delete from tenants where id = %s", (tenant_id,))
                conn.commit()

    with get_connection() as conn, conn.cursor() as cur:
        cur.execute("select 1 from tenants where id = %s", (tenant_id,))
        assert cur.fetchone() is None
