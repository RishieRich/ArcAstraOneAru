# Dashboard Table Reference

Snapshot of the live Neon Postgres dev database, pulled directly (not from docs) on **2026-07-12**. Use this to wire up the JSX real-time metrics dashboard — schema + actual current rows for every table that matters.

**Connection:** `backend/.env` → `DATABASE_URL` (Postgres on Neon, `neondb`). Driver: `psycopg` (v3), no ORM. Same connection string works for the dashboard's API layer.

```
postgresql://neondb_owner:********@ep-lucky-poetry-aiv82x9j-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```
(password redacted here — copy the real value from `backend/.env`, don't hardcode it in frontend code)

---

## Core tables (drive the dashboard metrics)

### `bills` — outstanding receivables (the main metric source)

```sql
create table bills (
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
create index bills_tenant_run_idx on bills (tenant_id, sync_run_id);
```

Metrics this drives: total outstanding ₹, overdue buckets (30/60/90d), top debtors, per-party pending amount.

**Actual rows (8 total, live):**

| id | tenant_id | party_name | bill_ref | bill_date | due_date | pending_amount | overdue_days |
|---|---|---|---|---|---|---|---|
| 1 | 88618a2b…(Pawan) | Party A | INV-001 | — | — | 35000.00 | 45 |
| 2 | 88618a2b…(Pawan) | Party B | INV-002 | — | — | 25000.00 | 12 |
| 10 | 5fff73de…(ARQ Code Test) | Alpha Customer | 2 | 2026-04-01 | 2026-04-01 | -508989.00 | 62 |
| 11 | 5fff73de… | Alpha Customer | 2 | 2026-04-01 | 2026-04-01 | -508989.00 | 62 |
| 12 | 5fff73de… | Alpha Customer | 2 | 2026-04-01 | 2026-04-01 | -508989.00 | 62 |
| 13 | 5fff73de… | Alpha Customer | 2 | 2026-04-01 | 2026-04-01 | -508989.00 | 62 |
| 14 | 5fff73de… | Alpha Customer | 2 | 2026-04-01 | 2026-04-01 | -508989.00 | 62 |
| 15 | 5fff73de… | Alpha Customer | 2 | 2026-04-01 | 2026-04-01 | -508989.00 | 62 |

⚠️ **Known bug, not a data artifact you should design around:** `bills` is append-only — every sync run inserts a fresh row instead of updating the existing bill, so rows 10–15 are all the *same* bill duplicated across 6 sync runs. **The dashboard must dedupe by `(tenant_id, party_name, bill_ref)` and take the row from the latest `sync_run_id` (join `sync_runs.started_at` and pick max)** until the backend fix (`magic_mds/DATA_MODEL.md` proposes a natural-key upsert schema with `closed_at`) ships.

---

### `ledgers` — per-customer running balance

```sql
create table ledgers (
  tenant_id uuid not null references tenants(id),
  tally_guid text not null,
  name text not null,
  parent_group text,
  closing_balance numeric(14,2),
  alter_id bigint,
  updated_at timestamptz not null default now(),
  primary key (tenant_id, tally_guid)
);
```

Upserted per sync (PK is `tenant_id + tally_guid`), so unlike `bills` this one is always current — good for a "current balance per customer" tile without dedup logic.

**Actual rows (1 total, live):**

| tenant_id | tally_guid | name | parent_group | closing_balance | alter_id | updated_at |
|---|---|---|---|---|---|---|
| 5fff73de…(ARQ Code Test) | da7e7890…-000000d0 | Alpha Customer | Sundry Debtors | -508989.00 | 210 | 2026-07-12T07:54:05Z |

---

### `sync_runs` — sync health / operational metrics

```sql
create table sync_runs (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  device_id uuid references devices(id),
  started_at timestamptz,
  finished_at timestamptz,
  status text check (status in ('success','failed')),
  counts jsonb,
  error text
);
```

Metrics this drives: last sync time, sync success/failure rate, "is connector alive" health indicator.

**Actual rows (7 total, live — all `success`, none failed yet):**

| id | tenant_id | status | counts | started_at |
|---|---|---|---|---|
| 24a07136… | 5fff73de…(ARQ Code Test) | success | {bills:1, ledgers:1} | 2026-07-12T07:54:05Z |
| c4b4e4b2… | 5fff73de… | success | {bills:1, ledgers:1} | 2026-07-11T18:33:57Z |
| 71984e6c… | 5fff73de… | success | {bills:1, ledgers:1} | 2026-07-11T17:45:47Z |
| 406848c6… | 5fff73de… | success | {bills:1, ledgers:1} | 2026-07-11T17:44:37Z |
| d16f790d… | 5fff73de… | success | {bills:1, ledgers:1} | 2026-07-11T13:41:55Z |
| 4ff54606… | 5fff73de… | success | {bills:1, ledgers:1} | 2026-07-11T13:39:06Z |
| b79614d5… | 88618a2b…(Pawan) | success | {bills:2} | 2026-07-11T09:46:45Z |

---

## Auxiliary tables (config/security — not metrics, but needed for context/joins)

### `tenants` — one row per client company

```sql
create table tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tally_company_guid text unique,
  created_at timestamptz not null default now()
);
```

**Actual rows (2 total, live):**

| id | name | tally_company_guid | created_at |
|---|---|---|---|
| 5fff73de-ae3c-4e2c-ae58-65e5ec1dfc92 | ARQ Code Test | da7e7890-ba54-455d-9dc6-93fc3f0ca2d8 | 2026-07-11T13:38:22Z |
| 88618a2b-1a99-4372-a8f3-61de554c1695 | Pawan Engineering Works | test-guid-0001 | 2026-07-11T09:46:45Z |

Use `tenants.id` as the tenant selector / scoping key for every dashboard query — this whole system is multi-tenant.

### `devices` — registered Tally-connector machines (auth)

```sql
create table devices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  token_hash text unique not null,
  machine_label text,
  last_seen_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
```

**Actual rows (1 total, live):** 1 device, `machine_label: "LAPTOP-O0QVTNOB"`, tenant `5fff73de…(ARQ Code Test)`, `last_seen_at: 2026-07-12T07:54:02Z`, not revoked. Useful for a "connector last seen" tile.

### `pairing_codes` — single-use onboarding codes

No dashboard/metric value — pure device-pairing plumbing. Not detailed here; see `backend/migrations/0001_target_schema.sql` if needed.

---

## Notes for the JSX dashboard build

- **No ORM** — backend uses raw `psycopg` SQL (see `backend/app/routers/sync.py` for the exact upsert/insert statements).
- **Dedup `bills` in your query**, not in the frontend, e.g.:
  ```sql
  select distinct on (tenant_id, party_name, bill_ref) *
  from bills
  join sync_runs on sync_runs.id = bills.sync_run_id
  where bills.tenant_id = $1
  order by tenant_id, party_name, bill_ref, sync_runs.started_at desc;
  ```
- A schema fix for the `bills` duplication is proposed (not yet applied) in `magic_mds/DATA_MODEL.md` — switches to natural-key upsert with `closed_at` for soft-close. Worth checking before you build dedup logic that migration might make obsolete.
- All money fields are `numeric(14,2)` — watch sign conventions (`ledgers.closing_balance` and some `bills.pending_amount` values are negative, representing credit-side balances from Tally).
