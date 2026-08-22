# Baseline: Tally connector

| Field | Value |
|---|---|
| Status | Current intended behavior |
| Last verified | 2026-08-22 |
| Primary code | `connector/src/arq_connector/` |

## Contract

- The Windows connector uses only Tally export/collection XML requests on the local gateway.
- It detects Tally, validates the configured company, extracts debtor ledgers and receivable
  bills, then sends a complete snapshot to the backend.
- Company GUID matching takes priority over name matching and survives a company rename.
- Registration stores the token in Windows Credential Manager and creates or refreshes the
  scheduled sync task.
- Reset registration removes only this PC's local identity, sync state, and scheduled task.
  It does not revoke the server device or remove cloud data.
- Connectivity failures are translated into useful TallyPrime instructions without exposing
  raw Windows socket errors.
- Client releases support Windows 10/11 x64 and require the release validation, checksum,
  icon, version metadata, and Authenticode signature.

## Invariants

- No Tally write envelope may be introduced.
- A credential failure must not expose the token or leave registration controls in an unsafe
  state.
- A retry reuses the same sync run ID.

## Known gaps

- The bill parser is live-verified against only one real bill-layout family.
- A colleague test tenant reports a successful zero-row sync; raw customer-approved diagnostic
  evidence is still needed.
- Educational-mode Tally cannot support reliable unattended startup.
