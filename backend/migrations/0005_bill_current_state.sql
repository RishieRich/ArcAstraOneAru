-- Keep one current row per Tally bill instead of appending the same bill on
-- every connector refresh. Historical sync_runs remain the audit trail.
--
-- Existing bills with a reference are collapsed to their latest state. The
-- earliest run is retained as first_sync_run_id. Reference-less legacy rows
-- cannot be identified safely, so they receive unique legacy keys; the next
-- successful sync will soft-close them and establish stable fallback keys.

alter table bills add column if not exists source_key text;
alter table bills add column if not exists first_sync_run_id uuid references sync_runs(id);
alter table bills add column if not exists last_sync_run_id uuid references sync_runs(id);
alter table bills add column if not exists created_at timestamptz not null default now();
alter table bills add column if not exists updated_at timestamptz not null default now();
alter table bills add column if not exists closed_at timestamptz;

update bills
set source_key = case
      when nullif(btrim(bill_ref), '') is not null then
        'ref:' ||
        lower(coalesce(nullif(btrim(party_guid), ''), btrim(party_name))) ||
        chr(31) ||
        lower(btrim(bill_ref))
      else 'legacy:' || id::text
    end,
    first_sync_run_id = coalesce(first_sync_run_id, sync_run_id),
    last_sync_run_id = coalesce(last_sync_run_id, sync_run_id)
where source_key is null
   or first_sync_run_id is null
   or last_sync_run_id is null;

-- Preserve the first sighting before older duplicate rows are removed.
with first_sightings as (
  select tenant_id, source_key, (array_agg(sync_run_id order by id))[1] as first_run
  from bills
  group by tenant_id, source_key
)
update bills b
set first_sync_run_id = f.first_run
from first_sightings f
where b.tenant_id = f.tenant_id
  and b.source_key = f.source_key;

with ranked as (
  select id,
         row_number() over (
           partition by tenant_id, source_key
           order by id desc
         ) as duplicate_rank
  from bills
)
delete from bills b
using ranked r
where b.id = r.id
  and r.duplicate_rank > 1;

alter table bills alter column source_key set not null;
alter table bills alter column first_sync_run_id set not null;
alter table bills alter column last_sync_run_id set not null;

create unique index if not exists bills_tenant_source_key_uidx
  on bills (tenant_id, source_key);
create index if not exists bills_tenant_open_idx
  on bills (tenant_id) where closed_at is null;

-- Earlier GUID-less Excel fallback keys included VoucherSeq, which is only the
-- row order in one export. Canonicalize existing rows to the same business key
-- now used by the importer, then keep the most recently updated copy.
alter table financial_transactions add column if not exists canonical_source_key text;

update financial_transactions
set canonical_source_key = case
      when source_key like 'guid:%' then
        'guid:' || lower(btrim(substring(source_key from 6)))
      when source_key like 'derived:%' then
        'derived:' ||
        kind || chr(31) ||
        coalesce(txn_date::text, '') || chr(31) ||
        lower(btrim(coalesce(voucher_number, ''))) || chr(31) ||
        lower(btrim(coalesce(party_name, '')))
      else source_key
    end;

with ranked as (
  select id,
         row_number() over (
           partition by tenant_id, kind, canonical_source_key
           order by updated_at desc, id desc
         ) as duplicate_rank
  from financial_transactions
)
delete from financial_transactions ft
using ranked r
where ft.id = r.id
  and r.duplicate_rank > 1;

update financial_transactions
set source_key = canonical_source_key;

alter table financial_transactions drop column canonical_source_key;

-- Zero-downtime bridge for the already-deployed pre-0005 backend. That version
-- inserts bills without source_key/first_sync_run_id/last_sync_run_id and would
-- otherwise fail between this migration and the matching code deployment.
-- Once the new backend supplies source_key, the trigger returns immediately and
-- the application-level ON CONFLICT/current-snapshot behavior owns the write.
create or replace function bills_current_state_compat()
returns trigger
language plpgsql
as $$
declare
  compat_key text;
begin
  if new.source_key is not null then
    return new;
  end if;

  if nullif(btrim(new.bill_ref), '') is not null then
    compat_key :=
      'ref:' ||
      lower(coalesce(nullif(btrim(new.party_guid), ''), btrim(new.party_name))) ||
      chr(31) ||
      lower(btrim(new.bill_ref));
  else
    compat_key :=
      'fallback-compat:' ||
      md5(
        lower(coalesce(nullif(btrim(new.party_guid), ''), btrim(new.party_name))) ||
        chr(31) || coalesce(new.bill_date::text, '') ||
        chr(31) || coalesce(new.due_date::text, '') ||
        chr(31) || new.pending_amount::text
      );
  end if;

  update bills
  set sync_run_id = new.sync_run_id,
      party_guid = new.party_guid,
      party_name = new.party_name,
      bill_ref = new.bill_ref,
      bill_date = new.bill_date,
      due_date = new.due_date,
      pending_amount = new.pending_amount,
      overdue_days = new.overdue_days,
      last_sync_run_id = new.sync_run_id,
      updated_at = now(),
      closed_at = null
  where tenant_id = new.tenant_id
    and source_key = compat_key;

  if found then
    return null;
  end if;

  new.source_key := compat_key;
  new.first_sync_run_id := new.sync_run_id;
  new.last_sync_run_id := new.sync_run_id;
  return new;
end;
$$;

drop trigger if exists bills_current_state_compat_trigger on bills;
create trigger bills_current_state_compat_trigger
before insert on bills
for each row
execute function bills_current_state_compat();
