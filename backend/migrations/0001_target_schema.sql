-- ARQ Tally Connector — M3 schema migration
--
-- Idempotent by design: safe to run against a fresh database AND against the
-- already-seeded Neon dev DB (tenants/devices/sync_runs/bills exist there
-- with Pawan test data). Every statement is create-if-missing / add-if-missing.
-- Never drops or truncates existing tables.

-- ── tenants (already matches target shape in dev; statement is a no-op there) ──
create table if not exists tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tally_company_guid text unique,
  created_at timestamptz not null default now()
);

-- ── pairing_codes (new table) ──
create table if not exists pairing_codes (
  code_hash text primary key,
  tenant_id uuid not null references tenants(id),
  expires_at timestamptz not null,
  used_at timestamptz
);

-- ── devices (existing table — add the columns dev is missing) ──
create table if not exists devices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  token_hash text unique not null,
  machine_label text,
  last_seen_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
alter table devices add column if not exists revoked_at timestamptz;

-- ── sync_runs (existing table — add device_id / finished_at / error) ──
create table if not exists sync_runs (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  device_id uuid references devices(id),
  started_at timestamptz,
  finished_at timestamptz,
  status text check (status in ('success','failed')),
  counts jsonb,
  error text
);
alter table sync_runs add column if not exists device_id uuid references devices(id);
alter table sync_runs add column if not exists finished_at timestamptz;
alter table sync_runs add column if not exists error text;

-- ── ledgers (new table) ──
create table if not exists ledgers (
  tenant_id uuid not null references tenants(id),
  tally_guid text not null,
  name text not null,
  parent_group text,
  closing_balance numeric(14,2),
  alter_id bigint,
  updated_at timestamptz not null default now(),
  primary key (tenant_id, tally_guid)
);

-- ── bills (existing table — add party_guid + the lookup index) ──
create table if not exists bills (
  id bigserial primary key,
  tenant_id uuid not null references tenants(id),
  sync_run_id uuid not null references sync_runs(id),
  party_guid text,
  party_name text not null,
  bill_ref text,
  bill_date date,
  due_date date,
  pending_amount numeric(14,2) not null,
  overdue_days int
);
alter table bills add column if not exists party_guid text;
create index if not exists bills_tenant_run_idx on bills (tenant_id, sync_run_id);
