# ARQ Data Model — Review Before We Touch Neon

**Nothing in this file has been run against your database yet.** This is for you to read and approve first, per your ask. Once you're happy with it, I'll write it as a migration and apply it.

---

## 1. What's already correct (no change needed)

| Table | Why it's fine |
|---|---|
| **`tenants`** | One row per client company, `tally_company_guid` is `unique` — a Tally GUID can never be claimed by two clients. |
| **`devices`** | One row per registered machine, `token_hash` is `unique`. Re-registering the same machine would need a new pairing code anyway (tokens aren't reusable). |
| **`pairing_codes`** | One row per issued code, `code_hash` is the primary key — can't be issued twice, `used_at` stops reuse. |
| **`ledgers`** | Primary key is `(tenant_id, tally_guid)`. Every sync does an **upsert** — same customer pushed 100 times still means 1 row, just refreshed. This is already the "no duplicates" pattern you want. |
| **`sync_runs`** | This one **is** meant to grow — one row per push, forever. That's not a bug, it's the audit trail ("did auto-sync actually fire every 3 hours? when did it last succeed?"). Small rows, cheap to keep. |

## 2. What's broken: `bills`

Right now every push does a plain `insert`, tied to that push's `sync_run_id`. Nothing ties today's "Alpha Customer, bill #2" to yesterday's identical row — so each auto-sync (every 3 hours, forever) adds a fresh copy. Proof, from your test tenant right now:

```
Alpha Customer | bill_ref 2 | ₹508,989 | sync_run 4ff54606...
Alpha Customer | bill_ref 2 | ₹508,989 | sync_run d16f790d...
Alpha Customer | bill_ref 2 | ₹508,989 | sync_run 406848c6...
Alpha Customer | bill_ref 2 | ₹508,989 | sync_run 71984e6c...
```
Same bill, 4 rows. Left running on Pawan's machine every 3 hours, that's 8 rows/day, forever, for a bill that never changed. Not acceptable for "just works."

### The fix: make `bills` upsert like `ledgers` already does

**Natural key:** `(tenant_id, party_name, bill_ref)`. Why this and not a GUID: TallyPrime's Bills Receivable report (the one we're actually pulling from, live-verified) doesn't expose a GUID per bill — only the party's name and Tally's own bill reference number. Within one client's data, that pair is a reliable identity for "this specific bill."

**Behavior on every push, atomically:**
1. **Upsert** every bill in the payload — if `(tenant_id, party_name, bill_ref)` already exists, update its amount/dates/overdue-days in place; if not, insert it.
2. **Soft-close** anything *not* in this payload — a bill that was outstanding last sync but isn't in this one means Tally shows it as paid/cleared. Mark it `closed_at = now()` instead of deleting it, so you keep history of what got paid and when.

Result: the table's row count tracks *real outstanding bills*, not *number of syncs run*. "Current receivables" is just `where closed_at is null` — no need to know about `sync_runs` at all for everyday queries.

---

## 3. Proposed schema for `bills` (replaces the current one)

```sql
create table if not exists bills (
  tenant_id       uuid not null references tenants(id),
  party_name      text not null,
  bill_ref        text not null,
  party_guid      text,
  bill_date       date,
  due_date        date,
  pending_amount  numeric(14,2) not null,
  overdue_days    int,
  first_sync_run_id uuid not null references sync_runs(id),  -- when we first saw this bill
  last_sync_run_id  uuid not null references sync_runs(id),  -- most recent push that confirmed it
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  closed_at       timestamptz,                                 -- set when a bill disappears from a fresh pull (paid off)
  primary key (tenant_id, party_name, bill_ref)
);

create index if not exists bills_tenant_open_idx
  on bills (tenant_id) where closed_at is null;   -- fast "current outstanding" lookups
```

**Migration from the current table** (keeps history, doesn't lose data — the old per-sync rows collapse into "latest state per bill," with `first_sync_run_id` backfilled from the earliest row and everything treated as still-open since we don't know true close dates for the old duplicate rows):

```sql
alter table bills rename to bills_old;

create table bills ( /* as above */ );

insert into bills (tenant_id, party_name, bill_ref, party_guid, bill_date, due_date,
                    pending_amount, overdue_days, first_sync_run_id, last_sync_run_id, created_at, updated_at)
select distinct on (tenant_id, party_name, bill_ref)
  tenant_id, party_name, bill_ref, party_guid, bill_date, due_date,
  pending_amount, overdue_days,
  first_value(sync_run_id) over w,
  last_value(sync_run_id) over w,
  min(id) over (partition by tenant_id, party_name, bill_ref),  -- rough created_at stand-in, see note below
  now()
from bills_old
window w as (partition by tenant_id, party_name, bill_ref order by id
             rows between unbounded preceding and unbounded following);

drop table bills_old;
```
*(I'll clean up the exact syntax when I write the real migration file — the above is the shape, not copy-paste-ready SQL. Flagging so you're not surprised if the final version looks slightly different.)*

## 4. Backend code change this requires

`backend/app/routers/sync.py` currently does a plain `insert into bills` per bill. It needs to become:
1. Upsert each bill in the payload (`insert ... on conflict (tenant_id, party_name, bill_ref) do update ...`)
2. Close out bills for this tenant that weren't in the payload: `update bills set closed_at = now() where tenant_id = %s and closed_at is null and (party_name, bill_ref) not in (...)`

Both in the same transaction as today (still atomic — a failed push still leaves zero partial changes).

## 5. Is this robust for *any* Tally company, not just Pawan/ARQ?

Yes, structurally — nothing here is hardcoded to a specific company. Two honest caveats worth knowing, not blockers:

- **If a party gets renamed in Tally** (e.g. "Alpha Customer" → "Alpha Customer Pvt Ltd"), the natural key changes, so the old name's bills get soft-closed and new rows appear under the new name — it looks like "bill closed + new bill opened" rather than a rename. Fixable later by enriching bills with the party's ledger GUID (we already pull ledger GUIDs in the same sync, just need to join bills to ledgers by name before sending) — a small follow-up, not needed to ship.
- **`sync_runs` still grows unbounded** by design (one row per push, e.g. ~8/day at a 3-hour interval). That's intentional (it's your audit log), but if you ever want to cap it, an easy later addition is deleting `sync_runs` older than N days that aren't referenced by any open bill.

## 6. Dummy data for testing

Once the table exists, a couple of throwaway rows to sanity-check the upsert/close behavior without touching real client data:

```sql
insert into bills (tenant_id, party_name, bill_ref, pending_amount, first_sync_run_id, last_sync_run_id)
values ('<a test tenant id>', 'Test Party', 'TEST-1', 1000.00,
        '<any existing sync_run id for that tenant>', '<same>');
```
Then push again from the exe with that bill no longer present in Tally, and confirm it flips to `closed_at` instead of vanishing or duplicating.

---

## Your call

If this looks right, say go and I'll:
1. Write the real migration file (`backend/migrations/0002_bills_upsert.sql`)
2. Update `sync.py` to upsert + close instead of plain insert
3. Run it against Neon (your current 4 duplicate test rows collapse into 1, nothing else touched)
4. Add a test proving re-pushing the same bill twice still yields exactly 1 row, and proving a disappeared bill gets closed
