# Baseline: receivables synchronization and metrics

| Field | Value |
|---|---|
| Status | Current intended behavior |
| Last verified | 2026-08-22 |
| Primary code | `backend/app/routers/sync.py`, `backend/app/routers/dashboard.py` |

## Contract

- `/v1/sync` accepts a complete ledger and open-bill snapshot from an authorized device.
- The client-minted sync run ID is the idempotency key. A retry returns the earlier result
  instead of inserting another run.
- The backend checks company GUID binding and serializes tenant writers with a PostgreSQL
  advisory transaction lock using the tenant ID cast to text.
- Bills are upserted by stable tenant/source identity. Bills absent from the latest accepted
  snapshot are marked closed rather than deleted.
- Tally debit amounts retain their raw sign in storage. Dashboard and research views use
  absolute values where the receivables contract requires positive exposure.
- Metrics expose only the authenticated user's permitted tenants and current open bills.
- Browser filters recalculate all visible receivables KPIs, charts, and lists from the same
  authorized bill payload.

## Invariants

- A retry, duplicate, or concurrent writer cannot create a second logical bill state.
- Current exposure by invoice month is not described as revenue or collection history.
- Product analytics use normalized item lines, never party or ledger names as products.

## Known gaps

- Unexpected empty or materially anomalous snapshots are not quarantined.
- There is no daily historical receivables balance series.
- Collection actions and outcomes are not yet recorded.
