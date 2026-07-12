# ARQ Tally Connector — Setup

Reads your Tally data and syncs it to the ARQ cloud. Read-only towards Tally — it never writes to your books.

You need two things from the person who sent you this:

1. **`arq-connector.exe`** — the app.
2. **A pairing code** — a short code like `xcEfebe0H7qh`. One-time use. Ask them for it if you didn't get one.

---

## Step 1 — Turn on Tally's gateway (one time, 30 seconds)

The connector reads Tally over a local port. Tally ships with this off.

1. Open **Tally** (Prime or ERP 9).
2. Press **F1 → Settings → Connectivity** (in ERP 9: **F12 → Advanced Configuration**).
3. Set **TallyPrime acts as: `Both`**.
4. Set **Port: `9000`**.
5. Accept / save.

Leave Tally **open**, with your company **loaded**. The connector only sees companies that are open in Tally.

---

## Step 2 — Run the exe

Double-click **`arq-connector.exe`**. No installer, nothing to configure.

Windows may show a blue **"Windows protected your PC"** box — that's just because the app isn't code-signed yet. Click **More info → Run anyway**.

The window opens. **Leave the Backend URL exactly as it is** — it's already pointed at the right server.

---

## Step 3 — Pick your company

Click **Refresh**. The **Tally company** dropdown fills with the companies you have open in Tally.

Select the company you want to sync.

> ⚠️ **This choice is permanent.** Your pairing code gets locked to whichever company you register with, and it can never be changed to another one. Pick the right company *before* you click Register. (If you get it wrong, you need a fresh pairing code from your admin.)

---

## Step 4 — Register (one time)

1. Paste your **pairing code** into the Pairing code box.
2. Click **Register**.

You should see: *"Registered ✓ — token stored in Windows Credential Manager."*

You will never enter the code again. It's now spent — it works exactly once.

---

## Step 5 — Push

Click **⭡ Push Now**.

A green **✓** in the Activity box means your data reached the cloud. The first push can take a few seconds (the server wakes from idle) — that's normal, don't click twice.

---

## Step 6 — Make it automatic (recommended)

In the **Auto-sync** card: set the hours (3 is fine) and click **Enable**.

From now on it syncs on its own, even with the window closed and even after a reboot. Tick **"Open Tally automatically if it's closed"** and it will launch Tally itself when a sync is due.

You can close the window. You're done.

---

## If something goes wrong

| What you see | What it means |
|---|---|
| **"Could not reach Tally"** | Tally isn't open, or Step 1 wasn't done. Check port 9000 and that a company is loaded. |
| **Company dropdown is empty** | No company is open in Tally. Open one, click Refresh. |
| **"Sync rejected (403): company_guid does not match…"** | You picked a **different company** than the one you registered with. Select the original company in the dropdown. |
| **"Registration failed (400): Pairing code already used"** | Codes work once. Ask your admin for a new one. |
| **"Registration failed (404): Invalid pairing code"** | Typo, or the code was never issued. Copy-paste it, don't retype. |
| **"Registration failed (400): Pairing code expired"** | Ask your admin for a new one. |
| **Anything else** | Send your admin the logs: press `Win+R`, paste `%LOCALAPPDATA%\ARQ\logs`, Enter. |

---

## For the admin (issuing codes)

Each user needs their own tenant + pairing code. From `backend/`, with the venv active:

```
python -m app.admin create-tenant --name "Their Company"
python -m app.admin issue-pairing-code --tenant-id <id-printed-above> --expires-hours 168
```

The code is printed **once** — copy it immediately. Send it to the user over any channel; it's single-use and time-limited.

Useful:

```
python -m app.admin list-tenants                  # who exists, and which Tally company each is bound to
python -m app.admin revoke-device --device-id <id>  # kill a machine's access
```

Remember: a tenant binds to the first Tally company GUID that registers against it, permanently. A user who registers the wrong company needs a **new tenant**, not just a new code.
