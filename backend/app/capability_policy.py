"""Capability policy and generation schema (Change 003 SLICE-08).

Backend-authoritative allowed/enabled Tally-sync capability sets per tenant
workspace, plus the two counters other Change-003 protocol layers pin at
sync-run creation: ``configuration_revision`` (bumped whenever the allowed or
enabled capability set changes) and ``cleanup_generation`` (bumped by
company-data cleanup). See
``docs/specs/changes/003-essential-tally-data-foundation/contracts/protocol.md``
and ADR-004/ADR-005.

Covers:
    REQ-041 -- Backend-authoritative sets
    REQ-042 -- Initial selection
    REQ-043 -- Post-pairing authority
    REQ-044 -- Backend enforcement
    REQ-045 -- Multiple-device consistency
    REQ-046 -- Supporting data (capability list is customer-facing only;
               supporting-master extraction is a connector/extraction-layer
               concern layered on top, not a stored policy row)
    REQ-047 -- Explicit pilot eligibility

This module owns schema-adjacent read/write primitives only. It has no
knowledge of HTTP, admin auth, or pairing flows -- those are SLICE-10/11.
Every write function takes an open connection/transaction and leaves commit
to the caller, so a caller can compose a policy change with other writes
inside one atomic transaction.
"""
from __future__ import annotations

from typing import Iterable

from psycopg import Connection

# DEC-007's customer-facing capability list. "Sync all available business
# data" is a connector-side convenience that selects every code below; it is
# not itself a stored capability code. Keep this in sync with the CHECK
# constraint in migrations/0009_capability_policy.sql.
CAPABILITIES = frozenset(
    {
        "ledgers_accounts",
        "receivables",
        "payables",
        "sales",
        "purchases",
        "receipts_payments",
        "inventory",
    }
)


class UnknownCapabilityError(ValueError):
    """Raised when a caller names a capability code outside CAPABILITIES."""


class NotAllowedError(ValueError):
    """Raised when a caller asks to enable a capability outside the allowed set."""


class NotEligibleError(ValueError):
    """Raised when a workspace has not been explicitly marked pilot-eligible (REQ-047)."""


def _validate_capabilities(capabilities: Iterable[str]) -> set[str]:
    codes = set(capabilities)
    unknown = codes - CAPABILITIES
    if unknown:
        raise UnknownCapabilityError(f"unknown capability code(s): {sorted(unknown)}")
    return codes


def ensure_tenant_configuration(conn: Connection, tenant_id) -> None:
    """Idempotently create the tenant's policy/generation row.

    pilot_eligible/configuration_revision/cleanup_generation all default to
    their off/zero state -- this never grants anything.
    """
    with conn.cursor() as cur:
        cur.execute(
            "insert into tenant_configuration (tenant_id) values (%s) "
            "on conflict (tenant_id) do nothing",
            (tenant_id,),
        )


def get_configuration(conn: Connection, tenant_id) -> dict:
    """Return {pilot_eligible, configuration_revision, cleanup_generation}.

    A tenant with no row yet (pre-migration or never touched) reads as the
    same default-off/zero state ensure_tenant_configuration() would create --
    callers never need to special-case "row missing" as an error.
    """
    with conn.cursor() as cur:
        cur.execute(
            "select pilot_eligible, configuration_revision, cleanup_generation "
            "from tenant_configuration where tenant_id = %s",
            (tenant_id,),
        )
        row = cur.fetchone()
    if row is None:
        return {"pilot_eligible": False, "configuration_revision": 0, "cleanup_generation": 0}
    pilot_eligible, configuration_revision, cleanup_generation = row
    return {
        "pilot_eligible": pilot_eligible,
        "configuration_revision": configuration_revision,
        "cleanup_generation": cleanup_generation,
    }


def get_effective_capabilities(conn: Connection, tenant_id) -> dict:
    """Return the allowed/enabled sets and current generations for one tenant.

    A tenant with no policy rows at all -- including one that has never been
    migrated into tenant_capability_policy -- reports empty allowed/enabled
    sets rather than raising: absence of a row means "not allowed", never an
    implicit grant (REQ-041/044).
    """
    config = get_configuration(conn, tenant_id)
    with conn.cursor() as cur:
        cur.execute(
            "select capability, is_allowed, is_enabled from tenant_capability_policy "
            "where tenant_id = %s",
            (tenant_id,),
        )
        rows = cur.fetchall()
    allowed = sorted(cap for cap, is_allowed, _ in rows if is_allowed)
    enabled = sorted(cap for cap, _, is_enabled in rows if is_enabled)
    return {**config, "allowed": allowed, "enabled": enabled}


def _bump_configuration_revision(conn: Connection, tenant_id) -> int:
    with conn.cursor() as cur:
        cur.execute(
            "update tenant_configuration "
            "set configuration_revision = configuration_revision + 1, updated_at = now() "
            "where tenant_id = %s returning configuration_revision",
            (tenant_id,),
        )
        row = cur.fetchone()
    if row is None:
        raise RuntimeError(
            f"tenant_configuration row missing for {tenant_id}; "
            "call ensure_tenant_configuration first"
        )
    return row[0]


def set_pilot_eligible(conn: Connection, tenant_id, eligible: bool) -> None:
    """Administratively grant/revoke pilot eligibility (REQ-047).

    This alone never enables a capability or downloads/pairs a connector --
    it only unlocks apply_initial_enabled_selection() below.
    """
    ensure_tenant_configuration(conn, tenant_id)
    with conn.cursor() as cur:
        cur.execute(
            "update tenant_configuration set pilot_eligible = %s, updated_at = now() "
            "where tenant_id = %s",
            (eligible, tenant_id),
        )


def set_allowed_capabilities(conn: Connection, tenant_id, capabilities: Iterable[str]) -> int:
    """Administratively replace the allowed set (REQ-041).

    Disables anything no longer allowed -- an enabled-but-disallowed row
    would violate the schema's own is_enabled-implies-is_allowed constraint.
    Returns the new configuration_revision. Caller commits.
    """
    codes = _validate_capabilities(capabilities)
    ensure_tenant_configuration(conn, tenant_id)
    with conn.cursor() as cur:
        cur.execute(
            "select capability from tenant_capability_policy where tenant_id = %s",
            (tenant_id,),
        )
        existing = {row[0] for row in cur.fetchall()}
        for capability in codes - existing:
            cur.execute(
                "insert into tenant_capability_policy (tenant_id, capability, is_allowed) "
                "values (%s, %s, true)",
                (tenant_id, capability),
            )
        for capability in codes & existing:
            cur.execute(
                "update tenant_capability_policy set is_allowed = true, updated_at = now() "
                "where tenant_id = %s and capability = %s",
                (tenant_id, capability),
            )
        for capability in existing - codes:
            cur.execute(
                "update tenant_capability_policy "
                "set is_allowed = false, is_enabled = false, updated_at = now() "
                "where tenant_id = %s and capability = %s",
                (tenant_id, capability),
            )
    return _bump_configuration_revision(conn, tenant_id)


def apply_initial_enabled_selection(conn: Connection, tenant_id, capabilities: Iterable[str]) -> int:
    """Atomically apply the operator-chosen initial enabled subset (REQ-042).

    All-or-nothing: raises NotAllowedError without writing anything if any
    requested capability is not currently in the allowed set, and raises
    NotEligibleError if the workspace has not been marked pilot-eligible
    (REQ-047). Returns the new configuration_revision. Caller commits.
    """
    codes = _validate_capabilities(capabilities)
    config = get_configuration(conn, tenant_id)
    if not config["pilot_eligible"]:
        raise NotEligibleError(f"tenant {tenant_id} is not pilot-eligible")
    allowed = set(get_effective_capabilities(conn, tenant_id)["allowed"])
    not_allowed = codes - allowed
    if not_allowed:
        raise NotAllowedError(
            f"capability(ies) not allowed for tenant {tenant_id}: {sorted(not_allowed)}"
        )
    with conn.cursor() as cur:
        for capability in codes:
            cur.execute(
                "update tenant_capability_policy set is_enabled = true, updated_at = now() "
                "where tenant_id = %s and capability = %s",
                (tenant_id, capability),
            )
    return _bump_configuration_revision(conn, tenant_id)


def run_cleanup(conn: Connection, tenant_id) -> dict:
    """Clear enabled capability state and bump both generations (REQ-055).

    After cleanup, the enabled set is empty and any device holding the prior
    configuration_revision/cleanup_generation is stale and must re-fetch
    /v2/devices/config before it can sync again (REQ-045). The allowed set
    and pilot_eligible are an administrative access grant analogous to the
    tenant/access/device boundary REQ-055 says cleanup preserves "unless
    separately approved" -- they are left intact here so a re-authenticated
    workspace does not silently lose ARQ-admin-granted permissions it never
    asked to have revoked. This interpretation is a judgment call, not a
    literal spec quote: flag it for owner confirmation before SLICE-54's
    full-boundary cleanup audit, since SLICE-54 is the authority on whether
    "capability state" should also mean the allowed set.

    Caller commits.
    """
    ensure_tenant_configuration(conn, tenant_id)
    with conn.cursor() as cur:
        cur.execute(
            "update tenant_capability_policy set is_enabled = false, updated_at = now() "
            "where tenant_id = %s and is_enabled",
            (tenant_id,),
        )
        cur.execute(
            "update tenant_configuration "
            "set configuration_revision = configuration_revision + 1, "
            "cleanup_generation = cleanup_generation + 1, updated_at = now() "
            "where tenant_id = %s "
            "returning configuration_revision, cleanup_generation",
            (tenant_id,),
        )
        configuration_revision, cleanup_generation = cur.fetchone()
    return {
        "configuration_revision": configuration_revision,
        "cleanup_generation": cleanup_generation,
    }
