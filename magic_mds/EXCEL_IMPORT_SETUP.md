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

## 1. Apply the Neon migration first

Do this **before deploying the backend code**, because the new dashboard queries
the new tables.

From PowerShell at the repository root:

```powershell
cd backend
..\.venv\Scripts\python.exe migrations\run_migration.py
```

The runner applies every migration in filename order. The older migrations are
idempotent, and the new file is:

```text
migrations/0003_financial_imports.sql
```

This creates:

- `financial_imports` — import audit trail and file hash.
- `financial_transactions` — one current normalized row per Tally voucher.
- `financial_transaction_lines` — item, expense-category and tax detail.

No existing table is dropped, truncated or altered.

If you prefer the Neon SQL Editor, open
`backend/migrations/0003_financial_imports.sql`, paste the complete file, and run
it once against the production database.

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
6. Confirm the total, date range, monthly chart, category/item mix, counterparties
   and import history.
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

- The dashboard token authorizes imports, just as it authorizes viewing all
  companies in the current dashboard security model.
- A file/type mismatch is rejected before any insert.
- Sales, purchase and expense totals are gross voucher values. Tax is also shown
  separately where Tally exposes tax ledger lines.
- **Net flow** is `sales - purchases - expenses`. It is intentionally not labelled
  profit because an uploaded set may not be a complete P&L.
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
