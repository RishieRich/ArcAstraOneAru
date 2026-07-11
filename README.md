# ARQ Astra Launch

Tally → cloud data pipeline. Two components:

- **`connector/`** — Windows app (ships as a single `arq-connector.exe`). Talks to a locally running TallyPrime over its port-9000 XML gateway (read-only), extracts debtor ledgers + receivable bills, and pushes them to the backend. Has a small GUI for one-time setup and a "Push Now" button; after that a Windows scheduled task syncs automatically.
- **`backend/`** — FastAPI API + Postgres (Neon in dev, Cloud SQL later). Receives synced data over device-token auth with per-tenant isolation. Admin CLI (`python -m app.admin`) creates tenants and issues pairing codes.

Docs live in `magic_mds/`:

- `readme_1107_base.md` — the original implementation plan
- `readme_1107_output.md` — what was actually built and live-verified
- `USER_MANUAL.md` — how to install, register, and use the exe

Quick start for development:

```powershell
# backend (needs backend\.env with DATABASE_URL)
cd backend; ..\.venv\Scripts\Activate.ps1; uvicorn app.main:app --port 8000

# connector (own venv)
cd connector; .venv\Scripts\Activate.ps1; python -m arq_connector.cli
```
