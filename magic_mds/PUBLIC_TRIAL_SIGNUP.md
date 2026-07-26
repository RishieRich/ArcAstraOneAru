# Public Trial Signup and Waitlist

## Product behavior

The dashboard login surface now has **Log in** and **Start free** paths.

The capacity rule counts only `dashboard_users.account_type = 'free_trial'`. Existing owner
and client accounts remain `managed` and do not reduce the ten public places.

For an accepted signup, one SQL transaction:

1. takes the global `arq-public-free-trial-capacity` advisory lock;
2. checks that the email is not already an active dashboard account;
3. recounts active free-trial users;
4. creates a dedicated `tenants` row;
5. stores a salted PBKDF2 password hash in `dashboard_users`;
6. inserts one `dashboard_user_tenants` grant for that tenant.

This preserves the same isolation checks used by imports, metrics, Ask ARQ and data cleanup.

When the active count is already 10, name, company and normalized email are upserted into
`trial_waitlist`. The supplied password is deliberately not stored. A repeated waitlist
submission updates the lead details.

Capacity is private operational information. Public signup/status responses expose only
`accepting_trials` plus contact details; they do not expose the capacity, active count,
remaining places or queue position. `list-trial-waitlist` prints the private active/capacity
and waiting totals for the administrator.

After a waitlisted response, the frontend replaces the signup card with a sample intelligence
experience. All values are explicitly marked illustrative and never presented as the lead's
own company data. It previews KPIs, sales trend, cost mix, product performance, Ask ARQ,
one-page reporting, upcoming Tally/database connectivity and direct contact actions.

## Operations

Migration required before application deployment:

```powershell
cd backend
..\.venv\Scripts\python.exe migrations\run_migration.py
```

The runner reapplies all idempotent migrations in order, including
`0006_public_trials.sql`.

List active users and waiting leads:

```powershell
python -m app.admin list-dashboard-users
python -m app.admin list-trial-waitlist
```

Public contact details shown by both the API and UI:

- `contact@arqoneailabs.space`
- `+91 9727067044`

## Security and launch notes

- The capacity decision is serialized in Postgres; it is not an in-memory counter.
- Passwords are never logged or returned.
- Waitlisted entries contain no password hash.
- Public signup does not grant cross-company or `all_tenants` access.
- Email verification and bot protection are not part of this release. Add them before
  running a larger unrestricted acquisition campaign; the ten-place cap limits account
  creation but does not stop automated waitlist submissions.
