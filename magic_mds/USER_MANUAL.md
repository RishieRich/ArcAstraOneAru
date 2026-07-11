# ARQ Tally Connector — User Manual

The connector is **one file**: `arq-connector.exe` (in `connector\dist\`). Copy it anywhere — Desktop, `C:\ARQ`, a pen drive to a client machine — it needs nothing else installed (no Python, no setup wizard).

What it does: reads receivables data from the TallyPrime running on the same machine (read-only — it can never change anything in Tally) and pushes it to the ARQ backend, which stores it in the cloud database with each client's data kept separate.

---

## 1. Admin prep (you, once per client)

The backend must be running, and the client needs a pairing code.

**Start the backend** (on whatever machine hosts it — for local testing, your own):
```powershell
cd D:\AI_Projects\ARQ\ARQ_Astra_Launch\backend
.\start_backend.ps1
```
Leave that window open. The API is now at `http://127.0.0.1:8000`.

**Create the client's tenant and pairing code** (new terminal):
```powershell
cd D:\AI_Projects\ARQ\ARQ_Astra_Launch\backend
..\.venv\Scripts\Activate.ps1
python -m app.admin create-tenant --name "Client Name"
python -m app.admin issue-pairing-code --tenant-id <id-printed-above>
```
Copy the pairing code it prints — it's shown **once**, works **once**, and expires in **72 hours**. Give it to the client operator.

Other admin commands: `python -m app.admin list-tenants` and `python -m app.admin revoke-device --device-id <id>` (instantly blocks a machine).

---

## 2. Install & first-time setup (client machine, once)

1. Make sure **TallyPrime is open with the company loaded** (its name visible at the top of Tally).
2. Copy `arq-connector.exe` anywhere on the machine and **double-click it**. A small window opens.
3. **Backend URL** — leave as `http://127.0.0.1:8000` for local testing; change to the real server address when the backend is deployed.
4. **Tally company** — your open companies appear in the dropdown automatically. Pick the right one. (Empty? Check Tally is open with a company loaded, press **Refresh**.)
5. **Pairing code** — paste the code from the admin and press **Register**. You'll see *"Registered ✓ — token stored in Windows Credential Manager."* This is once per machine; afterwards this section shows ✓ and stays locked.

## 3. Push data

Press **Push Now**. Within a few seconds the status area shows:

> ✓ Pushed 1 ledgers, 1 bills

That data is now in the database. Press it any time you want a fresh push — repeats are safe (the backend ignores accidental duplicates).

## 4. Turn on auto-sync (so it runs by itself)

1. Set the frequency (default **every 3 hours** — anything 1–24).
2. Press **Enable Auto-Sync**.

That's it. Windows Task Scheduler now runs the sync silently on that schedule whenever the machine is on — the window doesn't need to stay open, and nobody needs to touch anything again. To change the frequency, open the app, change the number, press Enable again. **Disable** turns it off.

---

## 5. When something goes wrong

The app (and the log) always says *why* in plain words:

| Message says | Meaning | Fix |
|---|---|---|
| Tally chalu nahi hai / not running | Tally is closed | Open TallyPrime |
| gateway band hai / port closed | Tally open, but its data gateway is off | In Tally: `F1` → Settings → Connectivity → enable the HTTP/ODBC server on port 9000 |
| company open karo / not found | Tally open, but no company (or the wrong one) loaded | Load the company in Tally, or pick the right one in the app |
| Device not registered | No token on this machine | Do the one-time Register step (needs a fresh pairing code from admin) |
| Could not reach the backend | Backend not running / wrong URL | Start the backend; check the Backend URL field |
| Sync rejected (403) | Company doesn't match what this client registered with | You're pushing a different company than the one paired — contact admin |

**Logs** (for auto-sync runs, which have no window): `%LOCALAPPDATA%\ARQ\logs\connector.log`. Failed runs are retried automatically at the next scheduled tick — a machine that was off or had Tally closed simply catches up next time.

**What's stored where:** settings (company, URL, frequency) in `%LOCALAPPDATA%\ARQ\settings.json`; the secret device token only in Windows Credential Manager; nothing sensitive is ever in a file or log.

---

## 6. Rebuilding the exe (developers only)

```powershell
cd D:\AI_Projects\ARQ\ARQ_Astra_Launch\connector
.\build.ps1
```
Output: `connector\dist\arq-connector.exe` (~16 MB).
