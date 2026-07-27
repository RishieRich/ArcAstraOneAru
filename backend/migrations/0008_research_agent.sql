-- Isolated, tenant-scoped storage for the optional Research Agent.
-- Existing accounting and connector tables are intentionally unchanged.

create table if not exists icp_profiles (
  tenant_id uuid primary key references tenants(id) on delete cascade,
  profile_json jsonb not null,
  narrative text not null,
  data_completeness jsonb not null,
  generated_at timestamptz not null default now()
);

create table if not exists research_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  type text not null check (type in ('customer', 'material')),
  status text not null check (status in ('running', 'completed', 'failed')),
  params_json jsonb not null default '{}'::jsonb,
  provider text not null,
  created_at timestamptz not null default now()
);
create index if not exists research_runs_tenant_created_idx
  on research_runs (tenant_id, created_at desc);

create table if not exists research_candidates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  run_id uuid not null references research_runs(id) on delete cascade,
  type text not null check (type in ('customer', 'material')),
  name text not null,
  location text,
  contact text,
  source_url text not null,
  retrieved_at timestamptz not null,
  fit_score int not null check (fit_score between 0 and 100),
  fit_reason text not null,
  status text not null default 'draft'
    check (status in ('draft', 'approved', 'rejected', 'delivered')),
  enrichment_json jsonb not null default '{}'::jsonb
);
create index if not exists research_candidates_tenant_run_idx
  on research_candidates (tenant_id, run_id, status, fit_score desc);
