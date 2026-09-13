"""SLICE-08: capability policy and generation schema.

Checks required by TASKS.md SLICE-08: apply the migration twice in the
isolated DB; cross-tenant relationships fail; an empty/default policy allows
no new capability; cleanup invalidates old generations.
"""
import uuid
from pathlib import Path

import psycopg
import pytest

from app import capability_policy as policy
from app.db import get_connection

MIGRATION_SQL = (
    Path(__file__).resolve().parent.parent / "migrations" / "0009_capability_policy.sql"
).read_text(encoding="utf-8")


def test_migration_applies_twice_without_error():
    # The migration is already applied once (by whoever set up the isolated
    # test database); re-running it here proves the file itself is
    # idempotent, independent of ordering or prior state.
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(MIGRATION_SQL)
        conn.commit()
        with conn.cursor() as cur:
            cur.execute(MIGRATION_SQL)
        conn.commit()


def test_unmigrated_tenant_reports_empty_policy_not_an_error(make_tenant):
    # A tenant that predates this migration (or was never touched by it) has
    # no tenant_configuration/tenant_capability_policy rows at all. Absence
    # must read as "nothing allowed, nothing enabled", not raise.
    tenant = make_tenant()
    with get_connection() as conn:
        effective = policy.get_effective_capabilities(conn, tenant["tenant_id"])
    assert effective["allowed"] == []
    assert effective["enabled"] == []
    assert effective["pilot_eligible"] is False
    assert effective["configuration_revision"] == 0
    assert effective["cleanup_generation"] == 0


def test_default_policy_allows_no_new_capability_ineligible(make_tenant):
    tenant = make_tenant()
    with get_connection() as conn:
        # Not yet marked pilot-eligible: even naming an otherwise-valid
        # capability code is refused before any allowed-set check.
        with pytest.raises(policy.NotEligibleError):
            policy.apply_initial_enabled_selection(conn, tenant["tenant_id"], ["receivables"])
        conn.rollback()


def test_default_policy_allows_no_new_capability_once_eligible(make_tenant):
    tenant = make_tenant()
    with get_connection() as conn:
        policy.set_pilot_eligible(conn, tenant["tenant_id"], True)
        conn.commit()
        # Eligible, but nothing has been added to the allowed set yet --
        # still refused, and refused whole (no partial enable).
        with pytest.raises(policy.NotAllowedError):
            policy.apply_initial_enabled_selection(
                conn, tenant["tenant_id"], ["receivables", "payables"]
            )
        conn.rollback()
        effective = policy.get_effective_capabilities(conn, tenant["tenant_id"])
    assert effective["enabled"] == []


def test_unknown_capability_code_rejected(make_tenant):
    tenant = make_tenant()
    with get_connection() as conn:
        with pytest.raises(policy.UnknownCapabilityError):
            policy.set_allowed_capabilities(conn, tenant["tenant_id"], ["not_a_real_capability"])
        conn.rollback()


def test_initial_selection_must_be_subset_of_allowed(make_tenant):
    tenant = make_tenant()
    with get_connection() as conn:
        policy.set_pilot_eligible(conn, tenant["tenant_id"], True)
        policy.set_allowed_capabilities(conn, tenant["tenant_id"], ["receivables"])
        conn.commit()
        # Asking for one allowed + one not-allowed capability rejects the
        # whole request -- no partial enable of the allowed one.
        with pytest.raises(policy.NotAllowedError):
            policy.apply_initial_enabled_selection(
                conn, tenant["tenant_id"], ["receivables", "payables"]
            )
        conn.rollback()
        effective = policy.get_effective_capabilities(conn, tenant["tenant_id"])
    assert effective["enabled"] == []

    with get_connection() as conn:
        revision = policy.apply_initial_enabled_selection(conn, tenant["tenant_id"], ["receivables"])
        conn.commit()
        effective = policy.get_effective_capabilities(conn, tenant["tenant_id"])
    assert effective["enabled"] == ["receivables"]
    assert effective["allowed"] == ["receivables"]
    assert revision == effective["configuration_revision"]


def test_revoking_allowed_capability_also_disables_it(make_tenant):
    tenant = make_tenant()
    with get_connection() as conn:
        policy.set_pilot_eligible(conn, tenant["tenant_id"], True)
        policy.set_allowed_capabilities(conn, tenant["tenant_id"], ["receivables", "payables"])
        conn.commit()
        policy.apply_initial_enabled_selection(conn, tenant["tenant_id"], ["receivables", "payables"])
        conn.commit()
        # Post-pairing, admin narrows the allowed set to drop payables.
        policy.set_allowed_capabilities(conn, tenant["tenant_id"], ["receivables"])
        conn.commit()
        effective = policy.get_effective_capabilities(conn, tenant["tenant_id"])
    assert effective["allowed"] == ["receivables"]
    assert effective["enabled"] == ["receivables"]


def test_enabled_requires_allowed_at_the_database_layer(make_tenant):
    # The Python primitives never produce an enabled-but-disallowed row, but
    # REQ-043/044 authorization must hold even against a direct/buggy write --
    # so the constraint itself, not just application code, must reject it.
    tenant = make_tenant()
    with get_connection() as conn:
        policy.ensure_tenant_configuration(conn, tenant["tenant_id"])
        conn.commit()
        with conn.cursor() as cur, pytest.raises(psycopg.errors.CheckViolation):
            cur.execute(
                "insert into tenant_capability_policy "
                "(tenant_id, capability, is_allowed, is_enabled) "
                "values (%s, %s, false, true)",
                (tenant["tenant_id"], "receivables"),
            )
        conn.rollback()


def test_cross_tenant_policy_row_rejected_for_unknown_tenant():
    fake_tenant_id = uuid.uuid4()
    with get_connection() as conn:
        with conn.cursor() as cur, pytest.raises(psycopg.errors.ForeignKeyViolation):
            cur.execute(
                "insert into tenant_capability_policy (tenant_id, capability, is_allowed) "
                "values (%s, %s, true)",
                (fake_tenant_id, "receivables"),
            )
        conn.rollback()


def test_cross_tenant_policy_is_isolated(make_tenant):
    tenant_a = make_tenant()
    tenant_b = make_tenant()
    with get_connection() as conn:
        policy.set_pilot_eligible(conn, tenant_a["tenant_id"], True)
        policy.set_allowed_capabilities(conn, tenant_a["tenant_id"], ["receivables", "inventory"])
        conn.commit()
        # tenant_b never had anything granted.
        effective_a = policy.get_effective_capabilities(conn, tenant_a["tenant_id"])
        effective_b = policy.get_effective_capabilities(conn, tenant_b["tenant_id"])
    assert effective_a["allowed"] == ["inventory", "receivables"]
    assert effective_b["allowed"] == []
    assert effective_b["pilot_eligible"] is False


def test_cleanup_invalidates_old_generations_and_clears_enabled_set(make_tenant):
    tenant = make_tenant()
    with get_connection() as conn:
        policy.set_pilot_eligible(conn, tenant["tenant_id"], True)
        policy.set_allowed_capabilities(conn, tenant["tenant_id"], ["receivables", "payables"])
        conn.commit()
        policy.apply_initial_enabled_selection(conn, tenant["tenant_id"], ["receivables"])
        conn.commit()
        before = policy.get_effective_capabilities(conn, tenant["tenant_id"])
    assert before["enabled"] == ["receivables"]

    with get_connection() as conn:
        result = policy.run_cleanup(conn, tenant["tenant_id"])
        conn.commit()
        after = policy.get_effective_capabilities(conn, tenant["tenant_id"])

    # Both generations a device might have cached are now stale.
    assert result["configuration_revision"] > before["configuration_revision"]
    assert result["cleanup_generation"] > before["cleanup_generation"]
    assert after["configuration_revision"] == result["configuration_revision"]
    assert after["cleanup_generation"] == result["cleanup_generation"]
    # Enabled sync state is cleared...
    assert after["enabled"] == []
    # ...but the admin-granted allowed set and pilot eligibility survive --
    # see run_cleanup()'s docstring for why this is a flagged judgment call.
    assert after["allowed"] == ["payables", "receivables"]
    assert after["pilot_eligible"] is True

    # A device holding the pre-cleanup revision is now stale by construction:
    # this is the invariant SLICE-15's /v2/sync/runs stale-generation check
    # will rely on. Assert it directly here since SLICE-15 doesn't exist yet.
    assert before["configuration_revision"] != after["configuration_revision"]
