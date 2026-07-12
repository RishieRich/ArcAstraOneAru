# Deploying the backend to Vercel

Goal: backend live on Vercel → bake that URL into the exe → hand the exe to anyone with Tally installed → their data lands in your Neon DB.

---

## What changed in the code (already done)

| File | Why |
|---|---|
| `backend/api/index.py` | **New.** Vercel's Python runtime looks for `api/*.py` exposing an ASGI `app`. Adds `backend/` to `sys.path` then imports the existing FastAPI app — no rewrite of your app code. |
| `backend/vercel.json` | **New.** Rewrites every path to `/api/index` so `/v1/sync`, `/v1/devices/register`, `/health` all reach FastAPI. |
| `backend/requirements.txt` | **New.** Runtime deps only (no uvicorn/pytest) for faster cold starts. Vercel installs from the Root Directory, so it must live here — the repo-root `requirements.txt` stays for local dev/tests. |
| `backend/app/db.py` | `DATABASE_URL` is now read **at call time**, not import time, and a missing `.env` is no longer fatal. On Vercel there is no `.env`; the var is injected by the platform. |
| `backend/app/main.py` | Added CORS (for the future JSX dashboard) + a `GET /health/db` endpoint that proves the deployment can actually reach Neon. |
| `connector/src/arq_connector/settings.py` | `DEFAULT_API_BASE_URL` constant — the one place to set the backend URL before building the exe. |

Existing backend tests (10) still pass against Neon after these changes.

---

## Part 1 — Push to GitHub

Vercel deploys from your repo (`github.com/RishieRich/ArcAstraOneAru`). Commit and push the new files first.

`backend/.env` is gitignored, so your Neon password does **not** go to GitHub. That's intentional — the credential goes into Vercel's env var UI instead (Part 2, step 4).

---

## Part 2 — Vercel UI, step by step

1. Go to **vercel.com** → log in with GitHub.
2. **Add New… → Project**.
3. Find **ArcAstraOneAru** in the repo list → **Import**.
4. On the configure screen — this is the part that matters:
   - **Root Directory**: click **Edit** and select **`backend`**. ⚠️ This is the single most important setting. Leave it at the repo root and the build will not find `requirements.txt` or `api/`, and the deploy will 404.
   - **Framework Preset**: leave as **Other** (Vercel auto-detects the Python runtime from `api/`).
   - **Build/Output/Install commands**: leave all blank/default.
5. Expand **Environment Variables** and add:
   - Name: `DATABASE_URL`
   - Value: copy the full connection string from your local `backend/.env` (the `postgresql://neondb_owner:...@ep-lucky-poetry-...neon.tech/neondb?sslmode=require&channel_binding=require` line).
   - Apply to **Production, Preview, and Development** (tick all three).
6. Click **Deploy** and wait ~1–2 min.

You'll get a URL like `https://arc-astra-one-aru.vercel.app` (Vercel derives it from the repo name — **note the actual URL it gives you**, it may differ).

---

## Part 3 — Verify the deploy (do this before touching the exe)

Open these in a browser:

1. `https://<your-url>/health` → should return `{"status":"ok"}`
   Proves FastAPI is running and routing works.
2. `https://<your-url>/health/db` → should return `{"status":"ok","db":"reachable","tenants":2}`
   Proves the lambda can reach Neon with your `DATABASE_URL`. **If this fails, the exe will fail too** — fix it here first.
3. `https://<your-url>/docs` → FastAPI's Swagger UI, listing `/v1/devices/register` and `/v1/sync`.

If step 2 returns `"db":"unreachable"`, the detail field tells you why. Most likely causes: `DATABASE_URL` typo'd/not saved, or you didn't tick the Production environment.

---

## Part 4 — Bake the URL into the exe

1. Open `connector/src/arq_connector/settings.py`.
2. Set `DEFAULT_API_BASE_URL` to your real Vercel URL (currently a placeholder):
   ```python
   DEFAULT_API_BASE_URL = os.environ.get(
       "ARQ_API_BASE_URL", "https://arc-astra-one-aru.vercel.app"
   )
   ```
   No trailing slash. Must be `https://`.
3. Rebuild: `cd connector; ./build.ps1`

⚠️ **Testing the new exe on *your* machine won't prove the URL is baked in.** `load_settings()` merges a saved `%LOCALAPPDATA%\ARQ\settings.json`, which on your dev box still contains the old `http://127.0.0.1:8000` and will silently override the new default. To test as a fresh user would: delete (or rename) `%LOCALAPPDATA%\ARQ\settings.json` first, then launch the exe and confirm the backend URL field shows the Vercel URL.

---

## Part 5 — What the recipient still needs

Handing over the exe alone is **not** zero-touch. Each new user needs:

1. **Tally installed and running** on their machine, with the XML/ODBC gateway enabled on port 9000 (the exe reads their local Tally — that part never goes through Vercel).
2. **A pairing code from you.** Codes are issued by a backend CLI, not by the exe:
   ```
   python -m app.admin create-tenant --name "Their Company"
   python -m app.admin issue-pairing-code --tenant-id <id>
   ```
   Run this locally (it talks to the same Neon DB). Give them the code; they paste it into the exe once, it registers a device and stores the token in Windows Credential Manager. After that, syncs are automatic.

So: **exe + pairing code from you = works.** Exe alone = they can't pair.

---

## Known constraints on Vercel free tier

- **Serverless, not a server.** Each request is a fresh lambda with a cold start (~1–3 s for the first hit after idle). The connector syncs every 3 h by default, so it will almost always pay a cold start — that's fine, just don't be alarmed by a slow first request.
- **10 s execution limit** on the free (Hobby) tier. A sync with a few thousand bills is fine; if you ever push a very large snapshot and start seeing 504s, that's the ceiling you hit — the fix is batching the sync payload, not a Vercel setting.
- **Use the Neon *pooler* connection string** (the one with `-pooler` in the host — yours already is). Serverless opens a new connection per invocation and will exhaust Neon's direct-connection limit without it.
- Free tier does not sleep/expire the deployment, so the URL you bake in stays valid.

---

## If something breaks

- **404 on every route** → Root Directory wasn't set to `backend`.
- **500 / `FUNCTION_INVOCATION_FAILED`** → check Vercel → your project → **Logs**. Usually a missing `DATABASE_URL`.
- **`/health` works but `/health/db` doesn't** → env var problem, not a code problem.
- **Exe still hitting localhost** → stale `%LOCALAPPDATA%\ARQ\settings.json` (see Part 4 warning).
