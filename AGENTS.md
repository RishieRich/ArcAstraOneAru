# AGENTS.md — shared context for Claude Code, Codex, and any other coding agent

**Read this file first, every session.** It is the single source of truth that keeps
different agents on the same page. Codex CLI loads `AGENTS.md` automatically; Claude Code
loads `CLAUDE.md`, which is a one-line pointer to this file. Keep it that way — one file,
not two drifting copies.

Last verified against the repo: **2026-07-26** (commit `cebbcbc`).

---

## 1. What this product is

**ARQ Astra** — a Tally → cloud receivables product for Indian small businesses. A Windows
exe reads TallyPrime read-only on the client's PC, pushes receivables to a FastAPI backend
on Neon Postgres, and the owner sees who owes them money in a trilingual web dashboard with
an AI copilot. The dashboard also accepts optional Tally-style `.xlsx` exports for sales,
purchases and expenses; these add business-flow metrics without changing connector sync.

Three components, **one repo** (`github.com/RishieRich/ArcAstraOneAru`), three deploy targets:

| Dir | What | Where it runs |
|---|---|---|
| `connector/` | Windows tkinter app → `dist/arq-connector.exe` | Client's PC, next to Tally |
| `backend/` | FastAPI + psycopg on Neon Postgres | Vercel (Root Directory = `backend`) |
| `frontend/` | Vite + React dashboard (EN / Hinglish / Gujarati) | Vercel (separate project, Root Directory = `frontend`) |

```
[Client Windows PC]                      [Vercel]                  [Neon Postgres]
  TallyPrime :9000  ──read-only XML──▶  arq-connector.exe
                                             │ HTTPS + device token
                                             ▼
                                        backend (FastAPI) ──────▶  tenants, ledgers,
                                             ▲                      bills, sync_runs,
                browser ──password login──┘                        dashboard_users,
                        │                                         financial_imports,
                        └──optional .xlsx upload─────────────────▶ financial_transactions
                     frontend (React)
```

## 2. Live URLs and ports

- Backend production alias: **https://arcastraone.vercel.app**
  - ⚠️ Per-deployment `*-projects.vercel.app` URLs sit behind Vercel SSO. **Never bake one
    into the exe and never use one for testing** — they return an SSO HTML page, not JSON.
  - Sanity check after any deploy: `GET /health` then `GET /health/db` (the latter proves
    Neon is reachable and returns a tenant count).
- Frontend: its own Vercel project; `VITE_API_BASE_URL` is baked **at build time**, so
  changing it requires a redeploy, not just an env edit.
- Local dev: backend on **:8010** (a dead-PID socket squats on :8000 on the dev machine),
  frontend `npm run dev` on :5173. `frontend/src/api.js` falls back to `http://127.0.0.1:8010`.

## 3. API surface (as of this writing)

| Method + path | Auth | Purpose |
|---|---|---|
| `GET /health`, `GET /health/db` | none | liveness / Neon reachability |
| `POST /v1/devices/register` | pairing code in body | exchange one-time code for a device token |
| `POST /v1/sync` | `Authorization: Bearer <device token>` | receive one snapshot (ledgers + bills) |
| `POST /v1/auth/login` | email + password (legacy 4-digit PIN still accepted) | returns stateless HMAC dashboard token |
| `GET /v1/dashboard/companies` | `Bearer <dashboard token>` | tenant list |
| `GET /v1/dashboard/metrics/{tenant_id}` | `Bearer <dashboard token>` | all dashboard numbers |
| `POST /v1/imports/financials` | `Bearer <dashboard token>` | classify + import one Tally `.xlsx` workbook |
| `POST /v1/ask` | `Bearer <dashboard token>` | AI copilot Q&A over the tenant's snapshot |
| `DELETE /v1/dashboard/data/{tenant_id}` | `Bearer <dashboard token>` + password/name confirmation | clear synced/imported facts while preserving tenant, access and devices |

Routers live in `backend/app/routers/`; wiring is in `backend/app/main.py`.

## 4. Security model (do not weaken any of these)

- **Pairing code** — one-time, admin-issued per client, 72h expiry, dead after use.
- **Device token** — issued at registration, stored on the client in **Windows Credential
  Manager** (never a file); backend stores only its hash (`app/security.py`).
- **Company GUID binding** — a tenant is permanently bound to the first Tally company GUID
  it registers with. Valid token + wrong company = 403.
- **Dashboard auth** — email + password (`dashboard_users`, migration 0002); legacy 4-digit
  PINs still verify. Hash is PBKDF2-HMAC-SHA256, 200k iterations, salted. Session is a
  stateless HMAC token (7-day TTL); secret = `DASHBOARD_SECRET`, else derived from `DATABASE_URL`.
- **Per-company access scoping** — `dashboard_users.all_tenants` plus
  `dashboard_user_tenants` (migration 0004). Existing owner accounts are explicitly promoted
  to all-company access; new accounts default to no access until granted a tenant. Enforced by
  `ensure_dashboard_tenant_access` on `/metrics`, `/imports`, `/ask`, and inside the `/companies`
  query. Grant with `python -m app.admin grant-dashboard-access`.
- **The exe never writes to Tally** — only read/export XML requests. Keep it that way.
- **Data cleanup re-authenticates** — exact company name plus current password/PIN are
  verified server-side; tenant, dashboard access and registered devices are preserved.
- **No secrets in files or logs**; logs carry counts and statuses, never party names or amounts.

## 5. Environment variables

Backend (`backend/.env` locally, Vercel project env in prod — see `backend/.env.example`):

- `DATABASE_URL` — Neon connection string (`sslmode=require&channel_binding=require`)
- `DASHBOARD_SECRET` — optional; derived from `DATABASE_URL` if unset
- `GEMINI_API_KEY` — **primary** LLM for `/v1/ask`
- `GROQ_API_KEY` — automatic fallback if Gemini errors or is unset
- `GEMINI_MODEL` / `GROQ_MODEL` — optional overrides (defaults `gemini-flash-latest`,
  `llama-3.3-70b-versatile`)
- `CORS_ORIGINS` — comma-separated dashboard origins; `*` until locked down

Frontend: `VITE_API_BASE_URL` (build-time). Connector: `ARQ_API_BASE_URL` at **build** time,
or edit `DEFAULT_API_BASE_URL` in `connector/src/arq_connector/settings.py` before `build.ps1`.

`.env` files are gitignored. Never commit one, never paste real keys into docs or commit messages.

## 6. How to run things (PowerShell, Windows)

```powershell
# Backend (needs backend\.env with DATABASE_URL)
cd backend; ..\.venv\Scripts\Activate.ps1; uvicorn app.main:app --port 8010
# or: .\backend\start_backend.ps1

# Backend tests (they hit the live Neon DB — they are not hermetic)
cd backend; python -m pytest

# Frontend
cd frontend; npm install; npm run dev        # :5173
cd frontend; npm run build

# Connector (its own venv)
cd connector; .venv\Scripts\Activate.ps1; python -m arq_connector.cli   # no args = GUI
cd connector; python -m arq_connector.cli doctor                        # Tally health check
cd connector; python -m pytest                                          # offline, real captured Tally XML
cd connector; .\build.ps1                                               # rebuild dist\arq-connector.exe

# Admin CLI (from backend/, venv active)
python -m app.admin create-tenant --name "Acme"
python -m app.admin issue-pairing-code --tenant-id <id>
python -m app.admin list-tenants
python -m app.admin revoke-device --device-id <id>
python -m app.admin create-dashboard-user --email x@y.com --password "strong-password"
python -m app.admin grant-dashboard-access --email x@y.com --tenant-id <id>
python -m app.admin list-dashboard-users
python -m app.admin delete-dashboard-user --email x@y.com

# DB migrations
cd backend; python migrations\run_migration.py
```

## 7. Deploy

Push to `main` first, then deploy both existing Vercel projects manually. Git auto-deploy
did not trigger for either project during the 2026-07-25 release; both projects still showed
their 13-day-old deployments after the push. Until the Git integrations are repaired, use:

```powershell
# Backend: run from the repository root because the Vercel project already has
# Root Directory = backend. Running from backend/ incorrectly resolves backend/backend.
npx vercel@latest link --project arcastraone --yes
npx vercel@latest --prod --yes

# Frontend: its linked project deploys from frontend/.
cd frontend
npx vercel@latest --prod --yes
```

There is **no `vercel.json`** in this repo; configuration lives in
`backend/pyproject.toml` and the Vercel project settings:

- Vercel's Python builder installs from `[project].dependencies` and **ignores
  `requirements.txt`** — keep both lists in sync or the build silently lacks a package.
- Excel ingestion uses `openpyxl`; it is a deliberate runtime dependency and must remain
  in both `backend/pyproject.toml` and `backend/requirements.txt`.
- `[tool.vercel] entrypoint = "api.index:app"` is required: the FastAPI preset finds several
  ASGI `app` objects (`api/index.py`, `app/main.py`, `tests/conftest.py`) and refuses to guess.
- Root Directory **must** be `backend` for the backend project, `frontend` for the frontend.

Full notes: `magic_mds/VERCEL_DEPLOY.md`.

## 8. Known quirks and traps (learned the hard way — read before debugging)

1. **Neon free tier suspends compute after ~5 min idle.** Cold-start connects used to raise
   an unhandled `OperationalError` and Vercel returned an opaque `FUNCTION_INVOCATION_FAILED`.
   Fixed in `289bd4e`: `db.py` retries 3× with a 10s timeout, and `main.py` has a catch-all
   middleware that always returns JSON `{"detail": ...}`. **Do not remove either.**
   Writeup: `magic_mds/ERROR101_RESOLUTION.md`.
2. **Tally sends receivables as negative (Dr) amounts.** The DB stores the raw sign; dashboard
   endpoints report `abs()`. Don't "fix" the sign in the DB layer.
3. **Vercel error-page IDs embed a millisecond epoch** (`bom1::xxx-<ms>-...`) — useful for
   dating an incident from a screenshot.
4. **Educational-mode Tally** ignores the `tally.ini` company preload and waits at its startup
   screen, so unattended sync only works on **licensed** TallyPrime with `Default Companies=Yes`
   + `Load=<n>`. This is a Tally limitation, not a bug to fix.
5. **`/v1/sync` is idempotent by run ID** — retries return the earlier result rather than
   duplicating rows. Preserve that when touching `routers/sync.py`.
6. **`gh` CLI is not authenticated** on this dev machine; GitHub work is manual.
7. **Apply `0003_financial_imports.sql` before deploying code that queries finance data.**
   Imports accept `.xlsx` up to 5 MB, never store the original file, reject mixed/wrong
   voucher types, deduplicate exact files by SHA-256, and upsert vouchers by Tally GUID.
8. **Apply `0005_bill_current_state.sql` before deploying the matching backend.** It
   collapses referenced historical bill duplicates, adds current/closed bill state, and
   canonicalizes GUID-less Excel identities. Sync, import and cleanup serialize per tenant
   with one Postgres advisory transaction lock. A compatibility trigger keeps the older
   deployed sync insert working safely until the matching backend is deployed.
9. **Advisory-lock tenant IDs must be cast to text.** Psycopg binds the connector's tenant
   ID as PostgreSQL `uuid`, while `hashtext()` accepts only text. The writer paths use
   `hashtextextended(cast(%s as text), 0)`; preserve the cast.

## 9. Open items

- **Colleague Test tenant (device `quaidjohar`) always syncs 0 ledgers / 0 bills.** Either an
  empty test company, or their Tally XML shape doesn't match `parse_bills_receivable`
  (`connector/src/arq_connector/tally/parsers.py`), which is live-verified against only one
  bill layout. Needs their real-company push or raw XML to resolve.
- **Migration 0005 is applied; matching application code is not deployed yet.** Neon was
  migrated and verified on 2026-07-26. Commit/push and deploy backend then frontend before
  expecting the Start fresh UI and full current-snapshot close behavior in production. The
  migration's compatibility trigger prevents the older deployed sync route from failing.
- **Excel voucher removals/cancellations** — re-exports update vouchers that retain the same
  Tally GUID, but a voucher absent from a later workbook is not automatically deleted. Add an
  explicit snapshot/reconciliation workflow before treating imports as a cancellation ledger.

## 10. Documentation index (`magic_mds/`)

| File | What it is |
|---|---|
| `SOLUTION_ARCHITECTURE.md` | **ARB-ready end-to-end architecture**: C4 L1–L3, sequence flows, ERD, threat model, ADRs, risks. Self-contained — hand it to any LLM to generate an architecture deck. |
| `HOW_IT_ALL_WORKS.md` | plain-language system tour (⚠️ its "next steps" section predates the Vercel deploy) |
| `USER_MANUAL.md` | end-user install / register / use of the exe |
| `CONNECTOR_SETUP.md` | connector installation detail |
| `DATA_MODEL.md` | current connector, workbook and reset data model |
| `DASHBOARD_TABLE_REFERENCE.md` | what every dashboard number means |
| `VERCEL_DEPLOY.md` | deploy procedure and preset gotchas |
| `ERROR101_RESOLUTION.md` | the Neon cold-start incident, root cause → fix |
| `TALLY_TEST_DATA.md` | test company + captured XML fixtures |
| `readme_1107_base.md` | original implementation plan |
| `readme_1107_output.md` | build log of what was actually shipped and verified |
| `AI_ERA_REVIEW_PLAYBOOK.md` | review playbook |
| `EXCEL_IMPORT_SETUP.md` | Neon migration, deploy and verification steps for optional workbook imports |
| `DATA_CLEANUP_AND_DEDUP.md` | reset boundary, Tally/Excel dedup behavior and migration 0005 deployment order |

## 11. Working agreement for agents

**Conventions**

- Match the surrounding code: this repo comments *why*, not *what*, and comments are written
  for a reader who wasn't there. Keep that voice.
- Python: stdlib-first. `/v1/ask` deliberately uses `urllib` over vendor SDKs to keep Vercel
  cold starts lean. Don't add an SDK dependency without a real reason.
- Frontend: plain React + Vite, no UI framework, no state library. Keep it that way.
- All user-facing dashboard strings go through `frontend/src/i18n.js` — **all three languages**
  (EN / Hinglish / Gujarati-Roman). Never hardcode a string in a component.
- Money is displayed in Indian lakh-crore grouping (`Rs 1,25,000`).

**Before you finish a session**

1. If you changed architecture, env vars, endpoints, deploy config, or discovered a new trap —
   **update this file** (and bump the "Last verified" date at the top). That is how the next
   agent, human or otherwise, stays in sync.
2. Log anything substantial in the right `magic_mds/` doc; this file stays a map, not a journal.
3. Move resolved items out of §9 and add newly discovered ones.
4. Say plainly in your final message what you changed, what you verified, and what you didn't.

**Do not, without asking the owner**

- Apply the bills-dedup migration, or any migration, against the live Neon DB.
- Commit or push (this repo's owner drives that), and never commit `.env` or keys.
- Bake a non-alias backend URL into the exe.
- Weaken any item in §4.
