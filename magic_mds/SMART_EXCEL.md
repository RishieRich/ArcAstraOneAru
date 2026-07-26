# Smart Excel — Multi-sheet Business Analytics

## Product boundary

Smart Excel accepts `.xlsx`, `.xlsm`, legacy `.xls` and `.csv` files up to 5 MB.
Every active managed or free-trial dashboard user gets the same capability through the
existing per-tenant access check. Waitlisted leads have no dashboard token or tenant and
continue to see the explicitly labelled sample-data experience.

There are two deliberate paths:

1. Familiar Tally and finance layouts continue through `spreadsheet_import.py`. Sales,
   Purchase, Expense and P&L semantics, product lines, tax reconciliation and stable voucher
   identities remain unchanged.
2. If Smart detect cannot safely classify a finance layout, `smart_spreadsheet.py` inspects
   every useful visible sheet. It finds a header, types date/number/category/identifier
   columns, classifies a broad business domain and creates chart-ready KPIs. It does not call
   a generic metric Sales, Profit, Expense or GST payable unless the source labels support it.

When a known finance workbook contains additional useful sheets, the finance sheets are
normalized normally and only the extra sheets enter the generic Smart Excel profile. This
prevents parent/detail voucher rows from being added twice.

## What is persisted

Migration `0007_smart_excel_datasets.sql` adds:

- `smart_imports`: tenant-scoped audit envelope, SHA-256, counts and warnings.
- `smart_datasets`: one typed, chart-ready profile per useful sheet.
- `smart_rows`: JSONB typed row values for Ask ARQ, scoped to one dataset and tenant.

The original file is never stored. An exact re-upload is a successful no-op through
`unique (tenant_id, file_sha256)`. Printed total rows are excluded. Repeated rows inside an
unfamiliar table are retained and visibly flagged because identical legitimate records cannot
be distinguished safely without a business identifier.

The dashboard and Ask ARQ use only the latest generic workbook snapshot, so uploading a
replacement does not stack old generic totals into the visible analytics. Finance vouchers
retain their existing GUID/business-key upsert behavior.

## Analysis limits

- 5 MB compressed upload.
- Existing zip-bomb limits: 100 MB expanded and 600 archive members.
- First 24 sheets, 120 columns, 20,000 rows per sheet, 40,000 rows per workbook.
- Hidden and non-tabular sheets are skipped and reported.
- Only visible, typed source facts are used; low confidence and missing date/metric coverage
  are shown as honest data notes.

## Deployment order

Do not deploy the matching backend until the owner approves and applies:

```powershell
cd backend
..\.venv\Scripts\python.exe migrations\run_migration.py
```

The migration is additive and idempotent. After it is present, deploy backend and frontend,
then verify `/health`, `/health/db`, one known Pawan-style sales workbook and one unfamiliar
multi-sheet GST/operations workbook.
