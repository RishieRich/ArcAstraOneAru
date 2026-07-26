-- Multi-sheet Smart Excel profiles for unfamiliar business workbooks.
--
-- Familiar Sales/Purchase/Expense/P&L exports continue to use the normalized
-- finance tables. These tables hold typed rows and chart-ready profiles only
-- when the accounting meaning cannot be inferred safely. The original file is
-- never stored, and exact workbook bytes remain tenant-scoped and idempotent.

create table if not exists smart_imports (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  uploaded_by text not null,
  source_filename text not null,
  file_sha256 text not null,
  dataset_count int not null default 0,
  row_count int not null default 0,
  duplicate_rows int not null default 0,
  skipped_sheets jsonb not null default '[]'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (tenant_id, file_sha256)
);

create index if not exists smart_imports_tenant_created_idx
  on smart_imports (tenant_id, created_at desc);

create table if not exists smart_datasets (
  id bigserial primary key,
  tenant_id uuid not null references tenants(id),
  import_id uuid not null references smart_imports(id) on delete cascade,
  sheet_index int not null,
  sheet_name text not null,
  title text not null,
  domain text not null,
  confidence numeric(4,3) not null,
  header_row int not null,
  row_count int not null,
  duplicate_rows int not null default 0,
  schema_fingerprint text not null,
  columns_json jsonb not null default '[]'::jsonb,
  date_columns jsonb not null default '[]'::jsonb,
  dimension_columns jsonb not null default '[]'::jsonb,
  metric_columns jsonb not null default '[]'::jsonb,
  kpis jsonb not null default '[]'::jsonb,
  charts jsonb not null default '[]'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (import_id, sheet_index)
);

create index if not exists smart_datasets_tenant_import_idx
  on smart_datasets (tenant_id, import_id, sheet_index);

create table if not exists smart_rows (
  id bigserial primary key,
  tenant_id uuid not null references tenants(id),
  dataset_id bigint not null references smart_datasets(id) on delete cascade,
  source_row int not null,
  row_fingerprint text not null,
  values_json jsonb not null,
  created_at timestamptz not null default now(),
  unique (dataset_id, source_row)
);

create index if not exists smart_rows_dataset_idx
  on smart_rows (dataset_id, source_row);

create index if not exists smart_rows_tenant_fingerprint_idx
  on smart_rows (tenant_id, row_fingerprint);
