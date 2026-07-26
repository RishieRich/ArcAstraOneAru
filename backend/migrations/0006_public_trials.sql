-- Public self-service trials and the overflow waitlist.
--
-- Managed client/owner accounts remain unchanged and do not consume the public
-- trial capacity. Each accepted trial receives a dedicated tenant and an
-- explicit access grant, preserving the existing per-company isolation model.

alter table dashboard_users
  add column if not exists account_type text;

update dashboard_users
set account_type = 'managed'
where account_type is null;

alter table dashboard_users
  alter column account_type set default 'managed';

alter table dashboard_users
  alter column account_type set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'dashboard_users_account_type_check'
      and conrelid = 'dashboard_users'::regclass
  ) then
    alter table dashboard_users
      add constraint dashboard_users_account_type_check
      check (account_type in ('managed', 'free_trial'));
  end if;
end
$$;

create index if not exists dashboard_users_account_type_idx
  on dashboard_users (account_type);

create table if not exists trial_waitlist (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  company_name text not null,
  email text unique not null,
  status text not null default 'waiting'
    check (status in ('waiting', 'contacted', 'invited', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists trial_waitlist_status_created_idx
  on trial_waitlist (status, created_at);

-- A mixed Profit & Loss summary is one import containing normalized sales,
-- purchase and expense rows. Transaction rows retain their original three-kind
-- constraint; only the import envelope needs the additional label.
do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select conname
    from pg_constraint
    where conrelid = 'financial_imports'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%detected_kind%'
  loop
    execute format(
      'alter table financial_imports drop constraint %I',
      constraint_name
    );
  end loop;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'financial_imports_detected_kind_check'
      and conrelid = 'financial_imports'::regclass
  ) then
    alter table financial_imports
      add constraint financial_imports_detected_kind_check
      check (detected_kind in ('sales', 'purchase', 'expense', 'profit_loss'));
  end if;
end
$$;
