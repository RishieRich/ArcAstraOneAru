# ARQ Astra Launch

Tally → cloud receivables pipeline. Three components:

- **`connector/`** — Windows app (ships as a single `arq-connector.exe`). Talks to a locally running TallyPrime over its port-9000 XML gateway (read-only), extracts debtor ledgers + receivable bills, and pushes them to the backend. Has a small GUI for one-time setup and a "Push Now" button; after that a Windows scheduled task syncs automatically.
- **`backend/`** — FastAPI API on Neon Postgres, deployed to Vercel (https://arcastraone.vercel.app). Receives synced data over device-token auth with per-tenant isolation. Admin CLI (`python -m app.admin`) creates tenants, issues pairing codes, and manages dashboard users.
- **`frontend/`** — Vite + React dashboard (English / Hinglish / Gujarati) with an AI copilot, on its own Vercel project. PIN login.

> **Working on this repo with an AI coding agent?** Read **[`AGENTS.md`](AGENTS.md)** first — it
> is the shared brief for Claude Code, Codex, and anything else: architecture, env vars,
> commands, deploy config, known traps, and the conventions to follow. `CLAUDE.md` just points there.

Docs live in `magic_mds/`:

- `HOW_IT_ALL_WORKS.md` — plain-language tour of the whole system
- `USER_MANUAL.md` — how to install, register, and use the exe
- `VERCEL_DEPLOY.md` — deploy procedure and preset gotchas
- `ERROR101_RESOLUTION.md` — the Neon cold-start incident and its fix
- `readme_1107_base.md` / `readme_1107_output.md` — original plan, and what was actually built

Quick start for development:

```powershell
# backend (needs backend\.env with DATABASE_URL)
cd backend; ..\.venv\Scripts\Activate.ps1; uvicorn app.main:app --port 8010

# frontend
cd frontend; npm install; npm run dev

# connector (own venv)
cd connector; .venv\Scripts\Activate.ps1; python -m arq_connector.cli
```
