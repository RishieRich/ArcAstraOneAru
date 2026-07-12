# ARQ Receivables — dashboard

React (Vite) dashboard on top of the same Neon database the connector pushes into.
Reads live data through the backend's `/v1/dashboard/*` endpoints and answers
natural-language questions through `/v1/ask`. English / Hinglish / Gujarati UI.

Deploys to Vercel as its **own project**, separate from `backend/`.

---

## Login (email + 4-digit PIN)

The dashboard is behind a login. Create users from `backend/` with the venv active:

```
python -m app.admin create-dashboard-user --email someone@x.com --pin 4321 --name "Someone"
python -m app.admin list-dashboard-users
python -m app.admin delete-dashboard-user --email someone@x.com
```

Re-running `create-dashboard-user` for an existing email **resets that user's PIN**.
Sessions last 7 days; `/v1/dashboard/*` and `/v1/ask` reject requests without a
valid session token. The signing secret is `DASHBOARD_SECRET` if set (recommended
in Vercel), otherwise derived from `DATABASE_URL`.

---

## Run locally

The backend must be running first (from `backend/`):

```
../.venv/Scripts/python.exe -m uvicorn app.main:app --port 8010
```

Then here:

```
npm install
cp .env.example .env      # point VITE_API_BASE_URL at the backend
npm run dev               # http://localhost:5173
```

`.env` decides which backend it talks to — `http://127.0.0.1:8010` for local,
`https://arcastraone.vercel.app` for the deployed one.

---

## Turning on the AI ("Ask about your money")

The ask box needs an Anthropic API key **on the backend**, not here — the key must
never reach the browser. Add to `backend/.env`:

```
ANTHROPIC_API_KEY=sk-ant-...
```

and restart the backend. For the deployed backend, add the same variable in
Vercel → the backend project → Settings → Environment Variables.

Without a key the dashboard still works fully; the ask box just replies
"AI is not configured on the server."

---

## Deploy to Vercel

1. Vercel → **Add New… → Project** → import the same repo.
2. **Root Directory: `frontend`** ← the single setting that matters.
3. Framework preset: **Vite** (auto-detected). Build command and output dir: leave default.
4. Environment variable: `VITE_API_BASE_URL = https://arcastraone.vercel.app`
5. Deploy.

Note that `VITE_*` variables are baked in **at build time** — changing one in the
Vercel UI requires a redeploy to take effect.

### CORS

The browser calls the backend cross-origin, so the backend must allow this app's
origin. In the **backend** Vercel project set:

```
CORS_ORIGINS=https://<this-app>.vercel.app
```

It currently defaults to `*`, which works but is worth tightening once the
dashboard has a stable URL.

---

## What it shows

- **Stat tiles** — total outstanding, overdue, unpaid bills, customers.
- **How old is the money** — outstanding by aging bucket (ordinal blue ramp; each bar directly labelled).
- **Who owes the most** — top customers by pending amount.
- **Every unpaid bill** — the full table, also the accessible fallback for the charts.
- **Ask about your money** — questions in English, Hinglish, or Gujarati-English; the answer comes back in the same language.

Language toggle (English / Hinglish / Gujarati) switches the whole UI. Light and
dark mode both follow the OS setting.

## Data note

Tally sends debit balances signed negative, so a ₹5,08,989 receivable is stored
as `-508989`. The tables keep Tally's raw sign; the dashboard endpoints report
magnitude. If you query the DB directly, expect the negatives.
