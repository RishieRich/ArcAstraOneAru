# AGENTS.md — shared context for Claude Code, Codex, and any other coding agent

**Read this file first, every session.** It is the operational entry point that keeps
different agents on the same page. Codex CLI loads `AGENTS.md` automatically; Claude Code
loads `CLAUDE.md`, which is a one-line pointer to this file. Keep it that way — one working
brief, not two drifting copies. The tracked engineering constitution, baseline specifications,
change workflow, and ADRs live under `docs/` and govern future behavior changes.

Last verified against the repo: **2026-08-23** (repository-native SDD constitution v1.2 now
requires bounded work and owner-authorized review slices. Change 002's SLICE-01 through
SLICE-06 are implemented and ready for owner review: predictable logo-home, explicit dashboard
location, grouped secondary tools, and plain login recovery/support. Frontend tests (13) and a
66-assertion local rendered Chrome smoke pass; the change is not deployed and SLICE-07 onward
remain unauthorized.
Baseline specs, change templates, and ADRs are tracked. Connector v0.2.0
reset-registration source, 89 offline tests and an unsigned Windows
x64 internal build were previously validated; it is not a client release because this machine
has no SignTool or code-signing certificate. Receivables filters and email-confirmed cleanup
remain deployed from `main`; Smart Excel migration 0007 and the `/v1/ask` Gemini→Groq fallback
remain live; see traps 13 and 17).

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
| `DELETE /v1/dashboard/data/{tenant_id}` | `Bearer <dashboard token>` + login email/password confirmation | clear synced/imported facts while preserving tenant, access and devices |

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
- **Data cleanup re-authenticates** — the submitted login email must match the signed-in
  dashboard token and the current password/PIN is verified server-side; tenant, dashboard
  access and registered devices are preserved. A temporary `company_name` request fallback
  keeps cached pre-2026-08-09 frontend bundles working during the staged deployment.
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
- `RESEARCH_SEARCH_DEPTH` — Tavily depth; defaults to `advanced`; `basic`, `fast`, and
  `ultra-fast` are also supported. Research cost is
  bounded by `RESEARCH_MAX_QUERIES` (default 4, hard max 6),
  `RESEARCH_RESULTS_PER_QUERY` (default 6, hard max 8), and
  `RESEARCH_MAX_CANDIDATES` (default 20, hard max 30).

Frontend: `VITE_API_BASE_URL` (build-time). Connector: the production alias is the literal
fallback in `connector/src/arq_connector/settings.py`; `ARQ_API_BASE_URL` is a **runtime**
process override and is not baked in merely by setting it in the build shell. Edit the
literal fallback before `build.ps1` only when deliberately building for another backend.

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
6. **`gh` CLI is authenticated** as `RishieRich` on this dev machine as of 2026-08-09.
   Re-check `gh auth status` before publishing rather than assuming the session is permanent.
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
   supplier names require `TAVILY_API_KEY`; it is configured in the Vercel backend Production
   environment as of 2026-08-02. If the key is absent, runs persist a prepared search plan
   with zero external candidates instead of fabricating company names. `GET /research/latest`
   restores the latest completed work. Do not add Tavily's `safe_search` request field without
   confirming an Enterprise key: the current standard key returns 403 when that field is sent,
   while the same bounded search succeeds without it. Tavily also rejects `country` at `fast`
   and `ultra-fast` depth, so the India boost is intentionally sent only for `basic` and
   `advanced` searches. Candidate listing must branch between an unfiltered `all` query and
   `status = %s`; a nullable `(%s is null or status = %s)` predicate raises PostgreSQL
   `IndeterminateDatatype` and hides an otherwise completed Tavily run. Explicit customer
   target industries intentionally drive discovery ahead of SKU-like sales labels, and
   punctuation/wildcards in human-entered material names are token-matched against cited
   evidence instead of treated as literal web text.
16. **Receivables “trajectory” is current exposure, not historical performance.** Connector
   sync stores the current open-bill state plus sync audit counts; it does not yet retain a
   daily outstanding balance series. The dashboard’s invoice-month chart therefore groups
   today’s still-open amount by original bill month and labels that boundary explicitly.
   Do not rename it revenue growth, collection trend or payment improvement without adding
   a real historical snapshot model. Receivables filters are calculated client-side from
   the authorized bill payload and update every visible KPI/chart/list together.
17. **Connector registration reset is local re-pairing, not server revocation.** Connector
   v0.2.0 locks company/code controls while a Windows Credential Manager token exists and
   exposes **Reset registration** behind a warning. Confirming removes only this PC's token,
   saved company name/GUID, disposable last-sync state and scheduled task; it preserves logs,
   Tally and all cloud data. A fresh one-time code and explicit company choice are required,
   and successful registration recreates auto-sync. The old server device remains valid until
   `python -m app.admin revoke-device`; a tenant also remains permanently bound to its first
   Tally company GUID, so a different company needs the correct new tenant/code. Do not word
   the local action as server revocation. Credential read/save failures must always unlock the
   GUI without logging the token. Port-9000 connection failures are intentionally translated
   into TallyPrime Connectivity instructions instead of exposing raw `[WinError 10061]` text.
   The icon verifier checks the current black/orange/silver orbit mark; its former 25%-orange
   threshold rejected the very icon generated by `make_icon.ps1`.

## 9. Open items

- **Colleague Test tenant (device `quaidjohar`) always syncs 0 ledgers / 0 bills.** Either an
  empty test company, or their Tally XML shape doesn't match `parse_bills_receivable`
  (`connector/src/arq_connector/tally/parsers.py`), which is live-verified against only one
  bill layout. Needs their real-company push or raw XML to resolve.
- **Public signup has no email verification or bot protection yet.** The ten-place capacity
  prevents more than 10 trial tenants but does not prevent automated waitlist submissions.
  Add verified email and a Vercel WAF/rate-limit rule before a large acquisition campaign.
- **Company-data cleanup does not yet cover Research Agent rows or future operational data.**
  Before collection actions, contacts or drafts ship, extend the owner-confirmed cleanup and
  retention policy to derived research and collections content. Preserve only the minimum
  pseudonymized security/audit evidence for a fixed, disclosed period after legal/DPDP review.
- **Excel voucher removals/cancellations** — re-exports update vouchers that retain the same
  Tally GUID, but a voucher absent from a later workbook is not automatically deleted. Add an
  explicit snapshot/reconciliation workflow before treating imports as a cancellation ledger.

## 10. Documentation index

Tracked documentation available in every clone:

| File | What it is |
|---|---|
| `ROADMAP.md` | Public product and agent roadmap with maturity labels, release gates, safety boundaries and 18-month direction. |
| `docs/governance/CONSTITUTION.md` | Ratified product and engineering rules that ordinary changes may not weaken. |
| `docs/governance/SDD_WORKFLOW.md` | Simple spec → plan → tasks → verification workflow and approval gates. |
| `docs/specs/baseline/` | Intended current behavior for the six major product capability areas. |
| `docs/specs/changes/` | One auditable folder per proposed or completed behavior change. |
| `docs/decisions/` | Architecture Decision Records for durable technical choices. |
| `archive/` | Tracked historical/reference material that is not used at runtime. |

### Active SDD changes

| Change | State | Next allowed action |
|---|---|---|
| `001-unexpected-empty-sync-quarantine` | Specification draft; implementation blocked | Owner reviews the specification. |
| `002-customer-friendly-ux-quality` | SLICE-01 through SLICE-06 ready for owner review; local tests/build and 66/66 rendered Chrome assertions pass; not deployed; real-data Stage-0 gaps remain recorded | Owner reviews the five journeys in `VERIFICATION.md`, then accepts the batch or requests one bounded correction. Do not start SLICE-07 without authorization. |

### Local-only implementation notes (`magic_mds/`)

`magic_mds/` is gitignored — these files exist in the local working copy only, never in the repo.
If they are missing, you are in a fresh clone and this file is the only brief you get.

| File | What it is |
|---|---|
| `SOLUTION_ARCHITECTURE.md` | Historical deep architecture snapshot: C4 L1–L3, flows, ERD, threat model and older ADRs. Some inventory sections predate migrations 0005–0008; use tracked baseline specs for current contracts. |
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
| `AI_ERA_REVIEW_PLAYBOOK.md` | Historical July 2026 review playbook; its code and test inventory is no longer current. |
| `EXCEL_IMPORT_SETUP.md` | Neon migration, deploy and verification steps for optional workbook imports |
| `DATA_CLEANUP_AND_DEDUP.md` | reset boundary, Tally/Excel dedup behavior and migration 0005 deployment order |
| `PUBLIC_TRIAL_SIGNUP.md` | first-10 signup capacity, isolated tenant creation, waitlist and migration 0006 |
| `SMART_EXCEL.md` | multi-sheet fallback model, metric/chart inference, dedup boundary and migration 0007 |
| `RESEARCH_AGENT.md` | ICP scoring, bounded Tavily discovery, evidence scoring, curation and UI behavior |
| `ux_002_smoke.mjs` / `ux-002-evidence/` | Local-only package-free Chrome harness, exact results and screenshots for change 002 SLICE-04 through SLICE-06. |

## 11. Working agreement for agents

**Specification-driven changes**

- Before changing behavior, read `docs/governance/CONSTITUTION.md`,
  `docs/governance/SDD_WORKFLOW.md`, and the affected baseline specs.
- Do not implement a feature or cross-component behavior change until its `SPEC.md` status is
  `Approved` by the owner. Resolve blocking decisions first.
- Build the plan and tasks from numbered requirements. Every implementation task and
  verification row cites the requirements it covers.
- `TASKS.md` uses vertical review slices, normally sized for one focused 45-60 minute session.
  The size is a planning guide, never a false passing condition.
- Do not start product code until the owner approves the task list and explicitly authorizes
  named slices or a named batch. Stop after the last authorized slice.
- Every UI slice includes its checks and ends with a recorded live UI review. If a slice is too
  large, leave a safe passing checkpoint and propose smaller slices for owner approval.
- Create an ADR only for a lasting architecture choice, not ordinary implementation detail.
- After verification and release, update the affected baseline specs and this file when its
  architecture, endpoint, environment, deployment, or trap summary changed.
- Documentation-only edits and narrowly mechanical fixes may use the lighter path described in
  the workflow. Constitution rules always apply.

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
2. Update the approved change's verification record and affected tracked baseline specs.
3. Log supporting implementation detail in the right `magic_mds/` doc when useful; local-only
   notes must not be the sole source of a product contract.
4. Move resolved items out of §9 and add newly discovered ones.
5. Say plainly in your final message what you changed, what you verified, and what you didn't.

**Do not, without asking the owner**

- Apply the bills-dedup migration, or any migration, against the live Neon DB.
- Commit or push (this repo's owner drives that), and never commit `.env` or keys.
- Bake a non-alias backend URL into the exe.
- Weaken any item in §4.
