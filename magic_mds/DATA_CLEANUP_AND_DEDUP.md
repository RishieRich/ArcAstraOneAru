# Data cleanup and duplicate protection

Code prepared on 2026-07-26. Migration `0005_bill_current_state.sql` was applied
to the configured Neon `neondb` on 2026-07-26 after explicit owner approval.
The matching backend and frontend code has not been deployed.

Application verification used metadata only: 13 historical bill rows became four
current rows, duplicate bill groups became zero, all identity/lineage fields were
valid, both required indexes existed, and all 68 financial transactions remained.
The backend suites completed with 29 passing tests and left no test tenants.

## Start-fresh behavior

The dashboard exposes **Start fresh** for the selected company. It is deliberately
hard to trigger:

1. The user must already have dashboard access to that tenant.
2. The modal explains what is deleted and what is preserved.
3. The exact company name must be typed, including case.
4. The current dashboard password/PIN must be verified by the backend.
5. The irreversible-action checkbox must be selected.

`DELETE /v1/dashboard/data/{tenant_id}` removes, in one transaction:

- `smart_rows`
- `smart_datasets`
- `smart_imports`
- `financial_transaction_lines`
- `financial_transactions`
- `financial_imports`
- `bills`
- `ledgers`
- `sync_runs`

It preserves the tenant/company row, dashboard user and access grant, pairing
history, and registered connector devices. This means the existing connector can
push a fresh snapshot and the same user can upload fresh workbooks without being
registered again.

Sync, Excel import and cleanup take the same tenant-scoped Postgres advisory
transaction lock. A cleanup cannot interleave with one of those writers and leave
a half-old/half-new dataset.

### Deployment compatibility

Migration 0005 includes `bills_current_state_compat_trigger` for the interval
between migrating Neon and deploying the new backend. The older backend does not
supply the three new required bill identity/lineage fields. The trigger derives
them and updates an existing referenced bill instead of allowing a unique-key
failure. New code supplies `source_key`, so the trigger immediately returns and
the application's full snapshot upsert/soft-close logic takes over.

The bridge was transaction-tested with two old-style inserts for the same bill:
one row remained with correct first/last sync lineage, and all temporary test rows
were rolled back.

## Tally duplicate protection

Migration 0005 adds a stable `source_key`, first/last sync references and
`closed_at` to `bills`.

- Bills with the same party identity + bill reference are updated in place.
- A reference-less bill uses party, dates and amount as a documented fallback.
- Bills absent from a later successful complete snapshot are soft-closed.
- Dashboard queries read only `closed_at is null`.
- `sync_runs` remains the append-only connector audit trail.
- Reusing the same `sync_run_id` remains idempotent.

The migration collapses existing referenced duplicates to their latest state and
keeps their earliest sync as `first_sync_run_id`. Reference-less legacy rows are
kept with unique keys because collapsing them without a reliable identity could
destroy legitimate separate bills; the next successful snapshot closes those
legacy rows and establishes current keys.

## Excel duplicate protection

There are three layers:

- Exact workbook bytes: unique `(tenant_id, file_sha256)` returns
  `duplicate: true` without writing totals again.
- Same vouchers in a re-export: unique `(tenant_id, kind, source_key)` upserts by
  normalized Tally GUID.
- GUID-less vouchers: the fallback key uses kind + date + voucher number + party,
  not `VoucherSeq`, because row sequence can change between exports.

Repeated copies of one voucher inside a single workbook are collapsed before its
item/category lines are stored. Migration 0005 also canonicalizes earlier
GUID-less keys and removes rows that only differed because export sequence changed.

A voucher missing from a later Excel workbook is still not treated as cancelled.
That requires an explicit workbook-snapshot reconciliation design; see the open
item in `AGENTS.md`.

## Deployment order

1. Review `backend/migrations/0005_bill_current_state.sql`.
2. Apply migrations from `backend/` (completed for the configured Neon database
   on 2026-07-26):

   ```powershell
   ..\.venv\Scripts\python.exe migrations\run_migration.py
   ```

3. Deploy the backend.
4. Deploy the frontend.
5. Test one non-production/throwaway tenant:
   - push the same bill in two different runs and confirm one open bill row;
   - push an empty successful snapshot and confirm the old bill is closed;
   - re-upload an exact workbook and confirm totals do not change;
   - use Start fresh and confirm data disappears while the device/user remain.
