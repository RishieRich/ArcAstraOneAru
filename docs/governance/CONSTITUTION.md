# ARQ Astra engineering constitution

| Field | Value |
|---|---|
| Version | 1.0.0 |
| Status | Ratified |
| Owner | Rishi |
| Ratified | 2026-08-22 |
| Review cadence | Before each release; full review every quarter |

This constitution governs all product and engineering changes. A specification, plan,
task, agent instruction, or implementation must not weaken it silently.

## 1. Tally remains read-only

ARQ may read or export from TallyPrime. It must never alter Tally data. Any proposed
Tally write path requires a constitutional amendment, not an ordinary feature spec.

## 2. Tenant isolation is enforced on the server

Every tenant-scoped read, write, import, cleanup, and agent operation must authorize the
tenant on the backend. Frontend filtering is not authorization. A device belongs to one
tenant, and a tenant remains bound to its first registered Tally company GUID.

## 3. Financial facts are deterministic

Amounts, rankings, ageing, reconciliation, and financial KPIs come from validated data and
deterministic code. AI may explain or draft around those facts; AI prose is never their source.
Tally's raw debit sign is preserved in storage and converted for display only where specified.

## 4. Evidence and uncertainty are explicit

ARQ must not fabricate companies, contacts, citations, transactions, amounts, dates, delivery
states, or payment states. Current exposure must not be presented as historical performance.
Unknown, inferred, reported, cleared, and verified states remain visibly different.

## 5. External actions require human authority

ARQ must not contact a debtor, customer, prospect, supplier, or other external party without
explicit authorized human approval. Drafted, opened, operator-reported sent, delivered, and
acted-upon states must not be treated as equivalent.

## 6. Secrets and business data are minimized

Credentials, device tokens, party names, amounts, message content, and uploaded source files
must not enter application logs. Device tokens stay in Windows Credential Manager; the backend
stores only their hashes. New external processors require a disclosure and consent analysis.

## 7. Identity, idempotency, and concurrency protections are preserved

Pairing-code expiry and one-time use, token hashing, company binding, sync-run idempotency,
per-tenant writer serialization, re-authenticated cleanup, and access scoping may not be
removed or bypassed. Tests must cover retries, wrong identity, and concurrent writers whenever
these paths change.

## 8. Database changes are owner-gated and compatible

Production migrations require the owner's explicit approval. Migrations are reviewed before
dependent code is deployed, are safe to re-run where practical, and include compatibility,
recovery, and data-cleanup analysis. Agents never apply a production migration autonomously.

## 9. The three deploy targets are one product contract

Connector, backend, and frontend compatibility must be considered together. API or data-shape
changes state the compatible rollout order. Production connector packages require the supported
Windows x64 checks and Authenticode signing before client distribution.

## 10. User-visible behavior is complete in every supported language

Dashboard strings go through `frontend/src/i18n.js` for English, Hinglish, Gujarati-Roman,
and Marathi-Roman. Money uses Indian lakh-crore grouping. A feature is incomplete if required
translations, empty states, error states, or accessibility behavior are missing.

## 11. Verification is proportional to risk

Every behavior change has numbered requirements and verification evidence. Authentication,
tenant access, money, Tally parsing, migrations, deletion, AI authority, and external actions
receive adversarial tests and line-by-line human review. Tests must cover relevant empty, zero,
negative, null, duplicate, stale, retry, and concurrent inputs.

## 12. Releases are observable and recoverable

Plans define deployment order, health checks, failure signals, containment, and rollback or
forward-recovery. A capability is not called autonomous unless auditability, failure handling,
kill switches, and human override have been proven.

## Governance

- Patch version: wording clarification with no rule change.
- Minor version: a new rule or a materially stronger rule.
- Major version: removal or weakening of a rule.
- Every amendment needs an ADR, owner approval, a version bump, and a review of affected
  baseline specs.
- An urgent production fix may use an abbreviated change spec, but it still needs verification
  before release and a completed spec within one working day.
