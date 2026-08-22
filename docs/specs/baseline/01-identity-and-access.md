# Baseline: identity and access

| Field | Value |
|---|---|
| Status | Current intended behavior |
| Last verified | 2026-08-22 |
| Primary code | `backend/app/auth.py`, `backend/app/dashauth.py`, auth/device routers |

## Contract

- A one-time pairing code expires after 72 hours and is consumed during registration.
- A registered device receives a token; Windows Credential Manager stores it locally and the
  backend stores only its hash.
- A device is scoped to one tenant. The tenant is permanently bound to the first registered
  Tally company GUID, and a mismatched company is rejected.
- Dashboard login accepts email plus password; legacy four-digit PIN hashes remain accepted.
- Dashboard session tokens are signed, stateless, and expire after seven days.
- Dashboard access is either explicitly all-tenant or granted through
  `dashboard_user_tenants`. New users do not receive tenant access implicitly.
- Public free trials are capped at ten under a transaction lock. Each accepted trial receives
  an isolated tenant and explicit access. Waitlisted passwords are discarded.

## Invariants

- Every tenant-scoped endpoint checks server-side access.
- Device and dashboard credentials cannot impersonate one another.
- Tokens and passwords never enter logs or tracked files.

## Known gaps

- Named Owner/Operator/Viewer action permissions are not implemented.
- Dashboard sessions cannot be revoked before expiry.
- Public signup has no verified email or bot protection.
