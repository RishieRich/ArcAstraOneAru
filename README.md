# ARQ Astra Launch

ARQ Astra is an agentic business operating system for Tally-first Indian MSMEs. Its current
commercial entry point is read-only receivables, business intelligence, and review-first AI
assistance. The implementation has three components:

- **`connector/`** — Windows app (packaged as a single `arq-connector.exe`; client releases must be signed). Talks to a locally running TallyPrime over its port-9000 XML gateway (read-only), extracts debtor ledgers + receivable bills, and pushes them to the backend. Has a small GUI for one-time setup and a "Push Now" button; after that a Windows scheduled task syncs automatically.
- **`backend/`** — FastAPI API on Neon Postgres, deployed to Vercel (https://arcastraone.vercel.app). Receives synced data over device-token auth with per-tenant isolation. Admin CLI (`python -m app.admin`) creates tenants, issues pairing codes, and manages dashboard users.
- **`frontend/`** — Vite + React dashboard with Excel-powered business analytics, English / Hinglish / Gujarati-Roman / Marathi-Roman UI, light/dark themes, an AI copilot, and cited customer/supplier research. Password login with per-company access.

> **Working on this repo with an AI coding agent?** Read **[`AGENTS.md`](AGENTS.md)** first — it
> is the shared brief for Claude Code, Codex, and anything else: architecture, env vars,
> commands, deploy config, known traps, and the conventions to follow. `CLAUDE.md` just points there.

The public **[Product and Agent Development Roadmap](ROADMAP.md)** separates implemented
capability from Alpha commitments, candidates, and long-term vision. It also records the
release gates and safety boundaries that future agent work must satisfy.

Detailed internal docs live in `magic_mds/`, which is **local only and gitignored** — it is not
part of a clone:

- `HOW_IT_ALL_WORKS.md` — plain-language tour of the whole system
- `USER_MANUAL.md` — how to install, register, and use the exe
- `EXCEL_IMPORT_SETUP.md` — Excel import, analytics, migration, and verification runbook
- `SOLUTION_ARCHITECTURE.md` — end-to-end architecture, data model, security, and flows
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
