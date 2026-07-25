-- Explicit per-company access for dashboard users.
--
-- Existing accounts predate access scoping and are promoted to all-company
-- owners. New accounts default to no access until a tenant grant is inserted.
-- This avoids an unsafe window between creating a client login and granting its
-- intended company.

alter table dashboard_users
  add column if not exists all_tenants boolean;

update dashboard_users
set all_tenants = true
where all_tenants is null;

alter table dashboard_users
  alter column all_tenants set default false;

alter table dashboard_users
  alter column all_tenants set not null;

create table if not exists dashboard_user_tenants (
  user_email text not null references dashboard_users(email)
    on update cascade on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_email, tenant_id)
);

create index if not exists dashboard_user_tenants_tenant_idx
  on dashboard_user_tenants (tenant_id);
