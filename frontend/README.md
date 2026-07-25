# ARQ Astra — dashboard

React (Vite) dashboard on top of the same Neon database the connector pushes into.
Reads live data through the backend's `/v1/dashboard/*` endpoints and answers
natural-language questions through `/v1/ask`. It also accepts Tally-style Sales,
Purchase and Expense `.xlsx` exports and turns them into complete-period business
analytics. English / Hinglish / Gujarati-Roman UI; light mode is the default and
dark mode is user-selectable.

Deploys to Vercel as its **own project**, separate from `backend/`.

---

## Login and company access

The dashboard is behind a login. Create users from `backend/` with the venv active:

```
python -m app.admin create-dashboard-user --email someone@x.com --password "strong-password" --name "Someone"
python -m app.admin grant-dashboard-access --email someone@x.com --tenant-id <tenant-uuid>
python -m app.admin list-dashboard-users
python -m app.admin delete-dashboard-user --email someone@x.com
```

New users are deny-by-default until a company is granted. Migration 0004 explicitly
marks pre-existing owner accounts as all-company users. Re-running
`create-dashboard-user` for an existing email resets that user's password without
changing its access grants. Legacy four-digit PIN hashes still verify so existing
accounts are not locked out.

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

## Turning on the AI ("Ask ARQ AI")

The chat drawer needs at least one provider key **on the backend**, never in the
browser. Gemini is primary and Groq is the automatic fallback:

```
GEMINI_API_KEY=...
GROQ_API_KEY=...
```

and restart the backend. For production, configure the same variables in the
backend Vercel project.

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
- **Excel business view** — Sales, Purchases, Expenses, estimated operating result,
  margin, tax, category drivers, counterparties, import history, highs/lows, and
  a zero-filled chart/table spanning the complete uploaded date range.
- **Ask ARQ AI** — a full chat drawer grounded in synced Tally receivables and
  normalized uploaded workbook data. Questions and answers follow the selected
  English, Hinglish, or Gujarati-Roman language.

Language and theme selections persist in the browser. Light is always the first-run
default; dark mode is an explicit user choice.

## Data note

Tally sends debit balances signed negative, so a ₹5,08,989 receivable is stored
as `-508989`. The tables keep Tally's raw sign; the dashboard endpoints report
magnitude. If you query the DB directly, expect the negatives.
