-- Optional Excel imports for sales, purchases and expenses.
--
-- The original Tally receivables tables remain untouched. Upload metadata is
-- retained for an audit trail, while vouchers are upserted by their Tally GUID
-- (or a stable fallback key) so exporting the same period again updates it
-- instead of stacking duplicate business totals.

create table if not exists financial_imports (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  uploaded_by text not null,
  source_filename text not null,
  file_sha256 text not null,
  detected_kind text not null check (detected_kind in ('sales', 'purchase', 'expense')),
  classification_confidence numeric(4,3) not null,
  classification_reason text not null,
  transaction_count int not null default 0,
  line_count int not null default 0,
  skipped_rows int not null default 0,
  min_date date,
  max_date date,
  created_at timestamptz not null default now(),
  unique (tenant_id, file_sha256)
);
create index if not exists financial_imports_tenant_created_idx
  on financial_imports (tenant_id, created_at desc);

create table if not exists financial_transactions (
  id bigserial primary key,
  tenant_id uuid not null references tenants(id),
  latest_import_id uuid not null references financial_imports(id),
  source_key text not null,
  source_row int,
  kind text not null check (kind in ('sales', 'purchase', 'expense')),
  txn_date date,
  voucher_number text,
  voucher_type text,
  party_name text,
  category text,
  gross_amount numeric(18,2) not null,
  net_amount numeric(18,2) not null,
  tax_amount numeric(18,2) not null default 0,
  updated_at timestamptz not null default now(),
  unique (tenant_id, kind, source_key)
);
create index if not exists financial_transactions_tenant_date_idx
  on financial_transactions (tenant_id, txn_date);
create index if not exists financial_transactions_tenant_kind_idx
  on financial_transactions (tenant_id, kind);

create table if not exists financial_transaction_lines (
  id bigserial primary key,
  tenant_id uuid not null references tenants(id),
  transaction_id bigint not null references financial_transactions(id) on delete cascade,
  line_type text not null check (line_type in ('item', 'category', 'tax')),
  name text not null,
  amount numeric(18,2) not null,
  quantity numeric(18,4),
  unit text,
  rate numeric(18,4)
);
create index if not exists financial_transaction_lines_transaction_idx
  on financial_transaction_lines (transaction_id);
create index if not exists financial_transaction_lines_tenant_type_idx
  on financial_transaction_lines (tenant_id, line_type);
