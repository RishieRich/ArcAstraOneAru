-- Dashboard viewers (email + PIN login). Idempotent, like 0001.
create table if not exists dashboard_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  pin_hash text not null,
  display_name text,
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);
