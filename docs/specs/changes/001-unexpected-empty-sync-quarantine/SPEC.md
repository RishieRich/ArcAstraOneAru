# Change specification: quarantine unexpected empty syncs

| Field | Value |
|---|---|
| Change ID | 001 |
| Status | Draft |
| Owner | Rishi |
| Risk | Critical |
| Baseline specs | `02-tally-connector`, `03-receivables-sync`, `05-ai-and-research`, `06-operations-and-data-lifecycle` |
| Roadmap item | Private Alpha data-trust gate |

## Outcome

An empty connector response must not silently erase a previously trusted receivables view.
ARQ preserves the last trusted snapshot, visibly reports that new data requires verification,
and prevents affected recommendations or actions until the data is trusted again.

## Current behavior and evidence

- The connector sends complete ledger and open-bill snapshots.
- The backend accepts an authorized, company-matched sync and marks bills absent from that
  snapshot as closed.
- Therefore, a parser or Tally response that unexpectedly returns zero bills can make the
  dashboard appear genuinely clear even when extraction failed.
- The colleague test tenant has repeatedly synchronized zero ledgers and zero bills. The cause
  is not yet proven.
- The database records sync runs but has no explicit trusted/quarantined state.

## Requirements

- **REQ-001 — Evaluate before mutation:** The backend must decide whether an incoming empty
  snapshot requires verification before it changes the trusted ledger or bill state.
- **REQ-002 — Preserve trusted data:** When a tenant previously had one or more trusted open
  bills and a new snapshot contains zero bills, the new run must be recorded as requiring
  verification and must not close or replace the last trusted bills.
- **REQ-003 — Separate attempt from truth:** The system must keep the time and outcome of the
  latest sync attempt separate from the time of the latest trusted snapshot.
- **REQ-004 — Visible warning:** The dashboard must prominently show `Data requires
  verification` in all four supported languages while continuing to label the displayed data
  with its trusted snapshot time.
- **REQ-005 — Safe feature gating:** Features that produce collection priorities, research
  recommendations, or future external actions must refuse to act on a tenant whose latest
  attempt requires verification. Read-only display of the last trusted snapshot remains
  available.
- **REQ-006 — Genuine-zero path:** A verified genuine-zero snapshot must be promotable to the
  trusted state through an explicit authorized process, after which the dashboard may show
  zero open receivables.
- **REQ-007 — Preserve protocol protections:** Existing company binding, device authorization,
  per-tenant locking, source-key handling, and sync-run idempotency must remain effective for
  accepted and quarantined runs.
- **REQ-008 — Safe diagnostics:** Logs and status messages may contain tenant/run identifiers,
  counts, and reason codes, but not party names, amounts, credentials, or raw Tally XML.
- **REQ-009 — Cleanup:** Authorized company-data cleanup must remove quarantined sync business
  data and its tenant-specific verification state under the same re-authenticated boundary.

## Acceptance scenarios

- **AC-001 / REQ-001, REQ-002:** Given a trusted snapshot with open bills, when the next valid
  company-matched snapshot has zero bills, then the attempt requires verification and the
  trusted open bills remain unchanged.
- **AC-002 / REQ-003, REQ-004:** Given a quarantined attempt, when the owner opens the dashboard,
  then the latest-attempt time, last-trusted time, and verification warning cannot be confused.
- **AC-003 / REQ-005:** Given a tenant requiring verification, when a recommendation or action
  endpoint is called, then it refuses with a stable machine-readable reason and useful UI text.
- **AC-004 / REQ-006:** Given a legitimate company with no open bills, when an authorized user
  completes the approved verification process, then the zero snapshot becomes trusted and the
  former bills become closed exactly once.
- **AC-005 / REQ-007:** Given a retry with the same quarantined sync run ID, when it reaches the
  backend, then it returns the same result without a second run or state change.
- **AC-006 / REQ-007:** Given two concurrent sync attempts for one tenant, when one is empty,
  then serialization prevents an unreviewed empty state from overwriting a trusted state.
- **AC-007 / REQ-007:** Given a wrong company GUID or revoked device, when an empty snapshot is
  submitted, then the existing authorization rejection happens before anomaly evaluation.
- **AC-008 / REQ-008:** Given accepted and quarantined runs, when logs are inspected, then they
  contain no party names, amounts, tokens, or raw XML.
- **AC-009 / REQ-009:** Given quarantined run state, when authorized cleanup succeeds, then its
  tenant business data is deleted without removing tenant identity, grants, or devices.

## Non-goals

- Detecting partial or percentage-based bill-count drops in this first change.
- Automatically proving why Tally returned an empty response.
- Uploading raw customer XML to the backend.
- Building collection action logging or messaging.
- Treating spreadsheet imports as a trusted Tally receivables snapshot.

## Constitution impact

Rules 2, 3, 4, 6, 7, 8, 9, 11, and 12 apply. No amendment is expected.

## Contract and data impact

- API: sync responses and dashboard metrics need an explicit data-trust state and timestamps.
- Database/migration: a reviewed additive model is required for quarantined attempts and the
  latest trusted snapshot boundary.
- Connector: must display a verification result without retrying it as a transient transport
  failure.
- Frontend/i18n: warning, timestamps, blocked-state explanations, and genuine-zero review entry
  points require all four languages.
- Security/privacy: the promotion process must require a named authorized dashboard user or an
  owner-run admin operation and must be auditable.
- Cleanup/retention: new tenant-scoped state must join the existing cleanup transaction.

## Failure and edge cases

- First-ever sync contains zero ledgers and zero bills.
- Previous trusted snapshot already contained zero bills.
- Empty bill list with non-empty debtor ledgers.
- Non-empty bill list with zero total amount.
- Retry of a quarantined run.
- Empty and non-empty runs arrive concurrently.
- Connector loses the response after the backend quarantines the run.
- Migration is deployed before code, and old/new backend versions overlap briefly.
- Dashboard is cached while the trust state changes.

## Open decisions

- **DEC-001 (blocking):** Who may promote a genuine-zero snapshot: owner login, admin CLI, or
  both? Recommendation: owner login plus an admin fallback, both audited.
- **DEC-002 (blocking):** Does a first-ever empty snapshot remain untrusted until manual
  confirmation? Recommendation: yes during founder-assisted Alpha.
- **DEC-003 (blocking):** Should Ask ARQ be fully blocked, or allowed to explain the last
  trusted snapshot with a strong warning? Recommendation: allow read-only explanation of the
  last trusted snapshot; block new priorities and action guidance.
- **DEC-004 (non-blocking):** Partial-drop anomaly detection needs real multi-client data before
  choosing a threshold. Keep it as a later change.
- **DEC-005 (blocking):** Required freshness limit for action-capable features. The roadmap
  proposes 24 hours; confirm it as the Alpha rule.

## Approval

- [ ] Requirements reviewed
- [ ] Acceptance scenarios reviewed
- [ ] Non-goals accepted
- [ ] DEC-001, DEC-002, DEC-003, and DEC-005 resolved
- [ ] Owner changed status to `Approved`
