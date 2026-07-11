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

This is the part that mattered most to test live, because the plan's own XML skeletons were explicitly marked "unverified, don't trust the field names" — and sure enough, testing against your real Tally surfaced **five real bugs**, all now fixed:

1. **UTF-16 decoding was backwards.** The plan assumed Tally always responds in UTF-16. Live testing showed a plain response came back as ASCII/UTF-8 instead — and blindly decoding ASCII bytes as UTF-16 doesn't throw an error, it just silently produces garbage text. Fixed with proper BOM/heuristic detection instead of "try UTF-16, fall back on failure." (A follow-up test also caught the BOM path itself not stripping the BOM bytes before decoding — fixed too.)
2. **Company-list parser matched the wrong tag.** Tally's response has `<CMPINFO><COMPANY>0</COMPANY></CMPINFO>` (a summary count) alongside the real `<COMPANY NAME="...">` records elsewhere in the document. The parser was grabbing the summary count instead of real records. Fixed by scoping the search to the `<DATA>` section.
3. **Naming collision with a Tally built-in report.** The envelope named its custom collection `"List of Companies"` — which collides with a name Tally already knows internally, so Tally silently ignored our field list (`FETCH`) and returned its own default fields instead (no GUID, no starting-from date). Renamed it to `"ARQ List of Companies"` (matching the pattern the plan already used for `"ARQ Debtor Ledgers"`) and the real GUID/starting-from date came through correctly.
4. **Invalid XML character references weren't being stripped.** The plan warned "Tally emits `&#4;` and friends" — but that's a literal 4-character XML entity reference (`&`, `#`, `4`, `;`), not a raw control byte, and the original sanitizer only stripped raw bytes. A real ledger's `PARENT` field (`Profit & Loss A/c`) contained exactly this and crashed the XML parser. Fixed by stripping invalid numeric character references before parsing.
5. **Bills Receivable envelope shape was wrong.** The plan's skeleton (`TYPE=Data`, `ID=Bills Receivable`) returns an empty `<ENVELOPE></ENVELOPE>` — Tally doesn't recognize it. The correct shape uses `TALLYREQUEST` = the exact two-word string `"Export Data"` with an `EXPORTDATA`/`REQUESTDESC`/`REPORTNAME` body. Confirmed against one real test voucher you created in "ARQ Code Test" (Alpha Customer, ₹508,989 pending, 62 days overdue) — see item 3 below.

**What's confirmed working end-to-end, live, right now:**
- `doctor` correctly detects "Tally not running" (exit 10) when only the background `tallyscheduler.exe` helper is up
- `doctor` correctly detects "gateway on, no company open" once Tally's app was open but no company loaded
- `doctor` correctly detects and matches your company by name, with the **real GUID**, once you loaded it — tested against all three of your open companies: `ARQ AA` (GUID `83dd7f81-1c9a-44c9-aaa7-839b9aeb843b`), `ARQ Code Test` (`da7e7890-ba54-455d-9dc6-93fc3f0ca2d8`), `ARQ Demo Traders` (`e218138b-4e93-4b06-be1e-946bc0358b63`)
- `pull` correctly extracts real Sundry Debtor ledger data — "Alpha Customer" in `ARQ Code Test` (name, GUID, parent group, balance, AlterID)
- `pull` correctly extracts real Bills Receivable data — after you created one test sales voucher, it picked up the real bill: party, bill ref, bill date, due date, pending amount (₹508,989), and 62 overdue days
- Rotating log file confirmed written to `%LOCALAPPDATA%\ARQ\logs\connector.log`

Three live-captured responses (company list, debtor ledgers, bills receivable) are saved as real fixtures in `connector/tests/fixtures/` and used by an 18-test `pytest` suite that runs with **no Tally required** (mocks process/port checks, replays the real captured XML) — **18/18 passing**.

---

## 2. What's still a known limitation — not a bug, just unconfirmed at scale

**Bills Receivable multi-bill grouping is inferred, not independently confirmed.** The real response for one bill looks like this (note: no per-bill wrapper element):

```xml
<ENVELOPE>
 <BILLFIXED>
  <BILLDATE>1-Apr-26</BILLDATE>
  <BILLREF>2</BILLREF>
  <BILLPARTY>Alpha Customer</BILLPARTY>
 </BILLFIXED>
 <BILLCL>-508989.00</BILLCL>
 <BILLDUE>1-Apr-26</BILLDUE>
 <BILLOVERDUE>62</BILLOVERDUE>
</ENVELOPE>
```

The parser assumes multiple bills repeat this `BILLFIXED` + 3-sibling group in sequence, which is a reasonable read of the structure but was only tested against exactly one bill. Also note `pending_amount` comes through as **negative** (Tally's internal sign convention) — the parser passes it through unchanged rather than guessing whether to flip the sign; worth checking against the actual Bills Receivable screen in Tally.

**To fully close this out:** create a second test voucher (different party or a second bill for Alpha Customer) and re-run `pull` — if 2 bills come back correctly, this is fully closed.

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

## 5. M4 + M5 — DONE (second half of the session)

The missing wire and the packaging both got built and live-verified:

- **`sync/pusher.py`** — register + push to the backend, with retries, idempotency UUID, and Tally-date → ISO-date conversion
- **`security/credentials.py`** — device token in Windows Credential Manager (keyring), never on disk
- **`runner.py`** — the one sync flow (doctor → pull → push) shared by the GUI button and headless mode
- **`gui.py`** — a small Tkinter window: company dropdown (auto-detected from Tally), backend URL, one-time pairing-code registration, a **Push Now** button, and an auto-sync section (1–24h frequency, default 3h) that creates/removes a Windows Task Scheduler job
- **`scheduler.py` / `lock.py`** — schtasks integration + a single-instance lock (verified: a second run while one holds the lock exits cleanly)
- **`build.ps1`** → **`connector\dist\arq-connector.exe`** (~16 MB, one file, no Python needed)

**Live end-to-end proof, twice:** a real tenant ("ARQ Code Test") + pairing code were created through the admin CLI, the device registered through the same code path the GUI uses, and a full sync ran — once via `python -m arq_connector.cli run` and once via **the built exe itself**. Both landed real rows in Neon (verified by querying `sync_runs`, `bills`, `ledgers` directly: Alpha Customer's bill with correctly converted dates, the ledger upserted). Config-less: settings live in `%LOCALAPPDATA%\ARQ\settings.json`, written by the GUI.

**Cleanup done in the same pass:** deleted dead code (`state.py` AlterID tracking, the TOML config module + example file — replaced by the GUI-managed settings JSON, the empty `backend/app/core/` package, the leftover `exports/` folder), rewrote the stale root `README.md`, and untracked previously-committed `__pycache__` files.

**How to use it:** see `magic_mds/USER_MANUAL.md`. Test counts after all this: connector 29/29, backend 10/10.

## 6. Polish pass (12-Jul) — auto-start Tally + new UI

- **Auto-start Tally**: scheduled syncs can now launch a closed Tally themselves (`tally/launcher.py`) and wait up to 2 min for the company. Live-tested: launch works (needed `os.startfile` — `Popen` from a windowed PyInstaller exe silently failed, a real bug found and fixed). Caveat discovered live: educational-mode Tally waits at its startup screen for a keypress regardless of `tally.ini` preload; licensed Tally with `Default Companies=Yes` + `Load=` goes straight in. The failure message now explains exactly this.
- **New GUI**: ARQ-branded header with drawn logo, card layout, colored timestamped activity log, big Push Now button, auto-start checkbox. Pure tkinter — no new runtime deps. Exe icon generated by `make_icon.ps1` (multi-size .ico, committed).
- **Windowed-mode hardening**: every subprocess call now sets explicit std handles + `CREATE_NO_WINDOW` (invalid-handle bugs only appear when the exe runs without a console).
- Tests: 36/36 connector (new launcher suite), backend untouched 10/10. Exe rebuilt: still ~16 MB.
- New docs: `HOW_IT_ALL_WORKS.md` (plain-language full-system guide), `USER_MANUAL.md` updated with the auto-start section, `DATA_MODEL.md` (bills-dedup proposal, awaiting go).
