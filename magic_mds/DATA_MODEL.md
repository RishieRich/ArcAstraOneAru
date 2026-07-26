# ARQ data model

This document records the current data-state model. The implementation and
deployment details for cleanup and deduplication are in
`DATA_CLEANUP_AND_DEDUP.md`.

## Tenant and identity tables

- `tenants` — one client company; `tally_company_guid` is globally unique.
- `devices` — connector registrations; only token hashes are stored.
- `pairing_codes` — one-time, expiring registration codes.
- `dashboard_users` / `dashboard_user_tenants` — dashboard identity and
  per-company access. Migration 0006 adds `account_type`; only `free_trial`
  accounts count toward the ten-place public capacity.
- `trial_waitlist` — name, company, normalized email, status and timestamps for
  overflow public signups. Waitlisted passwords are not stored.

These rows are intentionally preserved by the dashboard's Start fresh action.

## Connector data

- `sync_runs` — append-only audit row per connector attempt. Reusing a run ID is
  idempotent.
- `ledgers` — one current row per `(tenant_id, tally_guid)`, updated on sync.
- `bills` — after migration 0005, one historical/current row per
  `(tenant_id, source_key)`. `first_sync_run_id` and `last_sync_run_id` retain
  lineage; `closed_at is null` means currently outstanding.

Migration 0005 also installs a zero-downtime insert trigger for the older deployed
backend. It fills the new required fields until the matching application release
is deployed; new writes that already contain `source_key` pass through unchanged.

Tally receivable signs remain raw in SQL. Dashboard reads use `abs()` when
presenting outstanding amounts.

## Optional workbook data

- `financial_imports` — upload audit metadata and per-tenant SHA-256 identity.
- `financial_transactions` — one normalized current row per
  `(tenant_id, kind, source_key)`.
- `financial_transaction_lines` — item, category and tax detail; cascades when a
  normalized transaction is removed.

Workbook files are never stored. Exact files are idempotent, re-exported Tally
GUIDs upsert, and GUID-less vouchers use a stable semantic fallback. Workbook
absence is not yet a cancellation instruction.

Migration 0006 allows `profit_loss` on the import audit envelope. Its normalized
child transactions remain constrained to Sales, Purchase and Expense.

## Reset boundary

Start fresh deletes connector facts and workbook facts, including audit history,
but keeps tenant identity, user access and device registration. The existing
device can therefore populate a genuinely fresh snapshot after cleanup.

## Migration status

- 0001: connector target schema
- 0002: dashboard users
- 0003: financial imports
- 0004: per-company dashboard access
- 0005: current-state bills + legacy Excel key canonicalization
- 0006: public trial account type, waitlist and Profit & Loss import envelope

Migration 0005 was explicitly approved, applied to the configured Neon database,
verified and deployed on 2026-07-26. Migration 0006 was explicitly approved,
applied, verified and deployed on 2026-07-26.
