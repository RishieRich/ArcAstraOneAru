# ARQ Tally Connector — Implementation Plan (v1: Secure Data Hosting)

> **Execution doc for Claude Code.** Work milestone by milestone, in order. Do not start a milestone until the previous one's acceptance criteria pass. Do not build anything listed in Non-Goals. Stop at every `HUMAN CHECKPOINT` and ask Rishi to run the live-Tally verification before continuing.

---

## 1. Objective

One Windows `.exe` that:

1. **Detects** TallyPrime on any client Windows machine (running? gateway on? which company loaded?)
2. **Extracts** receivables data via the port-9000 XML/HTTP gateway (read-only, always)
3. **Pushes** it to our cloud API over an authenticated, tenant-isolated channel
4. Data lands in Cloud SQL (Postgres), keyed to the right tenant, with an audit trail

**End state of this plan: data hosted securely in the cloud. Nothing more.** UI consumption of this data is the next plan, not this one.

---

## 2. Context (read before writing any code)

- **OS/Shell:** Windows 11, **PowerShell** (not cmd, not bash). PowerShell 5.1 does not support `&&` chaining — use `;` or separate commands.
- **Python:** 3.13.2. Connector gets its **own venv** at `connector\.venv` (do not reuse backend's venv — different dependency sets).
- **Repo root:** `D:\AI_Projects\ARQ\ARQ_Astra_Launch\`
  - `backend\` → existing FastAPI + Postgres app (deployed on GCP: Cloud Run + Cloud SQL, Firebase Auth, Secret Manager)
  - `connector\` → NEW. This plan builds it.
- **Database — two environments:**
  - **Dev (now): Neon** — a free hosted Postgres, already provisioned. Database `neondb`, branch `br-polished-bread-aifac7g7`. The M3 schema tables (`tenants`, `devices`, `sync_runs`, `bills`, etc.) are **already created** in it and seeded with the Pawan test rows (2 parties, ₹60K). All M3/M4 development and testing runs against Neon.
  - **Prod (later): Cloud SQL for PostgreSQL** on GCP — the locked production stack. The exact same schema migrates there before the real unattended Pawan sync. Do not point production at Neon.
  - The connection string lives in an env var `DATABASE_URL` (never committed). Neon pauses on inactivity and wakes on the next query — a 1–2s cold-start lag in dev is normal, not a bug.
- **Tally access path:** HTTP POST of XML envelopes to `http://localhost:9000` (default; configurable). ODBC is deprecated in TallyPrime 4.0+ — do not use it.
- **Encoding:** Tally responds in **UTF-16**. Gujarati party names must survive the full round trip (Tally → parser → JSON → API → Postgres).
- **Live test fixture:** Pawan Engineering Works — Tally in educational mode, ~₹60,000 outstanding across 2 parties. Every live smoke test uses this.
- **Known vulnerability being fixed in this plan:** the existing backend sync endpoint trusts an unauthenticated `X-Company-Name` header — tenant spoofing risk. M3 removes it completely. Tenant identity must never be client-asserted again.

---

## 3. Architecture

```
[Client Windows machine]                         [GCP]
┌─────────────────────────────┐
│ TallyPrime (company open)   │
│   └── XML gateway :9000     │
│           ▲                 │
│           │ XML over HTTP   │
│   arq-connector.exe         │──HTTPS──▶  Cloud Run (FastAPI)
│   (Task Scheduler, hourly)  │  Bearer         │
│   token in Windows          │  device         ▼
│   Credential Manager        │  token     Cloud SQL (Postgres)
└─────────────────────────────┘            tenant-isolated tables
```

**Core security decisions (non-negotiable):**

1. **Tenant identity = server-side lookup from device token.** The connector never tells the server "which tenant I am" as a trusted value. Server derives tenant from the token.
2. **Tally company GUID = tenant fingerprint.** Captured at device registration (trust-on-first-use), verified on every sync. GUID mismatch → 403, sync rejected.
3. **Token storage:** Windows Credential Manager via `keyring`. Never in the TOML config, never in logs, never on disk in plaintext.
4. **Read-only toward Tally.** No voucher creation/alteration envelopes, ever. Extraction only.

**Sync model (v1):** full snapshot per run for bills and debtor balances — simple, idempotent, robust. AlterID is tracked for ledger masters as an incremental optimization, but snapshot correctness never depends on it.

---

## 4. Non-Goals (do not build any of this)

- UI / dashboard / data read APIs for a frontend (next plan)
- WhatsApp delivery, payment reminders, AI insights
- Multi-company sync per device (v1 = one pinned company; if multiple companies are loaded, fail with a clear message telling the operator which name to pin in config)
- Writing anything into Tally
- HMAC request signing, mTLS, automated key rotation (Bearer over TLS is v1 — do not gold-plate)
- Auto-update mechanism for the exe
- Installer/MSI (a copied exe + `install-task` command is v1)

If a task feels like it belongs here, stop and ask.

---

## 5. Repo layout to create

```
connector/
├── pyproject.toml
├── config.example.toml
├── build.ps1                      # PyInstaller build script (M5)
├── OPERATOR_SETUP.md              # written in M5
├── src/arq_connector/
│   ├── __init__.py
│   ├── cli.py                     # entrypoint: doctor | register | pull | sync | install-task | uninstall-task
│   ├── config.py                  # TOML load + validation (M0 work exists — reuse/port it)
│   ├── logging_setup.py           # rotating file logs → %LOCALAPPDATA%\ARQ\logs
│   ├── tally/
│   │   ├── client.py              # HTTP transport, UTF-16 decode, invalid-char sanitize, timeouts
│   │   ├── envelopes.py           # XML request builders
│   │   ├── parsers.py             # XML → dataclasses/pydantic models
│   │   └── detect.py              # process check, port check, company discovery
│   ├── sync/
│   │   ├── snapshot.py            # orchestrates pull → snapshot payload
│   │   ├── pusher.py              # authenticated POST to cloud, retries, idempotency
│   │   └── state.py               # local state (last AlterID, last run) → %LOCALAPPDATA%\ARQ\state.json
│   └── security/
│       └── credentials.py         # device token via keyring (Windows Credential Manager)
└── tests/
    ├── fixtures/                  # captured REAL Tally XML responses (sanitized)
    ├── test_parsers.py
    ├── test_detect.py
    └── test_snapshot.py
```

**Allowed dependencies:** `httpx` (or `requests`), `pydantic`, `keyring`, stdlib `xml.etree.ElementTree` (or `lxml` if genuinely needed), `pytest`, `pyinstaller>=6.10` (3.13 support). Anything beyond this list — ask first.

---

## 6. Milestones

### M0 — Scaffold & config  *(mostly done — verify, don't rebuild)*

Config loading via `tomllib` was already debugged (including PowerShell quirks). Port that work into `connector/src/arq_connector/config.py`.

**Deliverables**
- Package scaffold per layout above, venv created, deps installed
- `config.py`: loads `config.toml`, validates required fields, clear error messages for missing/malformed config
- `logging_setup.py`: rotating logs at `%LOCALAPPDATA%\ARQ\logs\connector.log`

**Acceptance criteria**
- `python -m arq_connector.cli doctor --config config.toml` loads config, prints resolved values, exits 0 (doctor's Tally checks come in M1 — for now it only proves config + logging work)
- Runs clean in PowerShell 5.1 and 7

---

### M1 — Tally detection & health check

**Deliverables**
- `detect.py` with four independent checks:
  1. Tally process present (`tally.exe` / TallyPrime process via `tasklist` or psutil-free stdlib approach)
  2. TCP connect on configured host:port
  3. Gateway alive: plain GET to `http://host:port` — a running Tally gateway returns a "server is running"-style response
  4. Company discovery: XML request for the list of open companies → name, GUID, financial-year start
- `doctor` subcommand prints a status table and returns **distinct exit codes**:
  - `0` = healthy (gateway up, exactly the configured company open)
  - `10` = Tally not running
  - `11` = Tally running, gateway off (port closed)
  - `12` = gateway on, no company open / configured company not found
  - `13` = multiple companies open and none pinned in config
- Each failure prints a one-line operator hint in simple Hinglish + English (operators are factory staff, not engineers). Example for 12: `"Tally mein company open karo → Configured: 'Pawan Engineering Works'"`

**Acceptance criteria**
- Live educational Tally with Pawan open → `doctor` exits 0, shows company name + GUID
- Tally closed → exits 10 with correct hint. Company closed → 12. (Rishi runs these three states manually.)
- Raw company-list XML response captured into `tests/fixtures/` (this becomes the parser's test fixture)

**`HUMAN CHECKPOINT`** — Rishi runs doctor against live Tally in all failure states before M2 starts.

---

### M2 — Extraction engine (local only — no cloud calls yet)

**Deliverables**
- Envelopes + parsers for three datasets:
  1. **Company info**: name, GUID, books-from date
  2. **Sundry debtor ledgers**: name, GUID, parent group, closing balance, AlterID
  3. **Bills receivable** (bill-by-bill): party name/GUID, bill ref, bill date, due date, pending amount, overdue days
- `client.py` handles: UTF-16 decode, **stripping invalid XML 1.0 control characters** (Tally is known to emit them — sanitize before parsing), 15s timeouts, and detecting Tally's in-body errors (Tally can return HTTP 200 with a `LINEERROR` in the body — treat that as failure)
- `pull --out <path>` writes `snapshot.json` (UTF-8): `{company, ledgers[], bills[], pulled_at, connector_version}`
- `state.py` records last-seen AlterID per master type after each successful pull
- Unit tests run against fixtures with no Tally required

**Acceptance criteria**
- Pawan pull matches the Tally screen: 2 parties, ₹60K total pending, bill-level rows correct
- Gujarati party names appear correctly in `snapshot.json` when opened in an editor
- `pytest` green with Tally closed (fixtures only)

**`HUMAN CHECKPOINT`** — Rishi eyeballs `snapshot.json` against Tally's Bills Receivable screen line by line.

---

### M3 — Ingestion API + tenant security fix  *(work happens in `backend/`, not `connector/`)*

**Deliverables**
- DB migration adding: `tenants`, `devices`, `pairing_codes`, `ledgers`, `bills`, `sync_runs` (schema in §7). **A simplified subset already exists in Neon dev** (tenants, devices, sync_runs, bills) — reconcile the migration with what's live: add the missing tables (`pairing_codes`, `ledgers`) and any missing columns rather than dropping/recreating. Write the migration as an idempotent script (`create table if not exists`, additive `alter table`) so it runs clean against both the seeded Neon dev DB and a fresh Cloud SQL prod DB.
- The backend reads its connection from `DATABASE_URL` (env var / Secret Manager in prod). No hardcoded connection strings anywhere.
- `POST /v1/devices/register` — body: `{pairing_code, company_guid, machine_label}` → returns `{device_token}` once. Pairing codes are single-use, hashed at rest, expire in 72h. Registration binds `company_guid` to the tenant (trust-on-first-use) if not already bound.
- Auth dependency: `Authorization: Bearer <token>` → SHA-256 hash lookup in `devices` → attach `tenant_id` to request context. Missing/invalid/revoked → 401.
- **Delete the `X-Company-Name` path entirely.** Grep the whole backend and remove every read of that header.
- `POST /v1/sync` — validates payload (pydantic), verifies payload `company_guid` == tenant's bound GUID (mismatch → 403), then in one DB transaction: insert `sync_runs` row, upsert ledgers on `(tenant_id, tally_guid)`, insert bills tied to this `sync_run_id`. Idempotency: client-supplied sync-run UUID; duplicate UUID → return prior result, don't double-insert.
- Admin utility (CLI script is fine for v1): create tenant, issue pairing code, revoke device.

**Acceptance criteria**
- No token → 401. Garbage token → 401. Valid token + wrong `company_guid` → 403. Valid → 200, rows in Postgres, `sync_runs` recorded.
- `grep -ri "x-company-name" backend/` → **zero hits**
- Two-tenant test: create tenants A and B; A's token can never write rows visible under B. Prove with a test.

**`HUMAN CHECKPOINT`** — Rishi reviews the auth dependency + migration diff before deploy to Cloud Run.

---

### M4 — Secure sync client (connector → cloud)

**Deliverables**
- `register --pairing-code XXXX` → runs doctor, calls `/v1/devices/register` with discovered `company_guid`, stores token via `keyring` (service name `arq-connector`). Prints success; never prints the token after storage.
- `sync` = doctor → pull → `POST /v1/sync`. Retries: 3 attempts, exponential backoff, 15s request timeout. Generates the sync-run UUID client-side (idempotency key).
- Single-instance lock (lock file in `%LOCALAPPDATA%\ARQ\`) so overlapping scheduled runs no-op cleanly.
- **Log hygiene:** INFO level logs record counts, durations, statuses only. Party names and amounts appear only at DEBUG. Token never appears at any level.

**Acceptance criteria**
- Full loop from Pawan's machine: `register` once, then `sync` lands data in Cloud SQL
- Kill network mid-sync → clean retry then clean failure; no partial rows (server transaction guarantees this); next run succeeds
- Search all logs and files on disk: token appears nowhere

**`HUMAN CHECKPOINT`** — end-to-end run from the real Pawan machine, verified in Cloud SQL.

---

### M5 — Packaging & scheduling

**Deliverables**
- `build.ps1`: PyInstaller one-file build → `dist\arq-connector.exe`
- `install-task` subcommand: creates a Windows Task Scheduler job (`schtasks` or `Register-ScheduledTask`) — every 60 min + at logon; `uninstall-task` removes it
- `OPERATOR_SETUP.MD`: numbered install guide a non-technical person can follow (copy exe → run `register` with pairing code → run `install-task` → done)

**Acceptance criteria**
- Clean Windows VM with **no Python installed**: exe runs `doctor`, `register`, `sync` successfully
- Scheduled task fires; a second overlapping start exits immediately via the instance lock
- Exe starts in a few seconds; no console encoding errors with Gujarati output

**`HUMAN CHECKPOINT`** — full unattended cycle observed on Pawan's machine (or clean VM) over 2+ scheduled runs.

---

## 7. Postgres schema (target for M3 migration)

> **Dev status:** a simplified version of `tenants`, `devices`, `sync_runs`, and `bills` is already live in Neon (`neondb`) with Pawan test data. The migration below is the full target — make it idempotent so it upgrades the existing Neon DB in place and also builds a fresh Cloud SQL DB from zero. Do **not** truncate or drop the seeded dev tables when running it.

```sql
create table tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tally_company_guid text unique,          -- bound at first device registration (TOFU)
  created_at timestamptz not null default now()
);

create table pairing_codes (
  code_hash text primary key,              -- sha256; raw code shown once to admin
  tenant_id uuid not null references tenants(id),
  expires_at timestamptz not null,
  used_at timestamptz
);

create table devices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  token_hash text unique not null,         -- sha256; raw token returned once at register
  machine_label text,
  last_seen_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table sync_runs (
  id uuid primary key,                     -- client-generated (idempotency key)
  tenant_id uuid not null references tenants(id),
  device_id uuid references devices(id),
  started_at timestamptz,
  finished_at timestamptz,
  status text check (status in ('success','failed')),
  counts jsonb,
  error text
);

create table ledgers (
  tenant_id uuid not null references tenants(id),
  tally_guid text not null,
  name text not null,
  parent_group text,
  closing_balance numeric(14,2),
  alter_id bigint,
  updated_at timestamptz not null default now(),
  primary key (tenant_id, tally_guid)
);

create table bills (
  id bigserial primary key,
  tenant_id uuid not null references tenants(id),
  sync_run_id uuid not null references sync_runs(id),
  party_guid text,
  party_name text not null,
  bill_ref text,
  bill_date date,
  due_date date,
  pending_amount numeric(14,2) not null,
  overdue_days int
);
create index bills_tenant_run_idx on bills (tenant_id, sync_run_id);
```

**Snapshot semantics:** "current outstanding" = bills belonging to the tenant's most recent *successful* `sync_run`. No delete-and-replace races, and history comes free for later trend features.

---

## 8. Tally XML skeletons

> ⚠️ **Rule: verify against live Tally before trusting any field name below.** These skeletons are directionally correct but Tally's exact tags vary by version/report. For each request: send it, dump the raw response to `tests/fixtures/`, inspect it, then write the parser against the fixture. Never invent field names when a parser breaks — dump and look.

**Health check:** plain `GET http://localhost:9000` → running gateway responds with a "server is running" message.

**List of open companies:**
```xml
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Collection</TYPE>
    <ID>List of Companies</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
      <TDL><TDLMESSAGE>
        <COLLECTION NAME="List of Companies" ISMODIFY="No">
          <TYPE>Company</TYPE>
          <FETCH>NAME, GUID, STARTINGFROM</FETCH>
        </COLLECTION>
      </TDLMESSAGE></TDL>
    </DESC>
  </BODY>
</ENVELOPE>
```

**Sundry debtor ledgers** (custom collection; pin company via `SVCURRENTCOMPANY`):
```xml
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Collection</TYPE>
    <ID>ARQ Debtor Ledgers</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
        <SVCURRENTCOMPANY>Pawan Engineering Works</SVCURRENTCOMPANY>
      </STATICVARIABLES>
      <TDL><TDLMESSAGE>
        <COLLECTION NAME="ARQ Debtor Ledgers" ISMODIFY="No">
          <TYPE>Ledger</TYPE>
          <CHILDOF>$$GroupSundryDebtors</CHILDOF>
          <BELONGSTO>Yes</BELONGSTO>   <!-- include sub-groups; verify behavior live -->
          <FETCH>NAME, GUID, PARENT, CLOSINGBALANCE, ALTERID</FETCH>
        </COLLECTION>
      </TDLMESSAGE></TDL>
    </DESC>
  </BODY>
</ENVELOPE>
```

**Bills receivable** (export the built-in report):
```xml
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>Bills Receivable</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
        <SVCURRENTCOMPANY>Pawan Engineering Works</SVCURRENTCOMPANY>
        <SVFROMDATE TYPE="Date">1-Apr-2025</SVFROMDATE>
        <SVTODATE TYPE="Date">6-Jul-2026</SVTODATE>
      </STATICVARIABLES>
    </DESC>
  </BODY>
</ENVELOPE>
```

**Transport rules (client.py):**
- POST envelope as body to `http://host:port`, `Content-Type: text/xml`
- Decode response as UTF-16 (fall back to UTF-8 if decode fails — log which path was taken)
- Strip characters invalid in XML 1.0 before parsing (Tally emits `&#4;` and friends)
- HTTP 200 with `LINEERROR` in body = failure, raise with the error text

---

## 9. Connector config (`config.example.toml`)

```toml
[tally]
host = "localhost"
port = 9000
company_name = "Pawan Engineering Works"   # must match Tally exactly; `doctor` lists available names

[cloud]
api_base_url = "https://<cloud-run-service>.run.app"

[sync]
interval_minutes = 60

[logging]
level = "INFO"    # party-level data only logged at DEBUG
```

**Not in this file, ever:** device token (Credential Manager only), database URLs, any secret.

> **Where the DB URL lives:** the connector never talks to Postgres directly — it only calls the cloud API, so it needs `api_base_url`, not a database URL. The **backend** is the only thing that holds `DATABASE_URL`: in dev that's the Neon connection string (in a local `.env`, gitignored); in prod it's the Cloud SQL string via Secret Manager. Never put either in the connector's TOML or in the repo.

---

## 10. Working agreements for Claude Code

1. **PowerShell syntax** for every command you run or document. No `&&` (breaks on PS 5.1) — use `;` or separate lines. Venv activation: `.\.venv\Scripts\Activate.ps1`.
2. **One milestone at a time.** Finish, run acceptance checks, stop at the human checkpoint. Do not "get a head start" on the next milestone.
3. **Never invent Tally field names.** When a parser fails, dump raw XML to a debug file and inspect. Fixtures are the source of truth.
4. **Read-only toward Tally.** If you find yourself writing an `Import Data` envelope, stop — that's out of scope and violates the trust model.
5. **Do not touch `backend/` outside M3 scope** without flagging it first. If you find other security issues while in there, report them; fix only what M3 covers unless told otherwise.
6. **Dependency discipline:** only the approved list in §5. Ask before adding anything.
7. **Explain as you go:** short reasoning before each significant implementation choice — Rishi wants step-by-step engineering logic, not silent code dumps.
8. **PII care:** party names + amounts are client financial data. Keep them out of INFO logs, error messages sent to any third party, and commit messages.

---

## 11. Definition of done (for this entire plan)

- Pawan's machine syncs **unattended on a schedule** into Cloud SQL
- Tenant isolation is enforced by device tokens; a second dummy tenant proves A cannot touch B
- `X-Company-Name` no longer exists anywhere in the backend
- A non-technical operator can install the connector using `OPERATOR_SETUP.md` alone
- Onboarding a new client = admin issues pairing code → operator runs `register` → done

When all five hold, this plan is complete. UI/data-read APIs are the next plan.