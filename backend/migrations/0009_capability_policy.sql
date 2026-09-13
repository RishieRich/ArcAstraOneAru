-- Change 003 SLICE-08: capability policy and generation schema.
--
-- Backend-authoritative allowed/enabled Tally-sync capability sets per tenant
-- workspace (REQ-041), plus the two counters the v2 sync protocol pins at run
-- creation (contracts/protocol.md, ADR-004): configuration_revision (bumped
-- whenever the allowed/enabled set changes -- REQ-045) and cleanup_generation
-- (bumped by company-data cleanup -- REQ-055). pilot_eligible defaults off
-- per REQ-047: authentication/free-trial status alone never grants connector
-- access.
--
-- Idempotent by design, matching 0001/0004/0006: safe to run twice against
-- the same database. Never drops or truncates existing tables.

create table if not exists tenant_configuration (
  tenant_id uuid primary key references tenants(id) on delete cascade,
  pilot_eligible boolean not null default false,
  configuration_revision bigint not null default 0,
  cleanup_generation bigint not null default 0,
  updated_at timestamptz not null default now()
);

-- Backfill a default (ineligible, revision 0) row for every tenant that
-- predates this migration, so get_effective_capabilities() never has to
-- special-case a missing row for an existing tenant.
insert into tenant_configuration (tenant_id)
select id from tenants
on conflict (tenant_id) do nothing;

-- DEC-007's customer-facing capability list. "Sync all available business
-- data" is a connector-side convenience that selects every code below; it is
-- not itself a stored capability code. Keep this list in sync with
-- backend/app/capability_policy.py's CAPABILITIES constant.
create table if not exists tenant_capability_policy (
  tenant_id uuid not null references tenants(id) on delete cascade,
  capability text not null check (capability in (
    'ledgers_accounts',
    'receivables',
    'payables',
    'sales',
    'purchases',
    'receipts_payments',
    'inventory'
  )),
  is_allowed boolean not null default false,
  is_enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (tenant_id, capability),
  -- REQ-043/044: a capability can never be enabled without also being
  -- allowed -- there is no code path where enabling implicitly grants
  -- authorization.
  constraint tenant_capability_policy_enabled_requires_allowed
    check (not is_enabled or is_allowed)
);
