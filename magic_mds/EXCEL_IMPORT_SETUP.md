# Excel Imports — Neon and Deployment Setup

This is the owner runbook for the optional sales, purchase and expense workbook
feature added on 2026-07-25. The Tally connector and receivables tables are
unchanged.

## What the feature accepts

- `.xlsx` files up to 5 MB.
- Standard Tally exports containing a `Ledger Entries` sheet; `Vouchers` and
  `Inventory Entries` are used when present.
- Single-sheet sales, purchase or expense registers with Date, Particulars and
  Value/Amount columns. Common aliases such as Buyer/Customer, Quantity/Qty/Alt.
  Units, Rate/Price, Gross Total and GST columns are detected automatically.
- Concatenated register sections may shift quantity between columns. Detection is
  performed per detail row by reconciling `quantity * rate` with line value.
- Upload sales, purchases and expenses as separate workbooks.

ARQ checks sheet signatures and Tally voucher types before writing. A workbook
uploaded through the wrong option is rejected. Custom journal/payment voucher
names can use the selected Expense option as the tie-breaker.

For flat registers, dated rows become vouchers and the following undated rows
become product lines until the next dated row. Footer totals are checked against
visible voucher rows. A mismatch is shown to the user and only visible rows are
imported; ARQ never invents missing transactions to force a total to reconcile.

The original workbook is **not stored**. ARQ stores normalized voucher totals and
item/category lines. Exact file re-uploads are idempotent, and vouchers with the
same Tally GUID are updated instead of duplicated. GUID-less vouchers use date,
voucher number and party rather than export row order, so a differently sorted
re-export also updates instead of stacking.

Some flat registers do not include a voucher number or GUID. ARQ then uses a
stable fingerprint of date, party, amounts and normalized product lines.
Identical-looking transactions are retained with distinct occurrence keys and
flagged for review because two identical invoices cannot safely be distinguished
from an accidental duplicate without a source identity.

The dashboard zero-fills every calendar month between the earliest and latest
uploaded dates. A one-year workbook therefore produces a complete one-year chart,
including inactive months. Estimated operating profit/loss is shown only after all
three book types are present; partial uploads are labelled as partial results.

Normalized item lines drive the Product performance section: product value,
quantity coverage, weighted average rate, transaction/customer counts, value
share and top customer. Unknown units remain blank instead of being guessed.

Every completed Ask ARQ answer offers **Create one-page report**. Questions that
explicitly mention report, one-page or PDF open it automatically. The report uses
deterministic dashboard metrics for KPIs and both charts, uses the AI answer only
as the narrative summary, and prints/saves as one A4 landscape page. No report
file is stored on the backend.

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
migrations/0005_bill_current_state.sql
```

This creates:

- `financial_imports` — import audit trail and file hash.
- `financial_transactions` — one current normalized row per Tally voucher.
- `financial_transaction_lines` — item, expense-category and tax detail.
- `dashboard_users.all_tenants` — explicit owner-wide access.
- `dashboard_user_tenants` — per-company grants for client logins.
- current-state bill identity plus canonical GUID-less Excel voucher keys.

No existing table is dropped or truncated. Migration 0004 additively alters
`dashboard_users`: pre-existing accounts become explicit all-company owners and
new accounts default to no access.

If you prefer the Neon SQL Editor, open
`backend/migrations/0003_financial_imports.sql` and
`backend/migrations/0004_dashboard_user_access.sql`, and
`backend/migrations/0005_bill_current_state.sql`, paste each complete file in
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
   counterparties, Product performance, period table and import history.
7. Re-upload the exact same file once. The UI should report that it was already
   imported and totals must not double.
8. Export the same vouchers in a different order (where practical), upload it,
   and confirm totals still do not double.
9. Switch back to **Receivables** and confirm the original Tally dashboard is
   unchanged.
10. Ask ARQ a product or management question, create the one-page report and use
    Print / Save PDF. Confirm the report stays to one A4 landscape page and its
    KPI/chart values match the dashboard.

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
- Adaptive-register uploads return the detected format, column mapping, duplicate
  review count and reconciliation warnings in the API response.
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
