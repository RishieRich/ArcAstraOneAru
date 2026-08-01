# AGENTS.md — shared context for Claude Code, Codex, and any other coding agent

**Read this file first, every session.** It is the single source of truth that keeps
different agents on the same page. Codex CLI loads `AGENTS.md` automatically; Claude Code
loads `CLAUDE.md`, which is a one-line pointer to this file. Keep it that way — one file,
not two drifting copies.

Last verified against the repo: **2026-07-28** (Smart Excel release commit `35c7fa8`;
migration 0007 and both Vercel projects verified in production. `/v1/ask` provider
routing fixed and **deployed** — verified live in production in all four languages,
and the Gemini→Groq fallback proven from Vercel's own network. See trap 13).

---

## 1. What this product is

**ARQ Astra** — a Tally → cloud receivables product for Indian small businesses. A Windows
exe reads TallyPrime read-only on the client's PC, pushes receivables to a FastAPI backend
on Neon Postgres, and the owner sees who owes them money in a multilingual web dashboard
with an AI copilot. The dashboard also accepts `.xlsx`, `.xlsm`, legacy `.xls` and `.csv`
uploads. Familiar Sales/Purchase/Expense/P&L books feed the audited finance model; Smart
Excel profiles unfamiliar multi-sheet business data into explicitly labelled KPIs and charts
without changing connector sync.

Three components, **one repo** (`github.com/RishieRich/ArcAstraOneAru`), three deploy targets:

| Dir | What | Where it runs |
|---|---|---|
| `connector/` | Windows tkinter app → `dist/arq-connector.exe` | Client's PC, next to Tally |
| `backend/` | FastAPI + psycopg on Neon Postgres | Vercel (Root Directory = `backend`) |
| `frontend/` | Vite + React dashboard (EN / Hinglish / Gujarati / Marathi) | Vercel (separate project, Root Directory = `frontend`) |

```
[Client Windows PC]                      [Vercel]                  [Neon Postgres]
  TallyPrime :9000  ──read-only XML──▶  arq-connector.exe
                                             │ HTTPS + device token
                                             ▼
                                        backend (FastAPI) ──────▶  tenants, ledgers,
                                             ▲                      bills, sync_runs,
                browser ──password login──┘                        dashboard_users,
                        │                                         financial_imports,
                        └──optional Excel/CSV upload────────────▶ financial_transactions /
                                                                  smart datasets + rows
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
| `GET /v1/auth/signup/status` | none | public availability flag and ARQ contact details; no counts |
| `POST /v1/auth/signup` | none | create one of 10 isolated free trials, else upsert a waitlist lead |
| `GET /v1/dashboard/companies` | `Bearer <dashboard token>` | tenant list |
| `GET /v1/dashboard/metrics/{tenant_id}` | `Bearer <dashboard token>` | all dashboard numbers |
| `POST /v1/imports/financials` | `Bearer <dashboard token>` | normalize a finance book or profile unfamiliar multi-sheet Excel/CSV data |
| `POST /v1/ask` | `Bearer <dashboard token>` | AI copilot Q&A over the tenant's snapshot |
| `/research/*` | `Bearer <dashboard token>` | Optional, feature-flagged Research Agent; tenant access is checked on every request |
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
- **Public trial signup** â€” migration 0006 marks managed vs free-trial accounts. The capacity
  is exactly 10 `free_trial` users; a Postgres advisory transaction lock prevents concurrent
  signups from exceeding it. Each accepted signup creates its own tenant plus one explicit
  grant. Existing managed users do not consume trial slots. Overflow entries store name,
  company and normalized email in `trial_waitlist`; their submitted password is deliberately
  discarded. Public API responses never expose capacity, remaining places or waitlist
  position. `python -m app.admin list-trial-waitlist` is the private source for active/waiting
  counts and lead details.
- **Smart Excel access** — no account-specific bypass exists. Every managed or active
  free-trial dashboard user may upload only to a tenant already allowed by
  `ensure_dashboard_tenant_access`; waitlisted leads have no token or tenant and see sample
  data only.
- **The exe never writes to Tally** — only read/export XML requests. Keep it that way.
- **Data cleanup re-authenticates** — exact company name plus current password/PIN are
  verified server-side; tenant, dashboard access and registered devices are preserved.
- **No secrets in files or logs**; logs carry counts and statuses, never party names or amounts.

## 5. Environment variables

Backend (`backend/.env` locally, Vercel project env in prod — see `backend/.env.example`):

- `DATABASE_URL` — Neon connection string (`sslmode=require&channel_binding=require`)
- `DASHBOARD_SECRET` — optional; derived from `DATABASE_URL` if unset
- `GEMINI_API_KEY` — **primary** LLM for `/v1/ask`
- `GROQ_API_KEY` — automatic fallback if Gemini errors or is unset. **Not optional in
  practice**: Gemini's free tier meters requests per day per model, so normal use lands
  on Groq most days. Both keys must be set on the Vercel backend project.
- `GEMINI_MODEL` / `GROQ_MODEL` — optional overrides (defaults `gemini-flash-lite-latest`,
  `llama-3.3-70b-versatile`)
- `GEMINI_REASONING_EFFORT` — leave unset. Only for a pinned 3.x *thinking* model; the
  Flash-Lite default rejects the field with 400 (see trap 14)
- `CORS_ORIGINS` — comma-separated dashboard origins; `*` until locked down
- `ARQ_RESEARCH_ENABLED` — optional Research Agent switch; defaults to `true` for demos.
  Set `false` to remove its API surface and frontend nav entry.
- `TAVILY_API_KEY` — required only when running cited customer or supplier discovery.
  Without it, the Agent still builds a data-backed business profile and a ready-to-search
  plan, but returns no external leads; no research results are fabricated.
- `RESEARCH_SEARCH_DEPTH` — Tavily depth; defaults to `advanced`. Research cost is
  bounded by `RESEARCH_MAX_QUERIES` (default 4, hard max 6),
  `RESEARCH_RESULTS_PER_QUERY` (default 6, hard max 8), and
  `RESEARCH_MAX_CANDIDATES` (default 20, hard max 30).

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
cd connector; .\build.ps1                                               # validated unsigned developer build
cd connector; .\build.ps1 -Release -CertificateThumbprint <thumbprint>  # signed client ZIP

# Admin CLI (from backend/, venv active)
python -m app.admin create-tenant --name "Acme"
python -m app.admin issue-pairing-code --tenant-id <id>
python -m app.admin list-tenants
python -m app.admin revoke-device --device-id <id>
python -m app.admin create-dashboard-user --email x@y.com --password "strong-password"
python -m app.admin grant-dashboard-access --email x@y.com --tenant-id <id>
python -m app.admin list-dashboard-users
python -m app.admin list-trial-waitlist
python -m app.admin delete-dashboard-user --email x@y.com
python scripts\seed_research_demo.py  # creates a separate, labelled synthetic demo tenant

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
- Excel ingestion uses `openpyxl` plus `xlrd` for legacy `.xls`; both are deliberate
  runtime dependencies and must remain in `backend/pyproject.toml` and
  `backend/requirements.txt`.
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
   The importer also detects single-sheet registers with parent voucher/product-detail rows.
   It reconciles quantity * rate to value per row, supports concatenated layouts that shift
   columns mid-sheet, reports non-reconciling footer totals, and flags identical-looking rows
   without silently dropping them when the export has no voucher number/GUID.
8. **Apply `0005_bill_current_state.sql` before deploying the matching backend.** It
   collapses referenced historical bill duplicates, adds current/closed bill state, and
   canonicalizes GUID-less Excel identities. Sync, import and cleanup serialize per tenant
   with one Postgres advisory transaction lock. A compatibility trigger keeps the older
   deployed sync insert working safely until the matching backend is deployed.
9. **Apply `0006_public_trials.sql` before deploying public-signup code.** It adds
   `dashboard_users.account_type`, `trial_waitlist`, and the `profit_loss` import-envelope
   constraint. The migration is idempotent, but production application remains owner-gated.
10. **Apply `0007_smart_excel_datasets.sql` before deploying Smart Excel code.** The
    dashboard queries `smart_imports`, `smart_datasets` and `smart_rows`. Known finance sheets
    keep their existing normalized path; generic profiles never masquerade as statutory
    accounting classifications. Do not deploy the matching backend first.
11. **Advisory-lock tenant IDs must be cast to text.** Psycopg binds the connector's tenant
   ID as PostgreSQL `uuid`, while `hashtext()` accepts only text. The writer paths use
   `hashtextextended(cast(%s as text), 0)`; preserve the cast.
12. **Client connector releases support Windows 10/11 x64 and must be Authenticode-signed.**
   `connector/build.ps1 -Release` refuses to package a release without a current-user
   code-signing certificate/private key and SignTool. It embeds version metadata and a
   multi-resolution icon, runs connector-only tests, validates the x64 PE/icon/signature,
   and creates a checksum-bearing versioned ZIP. Unsigned developer builds can be blocked
   by Windows Smart App Control and must not be sent to clients.
13. **`/v1/ask` provider traps — all three broke the copilot at once (fixed 2026-07-27).**
    Verified live against both provider APIs; don't "clean up" any of these.
    - **Groq is behind Cloudflare, which 403s `Python-urllib/3.x`** with `error code: 1010`.
      urllib sends that User-Agent by default, so the fallback failed on *every* call and
      the copilot died the moment Gemini hit its quota. `_call` now always sends
      `USER_AGENT`. A/B proof: `Python-urllib/3.13` → 403, `curl/8.5.0` → 200, same key.
    - **`gemini-flash-latest` drifted onto `gemini-3.6-flash`, free-tier cap 20 req/day**
      (`GenerateRequestsPerDayPerProjectPerModel-FreeTier`). The alias comment claiming it
      "never goes stale" was the trap. Default is now `gemini-flash-lite-latest`; Lite has
      real free-tier headroom and an alias can't 404 the way a pinned model does
      (`gemini-2.5-flash` already returns 404 "no longer available to new users").
    - **Provider request knobs are per-model, not per-provider.** `reasoning_effort` is
      accepted by `gemini-3.1-flash-lite`, rejected with 400 `INVALID_ARGUMENT` by
      `gemini-flash-lite-latest`, and hard-400s on Groq's llama-3.3. Hence `_Provider.extra`.
      Never move it to a shared payload.
    An empty `content` is treated as a provider failure so it falls through instead of
    returning a blank bubble. Fallback order is exercised by
    `backend/tests/test_ask_providers.py` with no network.
    - **The Vercel backend project had neither LLM key until 2026-07-27** — only
      `DATABASE_URL`. The copilot had therefore never worked in production; it returned
      503, while local dev returned 502 from real provider failures. Both keys are now
      set (Production scope). `npx vercel@latest env ls production` is the fast check,
      and the 503-vs-502 split tells you which failure you are looking at.
    - Verified end-to-end in production by pinning `GEMINI_MODEL` to the exhausted
      `gemini-3.6-flash`: the request returned 200 from Groq and the runtime log showed
      `[ask] provider failed ... gemini: HTTP 429`. That is the cheap way to re-prove the
      fallback after touching this code — set the env var, deploy, test, then `env rm`.
14. **Product analytics come only from normalized `item` lines.** Do not infer a product
   from a party or ledger row. Product value, quantity coverage, weighted rate, customers
   and top-customer metrics are computed in `dashboard.product_metrics`. A null unit remains
   unknown. Ask ARQ's one-page report is rendered from authorized dashboard metrics in the
   browser and printed/saved as A4 landscape; the AI narrative never supplies chart numbers.
15. **Research Agent has two honest capability levels.** Internal action plans work from
   current bills and normalized sales without a web credential. Verified new-customer and
   supplier names still require `TAVILY_API_KEY`; production currently has no Tavily key.
   In that state, runs persist a prepared search plan with zero external candidates instead
   of fabricating company names. `GET /research/latest` restores the latest completed work.

## 9. Open items

- **Colleague Test tenant (device `quaidjohar`) always syncs 0 ledgers / 0 bills.** Either an
  empty test company, or their Tally XML shape doesn't match `parse_bills_receivable`
  (`connector/src/arq_connector/tally/parsers.py`), which is live-verified against only one
  bill layout. Needs their real-company push or raw XML to resolve.
- **Public signup has no email verification or bot protection yet.** The ten-place capacity
  prevents more than 10 trial tenants but does not prevent automated waitlist submissions.
  Add verified email and a Vercel WAF/rate-limit rule before a large acquisition campaign.
- **Excel voucher removals/cancellations** — re-exports update vouchers that retain the same
  Tally GUID, but a voucher absent from a later workbook is not automatically deleted. Add an
  explicit snapshot/reconciliation workflow before treating imports as a cancellation ledger.
## 10. Documentation index (`magic_mds/`)

`magic_mds/` is gitignored — these files exist in the local working copy only, never in the repo.
If they are missing, you are in a fresh clone and this file is the only brief you get.

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
| `PUBLIC_TRIAL_SIGNUP.md` | first-10 signup capacity, isolated tenant creation, waitlist and migration 0006 |
| `SMART_EXCEL.md` | multi-sheet fallback model, metric/chart inference, dedup boundary and migration 0007 |
| `RESEARCH_AGENT.md` | ICP scoring, bounded Tavily discovery, evidence scoring, curation and UI behavior |

## 11. Working agreement for agents

**Conventions**

- Match the surrounding code: this repo comments *why*, not *what*, and comments are written
  for a reader who wasn't there. Keep that voice.
- Python: stdlib-first. `/v1/ask` deliberately uses `urllib` over vendor SDKs to keep Vercel
  cold starts lean. Don't add an SDK dependency without a real reason.
- Frontend: plain React + Vite, no UI framework, no state library. Keep it that way.
- All user-facing dashboard strings go through `frontend/src/i18n.js` — **all four languages**
  (EN / Hinglish / Gujarati-Roman / Marathi-Roman). Never hardcode a string in a component.
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
