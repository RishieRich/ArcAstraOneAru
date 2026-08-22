# Baseline: operations and data lifecycle

| Field | Value |
|---|---|
| Status | Current intended behavior |
| Last verified | 2026-08-22 |
| Primary code | app startup/database modules, migrations, build scripts, deployment notes |

## Contract

- Backend and frontend deploy as separate Vercel projects; the backend uses the stable
  `https://arcastraone.vercel.app` alias.
- The backend retries Neon cold starts and converts unhandled application failures to JSON.
- `/health` checks application liveness; `/health/db` proves database reachability.
- Database migrations are additive, hand-run, ordered, and never applied to production without
  owner approval.
- Frontend API configuration is baked at build time. Connector API override is evaluated at
  runtime; per-deployment Vercel URLs are never baked into the connector.
- Company-data cleanup re-authenticates the signed-in user, removes synced/imported business
  facts, and preserves tenant identity, access grants, and registered devices.

## Invariants

- Environment files and credentials remain untracked.
- A client release is not distributed unless the Windows package is signed and verified.
- Deployment plans name migration ordering and post-deploy health checks.

## Known gaps

- There is no CI pipeline, staging environment, automated monitoring, or alerting.
- Backend tests are not hermetic and currently use the configured Neon database.
- Vercel Git auto-deploy has been unreliable; documented manual deployment remains required.
