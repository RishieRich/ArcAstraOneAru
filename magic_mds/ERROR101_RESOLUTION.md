# Error 101 — `FUNCTION_INVOCATION_FAILED` on Push Now

**Status:** Resolved (backend fix deployed; connector exe needs rebuild + redistribution)
**Reported:** screenshot `Pictures/Error101.jpeg` from the colleague's machine (`Colleague Test` tenant, device `quaidjohar`)
**Incident time:** 2026-07-12 17:53:17 UTC (decoded from the Vercel error ID `bom1::f4cc6-1783878797454-...`)

---

## 1. What the user saw

Clicking **Push Now** in the ARQ Tally Connector showed this in the Activity log:

```
FUNCTION_INVOCATION_FAILED
bom1::f4cc6-1783878797454-333138768391
```

That text is Vercel's raw 500 error page — it means the Python function **crashed with an unhandled exception** before it could send a proper response.

## 2. Root cause

**Neon free-tier cold start + zero error handling around the DB connect.**

Evidence chain from the production DB and the error ID:

1. The colleague's last successful push was **17:34:32 UTC**. The crash happened **17:53:17 UTC** — about 19 minutes later.
2. Neon's free-tier compute **auto-suspends after ~5 minutes of inactivity**, so at 17:53 the database was asleep.
3. The failing request never updated the device's `last_seen_at` (still 17:34:32), proving the crash happened **inside device auth, at `psycopg.connect()`** — before any sync logic ran.
4. `get_connection()` called `psycopg.connect()` with no timeout and no retry. A transient connect failure during Neon's wake-up raised `OperationalError`, nothing caught it, and Vercel surfaced its generic `FUNCTION_INVOCATION_FAILED` page.
5. The connector only retried **network** errors (`httpx.RequestError`), not HTTP 5xx responses — so one transient hiccup went straight to the user's screen as raw Vercel text.

## 3. The fix (shipped in this commit)

### Backend (`backend/`, auto-deploys on push to `main`)

| File | Change |
|---|---|
| `app/db.py` | `get_connection()` now retries the connect up to 3× with backoff and a 10s `connect_timeout` — rides out Neon cold-start wobble instead of crashing. |
| `app/main.py` | New catch-all HTTP middleware: any unhandled exception now returns JSON `{"detail": "Internal error (...): ..."}` with status 500. Users will **never see raw `FUNCTION_INVOCATION_FAILED` again** — they get a readable message, and the traceback lands in Vercel logs. |
| `app/routers/sync.py` | Two hardening changes: (a) `sync_runs` insert is now `on conflict (id) do nothing` — a client retry that races the original request replays the prior result instead of crashing on a duplicate-key error; (b) ledgers/bills inserts use `executemany` (pipelined batches) instead of one round trip per row, so a real company with thousands of entries syncs in seconds, not minutes. |

### Connector (`connector/` — requires exe rebuild, see next steps)

| File | Change |
|---|---|
| `sync/pusher.py` | Request timeout raised 15s → 60s (big first pushes + DB cold start). 500/502/503/504 responses are now **retried with backoff** (safe: the client-generated `sync_run_id` makes retries idempotent). Vercel error pages are translated to a plain message: *"the backend had a temporary server error — wait a minute and push again"*. |

### Verification

- `backend/tests` — 10 passed.
- `connector/tests/test_pusher.py` — 9 passed.
- Live checks after deploy: `/health`, `/health/db`, and a 401 probe of `/v1/sync` all behave correctly.

## 4. Immediate workaround (before the new exe reaches the user)

The error is transient. Telling the user to **click Push Now again** (the first click wakes the database, the second succeeds) works with the old exe. With the backend fix deployed, even the old exe should stop seeing this error in almost all cases, because the backend now absorbs the cold start itself.

## 5. Next steps

1. **Rebuild and redistribute the exe** — `connector/build.ps1` → `connector/dist/arq-connector.exe`. The backend fix alone removes the crash; the new exe adds client-side retries and the friendlier message.
2. **⚠ Investigate the 0-ledgers / 0-bills issue (important, separate bug):** every one of the colleague's "successful" pushes uploaded **0 ledgers and 0 bills**. Either their test company is genuinely empty, or their Tally's Bills Receivable / debtor-ledger XML doesn't match our parser (`parse_bills_receivable` is only live-verified against a single bill on our own Tally). Ask the colleague to push with their real company open, then check the counts in `sync_runs` — if still 0/0 with real data on screen, we need their raw Tally XML to fix the parser.
3. **Consider upgrading Neon** (or enabling always-on compute) once real customers onboard — cold starts will otherwise add a few seconds to the first request after every idle period.
4. **Check Vercel function logs** when anything like this recurs: Vercel dashboard → project → Deployments → Functions logs. With the new middleware, the full Python traceback is logged there and the client shows the exception type inline.
5. **Optional polish:** the connector's Activity log could distinguish "backend waking up, retrying…" from hard failures, so users see progress instead of silence during the 60s window.
