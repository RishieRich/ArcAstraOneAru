# How It All Works — Plain-Language Guide

*Read this top to bottom once and you'll understand the whole system. No jargon without an explanation.*

---

## 1. The big picture

There are only **three actors** in this whole system:

```
[Client's Windows PC]                [Your server]              [Cloud database]
┌──────────────────────┐            ┌─────────────┐            ┌──────────────┐
│  TallyPrime          │            │   Backend   │            │  Neon        │
│  (their accounts)    │            │  (FastAPI)  │───────────▶│  (Postgres)  │
│        ▲             │            └─────────────┘   writes   └──────────────┘
│        │ reads only  │                  ▲
│  arq-connector.exe   │──── HTTPS ───────┘
│  (our app)           │    pushes data
└──────────────────────┘
```

1. **The exe** lives on the client's machine, next to their Tally. It *reads* their receivables data (who owes them money) and *pushes* it out. It can never write into Tally — physically impossible with the requests it makes.
2. **The backend** is a small web service you (the admin) run. It's the only thing that knows the database password. It checks *who is calling* before accepting any data.
3. **The database** (Neon, a cloud Postgres) stores every client's data, with each client's rows tagged by their tenant ID so they can never mix.

The exe and the database never talk directly. Everything goes through the backend, which acts as the security guard.

## 2. The journey of one push (what happens when you press the button)

1. **Health check ("doctor")** — Is Tally running? Is its gateway (port 9000) answering? Is the right company open? If Tally is closed and auto-start is on, the exe **launches Tally itself** and waits up to 2 minutes for it to come up.
2. **Pull** — The exe sends Tally two XML requests: "give me all Sundry Debtor ledgers" and "give me the Bills Receivable report". Tally answers with XML; the exe parses it into clean data (party names, amounts, dates, overdue days).
3. **Push** — The exe bundles that into one JSON payload with a unique run ID, attaches its **device token** (its identity card), and POSTs it to the backend.
4. **Verify** — The backend hashes the token, looks it up, finds which tenant this device belongs to, and checks the data's company GUID matches the company that tenant registered with. Wrong token → rejected (401). Wrong company → rejected (403).
5. **Store** — In one atomic transaction: a `sync_runs` row is recorded, ledgers are upserted, bills are inserted. If anything fails midway, nothing is written at all.
6. **Report** — The exe shows "✓ Pushed N ledgers, N bills" in the window, and writes the same to its log file.

The unique run ID makes retries safe: if the network drops and the exe re-sends, the backend recognizes the ID and returns the earlier result instead of storing duplicates.

## 3. The three security ideas (worth understanding)

- **Pairing code** — a one-time password *you* generate per client. It's how a brand-new machine proves "the admin invited me". Used once, then dead. Expires in 72h even if unused.
- **Device token** — what the machine gets in exchange for the pairing code. Stored in **Windows Credential Manager** (the OS's own password vault), never in a file. The backend only stores its *hash* — even a full database leak wouldn't reveal usable tokens. You can revoke any device instantly from the admin CLI.
- **Company GUID binding** — at registration, the tenant gets permanently tied to the Tally company's unique ID. Even a valid token can't push data from a *different* company. This kills the "pretend to be another client" attack.

## 4. Folder tour (what every piece of the repo is)

```
ARQ_Astra_Launch\
│
├── connector\                       ← the client-side app (becomes the exe)
│   ├── dist\arq-connector.exe       ← THE DELIVERABLE — copy this anywhere
│   ├── build.ps1                    ← rebuilds the exe (PyInstaller)
│   ├── make_icon.ps1                ← regenerates the ARQ icon (rarely needed)
│   ├── pyproject.toml               ← package definition + dependencies
│   ├── src\arq_connector\
│   │   ├── cli.py                   ← entry point: no args = GUI, "run" = silent sync
│   │   ├── gui.py                   ← the window (company picker, Push Now, auto-sync)
│   │   ├── runner.py                ← the one sync flow both GUI and scheduler share
│   │   ├── settings.py              ← reads/writes %LOCALAPPDATA%\ARQ\settings.json
│   │   ├── scheduler.py             ← creates/removes the Windows scheduled task
│   │   ├── lock.py                  ← stops two syncs running at the same time
│   │   ├── logging_setup.py         ← rotating log files
│   │   ├── assets\arq.ico           ← the ARQ icon (exe + window)
│   │   ├── tally\                   ← everything about talking TO Tally
│   │   │   ├── client.py            ←   HTTP transport + Tally's encoding quirks
│   │   │   ├── envelopes.py         ←   the XML requests we send (live-verified)
│   │   │   ├── parsers.py           ←   XML answers → clean Python data
│   │   │   ├── detect.py            ←   the "doctor" health checks
│   │   │   └── launcher.py          ←   auto-starts Tally when it's closed
│   │   ├── sync\
│   │   │   ├── snapshot.py          ←   orchestrates one full data pull
│   │   │   └── pusher.py            ←   register + push to the backend, retries
│   │   └── security\credentials.py  ←   device token in/out of Credential Manager
│   └── tests\                       ← 36 tests, run offline against captured real Tally XML
│
├── backend\                         ← the server side
│   ├── start_backend.ps1            ← one-liner to run it locally
│   ├── .env                         ← DATABASE_URL (gitignored, never committed)
│   ├── migrations\                  ← SQL that builds/upgrades the database schema
│   ├── app\
│   │   ├── main.py                  ← FastAPI app (3 endpoints: health, register, sync)
│   │   ├── auth.py                  ← token → tenant lookup (the security guard)
│   │   ├── routers\devices.py       ← POST /v1/devices/register
│   │   ├── routers\sync.py          ← POST /v1/sync (validate + store)
│   │   ├── admin.py                 ← your CLI: create tenants, issue codes, revoke
│   │   ├── schemas.py               ← the exact shape of valid payloads
│   │   ├── security.py              ← token generation + hashing
│   │   └── db.py                    ← database connection
│   └── tests\                       ← 10 tests that run against the live Neon DB
│
└── magic_mds\                       ← all documentation
    ├── HOW_IT_ALL_WORKS.md          ← this file
    ├── USER_MANUAL.md               ← step-by-step usage instructions
    ├── DATA_MODEL.md                ← proposed DB improvements (bills dedup) — pending your go
    ├── readme_1107_base.md          ← the original plan
    └── readme_1107_output.md        ← build log of what was done and verified
```

## 5. Where things live on a client's machine

| What | Where | Secret? |
|---|---|---|
| The app | wherever you copied the exe | no |
| Settings (company, URL, frequency) | `%LOCALAPPDATA%\ARQ\settings.json` | no |
| Device token | Windows Credential Manager | **yes — never in any file** |
| Logs | `%LOCALAPPDATA%\ARQ\logs\connector.log` | no (no party names/amounts at normal level) |
| Auto-sync schedule | Windows Task Scheduler, task "ARQ Tally Connector Sync" | no |

## 6. Auto-sync and auto-start, honestly explained

When you press **Enable** in the Auto-sync section, the exe registers a Windows scheduled task that silently runs `arq-connector.exe run` every N hours. Each run: take the lock → doctor → pull → push → log → exit. The window doesn't need to be open. A machine that was off simply syncs on its next scheduled tick.

**If Tally is closed when a run fires** (and the "Open Tally automatically" box is ticked): the exe finds `tally.exe` in the standard install location, launches it, and polls for up to 2 minutes until the company is ready — then continues the sync normally.

**One honest limitation, found in live testing:** whether Tally *loads the company by itself* after launching depends on Tally, not on us:
- **Licensed TallyPrime** with `Default Companies=Yes` and `Load=<company number>` in `tally.ini` (in Tally's install folder) boots straight into the company → fully unattended, end to end.
- **Educational-mode Tally** (no license — like this dev machine) stops at its startup screen and waits for a human keypress, ignoring the preload setting. The sync then logs exactly this, and completes on the next run after someone has opened Tally.

So on a real licensed client machine, set those two `tally.ini` lines once during installation and the loop is truly zero-touch.

## 7. What's deliberately NOT in this system

- **No writing to Tally, ever** — the exe only sends read/export requests.
- **No database password on client machines** — only the backend has it.
- **No secrets in files or logs** — token lives in Credential Manager only.
- **No party names or amounts in logs** — only counts and statuses.

## 8. Current status & what's next

**Working now, live-verified:** the full loop — exe (GUI or scheduled) → real Tally pull → backend → real rows in Neon. Auto-launch of a closed Tally works; company auto-load needs the `tally.ini` preload (licensed Tally).

**Next steps, in order:**
1. **Deploy the backend to Vercel** so it's always-on and any client machine can reach it (right now it runs locally on the dev machine — client machines can't see `127.0.0.1`).
2. **Bills dedup migration** (`DATA_MODEL.md`) — stop repeated syncs stacking duplicate bill rows; awaiting your go.
3. Onboard Pawan's machine: copy exe, pairing code, register, set `tally.ini` preload, enable auto-sync.
