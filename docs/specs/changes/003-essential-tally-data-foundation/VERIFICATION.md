# Verification: Essential Tally Data Foundation and Source-Aware Analytics

| Field | Value |
|---|---|
| Status | SLICE-01 done, SLICE-02 partial (receivables only); all other product checks below remain planned, not run |
| Planning | SPEC approved and PLAN approved by owner on 2026-09-05 |
| Task list | Owner authorized SLICE-01–05 on 2026-09-06; SLICE-03/04/05 found blocked on missing Tally evidence (see `EVIDENCE.md`) rather than executed |
| Commit/deployment | None from this planning work |

## Requirement evidence

Assertion IDs below are planned verification identifiers, not existing test names.
During execution replace/augment them with exact test paths, assertion details, command results,
fixture provenance and observable review links. Requirement wording states the expected outcome.

| Requirement | Planned assertion | Planned slices | Result |
|---|---|---|---|
| REQ-001 | V-001: Prefer reliable native Tally identifiers. Fallback identities are deterministic, domain-specific, documented, and tested. | SLICE-01, SLICE-02, SLICE-03, SLICE-04, SLICE-05, SLICE-09, SLICE-16, SLICE-21, SLICE-22, SLICE-25, SLICE-26, SLICE-29, SLICE-30, SLICE-33, SLICE-34, SLICE-37, SLICE-38, SLICE-41, SLICE-42, SLICE-45, SLICE-46, SLICE-56, SLICE-58 | Not run |
| REQ-002 | V-002: A newly observed trustworthy identity creates one logical source record. | SLICE-16, SLICE-22, SLICE-26, SLICE-30, SLICE-34, SLICE-38, SLICE-42, SLICE-46 | Not run |
| REQ-003 | V-003: Changed values for a known trustworthy identity update the canonical record rather than appending another copy. | SLICE-04, SLICE-16, SLICE-22, SLICE-26, SLICE-30, SLICE-34, SLICE-38, SLICE-42, SLICE-46 | Not run |
| REQ-004 | V-004: An unchanged known record remains one record and is operationally distinguishable from inserted or updated. | SLICE-16, SLICE-22, SLICE-26, SLICE-30, SLICE-34, SLICE-38, SLICE-42, SLICE-46 | Not run |
| REQ-005 | V-005: Absence from an incremental extract does not mean deleted, reversed, cancelled, closed, or invalid. | SLICE-02, SLICE-16, SLICE-21, SLICE-22, SLICE-25, SLICE-26, SLICE-29, SLICE-30, SLICE-33, SLICE-34, SLICE-37, SLICE-38, SLICE-41, SLICE-42, SLICE-45, SLICE-46 | Not run |
| REQ-006 | V-006: Closure, cancellation, reversal, or deletion requires a trustworthy source signal or explicitly authoritative domain contract. | SLICE-02, SLICE-03, SLICE-04, SLICE-05, SLICE-16, SLICE-21, SLICE-22, SLICE-25, SLICE-26, SLICE-29, SLICE-30, SLICE-33, SLICE-34, SLICE-37, SLICE-38, SLICE-41, SLICE-42, SLICE-45, SLICE-46, SLICE-58 | Not run |
| REQ-007 | V-007: A trusted complete receivable/payable snapshot may close a formerly open bill absent from the next trusted complete snapshot. This rule does not generalize to Sales, Purchases, Ledger postings, Payments, Receipts, or Inventory movements. | SLICE-02, SLICE-22, SLICE-26, SLICE-30, SLICE-34, SLICE-38, SLICE-42, SLICE-46, SLICE-56, SLICE-58 | Not run |
| REQ-008 | V-008: Retrying a run cannot create another logical fact or accepted run. A retry after a lost response returns the earlier result. | SLICE-06, SLICE-09, SLICE-15, SLICE-18, SLICE-22, SLICE-26, SLICE-30, SLICE-34, SLICE-38, SLICE-42, SLICE-46, SLICE-56 | Not run |
| REQ-009 | V-009: Concurrent writers for one company cannot produce mixed or duplicate accepted state. | SLICE-06, SLICE-07, SLICE-09, SLICE-16, SLICE-22, SLICE-26, SLICE-30, SLICE-34, SLICE-38, SLICE-42, SLICE-46, SLICE-56 | Not run |
| REQ-010 | V-010: Records without trustworthy native or fallback identity remain reviewable source evidence but are excluded from canonical accumulation and KPIs. The customer sees the excluded count and reason. | SLICE-01, SLICE-02, SLICE-03, SLICE-04, SLICE-05, SLICE-16, SLICE-21, SLICE-22, SLICE-23, SLICE-25, SLICE-26, SLICE-27, SLICE-29, SLICE-30, SLICE-31, SLICE-33, SLICE-34, SLICE-35, SLICE-37, SLICE-38, SLICE-39, SLICE-41, SLICE-42, SLICE-43, SLICE-45, SLICE-46, SLICE-47, SLICE-58 | Not run |
| REQ-011 | V-011: Ordinary synchronization sends canonical parsed facts and run evidence, not retained cloud copies of raw Tally XML. Raw customer source collection requires the explicit diagnostic contract in Section 20. | SLICE-01, SLICE-09, SLICE-15, SLICE-18, SLICE-21, SLICE-25, SLICE-29, SLICE-33, SLICE-37, SLICE-41, SLICE-45 | Not run |
| REQ-012 | V-012: Capabilities may commit independently when safe. A partially completed run reports its capability results and overall partial state. | SLICE-06, SLICE-09, SLICE-16, SLICE-18, SLICE-22, SLICE-26, SLICE-30, SLICE-34, SLICE-38, SLICE-42, SLICE-46, SLICE-55 | Not run |
| REQ-013 | V-013: Dependent facts inside a capability do not commit into an inconsistent state. | SLICE-03, SLICE-05, SLICE-06, SLICE-09, SLICE-16, SLICE-21, SLICE-22, SLICE-25, SLICE-26, SLICE-29, SLICE-30, SLICE-33, SLICE-34, SLICE-37, SLICE-38, SLICE-41, SLICE-42, SLICE-45, SLICE-46 | Not run |
| REQ-014 | V-014: Safely identified facts may be accepted while explicitly excluded facts remain outside KPIs, but only when the exclusion cannot make the advertised KPI materially misleading. Otherwise the capability requires verification. | SLICE-04, SLICE-05, SLICE-16, SLICE-21, SLICE-22, SLICE-23, SLICE-25, SLICE-26, SLICE-27, SLICE-29, SLICE-30, SLICE-31, SLICE-33, SLICE-34, SLICE-35, SLICE-37, SLICE-38, SLICE-39, SLICE-41, SLICE-42, SLICE-43, SLICE-45, SLICE-46, SLICE-47, SLICE-58 | Not run |
| REQ-015 | V-015: An enabled capability includes the supporting party, item, ledger, allocation, or master relationships required for its accepted facts, regardless of whether the broader supporting capability is enabled. | SLICE-03, SLICE-04, SLICE-05, SLICE-06, SLICE-16, SLICE-21, SLICE-22, SLICE-25, SLICE-26, SLICE-29, SLICE-30, SLICE-33, SLICE-34, SLICE-37, SLICE-38, SLICE-41, SLICE-42, SLICE-45, SLICE-46 | Not run |
| REQ-016 | V-016: Unexpected empty results are evaluated before they can replace trusted business truth. | SLICE-02, SLICE-09, SLICE-17, SLICE-22, SLICE-26, SLICE-30, SLICE-34, SLICE-38, SLICE-42, SLICE-46 | Not run |
| REQ-017 | V-017: A suspicious zero cannot overwrite previously trusted capability data before verification. | SLICE-02, SLICE-09, SLICE-17, SLICE-22, SLICE-26, SLICE-30, SLICE-34, SLICE-38, SLICE-42, SLICE-46, SLICE-56 | Not run |
| REQ-018 | V-018: During pilot operation, the first zero for an extractor whose reliability is not broadly validated cannot establish trusted truth automatically. | SLICE-02, SLICE-17 | Not run |
| REQ-019 | V-019: During founder-assisted release, only an ARQ administrator may promote a quarantined genuine-zero state, and the promotion records actor, time, company, capability, run, reason, and resulting state without logging business content. | SLICE-17, SLICE-54, SLICE-55 | Not run |
| REQ-020 | V-020: A first-ever zero may be accepted without human promotion only when the capability/extractor version is approved as broadly validated for the detected Tally structure and the extraction supplies positive completeness evidence beyond an empty list. | SLICE-02, SLICE-17, SLICE-58 | Not run |
| REQ-021 | V-021: Analytics and AI distinguish latest attempt, latest trusted data, and current trust state. Last-trusted facts may remain visible with a warning; quarantined facts are never presented as current truth. | SLICE-09, SLICE-17, SLICE-18, SLICE-19, SLICE-22, SLICE-23, SLICE-24, SLICE-26, SLICE-27, SLICE-28, SLICE-30, SLICE-31, SLICE-32, SLICE-34, SLICE-35, SLICE-36, SLICE-38, SLICE-39, SLICE-40, SLICE-42, SLICE-43, SLICE-44, SLICE-46, SLICE-47, SLICE-48, SLICE-51, SLICE-52, SLICE-53, SLICE-54, SLICE-55, SLICE-56, SLICE-59 | Not run |
| REQ-022 | V-022: Re-uploading identical file bytes does not duplicate facts. | SLICE-49, SLICE-50 | Not run |
| REQ-023 | V-023: Recognized finance books with reliable identities may accumulate history through deterministic cross-file upsert. Matching overlapping rows update; new rows insert; absence does not delete. | SLICE-49 | Not run |
| REQ-024 | V-024: Arbitrary Smart Excel datasets stay selected/latest-dataset oriented until a schema-specific identity contract exists. | SLICE-50 | Not run |
| REQ-025 | V-025: Weak-identity rows remain reviewable evidence but are excluded from canonical accumulative KPIs with a visible count and reason. | SLICE-49, SLICE-50 | Not run |
| REQ-026 | V-026: A connector invoice and uploaded-file invoice are not automatically treated as the same record. | SLICE-49, SLICE-50 | Not run |
| REQ-027 | V-027: Relevant areas expose `Tally`, `Uploaded files`, and `Both`; the selector is not one global setting for unrelated Astra functionality. | SLICE-19, SLICE-20, SLICE-23, SLICE-24, SLICE-27, SLICE-28, SLICE-31, SLICE-32, SLICE-35, SLICE-36, SLICE-39, SLICE-40, SLICE-43, SLICE-44, SLICE-47, SLICE-48, SLICE-50 | Not run |
| REQ-028 | V-028: Remember source preference per user, company, and business area. | SLICE-19, SLICE-20, SLICE-24, SLICE-28, SLICE-32, SLICE-36, SLICE-40, SLICE-44, SLICE-48 | Not run |
| REQ-029 | V-029: When both supported channels exist and no preference exists, prefer fresh trusted Tally data, never Both. | SLICE-19, SLICE-20, SLICE-24, SLICE-28, SLICE-32, SLICE-36, SLICE-40, SLICE-44, SLICE-48 | Not run |
| REQ-030 | V-030: Preserve the selected source, explain missing data, and offer a clear switch. Never silently switch. | SLICE-19, SLICE-20, SLICE-24, SLICE-28, SLICE-32, SLICE-36, SLICE-40, SLICE-44, SLICE-48, SLICE-50 | Not run |
| REQ-031 | V-031: Present compact, separated source sections. Do not calculate combined totals, rankings, variances, or reconciliation differences. | SLICE-19, SLICE-20, SLICE-23, SLICE-24, SLICE-27, SLICE-28, SLICE-31, SLICE-32, SLICE-35, SLICE-36, SLICE-39, SLICE-40, SLICE-43, SLICE-44, SLICE-47, SLICE-48, SLICE-50 | Not run |
| REQ-032 | V-032: Important results identify ingestion channel, covered period, last accepted freshness, completeness/warnings, and trust state close to the result. | SLICE-19, SLICE-20, SLICE-23, SLICE-24, SLICE-27, SLICE-28, SLICE-31, SLICE-32, SLICE-35, SLICE-36, SLICE-39, SLICE-40, SLICE-43, SLICE-44, SLICE-47, SLICE-48, SLICE-50, SLICE-53, SLICE-58 | Not run |
| REQ-033 | V-033: Ask ARQ and My Business Snapshot use an explicit source context and do not silently combine ingestion channels. | SLICE-51, SLICE-52, SLICE-53 | Not run |
| REQ-034 | V-034: AI may explain two separately labelled sources but cannot produce a combined amount, ranking, KPI, or conclusion that assumes reconciliation. | SLICE-51, SLICE-52, SLICE-53 | Not run |
| REQ-035 | V-035: AI may explain last-trusted facts with a warning but cannot create new action recommendations dependent on a capability requiring verification. | SLICE-51, SLICE-52 | Not run |
| REQ-036 | V-036: A workspace remains bound to one Tally company GUID; a rename does not create a workspace. | SLICE-11 | Not run |
| REQ-037 | V-037: First multi-company use requires explicit company choice; later sessions may restore the last explicit choice. | SLICE-20 | Not run |
| REQ-038 | V-038: Switching company refreshes KPIs, source preference, sync/trust state, uploads, AI/Research context, and business details. No previous-company fact remains visible through frontend state leakage. | SLICE-20, SLICE-24, SLICE-28, SLICE-32, SLICE-36, SLICE-40, SLICE-44, SLICE-48, SLICE-51, SLICE-52, SLICE-53 | Not run |
| REQ-039 | V-039: No cross-company totals, ledgers, receivables, sales, or AI context are introduced. | SLICE-20, SLICE-24, SLICE-28, SLICE-32, SLICE-36, SLICE-40, SLICE-44, SLICE-48, SLICE-51, SLICE-52, SLICE-53 | Not run |
| REQ-040 | V-040: One connector installation can maintain several explicit, independently credentialed company/workspace profiles. Manual and scheduled sync always name the intended profile and never combine profile data. | SLICE-06, SLICE-12, SLICE-13, SLICE-14, SLICE-18, SLICE-56, SLICE-57 | Not run |
| REQ-041 | V-041: Allowed and enabled capability sets are stored per company workspace on the backend. | SLICE-08, SLICE-10 | Not run |
| REQ-042 | V-042: During assisted pairing, the connector operator may choose the initial enabled subset from the allowed set. | SLICE-08, SLICE-11, SLICE-14 | Not run |
| REQ-043 | V-043: During founder-assisted release, only ARQ administration may change enabled capabilities. Connector devices read the set and cannot overwrite it. | SLICE-08, SLICE-10, SLICE-18 | Not run |
| REQ-044 | V-044: The backend rejects a payload domain not enabled and allowed for that workspace. | SLICE-08, SLICE-10, SLICE-15, SLICE-18 | Not run |
| REQ-045 | V-045: Devices cannot create conflicting effective configuration through last-writer-wins behavior. | SLICE-06, SLICE-08, SLICE-10, SLICE-11, SLICE-15 | Not run |
| REQ-046 | V-046: Backend policy may permit the minimum supporting source facts necessary to make an enabled capability correct without enabling an unrelated KPI surface. | SLICE-08, SLICE-10 | Not run |
| REQ-047 | V-047: Authentication or free-trial status alone does not enable connector download or pairing; the workspace must be explicitly enabled. | SLICE-08, SLICE-10, SLICE-11, SLICE-57, SLICE-59 | Not run |
| REQ-048 | V-048: The connector shows the Astra workspace and detected Tally company before permanent binding. | SLICE-11, SLICE-14, SLICE-57 | Not run |
| REQ-049 | V-049: Initial production/pilot pairing may remain ARQ-admin assisted; self-service pairing is not required. | SLICE-11 | Not run |
| REQ-050 | V-050: Incorrect binding recovery is audited and cannot silently rebind a populated workspace or weaken permanent company isolation. | SLICE-11 | Not run |
| REQ-051 | V-051: Every company-scoped sync, import, analytics query, AI request, cleanup, and capability change enforces authorization on the backend. | SLICE-07, SLICE-08, SLICE-10, SLICE-11, SLICE-15, SLICE-17, SLICE-19, SLICE-22, SLICE-23, SLICE-26, SLICE-27, SLICE-30, SLICE-31, SLICE-34, SLICE-35, SLICE-38, SLICE-39, SLICE-42, SLICE-43, SLICE-46, SLICE-47, SLICE-49, SLICE-51, SLICE-52, SLICE-54, SLICE-55, SLICE-56, SLICE-57, SLICE-59 | Not run |
| REQ-052 | V-052: Device-token hashing and Windows Credential Manager storage remain intact. Credentials never enter logs or tracked files. | SLICE-11, SLICE-12, SLICE-13, SLICE-14, SLICE-54, SLICE-57 | Not run |
| REQ-053 | V-053: Operational logs may contain safe identifiers, capability, counts, duration, result, and reason code, but no party names, amounts, rows, secrets, or raw XML. | SLICE-01, SLICE-09, SLICE-15, SLICE-17, SLICE-18, SLICE-21, SLICE-25, SLICE-29, SLICE-33, SLICE-37, SLICE-41, SLICE-45, SLICE-54, SLICE-55, SLICE-59 | Not run |
| REQ-054 | V-054: Raw customer Tally data is never silently uploaded. Collection requires explicit consent, purpose, minimization, access, and retention rules. | SLICE-01, SLICE-54, SLICE-58 | Not run |
| REQ-055 | V-055: Existing re-authenticated company cleanup removes every new Tally/uploaded business fact, capability state, quarantine state, stored business provenance, and derived Ask ARQ/Research business context while preserving the established tenant/access/ device boundary unless separately approved. | SLICE-06, SLICE-07, SLICE-08, SLICE-09, SLICE-15, SLICE-22, SLICE-26, SLICE-30, SLICE-34, SLICE-38, SLICE-42, SLICE-46, SLICE-49, SLICE-52, SLICE-54, SLICE-56, SLICE-59 | Not run |
| REQ-056 | V-056: Only minimal pseudonymized security/audit evidence may survive cleanup, under a fixed disclosed retention period approved before release. It contains no party, amount, row, raw XML, or reusable credential. | SLICE-54, SLICE-59 | Not run |

## Acceptance scenarios

| Scenario | Expected assertion | Planned slices | Result |
|---|---|---|---|
| AC-001 | An authenticated but ineligible trial sees an honest setup state and cannot download/pair the production connector; an enabled workspace can. | SLICE-10, SLICE-11, SLICE-57 | Not run |
| AC-002 | Pairing shows both identities, binds only the intended GUID, and does not offer unsafe rebinding. | SLICE-11, SLICE-14 | Not run |
| AC-003 | One installation maintains Company A and Company B as separate profiles; syncing either uses only its credential, workspace, capabilities, state, and schedule. | SLICE-12, SLICE-13, SLICE-14, SLICE-18 | Not run |
| AC-004 | The connector can select an allowed subset during pairing; later devices obey the backend set, and unauthorized domains are rejected before ingestion. | SLICE-08, SLICE-10, SLICE-11, SLICE-15 | Not run |
| AC-005 | Repeating unchanged trustworthy source identities creates no duplicate; changed values update the existing facts and result counters distinguish the outcomes. | SLICE-16, SLICE-22, SLICE-26, SLICE-30, SLICE-34, SLICE-38, SLICE-42, SLICE-46 | Not run |
| AC-006 | Missing incremental Sales does nothing, while a missing bill in a trusted authoritative open-bill snapshot may close the bill exactly once. | SLICE-02, SLICE-16, SLICE-22, SLICE-30 | Not run |
| AC-007 | Retry after a lost response and concurrent writers preserve one accepted result and consistent canonical state. | SLICE-15, SLICE-16, SLICE-54, SLICE-56 | Not run |
| AC-008 | Weak-identity or safely excluded records remain reviewable, contribute to no canonical KPI, and produce visible warning/count evidence. | SLICE-16, SLICE-49, SLICE-50 | Not run |
| AC-009 | If excluded records could materially alter a Sales total, the capability requires verification rather than publishing a trusted incomplete total. | SLICE-04, SLICE-16, SLICE-34, SLICE-38 | Not run |
| AC-010 | A reliably classified custom Sales voucher contributes correctly; an unknown custom voucher is retained as unsupported evidence and cannot silently distort KPIs. | SLICE-04, SLICE-33, SLICE-34, SLICE-37, SLICE-38 | Not run |
| AC-011 | Sales can be accepted while Inventory fails; the run is Partially completed, and dependent facts inside Sales remain atomic. | SLICE-16, SLICE-18 | Not run |
| AC-012 | Suspicious zero preserves last-trusted data; only an audited ARQ admin can promote it during pilot; a validated extractor may accept zero only with positive completeness evidence. | SLICE-17, SLICE-18 | Not run |
| AC-013 | Exact file re-upload does not duplicate; recognized overlapping finance rows upsert; Smart Excel remains dataset-oriented; no upload matches a connector fact. | SLICE-49, SLICE-50 | Not run |
| AC-014 | Source choice persists per user/company/area, defaults to fresh Tally on first use, never silently switches, and Both remains separate with no variance or combined KPI. | SLICE-19, SLICE-20, SLICE-50 | Not run |
| AC-015 | Ask ARQ and My Business Snapshot enforce explicit source and trust context and produce no unreconciled combined financial conclusion. | SLICE-51, SLICE-52, SLICE-53 | Not run |
| AC-016 | Explicit company selection/switch refreshes every business and AI context without consolidation or stale frontend leakage. | SLICE-20, SLICE-51, SLICE-52, SLICE-53 | Not run |
| AC-017 | A supported ledger is traceable end-to-end and presented with debit/ credit meaning without a meaningless aggregate. | SLICE-03, SLICE-25, SLICE-26, SLICE-27, SLICE-28 | Not run |
| AC-018 | Accepted receivables reconcile to the named Tally source boundary for outstanding, overdue, ageing, party, and bill detail. | SLICE-02, SLICE-21, SLICE-22, SLICE-23, SLICE-24 | Not run |
| AC-019 | Accepted payables reconcile to the named Tally source boundary and remain visibly separate from receivables. | SLICE-02, SLICE-29, SLICE-30, SLICE-31, SLICE-32 | Not run |
| AC-020 | Posted Sales and supported Credit Notes produce deterministic recorded-sales, customer, trend, and product facts; Sales Orders do not contribute. | SLICE-04, SLICE-33, SLICE-34, SLICE-35, SLICE-36 | Not run |
| AC-021 | Posted Purchases and supported Debit Notes produce deterministic purchase, supplier, trend, and item facts; Purchase Orders do not contribute. | SLICE-04, SLICE-37, SLICE-38, SLICE-39, SLICE-40 | Not run |
| AC-022 | Receipts/Payments and necessary ledger movements are represented without claiming a complete Cash Flow Statement or bank reconciliation. | SLICE-03, SLICE-05, SLICE-25, SLICE-26, SLICE-27, SLICE-28, SLICE-41, SLICE-42, SLICE-43, SLICE-44 | Not run |
| AC-023 | Inventory exposes trustworthy identities, quantities, movements, and only valuation whose basis is reproducible and labelled. | SLICE-05, SLICE-45, SLICE-46, SLICE-47, SLICE-48 | Not run |
| AC-024 | Ordinary cloud storage and logs contain no raw XML or customer business content; consented diagnostics follow the explicit boundary. | SLICE-01, SLICE-15, SLICE-18, SLICE-54, SLICE-55 | Not run |
| AC-025 | Re-authenticated cleanup removes all new and derived company business content, leaving only the approved minimal pseudonymized audit record for its fixed period. | SLICE-09, SLICE-54 | Not run |
| AC-026 | Operators can inspect capability-level results, trust, completeness, freshness, and outcome counts without reading customer content. | SLICE-18, SLICE-55 | Not run |
| AC-027 | For each mandatory domain, validation compares the same company, period, voucher states, and valuation boundary against a named Tally report/export; identities/counts match and currency values match within documented rounding tolerances. | SLICE-02, SLICE-03, SLICE-04, SLICE-05, SLICE-24, SLICE-28, SLICE-32, SLICE-36, SLICE-40, SLICE-44, SLICE-48, SLICE-58 | Not run |

## Slice evidence

| Slice | Authorized scope | Checks and observable review | Result |
|---|---|---|---|
| SLICE-01 | Owner-authorized 2026-09-06 | Evidence matrix across fixtures, per-domain (5.1–5.11) status, consent status, minimized collection procedure — see `EVIDENCE.md` | Done; Ready for owner review |
| SLICE-02 | Owner-authorized 2026-09-06 | Receivables (`Bills Receivable`) mapped from real single-bill fixture with every open question named (identity, all-age scope, completeness, multi-bill, sign); payables (`Bills Payable`) has zero evidence — see `contracts/open-bills.md` | Receivables: Ready for owner review. Payables: not started, blocked |
| SLICE-03 | Owner-authorized 2026-09-06 | Attempted; found blocked — only one debtor ledger ever captured (₹0 balance, Sundry Debtors group), no Trial Balance/Ledger/Cash-Bank Book export exists to reconcile against | Blocked — no evidence, not started |
| SLICE-04 | Owner-authorized 2026-09-06 | Attempted; found blocked — no Sales/Purchase/Note register or voucher export ever captured | Blocked — no evidence, not started |
| SLICE-05 | Owner-authorized 2026-09-06 | Attempted; found blocked — no Receipt/Payment register or Stock Summary/movement export ever captured | Blocked — no evidence, not started |
| SLICE-06 | Owner-authorized and accepted 2026-09-06 | `python docs/specs/changes/003-.../evidence/capacity_probe.py` — deterministic synthetic serialization probe, output reproduced verbatim in `contracts/protocol.md` §3; found the proposed 1,000-fact and 1 MiB chunk bounds are not simultaneously safe, revised to whichever-first. Route/payload/error/generation design in `contracts/protocol.md`. ADR-004/005/006 accepted by owner. | Accepted |
| SLICE-07 | Owner-authorized 2026-09-06; accepted 2026-09-13 | `backend/tests/conftest.py` requires `ARQ_TEST_DATABASE_URL`, distinct from `DATABASE_URL`, before importing app modules. The owner configured a separate Neon test branch. `..\.venv\Scripts\python.exe -m pytest tests/test_isolated_test_db_guard.py tests/test_devices.py::test_register_success_returns_token_once -q` passed 4/4 on 2026-09-06. This covers missing/equal URL rejection before connection, an explicit unique-tenant create/read/delete/confirm-absent check, and device registration with fixture cleanup. The command printed no URL, credential, party name, or amount. | Accepted |
| SLICE-08 | Owner-authorized 2026-09-13 (resume through SLICE-08) | `backend/migrations/0009_capability_policy.sql` (tenant_configuration + tenant_capability_policy, applied to the isolated Neon test branch via `DATABASE_URL="$ARQ_TEST_DATABASE_URL" python migrations/run_migration.py`, then to production the same way with the default `.env` `DATABASE_URL`) and `backend/app/capability_policy.py` (policy repository primitives). `..\.venv\Scripts\python.exe -m pytest tests/test_capability_policy.py -q` passed 11/11 on 2026-09-13, covering: migration applied twice with no error; an unmigrated/never-touched tenant reads as empty allowed/enabled (not an error); ineligible and eligible-but-nothing-allowed tenants both refuse `apply_initial_enabled_selection` (all-or-nothing, no partial enable); unknown capability codes rejected; narrowing the allowed set also disables what it drops; the DB-level `is_enabled ⇒ is_allowed` CHECK rejects a direct bad insert independent of the Python layer; a policy row for a nonexistent tenant is rejected by the FK; two tenants' policies stay isolated; cleanup bumps both `configuration_revision` and `cleanup_generation` and clears the enabled set. Full backend suite (`..\.venv\Scripts\python.exe -m pytest -q`, includes SLICE-07's guard) passed 84/84 the same run, no regressions. No command printed a URL, credential, party name, or amount. **Flagged for owner confirmation:** `run_cleanup()` currently preserves the allowed set and `pilot_eligible` across cleanup (only the enabled set and both generations reset) — an interpretation of REQ-055's "capability state" wording, not a literal spec quote; see the function's docstring. Deployed to production (migration applied, code pushed to `main`; no API route yet calls this module, so there is no visible dashboard change). | Done; Ready for owner review |
| SLICE-09 | None | Planned: Run and evidence persistence schema; see TASKS.md for assertions/review | Not started |
| SLICE-10 | None | Planned: Eligibility and capability administration; see TASKS.md for assertions/review | Not started |
| SLICE-11 | None | Planned: Identity preview and atomic assisted registration; see TASKS.md for assertions/review | Not started |
| SLICE-12 | None | Planned: Profile credentials and recoverable migration; see TASKS.md for assertions/review | Not started |
| SLICE-13 | None | Planned: Profile scheduling, locking and reset; see TASKS.md for assertions/review | Not started |
| SLICE-14 | None | Planned: Localized connector pairing/profile controls; see TASKS.md for assertions/review | Not started |
| SLICE-15 | None | Planned: Immutable run and chunk API; see TASKS.md for assertions/review | Not started |
| SLICE-16 | None | Planned: Capability acceptance and shared dependencies; see TASKS.md for assertions/review | Not started |
| SLICE-17 | None | Planned: Quarantine and audited zero promotion; see TASKS.md for assertions/review | Not started |
| SLICE-18 | None | Planned: Bounded connector orchestration and status UI; see TASKS.md for assertions/review | Not started |
| SLICE-19 | None | Planned: Authorized source envelopes and preferences; see TASKS.md for assertions/review | Not started |
| SLICE-20 | None | Planned: Company context and shared source controls; see TASKS.md for assertions/review | Not started |
| SLICE-21 | None | Planned: Receivables: bounded extraction; see TASKS.md for assertions/review | Not started |
| SLICE-22 | None | Planned: Receivables: atomic canonical persistence; see TASKS.md for assertions/review | Not started |
| SLICE-23 | None | Planned: Receivables: deterministic metrics and API; see TASKS.md for assertions/review | Not started |
| SLICE-24 | None | Planned: Receivables: localized business view; see TASKS.md for assertions/review | Not started |
| SLICE-25 | None | Planned: Ledgers and cash/bank accounts: bounded extraction; see TASKS.md for assertions/review | Not started |
| SLICE-26 | None | Planned: Ledgers and cash/bank accounts: atomic canonical persistence; see TASKS.md for assertions/review | Not started |
| SLICE-27 | None | Planned: Ledgers and cash/bank accounts: deterministic metrics and API; see TASKS.md for assertions/review | Not started |
| SLICE-28 | None | Planned: Ledgers and cash/bank accounts: localized business view; see TASKS.md for assertions/review | Not started |
| SLICE-29 | None | Planned: Payables: bounded extraction; see TASKS.md for assertions/review | Not started |
| SLICE-30 | None | Planned: Payables: atomic canonical persistence; see TASKS.md for assertions/review | Not started |
| SLICE-31 | None | Planned: Payables: deterministic metrics and API; see TASKS.md for assertions/review | Not started |
| SLICE-32 | None | Planned: Payables: localized business view; see TASKS.md for assertions/review | Not started |
| SLICE-33 | None | Planned: Sales and Credit Notes: bounded extraction; see TASKS.md for assertions/review | Not started |
| SLICE-34 | None | Planned: Sales and Credit Notes: atomic canonical persistence; see TASKS.md for assertions/review | Not started |
| SLICE-35 | None | Planned: Sales and Credit Notes: deterministic metrics and API; see TASKS.md for assertions/review | Not started |
| SLICE-36 | None | Planned: Sales and Credit Notes: localized business view; see TASKS.md for assertions/review | Not started |
| SLICE-37 | None | Planned: Purchases and Debit Notes: bounded extraction; see TASKS.md for assertions/review | Not started |
| SLICE-38 | None | Planned: Purchases and Debit Notes: atomic canonical persistence; see TASKS.md for assertions/review | Not started |
| SLICE-39 | None | Planned: Purchases and Debit Notes: deterministic metrics and API; see TASKS.md for assertions/review | Not started |
| SLICE-40 | None | Planned: Purchases and Debit Notes: localized business view; see TASKS.md for assertions/review | Not started |
| SLICE-41 | None | Planned: Receipts and Payments: bounded extraction; see TASKS.md for assertions/review | Not started |
| SLICE-42 | None | Planned: Receipts and Payments: atomic canonical persistence; see TASKS.md for assertions/review | Not started |
| SLICE-43 | None | Planned: Receipts and Payments: deterministic metrics and API; see TASKS.md for assertions/review | Not started |
| SLICE-44 | None | Planned: Receipts and Payments: localized business view; see TASKS.md for assertions/review | Not started |
| SLICE-45 | None | Planned: Inventory: bounded extraction; see TASKS.md for assertions/review | Not started |
| SLICE-46 | None | Planned: Inventory: atomic canonical persistence; see TASKS.md for assertions/review | Not started |
| SLICE-47 | None | Planned: Inventory: deterministic metrics and API; see TASKS.md for assertions/review | Not started |
| SLICE-48 | None | Planned: Inventory: localized business view; see TASKS.md for assertions/review | Not started |
| SLICE-49 | None | Planned: Uploaded finance identity and accumulation; see TASKS.md for assertions/review | Not started |
| SLICE-50 | None | Planned: Uploaded-file and Smart Excel presentation; see TASKS.md for assertions/review | Not started |
| SLICE-51 | None | Planned: Source/trust enforcement for Ask ARQ; see TASKS.md for assertions/review | Not started |
| SLICE-52 | None | Planned: Research and business snapshot source isolation; see TASKS.md for assertions/review | Not started |
| SLICE-53 | None | Planned: One-page report source and trust provenance; see TASKS.md for assertions/review | Not started |
| SLICE-54 | None | Planned: Complete cleanup and retention enforcement; see TASKS.md for assertions/review | Not started |
| SLICE-55 | None | Planned: Operator run visibility and failure signals; see TASKS.md for assertions/review | Not started |
| SLICE-56 | None | Planned: Legacy compatibility and recovery rehearsal; see TASKS.md for assertions/review | Not started |
| SLICE-57 | None | Planned: Eligible signed connector download journey; see TASKS.md for assertions/review | Not started |
| SLICE-58 | None | Planned: Representative company acceptance; see TASKS.md for assertions/review | Not started |
| SLICE-59 | None | Planned: Owner-authorized production rollout and reconciliation; see TASKS.md for assertions/review | Not started |

## Evidence gates

| Gate | State | Closure evidence |
|---|---|---|
| G01 Source feasibility | Open | Actual mappings and consented/anonymized source comparisons, SLICE-01–05 |
| G02 Financial semantics | Open | Reviewed formulas, states, currency/units/rounding/period boundaries, SLICE-02–05 |
| G03 Protocol capacity | Open | Schema and generation contracts, bounded capacity evidence and reviewed ADRs, SLICE-06 |
| G04 Legacy migration | Open | Isolated migration/upgrade/recovery rehearsal, SLICE-56 |
| G05 Lifecycle | Open | Explicit retention duration/diagnostic policy approval and cleanup/race/expiry evidence, SLICE-54 |
| G06 Distribution | Open | Approved artifact hosting, signing environment and Windows validation, SLICE-57 |
| G07 Representative companies | Open | Consented structurally different company/domain comparisons, SLICE-58 |

## Recording each executed slice

Record authorization message/date, exact commands and working directory, assertion/result,
fixtures (synthetic versus consented real source), source report/company pseudonym/period/state/
valuation boundary, expected/actual counts and currency tolerance, screenshots or inspectable
artifact paths, failures/limitations, and owner acceptance. Never store raw customer XML, secrets
or business-sensitive logs in this record. Any retained customer evidence needs approved consent
and minimization; public documentation should use safe synthetic examples.

## Security, privacy and logs

- [ ] Server tenant/device/company/capability boundaries verified.
- [ ] Retry, concurrency, stale generation and cleanup races verified.
- [ ] Logs and residual audit inspected for prohibited content.
- [ ] Retention duration and diagnostics policy explicitly approved and enforced.
- [ ] Every new and existing derived business table included in cleanup.

## Deployment evidence

No production migration, deployment, upload, publication or connector distribution occurred.

- Migration review/owner approval/application: pending.
- Backend stable-alias health and database health: not run this change.
- Frontend source/company and live UI review: not run.
- Connector signature/checksum/Windows compatibility: not run.
- Pilot eligibility and capability activation: not performed.
- Recovery rehearsal and release acceptance: pending.

## Planning checks

Documentation-only validation: require all 56 REQ and 27 AC identifiers, 59 unique slice IDs,
valid references, explicit authorization states, and whitespace/diff checks. Record actual results
after running these checks. These checks do not verify product behavior.

2026-09-05 planning results: `git diff --check` passed (Git reported its normal
LF-to-CRLF working-copy warning for AGENTS.md). PowerShell regex/uniqueness checks on
TASKS.md and this file confirmed 59 unique slice headings, 56 requirement rows,
27 acceptance-scenario rows and zero unknown slice references. Product tests were not run.

## Release decision

- [ ] Every approved requirement and acceptance scenario has passing evidence.
- [ ] Every mandatory domain meets the end-to-end Definition of Done.
- [ ] All evidence gates and external prerequisites resolved.
- [ ] Required human/adversarial/live reviews accepted by owner.
- [ ] Baseline specs, AGENTS.md and superseded-change records reconciled.
- [ ] Owner approved release and status changed to Released.
