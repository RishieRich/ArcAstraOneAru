# Baseline: financial and Smart Excel imports

| Field | Value |
|---|---|
| Status | Current intended behavior |
| Last verified | 2026-08-22 |
| Primary code | spreadsheet parsers, imports router, migrations 0003/0005/0007 |

## Contract

- Authorized users may upload `.xlsx`, `.xlsm`, `.xls`, or `.csv` files up to 5 MB only for a
  tenant they can access. The original file is not stored.
- Known Sales, Purchase, Expense, and Profit & Loss books use the normalized finance model.
- Unfamiliar multi-sheet data uses Smart Excel profiling and remains explicitly generic; it
  does not masquerade as statutory accounting classification.
- Exact files are deduplicated by SHA-256. Vouchers use their Tally GUID where present or a
  deterministic fallback identity.
- Parser reconciliation, warnings, rejected mixed kinds, and duplicate-looking rows remain
  visible rather than being silently discarded.
- Product analytics use normalized item lines with quantity and unit uncertainty preserved.

## Invariants

- Import access is server-side tenant scoped.
- Connector synchronization and spreadsheet imports remain separate ingestion paths.
- Imported analytics must not silently replace the trusted current receivables snapshot.

## Known gaps

- A voucher absent from a later workbook is not automatically removed or treated as cancelled.
- Backend integration tests require a dedicated non-production database before normal CI use.
