# ARQ Tally Connector — Session Output (M0–M3, live-verified)

> Companion to `readme_1107_base.md` (the plan). This documents what was actually built and verified in this session, in plain terms.

**Session scope, agreed up front:** build M0–M3 (scaffold, Tally detection/extraction code, and the backend + Neon database), then pause before M4 (the full connector → cloud sync loop), since M4/M5 need a real device end-to-end run that's a separate exercise. Live TallyPrime testing happened mid-session once you opened it — several real bugs were found and fixed as a result (see below).

---

## 1. What's done and verified

### Backend (`backend/`) — M3, fully built from scratch, tested live against Neon

The plan assumed `backend/` was already an existing FastAPI + Postgres app. It wasn't — the folder only had a bare local-export script (no FastAPI, no database code at all). That old code (`app/main.py`, `app/core/config.py`, `app/core/logging.py`, `config.toml`) has been removed; it belonged to an earlier, different design and conflicted with this plan. It's still recoverable from git history if you ever need it.

Built instead, matching §7 and the M3 deliverables exactly:

- **`backend/migrations/0001_target_schema.sql`** — an idempotent migration (`create table if not exists`, `add column if not exists`). Ran it against your live Neon `neondb`: added the two missing tables (`pairing_codes`, `ledgers`) and the missing columns on your existing `devices`/`sync_runs`/`bills` tables, **without touching your seeded Pawan Engineering Works data** (verified before/after: still 1 tenant, 1 sync_run, 2 bills, all unchanged).
- **`backend/app/main.py`** + **`app/routers/devices.py`** + **`app/routers/sync.py`** — the FastAPI app:
  - `POST /v1/devices/register` — pairing-code → device token, single-use codes, trust-on-first-use company GUID binding
  - `POST /v1/sync` — Bearer-token auth, GUID-mismatch → 403, idempotent by client-supplied `sync_run_id`, all writes in one transaction
  - `GET /health`
- **`backend/app/auth.py`** — the Bearer-token dependency (hash lookup, revocation check, `last_seen_at` bump)
- **`backend/app/admin.py`** — CLI: `create-tenant`, `issue-pairing-code`, `revoke-device`, `list-tenants`
- **`backend/app/db.py`**, **`security.py`**, **`schemas.py`** — connection handling, token hashing, pydantic request/response models

**`X-Company-Name` vulnerability:** grepped the whole repo — zero hits. This backend never had it (it's new code), so there was nothing to remove. Worth knowing this doesn't mean the risk category is gone — it means it never got introduced here.

**Verified live against Neon**, not just unit-tested in isolation:
- Ran the migration against the real dev database and confirmed the schema diff
- Started the API, created a throwaway test tenant via the admin CLI, and drove the full flow with curl: no-token → 401, garbage token → 401, invalid pairing code → 404, register → 200, pairing code reuse → 400, wrong `company_guid` → 403, valid sync → 200, idempotent re-send → same result no duplicate rows, revoked device → 401
- Confirmed in the database directly that two tenants' bills never cross-contaminate
- Cleaned up all test data afterward — only your original Pawan Engineering Works data remains in Neon
- Wrote this into a real `pytest` suite (`backend/tests/`) so it's repeatable: **10/10 passing**, each test creates and tears down its own tenant

### Connector (`connector/`) — M0–M2, built and live-tested against your actual TallyPrime

Built the full package layout from §5: `config.py`, `logging_setup.py`, `tally/{client,envelopes,parsers,detect}.py`, `sync/{snapshot,state}.py`, `cli.py` with `doctor` and `pull` subcommands. Has its own venv at `connector/.venv` (Python 3.13.2, per plan). `sync/pusher.py` and `security/credentials.py` (the cloud-push half, M4) were deliberately not built yet — that's the paused part.

This is the part that mattered most to test live, because the plan's own XML skeletons were explicitly marked "unverified, don't trust the field names" — and sure enough, testing against your real Tally surfaced **four real bugs**, all now fixed:

1. **UTF-16 decoding was backwards.** The plan assumed Tally always responds in UTF-16. Live testing showed a plain response came back as ASCII/UTF-8 instead — and blindly decoding ASCII bytes as UTF-16 doesn't throw an error, it just silently produces garbage text. Fixed with proper BOM/heuristic detection instead of "try UTF-16, fall back on failure."
2. **Company-list parser matched the wrong tag.** Tally's response has `<CMPINFO><COMPANY>0</COMPANY></CMPINFO>` (a summary count) alongside the real `<COMPANY NAME="...">` records elsewhere in the document. The parser was grabbing the summary count instead of real records. Fixed by scoping the search to the `<DATA>` section.
3. **Naming collision with a Tally built-in report.** The envelope named its custom collection `"List of Companies"` — which collides with a name Tally already knows internally, so Tally silently ignored our field list (`FETCH`) and returned its own default fields instead (no GUID, no starting-from date). Renamed it to `"ARQ List of Companies"` (matching the pattern the plan already used for `"ARQ Debtor Ledgers"`) and the real GUID/starting-from date came through correctly.
4. **Invalid XML character references weren't being stripped.** The plan warned "Tally emits `&#4;` and friends" — but that's a literal 4-character XML entity reference (`&`, `#`, `4`, `;`), not a raw control byte, and the original sanitizer only stripped raw bytes. A real ledger's `PARENT` field (`Profit & Loss A/c`) contained exactly this and crashed the XML parser. Fixed by stripping invalid numeric character references before parsing.

**What's confirmed working end-to-end, live, right now:**
- `doctor` correctly detects "Tally not running" (exit 10) when only the background `tallyscheduler.exe` helper is up
- `doctor` correctly detects "gateway on, no company open" once Tally's app was open but no company loaded
- `doctor` correctly detects and matches your company by name, with the **real GUID**, once you loaded it — tested against all three of your open companies: `ARQ AA` (GUID `83dd7f81-1c9a-44c9-aaa7-839b9aeb843b`), `ARQ Code Test` (`da7e7890-ba54-455d-9dc6-93fc3f0ca2d8`), `ARQ Demo Traders` (`e218138b-4e93-4b06-be1e-946bc0358b63`)
- `pull` correctly extracts real Sundry Debtor ledger data — found and correctly parsed "Alpha Customer" in `ARQ Code Test` (name, GUID, parent group, ₹0.00 balance, AlterID)
- Rotating log file confirmed written to `%LOCALAPPDATA%\ARQ\logs\connector.log`

The two live-captured responses (company list, debtor ledgers) are saved as real fixtures in `connector/tests/fixtures/` and used by a 17-test `pytest` suite that runs with **no Tally required** (mocks process/port checks, replays the real captured XML) — **17/17 passing**.

---

## 2. What's not done — one real, known gap

**Bills Receivable extraction is unverified and currently broken.** None of your three open companies (`ARQ AA`, `ARQ Code Test`, `ARQ Demo Traders`) have any vouchers or outstanding bills — they're all essentially blank test companies with just Tally's default chart of accounts. Two consequences:

1. There's no data to check parser output against even if the request worked.
2. The request itself doesn't work yet: the plan's documented envelope shape (`TYPE=Data`, `ID=Bills Receivable`) returns an empty `<ENVELOPE></ENVELOPE>`, and a more standard alternative shape (`EXPORTDATA`/`REQUESTDESC`/`REPORTNAME`) returned `"Unknown Request, cannot be processed"`. Neither is right yet, and — per the plan's own rule 3 ("never invent Tally field names, dump and look") — this needs real bill data to iterate against rather than more guessing.

**To unblock this:** create a couple of test sales vouchers with pending amounts in one of your companies (or open a company that already has real receivables, like a proper Pawan Engineering Works setup), then say the word and this gets finished and verified the same way everything else was.

Everything else in `bills_receivable()` / `parse_bills_receivable()` is still in the code, clearly flagged with comments explaining it's unverified — nothing was left silently broken.

---

## 3. How to test any of this yourself

**Backend:**
```powershell
cd backend
..\.venv\Scripts\Activate.ps1
python -m pytest -q
```

**Connector (no Tally needed — fixture-based):**
```powershell
cd connector
.venv\Scripts\Activate.ps1
python -m pytest -q
```

**Connector against live Tally** (open a company in TallyPrime first):
```powershell
cd connector
.venv\Scripts\Activate.ps1
python -m arq_connector.cli doctor --config config.toml
python -m arq_connector.cli pull --config config.toml --out snapshot.json
```

---

## 4. Repo hygiene changes

- Added a root `.gitignore` (there wasn't one before) — excludes `.env`, venvs, `__pycache__`, local state/log files, and your per-machine `connector/config.toml`
- `backend/.env` holds your Neon `DATABASE_URL` — gitignored, never logged, never committed
- Untracked `exports/logs/connector.log` (leftover from the old design, was accidentally committed)

---

## 5. Next step (not started — paused here per plan + your instruction)

**M4 — secure sync client**: `register` and `sync` CLI commands that actually call the backend (`sync/pusher.py`, `security/credentials.py` for Windows Credential Manager token storage). This needs `connector/config.toml`'s `[cloud] api_base_url` pointed at a real deployed backend (Cloud Run, or your machine's IP for local testing), and ideally the Bills Receivable gap closed first since a real sync should carry real bill data.
