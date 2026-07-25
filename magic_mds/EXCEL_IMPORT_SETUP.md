# Excel Imports — Neon and Deployment Setup

This is the owner runbook for the optional sales, purchase and expense workbook
feature added on 2026-07-25. The Tally connector and receivables tables are
unchanged.

## What the feature accepts

- `.xlsx` files up to 5 MB.
- Tally-style exports containing a `Ledger Entries` sheet.
- `Vouchers` and `Inventory Entries` are used when present.
- Upload sales, purchases and expenses as separate workbooks.

ARQ checks sheet signatures and Tally voucher types before writing. A workbook
uploaded through the wrong option is rejected. Custom journal/payment voucher
names can use the selected Expense option as the tie-breaker.

The original workbook is **not stored**. ARQ stores normalized voucher totals and
item/category lines. Exact file re-uploads are idempotent, and vouchers with the
same Tally GUID are updated instead of duplicated.

The dashboard zero-fills every calendar month between the earliest and latest
uploaded dates. A one-year workbook therefore produces a complete one-year chart,
including inactive months. Estimated operating profit/loss is shown only after all
three book types are present; partial uploads are labelled as partial results.

## 1. Apply the Neon migration first

Do this **before deploying the backend code**, because the new dashboard queries
the new tables.

From PowerShell at the repository root:

```powershell
cd backend
..\.venv\Scripts\python.exe migrations\run_migration.py
```

The runner applies every migration in filename order. The migrations are
idempotent. The Excel data model and dashboard-access additions are:

```text
migrations/0003_financial_imports.sql
migrations/0004_dashboard_user_access.sql
```

This creates:

- `financial_imports` — import audit trail and file hash.
- `financial_transactions` — one current normalized row per Tally voucher.
- `financial_transaction_lines` — item, expense-category and tax detail.
- `dashboard_users.all_tenants` — explicit owner-wide access.
- `dashboard_user_tenants` — per-company grants for client logins.

No existing table is dropped or truncated. Migration 0004 additively alters
`dashboard_users`: pre-existing accounts become explicit all-company owners and
new accounts default to no access.

If you prefer the Neon SQL Editor, open
`backend/migrations/0003_financial_imports.sql` and
`backend/migrations/0004_dashboard_user_access.sql`, paste each complete file in
order, and run them once against the production database.

## 2. Deploy

No new environment variable is required.

1. Review and commit the code when ready.
2. Push to `main`.
3. Deploy the two existing Vercel projects manually. Git auto-deploy did not
   trigger during the 2026-07-25 production release:

   ```powershell
   # Backend: run from the repository root. The project already has
   # Root Directory = backend.
   npx vercel@latest link --project arcastraone --yes
   npx vercel@latest --prod --yes

   # Frontend
   cd frontend
   npx vercel@latest --prod --yes
   ```

4. Do not run the backend deployment from inside `backend/`; Vercel would combine
   that directory with the configured Root Directory and look for
   `backend/backend`.
5. Remember that the frontend's `VITE_API_BASE_URL` remains a build-time value.

The backend adds `openpyxl` to both dependency lists that Vercel may read:

- `backend/pyproject.toml`
- `backend/requirements.txt`

## 3. Verify production

First verify the normal backend paths:

```powershell
Invoke-RestMethod https://arcastraone.vercel.app/health
Invoke-RestMethod https://arcastraone.vercel.app/health/db
```

Then:

1. Log in to the dashboard.
2. Pick a company.
3. Click **Upload Excel**.
4. Use the matching Sales, Purchases or Expenses tile.
5. After import, open **Sales & spending**.
6. Confirm the total, full date range, complete-tenure chart, Sales/Purchase/Expense
   lines, monthly profit/loss bars, performance highs/lows, category/item mix,
   counterparties, period table and import history.
7. Re-upload the exact same file once. The UI should report that it was already
   imported and totals must not double.
8. Switch back to **Receivables** and confirm the original Tally dashboard is
   unchanged.

Optional metadata-only SQL checks in Neon:

```sql
select detected_kind, transaction_count, min_date, max_date, created_at
from financial_imports
order by created_at desc
limit 10;

select kind, count(*)
from financial_transactions
group by kind
order by kind;
```

These checks avoid displaying party names or amounts.

## Operating notes

- Dashboard users are scoped. New users cannot list, view, upload to, or ask AI
  about a company until `grant-dashboard-access` adds that tenant.
- A file/type mismatch is rejected before any insert.
- Sales, purchase and expense totals are gross voucher values. Tax is also shown
  separately where Tally exposes tax ledger lines.
- With all three book types, **estimated operating result** is
  `sales - purchases - expenses`. Positive and negative monthly results are
  summarized separately as profit/loss periods. It is still an operating estimate,
  not a statutory P&L; stock adjustments, depreciation, finance cost, tax
  provisions and missing uploads may change the accounting result.
- With one or two book types, the same arithmetic is labelled only as a **partial
  uploaded result**, never profit/loss.
- Re-exporting an existing voucher updates it by Tally GUID. A voucher removed
  from a later workbook is not automatically deleted; removal tooling should be
  added before using imports as a cancellation ledger.
- Legacy `.xls`, mixed sales-and-purchase workbooks, password-protected files and
  files above 5 MB are rejected with a user-facing error.

## Safe rollback

If a deploy has a problem, roll the application code back but leave the three
additive tables in Neon. They do not affect connector sync. Do not drop tables
while investigating because import history and normalized transactions would be
lost.
