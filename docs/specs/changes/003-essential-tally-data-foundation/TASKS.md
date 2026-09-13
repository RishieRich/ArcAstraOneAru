# Tasks: Essential Tally Data Foundation and Source-Aware Analytics

| Field | Value |
|---|---|
| Status | Draft — owner task-list review required |
| Approved plan | PLAN.md; owner approved in conversation on 2026-09-05 |
| Execution | Owner authorized SLICE-01–05 on 2026-09-06, then SLICE-06–10 the same day, and authorized continuation through SLICE-25. SLICE-01 done (`EVIDENCE.md`). SLICE-02 partial — receivables mapped (`contracts/open-bills.md`), payables blocked. SLICE-03/04/05 blocked: zero real Tally evidence for those domains. SLICE-06 accepted by owner on 2026-09-06 (`contracts/protocol.md`, ADR-004/005/006, real synthetic capacity probe). **SLICE-07 accepted by owner on 2026-09-13** (in conversation, resuming work through SLICE-08): the isolated-test-DB guard and real Neon create/read/cleanup check pass. **SLICE-08 done, Ready for owner review** (2026-09-13): `backend/migrations/0009_capability_policy.sql` + `backend/app/capability_policy.py` — tenant-scoped allowed/enabled capability policy, `configuration_revision`/`cleanup_generation` counters, pilot-eligibility default-off, transactional initial-selection and cleanup primitives; 11 new isolated-DB tests plus the existing SLICE-07 guard (14/14) and the full backend suite (84/84) pass. Deployed: migration applied to production Neon, code pushed to `main`. |
| Next proposed slice | Owner reviews/accepts SLICE-08's schema/primitive evidence; then start SLICE-09 (run and evidence persistence schema). SLICE-03/04/05 and dependent domain work remain separately blocked on live-Tally evidence per `EVIDENCE.md` §5. |

## Execution agreement

Owner plan approval accepts the approach, not proof that G01–G07 have passed.
Review the complete list and authorize named slices before execution. Prerequisite slice numbers
below mean accepted outcomes, not merely code present. A named batch does not waive acceptance
of dependencies, source consent, evidence gates or production authority.

Each slice includes checks and an inspectable result. UI slices require a recorded live review,
all four languages, relevant accessibility states and the frontend build (or Windows GUI review).
Aim for one focused 45–60-minute review unit; evidence collection and domain implementations may
need smaller continuations. Stop at a safe passing checkpoint and propose a split if necessary;
elapsed time never establishes completion. No mandatory capability may be silently dropped.

Status progression: Proposed → Authorized → In progress → Ready for owner review → Accepted.
Record evidence and stop after the last authorized slice. Three equivalent failed attempts or
three unresolved review rounds require an owner decision. Customer evidence, signing, hosting
and production actions have the specific gates in PLAN.md. Missing evidence blocks dependent
work, not independent authorized slices.

Every schema slice includes re-runnable isolated migration, tenant constraints, compatibility and
cleanup tests in that slice. SLICE-54 audits the full boundary; it does not defer per-table cleanup.
Every domain includes contract → extraction → persistence → metrics → live view → named-source
reconciliation. Source controls are deliberately earlier than the domain views.
No baseline runtime contract is updated merely because this task list exists.

## Requirement coverage

| Requirement | Planned slices |
|---|---|
| REQ-001 — Stable identity | SLICE-01, SLICE-02, SLICE-03, SLICE-04, SLICE-05, SLICE-09, SLICE-16, SLICE-21, SLICE-22, SLICE-25, SLICE-26, SLICE-29, SLICE-30, SLICE-33, SLICE-34, SLICE-37, SLICE-38, SLICE-41, SLICE-42, SLICE-45, SLICE-46, SLICE-56, SLICE-58 |
| REQ-002 — Insert | SLICE-16, SLICE-22, SLICE-26, SLICE-30, SLICE-34, SLICE-38, SLICE-42, SLICE-46 |
| REQ-003 — Update | SLICE-04, SLICE-16, SLICE-22, SLICE-26, SLICE-30, SLICE-34, SLICE-38, SLICE-42, SLICE-46 |
| REQ-004 — Unchanged | SLICE-16, SLICE-22, SLICE-26, SLICE-30, SLICE-34, SLICE-38, SLICE-42, SLICE-46 |
| REQ-005 — Missing incremental records | SLICE-02, SLICE-16, SLICE-21, SLICE-22, SLICE-25, SLICE-26, SLICE-29, SLICE-30, SLICE-33, SLICE-34, SLICE-37, SLICE-38, SLICE-41, SLICE-42, SLICE-45, SLICE-46 |
| REQ-006 — Explicit transitions | SLICE-02, SLICE-03, SLICE-04, SLICE-05, SLICE-16, SLICE-21, SLICE-22, SLICE-25, SLICE-26, SLICE-29, SLICE-30, SLICE-33, SLICE-34, SLICE-37, SLICE-38, SLICE-41, SLICE-42, SLICE-45, SLICE-46, SLICE-58 |
| REQ-007 — Open-bill snapshot exception | SLICE-02, SLICE-22, SLICE-26, SLICE-30, SLICE-34, SLICE-38, SLICE-42, SLICE-46, SLICE-56, SLICE-58 |
| REQ-008 — Retry idempotency | SLICE-06, SLICE-09, SLICE-15, SLICE-18, SLICE-22, SLICE-26, SLICE-30, SLICE-34, SLICE-38, SLICE-42, SLICE-46, SLICE-56 |
| REQ-009 — Concurrency | SLICE-06, SLICE-07, SLICE-09, SLICE-16, SLICE-22, SLICE-26, SLICE-30, SLICE-34, SLICE-38, SLICE-42, SLICE-46, SLICE-56 |
| REQ-010 — Weak identity | SLICE-01, SLICE-02, SLICE-03, SLICE-04, SLICE-05, SLICE-16, SLICE-21, SLICE-22, SLICE-23, SLICE-25, SLICE-26, SLICE-27, SLICE-29, SLICE-30, SLICE-31, SLICE-33, SLICE-34, SLICE-35, SLICE-37, SLICE-38, SLICE-39, SLICE-41, SLICE-42, SLICE-43, SLICE-45, SLICE-46, SLICE-47, SLICE-58 |
| REQ-011 — Raw-source minimization | SLICE-01, SLICE-09, SLICE-15, SLICE-18, SLICE-21, SLICE-25, SLICE-29, SLICE-33, SLICE-37, SLICE-41, SLICE-45 |
| REQ-012 — Independent capability result | SLICE-06, SLICE-09, SLICE-16, SLICE-18, SLICE-22, SLICE-26, SLICE-30, SLICE-34, SLICE-38, SLICE-42, SLICE-46, SLICE-55 |
| REQ-013 — Capability atomicity | SLICE-03, SLICE-05, SLICE-06, SLICE-09, SLICE-16, SLICE-21, SLICE-22, SLICE-25, SLICE-26, SLICE-29, SLICE-30, SLICE-33, SLICE-34, SLICE-37, SLICE-38, SLICE-41, SLICE-42, SLICE-45, SLICE-46 |
| REQ-014 — Accepted with warnings | SLICE-04, SLICE-05, SLICE-16, SLICE-21, SLICE-22, SLICE-23, SLICE-25, SLICE-26, SLICE-27, SLICE-29, SLICE-30, SLICE-31, SLICE-33, SLICE-34, SLICE-35, SLICE-37, SLICE-38, SLICE-39, SLICE-41, SLICE-42, SLICE-43, SLICE-45, SLICE-46, SLICE-47, SLICE-58 |
| REQ-015 — Supporting-data atomicity | SLICE-03, SLICE-04, SLICE-05, SLICE-06, SLICE-16, SLICE-21, SLICE-22, SLICE-25, SLICE-26, SLICE-29, SLICE-30, SLICE-33, SLICE-34, SLICE-37, SLICE-38, SLICE-41, SLICE-42, SLICE-45, SLICE-46 |
| REQ-016 — Evaluate before mutation | SLICE-02, SLICE-09, SLICE-17, SLICE-22, SLICE-26, SLICE-30, SLICE-34, SLICE-38, SLICE-42, SLICE-46 |
| REQ-017 — Preserve last trusted state | SLICE-02, SLICE-09, SLICE-17, SLICE-22, SLICE-26, SLICE-30, SLICE-34, SLICE-38, SLICE-42, SLICE-46, SLICE-56 |
| REQ-018 — First-ever zero | SLICE-02, SLICE-17 |
| REQ-019 — Audited promotion | SLICE-17, SLICE-54, SLICE-55 |
| REQ-020 — Mature zero acceptance | SLICE-02, SLICE-17, SLICE-58 |
| REQ-021 — Trust-aware use | SLICE-09, SLICE-17, SLICE-18, SLICE-19, SLICE-22, SLICE-23, SLICE-24, SLICE-26, SLICE-27, SLICE-28, SLICE-30, SLICE-31, SLICE-32, SLICE-34, SLICE-35, SLICE-36, SLICE-38, SLICE-39, SLICE-40, SLICE-42, SLICE-43, SLICE-44, SLICE-46, SLICE-47, SLICE-48, SLICE-51, SLICE-52, SLICE-53, SLICE-54, SLICE-55, SLICE-56, SLICE-59 |
| REQ-022 — Exact-file deduplication | SLICE-49, SLICE-50 |
| REQ-023 — Recognized finance upsert | SLICE-49 |
| REQ-024 — Smart Excel remains dataset-oriented | SLICE-50 |
| REQ-025 — Weak uploaded identity | SLICE-49, SLICE-50 |
| REQ-026 — No cross-channel matching | SLICE-49, SLICE-50 |
| REQ-027 — Business-area source selection | SLICE-19, SLICE-20, SLICE-23, SLICE-24, SLICE-27, SLICE-28, SLICE-31, SLICE-32, SLICE-35, SLICE-36, SLICE-39, SLICE-40, SLICE-43, SLICE-44, SLICE-47, SLICE-48, SLICE-50 |
| REQ-028 — Preference scope | SLICE-19, SLICE-20, SLICE-24, SLICE-28, SLICE-32, SLICE-36, SLICE-40, SLICE-44, SLICE-48 |
| REQ-029 — First-use default | SLICE-19, SLICE-20, SLICE-24, SLICE-28, SLICE-32, SLICE-36, SLICE-40, SLICE-44, SLICE-48 |
| REQ-030 — Missing source | SLICE-19, SLICE-20, SLICE-24, SLICE-28, SLICE-32, SLICE-36, SLICE-40, SLICE-44, SLICE-48, SLICE-50 |
| REQ-031 — Both mode | SLICE-19, SLICE-20, SLICE-23, SLICE-24, SLICE-27, SLICE-28, SLICE-31, SLICE-32, SLICE-35, SLICE-36, SLICE-39, SLICE-40, SLICE-43, SLICE-44, SLICE-47, SLICE-48, SLICE-50 |
| REQ-032 — Provenance presentation | SLICE-19, SLICE-20, SLICE-23, SLICE-24, SLICE-27, SLICE-28, SLICE-31, SLICE-32, SLICE-35, SLICE-36, SLICE-39, SLICE-40, SLICE-43, SLICE-44, SLICE-47, SLICE-48, SLICE-50, SLICE-53, SLICE-58 |
| REQ-033 — Explicit AI source context | SLICE-51, SLICE-52, SLICE-53 |
| REQ-034 — Both-mode AI | SLICE-51, SLICE-52, SLICE-53 |
| REQ-035 — Trust-aware AI | SLICE-51, SLICE-52 |
| REQ-036 — One company per workspace | SLICE-11 |
| REQ-037 — Multiple workspaces per login | SLICE-20 |
| REQ-038 — Complete context switch | SLICE-20, SLICE-24, SLICE-28, SLICE-32, SLICE-36, SLICE-40, SLICE-44, SLICE-48, SLICE-51, SLICE-52, SLICE-53 |
| REQ-039 — No consolidation | SLICE-20, SLICE-24, SLICE-28, SLICE-32, SLICE-36, SLICE-40, SLICE-44, SLICE-48, SLICE-51, SLICE-52, SLICE-53 |
| REQ-040 — Multiple local profiles | SLICE-06, SLICE-12, SLICE-13, SLICE-14, SLICE-18, SLICE-56, SLICE-57 |
| REQ-041 — Backend-authoritative sets | SLICE-08, SLICE-10 |
| REQ-042 — Initial selection | SLICE-08, SLICE-11, SLICE-14 |
| REQ-043 — Post-pairing authority | SLICE-08, SLICE-10, SLICE-18 |
| REQ-044 — Backend enforcement | SLICE-08, SLICE-10, SLICE-15, SLICE-18 |
| REQ-045 — Multiple-device consistency | SLICE-06, SLICE-08, SLICE-10, SLICE-11, SLICE-15 |
| REQ-046 — Supporting data | SLICE-08, SLICE-10 |
| REQ-047 — Explicit pilot eligibility | SLICE-08, SLICE-10, SLICE-11, SLICE-57, SLICE-59 |
| REQ-048 — Identity confirmation | SLICE-11, SLICE-14, SLICE-57 |
| REQ-049 — Assisted pairing | SLICE-11 |
| REQ-050 — Safe recovery | SLICE-11 |
| REQ-051 — Server authorization | SLICE-07, SLICE-08, SLICE-10, SLICE-11, SLICE-15, SLICE-17, SLICE-19, SLICE-22, SLICE-23, SLICE-26, SLICE-27, SLICE-30, SLICE-31, SLICE-34, SLICE-35, SLICE-38, SLICE-39, SLICE-42, SLICE-43, SLICE-46, SLICE-47, SLICE-49, SLICE-51, SLICE-52, SLICE-54, SLICE-55, SLICE-56, SLICE-57, SLICE-59 |
| REQ-052 — Credential protection | SLICE-11, SLICE-12, SLICE-13, SLICE-14, SLICE-54, SLICE-57 |
| REQ-053 — Safe logs | SLICE-01, SLICE-09, SLICE-15, SLICE-17, SLICE-18, SLICE-21, SLICE-25, SLICE-29, SLICE-33, SLICE-37, SLICE-41, SLICE-45, SLICE-54, SLICE-55, SLICE-59 |
| REQ-054 — Diagnostics | SLICE-01, SLICE-54, SLICE-58 |
| REQ-055 — Complete cleanup | SLICE-06, SLICE-07, SLICE-08, SLICE-09, SLICE-15, SLICE-22, SLICE-26, SLICE-30, SLICE-34, SLICE-38, SLICE-42, SLICE-46, SLICE-49, SLICE-52, SLICE-54, SLICE-56, SLICE-59 |
| REQ-056 — Residual audit minimization | SLICE-54, SLICE-59 |

## Slice index

| Slice | Reviewable outcome |
|---|---|
| SLICE-01 | Evidence inventory and collection protocol |
| SLICE-02 | Receivable and payable source contracts |
| SLICE-03 | Ledger, structure and cash/bank contracts |
| SLICE-04 | Sales, purchases and note contracts |
| SLICE-05 | Receipt/payment and inventory contracts |
| SLICE-06 | Protocol, storage and profile decision records |
| SLICE-07 | Isolated backend test execution |
| SLICE-08 | Capability policy and generation schema |
| SLICE-09 | Run and evidence persistence schema |
| SLICE-10 | Eligibility and capability administration |
| SLICE-11 | Identity preview and atomic assisted registration |
| SLICE-12 | Profile credentials and recoverable migration |
| SLICE-13 | Profile scheduling, locking and reset |
| SLICE-14 | Localized connector pairing/profile controls |
| SLICE-15 | Immutable run and chunk API |
| SLICE-16 | Capability acceptance and shared dependencies |
| SLICE-17 | Quarantine and audited zero promotion |
| SLICE-18 | Bounded connector orchestration and status UI |
| SLICE-19 | Authorized source envelopes and preferences |
| SLICE-20 | Company context and shared source controls |
| SLICE-21 | Receivables: bounded extraction |
| SLICE-22 | Receivables: atomic canonical persistence |
| SLICE-23 | Receivables: deterministic metrics and API |
| SLICE-24 | Receivables: localized business view |
| SLICE-25 | Ledgers and cash/bank accounts: bounded extraction |
| SLICE-26 | Ledgers and cash/bank accounts: atomic canonical persistence |
| SLICE-27 | Ledgers and cash/bank accounts: deterministic metrics and API |
| SLICE-28 | Ledgers and cash/bank accounts: localized business view |
| SLICE-29 | Payables: bounded extraction |
| SLICE-30 | Payables: atomic canonical persistence |
| SLICE-31 | Payables: deterministic metrics and API |
| SLICE-32 | Payables: localized business view |
| SLICE-33 | Sales and Credit Notes: bounded extraction |
| SLICE-34 | Sales and Credit Notes: atomic canonical persistence |
| SLICE-35 | Sales and Credit Notes: deterministic metrics and API |
| SLICE-36 | Sales and Credit Notes: localized business view |
| SLICE-37 | Purchases and Debit Notes: bounded extraction |
| SLICE-38 | Purchases and Debit Notes: atomic canonical persistence |
| SLICE-39 | Purchases and Debit Notes: deterministic metrics and API |
| SLICE-40 | Purchases and Debit Notes: localized business view |
| SLICE-41 | Receipts and Payments: bounded extraction |
| SLICE-42 | Receipts and Payments: atomic canonical persistence |
| SLICE-43 | Receipts and Payments: deterministic metrics and API |
| SLICE-44 | Receipts and Payments: localized business view |
| SLICE-45 | Inventory: bounded extraction |
| SLICE-46 | Inventory: atomic canonical persistence |
| SLICE-47 | Inventory: deterministic metrics and API |
| SLICE-48 | Inventory: localized business view |
| SLICE-49 | Uploaded finance identity and accumulation |
| SLICE-50 | Uploaded-file and Smart Excel presentation |
| SLICE-51 | Source/trust enforcement for Ask ARQ |
| SLICE-52 | Research and business snapshot source isolation |
| SLICE-53 | One-page report source and trust provenance |
| SLICE-54 | Complete cleanup and retention enforcement |
| SLICE-55 | Operator run visibility and failure signals |
| SLICE-56 | Legacy compatibility and recovery rehearsal |
| SLICE-57 | Eligible signed connector download journey |
| SLICE-58 | Representative company acceptance |
| SLICE-59 | Owner-authorized production rollout and reconciliation |

## Review slices

### SLICE-01 — Evidence inventory and collection protocol

- **Status:** Authorized by owner 2026-09-06; done, Ready for owner review. See `EVIDENCE.md`.
- **Requirements:** REQ-001, REQ-010, REQ-011, REQ-053, REQ-054. Also covers the domain/section named in the work or review below.
- **Prerequisites:** None.
- **Likely files:** change-003/EVIDENCE.md; connector/tests/fixtures inventory.
- **Work:** Inventory existing fixtures and source mappings for every mandatory domain; record missing consent, actual Tally availability and a minimized read-only collection procedure. Do not assume permission to collect customer data.
- **Checks:** Separate synthetic, consented and unverified evidence; confirm all specification 5.1–5.11 domains have an owner and named source-report target.
- **Review:** An evidence matrix showing exactly what can be verified and what is missing.
- **Stop:** Record exact commands, assertions, observable evidence and limitations in VERIFICATION.md; stop for owner acceptance before dependent work. If incomplete, preserve a passing checkpoint and request a bounded continuation; never mark the slice accepted yourself.

### SLICE-02 — Receivable and payable source contracts

- **Status:** Authorized by owner 2026-09-06; receivables half done (see `contracts/open-bills.md`),
  Ready for owner review. Payables half blocked — zero captured evidence exists; not started.
- **Requirements:** REQ-001, REQ-005, REQ-006, REQ-007, REQ-010, REQ-016, REQ-017, REQ-018, REQ-020. Also covers the domain/section named in the work or review below.
- **Prerequisites:** 01; consented source access for actual captures.
- **Likely files:** change-003/contracts/open-bills.md; approved anonymized fixtures.
- **Work:** Verify party/bill identity, all-age open scope, due dates and positive completeness signals for both bill reports; document weak-reference handling.
- **Checks:** Compare identical company/as-of report counts and values; examine genuine zero, failed export, duplicate references and changed amounts.
- **Review:** Reviewed G01/G02 mappings for open bills; incomplete mappings remain explicitly blocked.
- **Stop:** Record exact commands, assertions, observable evidence and limitations in VERIFICATION.md; stop for owner acceptance before dependent work. If incomplete, preserve a passing checkpoint and request a bounded continuation; never mark the slice accepted yourself.

### SLICE-03 — Ledger, structure and cash/bank contracts

- **Status:** Authorized by owner 2026-09-06; blocked — no evidence. Repository contains one
  captured ledger (`debtor_ledgers.xml`, Sundry Debtors group, ₹0 balance) and nothing for Trial
  Balance, general Ledger report, Journal/Contra postings or Cash/Bank Book. See `EVIDENCE.md` §3/§5.
- **Requirements:** REQ-001, REQ-006, REQ-010, REQ-013, REQ-015. Also covers the domain/section named in the work or review below.
- **Prerequisites:** 01; consented source evidence.
- **Likely files:** change-003/contracts/accounts.md; approved fixtures.
- **Work:** Document native master identifiers, base classification, opening/closing boundaries, Journal/Contra postings and cash/bank relationships.
- **Checks:** Match Trial Balance, Ledger and Cash/Bank Book; test rename, custom group, sign, missing classification and balanced posting interpretation.
- **Review:** Account/source mapping and exact balance equations, without an all-ledger aggregate.
- **Stop:** Record exact commands, assertions, observable evidence and limitations in VERIFICATION.md; stop for owner acceptance before dependent work. If incomplete, preserve a passing checkpoint and request a bounded continuation; never mark the slice accepted yourself.

### SLICE-04 — Sales, purchases and note contracts

- **Status:** Authorized by owner 2026-09-06; blocked — no evidence. No Sales/Purchase/Note
  register or voucher export has ever been captured in this repository. See `EVIDENCE.md` §3/§5.
- **Requirements:** REQ-001, REQ-003, REQ-006, REQ-010, REQ-014, REQ-015. Also covers the domain/section named in the work or review below.
- **Prerequisites:** 01; consented source evidence.
- **Likely files:** change-003/contracts/trade.md; approved fixtures.
- **Work:** Document voucher identity, base classification, item lines, tax/base/gross values, Credit/Debit Notes, posted/cancelled/reversed states and current-year/rollover extraction.
- **Checks:** Match Sales/Purchase/Note registers; cover custom types, orders, currency, rounding, weak identities, line edits and missing incremental rows.
- **Review:** Reviewed formula and state matrix with named-source examples for both trade domains.
- **Stop:** Record exact commands, assertions, observable evidence and limitations in VERIFICATION.md; stop for owner acceptance before dependent work. If incomplete, preserve a passing checkpoint and request a bounded continuation; never mark the slice accepted yourself.

### SLICE-05 — Receipt/payment and inventory contracts

- **Status:** Authorized by owner 2026-09-06; blocked — no evidence. No Receipt/Payment register
  or Stock Summary/movement export has ever been captured in this repository. See `EVIDENCE.md` §3/§5.
- **Requirements:** REQ-001, REQ-006, REQ-010, REQ-013, REQ-014, REQ-015. Also covers the domain/section named in the work or review below.
- **Prerequisites:** 01,03,04; consented source evidence.
- **Likely files:** change-003/contracts/cash-stock.md; approved fixtures.
- **Work:** Document Receipt/Payment cash/bank allocations and stock identities, movements, units and reproducible valuation; distinguish internal transfers.
- **Checks:** Match receipt/payment registers and Stock Summary/movement reports; inspect split allocations, compound units and unavailable valuation.
- **Review:** Reviewed cash and stock contracts; unsupported valuation remains unknown.
- **Stop:** Record exact commands, assertions, observable evidence and limitations in VERIFICATION.md; stop for owner acceptance before dependent work. If incomplete, preserve a passing checkpoint and request a bounded continuation; never mark the slice accepted yourself.

### SLICE-06 — Protocol, storage and profile decision records

- **Status:** Accepted by owner 2026-09-06. See `contracts/protocol.md`,
  `evidence/capacity_probe.py` (real, rerunnable output), and accepted ADR-004/005/006.
- **Requirements:** REQ-008, REQ-009, REQ-012, REQ-013, REQ-015, REQ-040, REQ-045, REQ-055. Also covers the domain/section named in the work or review below.
- **Prerequisites:** 02–05 findings sufficient for affected contracts.
- **Likely files:** change-003/contracts/protocol.md; docs/decisions/ next available Proposed ADRs.
- **Work:** Specify complete route/payload/error schemas, generation rules, shared-master versioning, staging bounds and profile migration. Record alternatives in Proposed ADRs. Use a bounded synthetic probe for capacity evidence; freeze no unsupported limit.
- **Checks:** Review lost response, changed-content retry, stale devices, capability failure and cleanup races; demonstrate proposed chunk/runtime limits in an isolated harness.
- **Review:** G03 evidence and inspectable contracts; lasting decisions require reviewer acceptance before dependent implementation.
- **Stop:** Record exact commands, assertions, observable evidence and limitations in VERIFICATION.md; stop for owner acceptance before dependent work. If incomplete, preserve a passing checkpoint and request a bounded continuation; never mark the slice accepted yourself.

### SLICE-07 — Isolated backend test execution

- **Status:** Authorized by owner 2026-09-06; **accepted by owner 2026-09-13** (in conversation,
  authorizing continuation through SLICE-08). `backend/tests/conftest.py` now
  requires `ARQ_TEST_DATABASE_URL`, refuses to proceed if unset or identical to `DATABASE_URL`,
  and repoints every app module at the isolated URL before any of them can be imported.
  `backend/tests/test_isolated_test_db_guard.py` proves both failure modes fail before any
  connection attempt. The owner configured a distinct isolated Neon branch, and the live
  create/read/delete/confirm-absent check passed against it (see VERIFICATION.md).
- **Requirements:** REQ-009, REQ-051, REQ-055. Also covers the domain/section named in the work or review below.
- **Prerequisites:** Task-list and slice authorization; no production database.
- **Likely files:** backend/tests/conftest.py; test database configuration/docs.
- **Work:** Require explicit isolated test configuration and guard against accidental use of production; preserve offline-only test execution.
- **Checks:** Prove missing/unsafe configuration fails before connection; run one create/read/cleanup test against an explicitly isolated database.
- **Review:** A repeatable safe integration-test command with sanitized output.
- **Stop:** Record exact commands, assertions, observable evidence and limitations in VERIFICATION.md; stop for owner acceptance before dependent work. If incomplete, preserve a passing checkpoint and request a bounded continuation; never mark the slice accepted yourself.

### SLICE-08 — Capability policy and generation schema

- **Status:** Authorized by owner 2026-09-13 (resuming work in conversation through SLICE-08);
  done, Ready for owner review. `backend/migrations/0009_capability_policy.sql` adds
  `tenant_configuration` (`pilot_eligible` default `false`, `configuration_revision`,
  `cleanup_generation`, one row per tenant, backfilled for existing tenants) and
  `tenant_capability_policy` (`tenant_id, capability` primary key, `is_allowed`, `is_enabled`,
  DB-level `is_enabled` ⇒ `is_allowed` check, capability code CHECK against DEC-007's list, `on
  delete cascade` from `tenants`). `backend/app/capability_policy.py` provides
  `ensure_tenant_configuration`, `get_configuration`, `get_effective_capabilities`,
  `set_pilot_eligible`, `set_allowed_capabilities`, `apply_initial_enabled_selection` (all-or-
  nothing subset-of-allowed, requires pilot-eligible) and `run_cleanup` (bumps both generations,
  clears the enabled set; **flagged for owner confirmation**: it currently leaves the allowed set
  and pilot-eligibility intact as an administrative grant rather than spec's ambiguous "capability
  state" wording forcing their removal too — see the docstring — SLICE-54 is the authority that
  should confirm or override this before release).
- **Requirements:** REQ-041, REQ-042, REQ-043, REQ-044, REQ-045, REQ-046, REQ-047, REQ-051, REQ-055. Also covers the domain/section named in the work or review below.
- **Prerequisites:** 06 accepted,07.
- **Likely files:** backend/migrations/ next available migration; policy repository; cleanup tests.
- **Work:** Add policy/configuration and cleanup generations with tenant constraints, eligibility default-off and transactional initial selection primitives. Include cleanup treatment immediately.
- **Checks:** Apply twice in isolated DB; cross-tenant relationships fail; empty/default policy allows no new capability; cleanup invalidates old generations. All four checks implemented as
  `backend/tests/test_capability_policy.py` (11 tests) against the isolated Neon test branch;
  ran alongside the SLICE-07 guard (14/14) and the full backend suite (84/84), all passing.
- **Review:** Schema and rollback-compatible local migration evidence.
- **Stop:** Record exact commands, assertions, observable evidence and limitations in VERIFICATION.md; stop for owner acceptance before dependent work. If incomplete, preserve a passing checkpoint and request a bounded continuation; never mark the slice accepted yourself.

### SLICE-09 — Run and evidence persistence schema

- **Status:** Proposed; not authorized.
- **Requirements:** REQ-001, REQ-008, REQ-009, REQ-011, REQ-012, REQ-013, REQ-016, REQ-017, REQ-021, REQ-053, REQ-055. Also covers the domain/section named in the work or review below.
- **Prerequisites:** 06,07,08.
- **Likely files:** backend/migrations/ next migration; run repository; data_management.py; tests.
- **Work:** Add immutable runs/chunks, capability attempts, accepted generations and parsed quarantine; integrate deletion of every new business-bearing table.
- **Checks:** Tenant constraints, digest uniqueness, rerun migration, cleanup deletion and transaction rollback tests.
- **Review:** One isolated persisted run with evidence metadata, no raw XML, and complete cleanup.
- **Stop:** Record exact commands, assertions, observable evidence and limitations in VERIFICATION.md; stop for owner acceptance before dependent work. If incomplete, preserve a passing checkpoint and request a bounded continuation; never mark the slice accepted yourself.

### SLICE-10 — Eligibility and capability administration

- **Status:** Proposed; not authorized.
- **Requirements:** REQ-041, REQ-043, REQ-044, REQ-045, REQ-046, REQ-047, REQ-051. Also covers the domain/section named in the work or review below.
- **Prerequisites:** 08.
- **Likely files:** backend/app/admin.py; policy service; device config router; tests.
- **Work:** Expose admin-managed allowed/enabled sets and device read-only effective dependency closure with revision checks.
- **Checks:** Denied trial, disallowed dependency, stale revision and racing devices cannot change authority.
- **Review:** Inspectable admin/config responses and denial evidence, with no production policy changes.
- **Stop:** Record exact commands, assertions, observable evidence and limitations in VERIFICATION.md; stop for owner acceptance before dependent work. If incomplete, preserve a passing checkpoint and request a bounded continuation; never mark the slice accepted yourself.

### SLICE-11 — Identity preview and atomic assisted registration

- **Status:** Proposed; not authorized.
- **Requirements:** REQ-036, REQ-042, REQ-045, REQ-047, REQ-048, REQ-049, REQ-050, REQ-051, REQ-052. Also covers the domain/section named in the work or review below.
- **Prerequisites:** 10.
- **Likely files:** backend/app/routers/devices.py; v2 schemas; registration tests.
- **Work:** Add minimal pairing preview and confirmed GUID/subset registration under one-time-code and workspace locks; define audited safe recovery.
- **Checks:** Expired/reused codes, wrong GUID, stale preview, racing registrations and populated-workspace rebind fail safely; tokens never logged.
- **Review:** Synthetic registration journey showing both identities and one successful consume.
- **Stop:** Record exact commands, assertions, observable evidence and limitations in VERIFICATION.md; stop for owner acceptance before dependent work. If incomplete, preserve a passing checkpoint and request a bounded continuation; never mark the slice accepted yourself.

### SLICE-12 — Profile credentials and recoverable migration

- **Status:** Proposed; not authorized.
- **Requirements:** REQ-040, REQ-052. Also covers the domain/section named in the work or review below.
- **Prerequisites:** 06 accepted.
- **Likely files:** connector/settings.py, state.py, security/credentials.py (under src/arq_connector); tests.
- **Work:** Add opaque profile IDs and per-profile secret/state access; migrate legacy identity using verified copy before activation.
- **Checks:** Mock credential read/write failures at each transition; prove token never enters settings/logs and original registration remains recoverable.
- **Review:** Two isolated profiles and an interrupted migration recovery demonstration.
- **Stop:** Record exact commands, assertions, observable evidence and limitations in VERIFICATION.md; stop for owner acceptance before dependent work. If incomplete, preserve a passing checkpoint and request a bounded continuation; never mark the slice accepted yourself.

### SLICE-13 — Profile scheduling, locking and reset

- **Status:** Proposed; not authorized.
- **Requirements:** REQ-040, REQ-052. Also covers the domain/section named in the work or review below.
- **Prerequisites:** 12.
- **Likely files:** connector/src/arq_connector/{scheduler,runner,cli,lock,registration}.py; tests.
- **Work:** Require explicit profile on scheduled execution, isolate locks/tasks and reset only selected profile.
- **Checks:** Two scheduled commands resolve correct identity; ambiguous manual run refuses; failure/reset of A leaves B intact.
- **Review:** Inspectable task XML plus Windows task/reset check using test profiles.
- **Stop:** Record exact commands, assertions, observable evidence and limitations in VERIFICATION.md; stop for owner acceptance before dependent work. If incomplete, preserve a passing checkpoint and request a bounded continuation; never mark the slice accepted yourself.

### SLICE-14 — Localized connector pairing/profile controls

- **Status:** Proposed; not authorized.
- **Requirements:** REQ-040, REQ-042, REQ-048, REQ-052. Also covers the domain/section named in the work or review below.
- **Prerequisites:** 11,13.
- **Likely files:** connector/src/arq_connector/gui.py; new localization catalog; GUI tests.
- **Work:** Add four-language profile selection, capability subset and both-identity confirmation with credential-error recovery.
- **Checks:** Run connector tests and live Windows GUI review in all languages, including cancelled pairing, inaccessible credential and wrong-company states.
- **Review:** Recorded live two-profile registration/selection journey; no real pairing without eligible test setup.
- **Stop:** Record exact commands, assertions, observable evidence and limitations in VERIFICATION.md; stop for owner acceptance before dependent work. If incomplete, preserve a passing checkpoint and request a bounded continuation; never mark the slice accepted yourself.

### SLICE-15 — Immutable run and chunk API

- **Status:** Proposed; not authorized.
- **Requirements:** REQ-008, REQ-011, REQ-044, REQ-045, REQ-051, REQ-053, REQ-055. Also covers the domain/section named in the work or review below.
- **Prerequisites:** 09,10.
- **Likely files:** backend/app/ new v2 sync router/schemas; staging service; tests.
- **Work:** Authorize immutable manifest/chunks with bounded sizes, revisions, cleanup generation and safe result retrieval.
- **Checks:** Lost-response replay returns prior result; altered digest conflicts; wrong tenant/device/domain, oversize and stale generation reject before staging.
- **Review:** Inspectable API transcript and isolated stored counts.
- **Stop:** Record exact commands, assertions, observable evidence and limitations in VERIFICATION.md; stop for owner acceptance before dependent work. If incomplete, preserve a passing checkpoint and request a bounded continuation; never mark the slice accepted yourself.

### SLICE-16 — Capability acceptance and shared dependencies

- **Status:** Proposed; not authorized.
- **Requirements:** REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006, REQ-009, REQ-010, REQ-012, REQ-013, REQ-014, REQ-015. Also covers the domain/section named in the work or review below.
- **Prerequisites:** 15; G03 accepted.
- **Likely files:** backend/app/ acceptance/domain repository primitives; tests.
- **Work:** Validate identity and material exclusions, serialize writers, atomically publish capability plus supporting versions and counters; reject stale base generations.
- **Checks:** Concurrent devices cannot mix generations; changed/unchanged/inserted counts agree; one capability failure leaves another accepted; missing incremental data does nothing.
- **Review:** Adversarial isolated acceptance results with before/after canonical rows.
- **Stop:** Record exact commands, assertions, observable evidence and limitations in VERIFICATION.md; stop for owner acceptance before dependent work. If incomplete, preserve a passing checkpoint and request a bounded continuation; never mark the slice accepted yourself.

### SLICE-17 — Quarantine and audited zero promotion

- **Status:** Proposed; not authorized.
- **Requirements:** REQ-016, REQ-017, REQ-018, REQ-019, REQ-020, REQ-021, REQ-051, REQ-053. Also covers the domain/section named in the work or review below.
- **Prerequisites:** 16.
- **Likely files:** backend/app/ trust service, admin.py; tests.
- **Work:** Quarantine suspicious and unvalidated-first zeros, preserve last-trusted generation and support admin-only promotion with reason and current-generation checks.
- **Checks:** Zero after data never erases it; stale promotion fails; mature extractor zero needs both registry approval and positive completeness.
- **Review:** Inspectable first-zero, suspicious-zero and valid-promotion scenarios.
- **Stop:** Record exact commands, assertions, observable evidence and limitations in VERIFICATION.md; stop for owner acceptance before dependent work. If incomplete, preserve a passing checkpoint and request a bounded continuation; never mark the slice accepted yourself.

### SLICE-18 — Bounded connector orchestration and status UI

- **Status:** Proposed; not authorized.
- **Requirements:** REQ-008, REQ-011, REQ-012, REQ-021, REQ-040, REQ-043, REQ-044, REQ-053. Also covers the domain/section named in the work or review below.
- **Prerequisites:** 14,15,17.
- **Likely files:** connector/src/arq_connector/sync/; runner.py; gui.py; localization; tests.
- **Work:** Read effective configuration, extract using domain adapters, upload bounded chunks, recover saved results and expose per-capability partial/failure states; keep local extraction and submission failure distinct.
- **Checks:** Cancel/deadline/retry/response-loss tests; no silent truncation; live localized Windows review of partial run using synthetic adapters.
- **Review:** A visible partial run and recovered retry; each capability correctly labelled.
- **Stop:** Record exact commands, assertions, observable evidence and limitations in VERIFICATION.md; stop for owner acceptance before dependent work. If incomplete, preserve a passing checkpoint and request a bounded continuation; never mark the slice accepted yourself.

### SLICE-19 — Authorized source envelopes and preferences

- **Status:** Proposed; not authorized.
- **Requirements:** REQ-021, REQ-027, REQ-028, REQ-029, REQ-030, REQ-031, REQ-032, REQ-051. Also covers the domain/section named in the work or review below.
- **Prerequisites:** 09,17.
- **Likely files:** backend/app/ metric context service, dashboard routes; preference migration and cleanup; tests.
- **Work:** Add per-user/company/area preference and separate per-source envelopes; expose source/period/freshness/trust without combined aggregate.
- **Checks:** Both stays separated; missing remembered source remains selected; fresh trusted Tally default only under policy; tenant access enforced.
- **Review:** Inspectable source API scenarios with synthetic facts.
- **Stop:** Record exact commands, assertions, observable evidence and limitations in VERIFICATION.md; stop for owner acceptance before dependent work. If incomplete, preserve a passing checkpoint and request a bounded continuation; never mark the slice accepted yourself.

### SLICE-20 — Company context and shared source controls

- **Status:** Proposed; not authorized.
- **Requirements:** REQ-027, REQ-028, REQ-029, REQ-030, REQ-031, REQ-032, REQ-037, REQ-038, REQ-039. Also covers the domain/section named in the work or review below.
- **Prerequisites:** 19; inspect Change 002 accepted navigation.
- **Likely files:** frontend/src/App.jsx, api.js, i18n.js; source context helpers/tests.
- **Work:** Add explicit initial company choice, request-generation cancellation and shared source selector/provenance states before domain UI.
- **Checks:** Frontend tests/build plus live four-language, keyboard/mobile/zoom checks; delayed A response cannot enter B; Both/missing/stale views truthful.
- **Review:** Recorded company switch and source selection journey.
- **Stop:** Record exact commands, assertions, observable evidence and limitations in VERIFICATION.md; stop for owner acceptance before dependent work. If incomplete, preserve a passing checkpoint and request a bounded continuation; never mark the slice accepted yourself.

### SLICE-21 — Receivables: bounded extraction

- **Status:** Proposed; not authorized.
- **Requirements:** REQ-001, REQ-005, REQ-006, REQ-010, REQ-011, REQ-013, REQ-014, REQ-015, REQ-053. Also covers the domain/section named in the work or review below.
- **Prerequisites:** 02,18; G01/G02 accepted for specification 5.3; supporting extraction 18.
- **Likely files:** connector/src/arq_connector/tally/ domain modules; connector/tests/; change-003/contracts/receivables.md.
- **Work:** Extract current open bills, all ages, party/reference identity and due dates under the accepted mapping; include completeness/period and classification evidence.
- **Checks:** Fixture assertions cover raw signs, changed amount, weak reference, missing bills closing only in trusted complete snapshots; requests are export-only; no raw source/cloud or business logs.
- **Review:** Parsed synthetic/anonymized example reconciles to Bills Receivable; no live source claim without actual evidence.
- **Stop:** Record exact commands, assertions, observable evidence and limitations in VERIFICATION.md; stop for owner acceptance before dependent work. If incomplete, preserve a passing checkpoint and request a bounded continuation; never mark the slice accepted yourself.

### SLICE-22 — Receivables: atomic canonical persistence

- **Status:** Proposed; not authorized.
- **Requirements:** REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006, REQ-007, REQ-008, REQ-009, REQ-010, REQ-012, REQ-013, REQ-014, REQ-015, REQ-016, REQ-017, REQ-021, REQ-051, REQ-055. Also covers the domain/section named in the work or review below.
- **Prerequisites:** 21,16,17; accepted supporting domain contracts.
- **Likely files:** backend/app/ domain repository; backend/migrations/ next additive migration; cleanup and domain tests.
- **Work:** Store current open bills, all ages, party/reference identity and due dates with scoped native identity, accepted generations and supporting versions; add cleanup in the same slice. Apply REQ-007 only to open bills, never other domains.
- **Checks:** Isolated migration rerun, tenant constraints, lost response/concurrent changes, missing-input semantics, quarantine and cleanup; assert raw signs, changed amount, weak reference, missing bills closing only in trusted complete snapshots.
- **Review:** Accepted generation and counters from fixture replay; invalid/weak input cannot mutate trusted KPIs.
- **Stop:** Record exact commands, assertions, observable evidence and limitations in VERIFICATION.md; stop for owner acceptance before dependent work. If incomplete, preserve a passing checkpoint and request a bounded continuation; never mark the slice accepted yourself.

### SLICE-23 — Receivables: deterministic metrics and API

- **Status:** Proposed; not authorized.
- **Requirements:** REQ-010, REQ-014, REQ-021, REQ-027, REQ-031, REQ-032, REQ-051. Also covers the domain/section named in the work or review below.
- **Prerequisites:** 22,19; G02 accepted.
- **Likely files:** backend/app/ domain metric service and authorized dashboard routes; metric tests.
- **Work:** Compute outstanding, overdue, ageing, top debtors and bill details from accepted same-source facts under the documented Decimal formulas.
- **Checks:** Assert raw signs, changed amount, weak reference, missing bills closing only in trusted complete snapshots; zero/negative/null/stale inputs; exact count/value comparison to Bills Receivable using matched company/period/states and documented rounding.
- **Review:** Inspectable authorized API with provenance and independently separated Both envelopes.
- **Stop:** Record exact commands, assertions, observable evidence and limitations in VERIFICATION.md; stop for owner acceptance before dependent work. If incomplete, preserve a passing checkpoint and request a bounded continuation; never mark the slice accepted yourself.

### SLICE-24 — Receivables: localized business view

- **Status:** Proposed; not authorized.
- **Requirements:** REQ-021, REQ-027, REQ-028, REQ-029, REQ-030, REQ-031, REQ-032, REQ-038, REQ-039. Also covers the domain/section named in the work or review below.
- **Prerequisites:** 23,20; accepted overlapping Change 002 UI.
- **Likely files:** frontend/src/components/ domain view; presentation helpers/tests; i18n.js.
- **Work:** Present outstanding, overdue, ageing, top debtors and bill details with source, period, freshness/trust and reviewable exclusions, preserving answer-first navigation.
- **Checks:** Frontend tests/build; live all-language keyboard/mobile/zoom review with empty/error/partial/stale/Both states and delayed company switch. Compare displayed figures to Bills Receivable fixture.
- **Review:** Recorded live business journey and domain end-to-end source comparison; extraction/storage alone is not completion.
- **Stop:** Record exact commands, assertions, observable evidence and limitations in VERIFICATION.md; stop for owner acceptance before dependent work. If incomplete, preserve a passing checkpoint and request a bounded continuation; never mark the slice accepted yourself.

### SLICE-25 — Ledgers and cash/bank accounts: bounded extraction

- **Status:** Proposed; not authorized.
- **Requirements:** REQ-001, REQ-005, REQ-006, REQ-010, REQ-011, REQ-013, REQ-014, REQ-015, REQ-053. Also covers the domain/section named in the work or review below.
- **Prerequisites:** 03,18; G01/G02 accepted for specification 5.1–5.2, 5.9, 5.11; supporting extraction 18.
- **Likely files:** connector/src/arq_connector/tally/ domain modules; connector/tests/; change-003/contracts/ledgers-and-cash-bank-accounts.md.
- **Work:** Extract company/group/ledger masters, Journal/Contra and cash/bank postings with versioned relationships under the accepted mapping; include completeness/period and classification evidence.
- **Checks:** Fixture assertions cover renames, unknown groups, balancing entries, period opening/closing and debit/credit orientation; requests are export-only; no raw source/cloud or business logs.
- **Review:** Parsed synthetic/anonymized example reconciles to Trial Balance, Ledger and Cash/Bank Book; no live source claim without actual evidence.
- **Stop:** Record exact commands, assertions, observable evidence and limitations in VERIFICATION.md; stop for owner acceptance before dependent work. If incomplete, preserve a passing checkpoint and request a bounded continuation; never mark the slice accepted yourself.

### SLICE-26 — Ledgers and cash/bank accounts: atomic canonical persistence

- **Status:** Proposed; not authorized.
- **Requirements:** REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006, REQ-007, REQ-008, REQ-009, REQ-010, REQ-012, REQ-013, REQ-014, REQ-015, REQ-016, REQ-017, REQ-021, REQ-051, REQ-055. Also covers the domain/section named in the work or review below.
- **Prerequisites:** 25,16,17; accepted supporting domain contracts.
- **Likely files:** backend/app/ domain repository; backend/migrations/ next additive migration; cleanup and domain tests.
- **Work:** Store company/group/ledger masters, Journal/Contra and cash/bank postings with versioned relationships with scoped native identity, accepted generations and supporting versions; add cleanup in the same slice. Apply REQ-007 only to open bills, never other domains.
- **Checks:** Isolated migration rerun, tenant constraints, lost response/concurrent changes, missing-input semantics, quarantine and cleanup; assert renames, unknown groups, balancing entries, period opening/closing and debit/credit orientation.
- **Review:** Accepted generation and counters from fixture replay; invalid/weak input cannot mutate trusted KPIs.
- **Stop:** Record exact commands, assertions, observable evidence and limitations in VERIFICATION.md; stop for owner acceptance before dependent work. If incomplete, preserve a passing checkpoint and request a bounded continuation; never mark the slice accepted yourself.

### SLICE-27 — Ledgers and cash/bank accounts: deterministic metrics and API

- **Status:** Proposed; not authorized.
- **Requirements:** REQ-010, REQ-014, REQ-021, REQ-027, REQ-031, REQ-032, REQ-051. Also covers the domain/section named in the work or review below.
- **Prerequisites:** 26,19; G02 accepted.
- **Likely files:** backend/app/ domain metric service and authorized dashboard routes; metric tests.
- **Work:** Compute per-account balances, classification, movement and details without meaningless aggregate from accepted same-source facts under the documented Decimal formulas.
- **Checks:** Assert renames, unknown groups, balancing entries, period opening/closing and debit/credit orientation; zero/negative/null/stale inputs; exact count/value comparison to Trial Balance, Ledger and Cash/Bank Book using matched company/period/states and documented rounding.
- **Review:** Inspectable authorized API with provenance and independently separated Both envelopes.
- **Stop:** Record exact commands, assertions, observable evidence and limitations in VERIFICATION.md; stop for owner acceptance before dependent work. If incomplete, preserve a passing checkpoint and request a bounded continuation; never mark the slice accepted yourself.

### SLICE-28 — Ledgers and cash/bank accounts: localized business view

- **Status:** Proposed; not authorized.
- **Requirements:** REQ-021, REQ-027, REQ-028, REQ-029, REQ-030, REQ-031, REQ-032, REQ-038, REQ-039. Also covers the domain/section named in the work or review below.
- **Prerequisites:** 27,20; accepted overlapping Change 002 UI.
- **Likely files:** frontend/src/components/ domain view; presentation helpers/tests; i18n.js.
- **Work:** Present per-account balances, classification, movement and details without meaningless aggregate with source, period, freshness/trust and reviewable exclusions, preserving answer-first navigation.
- **Checks:** Frontend tests/build; live all-language keyboard/mobile/zoom review with empty/error/partial/stale/Both states and delayed company switch. Compare displayed figures to Trial Balance, Ledger and Cash/Bank Book fixture.
- **Review:** Recorded live business journey and domain end-to-end source comparison; extraction/storage alone is not completion.
- **Stop:** Record exact commands, assertions, observable evidence and limitations in VERIFICATION.md; stop for owner acceptance before dependent work. If incomplete, preserve a passing checkpoint and request a bounded continuation; never mark the slice accepted yourself.

### SLICE-29 — Payables: bounded extraction

- **Status:** Proposed; not authorized.
- **Requirements:** REQ-001, REQ-005, REQ-006, REQ-010, REQ-011, REQ-013, REQ-014, REQ-015, REQ-053. Also covers the domain/section named in the work or review below.
- **Prerequisites:** 02,18; G01/G02 accepted for specification 5.4; supporting extraction 18.
- **Likely files:** connector/src/arq_connector/tally/ domain modules; connector/tests/; change-003/contracts/payables.md.
- **Work:** Extract creditor masters and all-age current payable bills under the accepted mapping; include completeness/period and classification evidence.
- **Checks:** Fixture assertions cover supplier identity, changed balances, unknown due date and complete-snapshot-only closure; requests are export-only; no raw source/cloud or business logs.
- **Review:** Parsed synthetic/anonymized example reconciles to Bills Payable; no live source claim without actual evidence.
- **Stop:** Record exact commands, assertions, observable evidence and limitations in VERIFICATION.md; stop for owner acceptance before dependent work. If incomplete, preserve a passing checkpoint and request a bounded continuation; never mark the slice accepted yourself.

### SLICE-30 — Payables: atomic canonical persistence

- **Status:** Proposed; not authorized.
- **Requirements:** REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006, REQ-007, REQ-008, REQ-009, REQ-010, REQ-012, REQ-013, REQ-014, REQ-015, REQ-016, REQ-017, REQ-021, REQ-051, REQ-055. Also covers the domain/section named in the work or review below.
- **Prerequisites:** 29,16,17; accepted supporting domain contracts.
- **Likely files:** backend/app/ domain repository; backend/migrations/ next additive migration; cleanup and domain tests.
- **Work:** Store creditor masters and all-age current payable bills with scoped native identity, accepted generations and supporting versions; add cleanup in the same slice. Apply REQ-007 only to open bills, never other domains.
- **Checks:** Isolated migration rerun, tenant constraints, lost response/concurrent changes, missing-input semantics, quarantine and cleanup; assert supplier identity, changed balances, unknown due date and complete-snapshot-only closure.
- **Review:** Accepted generation and counters from fixture replay; invalid/weak input cannot mutate trusted KPIs.
- **Stop:** Record exact commands, assertions, observable evidence and limitations in VERIFICATION.md; stop for owner acceptance before dependent work. If incomplete, preserve a passing checkpoint and request a bounded continuation; never mark the slice accepted yourself.

### SLICE-31 — Payables: deterministic metrics and API

- **Status:** Proposed; not authorized.
- **Requirements:** REQ-010, REQ-014, REQ-021, REQ-027, REQ-031, REQ-032, REQ-051. Also covers the domain/section named in the work or review below.
- **Prerequisites:** 30,19; G02 accepted.
- **Likely files:** backend/app/ domain metric service and authorized dashboard routes; metric tests.
- **Work:** Compute payable/overdue totals, ageing, top suppliers and bill detail distinct from receivables from accepted same-source facts under the documented Decimal formulas.
- **Checks:** Assert supplier identity, changed balances, unknown due date and complete-snapshot-only closure; zero/negative/null/stale inputs; exact count/value comparison to Bills Payable using matched company/period/states and documented rounding.
- **Review:** Inspectable authorized API with provenance and independently separated Both envelopes.
- **Stop:** Record exact commands, assertions, observable evidence and limitations in VERIFICATION.md; stop for owner acceptance before dependent work. If incomplete, preserve a passing checkpoint and request a bounded continuation; never mark the slice accepted yourself.

### SLICE-32 — Payables: localized business view

- **Status:** Proposed; not authorized.
- **Requirements:** REQ-021, REQ-027, REQ-028, REQ-029, REQ-030, REQ-031, REQ-032, REQ-038, REQ-039. Also covers the domain/section named in the work or review below.
- **Prerequisites:** 31,20; accepted overlapping Change 002 UI.
- **Likely files:** frontend/src/components/ domain view; presentation helpers/tests; i18n.js.
- **Work:** Present payable/overdue totals, ageing, top suppliers and bill detail distinct from receivables with source, period, freshness/trust and reviewable exclusions, preserving answer-first navigation.
- **Checks:** Frontend tests/build; live all-language keyboard/mobile/zoom review with empty/error/partial/stale/Both states and delayed company switch. Compare displayed figures to Bills Payable fixture.
- **Review:** Recorded live business journey and domain end-to-end source comparison; extraction/storage alone is not completion.
- **Stop:** Record exact commands, assertions, observable evidence and limitations in VERIFICATION.md; stop for owner acceptance before dependent work. If incomplete, preserve a passing checkpoint and request a bounded continuation; never mark the slice accepted yourself.

### SLICE-33 — Sales and Credit Notes: bounded extraction

- **Status:** Proposed; not authorized.
- **Requirements:** REQ-001, REQ-005, REQ-006, REQ-010, REQ-011, REQ-013, REQ-014, REQ-015, REQ-053. Also covers the domain/section named in the work or review below.
- **Prerequisites:** 04,18; G01/G02 accepted for specification 5.5, 5.8; supporting extraction 25.
- **Likely files:** connector/src/arq_connector/tally/ domain modules; connector/tests/; change-003/contracts/sales-and-credit-notes.md.
- **Work:** Extract posted sales and credit-note headers, accounting allocations and item lines under the accepted mapping; include completeness/period and classification evidence.
- **Checks:** Fixture assertions cover custom base types, cancelled/draft/orders, line edits, tax/base/gross, currency and material exclusions; requests are export-only; no raw source/cloud or business logs.
- **Review:** Parsed synthetic/anonymized example reconciles to Sales and Credit Note registers; no live source claim without actual evidence.
- **Stop:** Record exact commands, assertions, observable evidence and limitations in VERIFICATION.md; stop for owner acceptance before dependent work. If incomplete, preserve a passing checkpoint and request a bounded continuation; never mark the slice accepted yourself.

### SLICE-34 — Sales and Credit Notes: atomic canonical persistence

- **Status:** Proposed; not authorized.
- **Requirements:** REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006, REQ-007, REQ-008, REQ-009, REQ-010, REQ-012, REQ-013, REQ-014, REQ-015, REQ-016, REQ-017, REQ-021, REQ-051, REQ-055. Also covers the domain/section named in the work or review below.
- **Prerequisites:** 33,16,17; accepted supporting domain contracts.
- **Likely files:** backend/app/ domain repository; backend/migrations/ next additive migration; cleanup and domain tests.
- **Work:** Store posted sales and credit-note headers, accounting allocations and item lines with scoped native identity, accepted generations and supporting versions; add cleanup in the same slice. Apply REQ-007 only to open bills, never other domains.
- **Checks:** Isolated migration rerun, tenant constraints, lost response/concurrent changes, missing-input semantics, quarantine and cleanup; assert custom base types, cancelled/draft/orders, line edits, tax/base/gross, currency and material exclusions.
- **Review:** Accepted generation and counters from fixture replay; invalid/weak input cannot mutate trusted KPIs.
- **Stop:** Record exact commands, assertions, observable evidence and limitations in VERIFICATION.md; stop for owner acceptance before dependent work. If incomplete, preserve a passing checkpoint and request a bounded continuation; never mark the slice accepted yourself.

### SLICE-35 — Sales and Credit Notes: deterministic metrics and API

- **Status:** Proposed; not authorized.
- **Requirements:** REQ-010, REQ-014, REQ-021, REQ-027, REQ-031, REQ-032, REQ-051. Also covers the domain/section named in the work or review below.
- **Prerequisites:** 34,19; G02 accepted.
- **Likely files:** backend/app/ domain metric service and authorized dashboard routes; metric tests.
- **Work:** Compute gross/notes/net recorded sales, counts, customers/products, monthly trend and drill-down from accepted same-source facts under the documented Decimal formulas.
- **Checks:** Assert custom base types, cancelled/draft/orders, line edits, tax/base/gross, currency and material exclusions; zero/negative/null/stale inputs; exact count/value comparison to Sales and Credit Note registers using matched company/period/states and documented rounding.
- **Review:** Inspectable authorized API with provenance and independently separated Both envelopes.
- **Stop:** Record exact commands, assertions, observable evidence and limitations in VERIFICATION.md; stop for owner acceptance before dependent work. If incomplete, preserve a passing checkpoint and request a bounded continuation; never mark the slice accepted yourself.

### SLICE-36 — Sales and Credit Notes: localized business view

- **Status:** Proposed; not authorized.
- **Requirements:** REQ-021, REQ-027, REQ-028, REQ-029, REQ-030, REQ-031, REQ-032, REQ-038, REQ-039. Also covers the domain/section named in the work or review below.
- **Prerequisites:** 35,20; accepted overlapping Change 002 UI.
- **Likely files:** frontend/src/components/ domain view; presentation helpers/tests; i18n.js.
- **Work:** Present gross/notes/net recorded sales, counts, customers/products, monthly trend and drill-down with source, period, freshness/trust and reviewable exclusions, preserving answer-first navigation.
- **Checks:** Frontend tests/build; live all-language keyboard/mobile/zoom review with empty/error/partial/stale/Both states and delayed company switch. Compare displayed figures to Sales and Credit Note registers fixture.
- **Review:** Recorded live business journey and domain end-to-end source comparison; extraction/storage alone is not completion.
- **Stop:** Record exact commands, assertions, observable evidence and limitations in VERIFICATION.md; stop for owner acceptance before dependent work. If incomplete, preserve a passing checkpoint and request a bounded continuation; never mark the slice accepted yourself.

### SLICE-37 — Purchases and Debit Notes: bounded extraction

- **Status:** Proposed; not authorized.
- **Requirements:** REQ-001, REQ-005, REQ-006, REQ-010, REQ-011, REQ-013, REQ-014, REQ-015, REQ-053. Also covers the domain/section named in the work or review below.
- **Prerequisites:** 04,18; G01/G02 accepted for specification 5.6, 5.8; supporting extraction 25.
- **Likely files:** connector/src/arq_connector/tally/ domain modules; connector/tests/; change-003/contracts/purchases-and-debit-notes.md.
- **Work:** Extract posted purchase/debit-note headers and accounting/item allocations under the accepted mapping; include completeness/period and classification evidence.
- **Checks:** Fixture assertions cover custom base types, cancelled/draft/orders, line edits, tax/base/gross, currency and material exclusions; requests are export-only; no raw source/cloud or business logs.
- **Review:** Parsed synthetic/anonymized example reconciles to Purchase and Debit Note registers; no live source claim without actual evidence.
- **Stop:** Record exact commands, assertions, observable evidence and limitations in VERIFICATION.md; stop for owner acceptance before dependent work. If incomplete, preserve a passing checkpoint and request a bounded continuation; never mark the slice accepted yourself.

### SLICE-38 — Purchases and Debit Notes: atomic canonical persistence

- **Status:** Proposed; not authorized.
- **Requirements:** REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006, REQ-007, REQ-008, REQ-009, REQ-010, REQ-012, REQ-013, REQ-014, REQ-015, REQ-016, REQ-017, REQ-021, REQ-051, REQ-055. Also covers the domain/section named in the work or review below.
- **Prerequisites:** 37,16,17; accepted supporting domain contracts.
- **Likely files:** backend/app/ domain repository; backend/migrations/ next additive migration; cleanup and domain tests.
- **Work:** Store posted purchase/debit-note headers and accounting/item allocations with scoped native identity, accepted generations and supporting versions; add cleanup in the same slice. Apply REQ-007 only to open bills, never other domains.
- **Checks:** Isolated migration rerun, tenant constraints, lost response/concurrent changes, missing-input semantics, quarantine and cleanup; assert custom base types, cancelled/draft/orders, line edits, tax/base/gross, currency and material exclusions.
- **Review:** Accepted generation and counters from fixture replay; invalid/weak input cannot mutate trusted KPIs.
- **Stop:** Record exact commands, assertions, observable evidence and limitations in VERIFICATION.md; stop for owner acceptance before dependent work. If incomplete, preserve a passing checkpoint and request a bounded continuation; never mark the slice accepted yourself.

### SLICE-39 — Purchases and Debit Notes: deterministic metrics and API

- **Status:** Proposed; not authorized.
- **Requirements:** REQ-010, REQ-014, REQ-021, REQ-027, REQ-031, REQ-032, REQ-051. Also covers the domain/section named in the work or review below.
- **Prerequisites:** 38,19; G02 accepted.
- **Likely files:** backend/app/ domain metric service and authorized dashboard routes; metric tests.
- **Work:** Compute gross/notes/net recorded purchases, counts, suppliers/items, monthly trend and detail from accepted same-source facts under the documented Decimal formulas.
- **Checks:** Assert custom base types, cancelled/draft/orders, line edits, tax/base/gross, currency and material exclusions; zero/negative/null/stale inputs; exact count/value comparison to Purchase and Debit Note registers using matched company/period/states and documented rounding.
- **Review:** Inspectable authorized API with provenance and independently separated Both envelopes.
- **Stop:** Record exact commands, assertions, observable evidence and limitations in VERIFICATION.md; stop for owner acceptance before dependent work. If incomplete, preserve a passing checkpoint and request a bounded continuation; never mark the slice accepted yourself.

### SLICE-40 — Purchases and Debit Notes: localized business view

- **Status:** Proposed; not authorized.
- **Requirements:** REQ-021, REQ-027, REQ-028, REQ-029, REQ-030, REQ-031, REQ-032, REQ-038, REQ-039. Also covers the domain/section named in the work or review below.
- **Prerequisites:** 39,20; accepted overlapping Change 002 UI.
- **Likely files:** frontend/src/components/ domain view; presentation helpers/tests; i18n.js.
- **Work:** Present gross/notes/net recorded purchases, counts, suppliers/items, monthly trend and detail with source, period, freshness/trust and reviewable exclusions, preserving answer-first navigation.
- **Checks:** Frontend tests/build; live all-language keyboard/mobile/zoom review with empty/error/partial/stale/Both states and delayed company switch. Compare displayed figures to Purchase and Debit Note registers fixture.
- **Review:** Recorded live business journey and domain end-to-end source comparison; extraction/storage alone is not completion.
- **Stop:** Record exact commands, assertions, observable evidence and limitations in VERIFICATION.md; stop for owner acceptance before dependent work. If incomplete, preserve a passing checkpoint and request a bounded continuation; never mark the slice accepted yourself.

### SLICE-41 — Receipts and Payments: bounded extraction

- **Status:** Proposed; not authorized.
- **Requirements:** REQ-001, REQ-005, REQ-006, REQ-010, REQ-011, REQ-013, REQ-014, REQ-015, REQ-053. Also covers the domain/section named in the work or review below.
- **Prerequisites:** 05,18; G01/G02 accepted for specification 5.7, 5.11; supporting extraction 25.
- **Likely files:** connector/src/arq_connector/tally/ domain modules; connector/tests/; change-003/contracts/receipts-and-payments.md.
- **Work:** Extract receipt/payment voucher and cash/bank/counterparty/bill allocations under the accepted mapping; include completeness/period and classification evidence.
- **Checks:** Fixture assertions cover split allocations, Contra transfers, duplicate references, sign/currency and zero/missing values; requests are export-only; no raw source/cloud or business logs.
- **Review:** Parsed synthetic/anonymized example reconciles to Receipt/Payment registers and Cash/Bank Book; no live source claim without actual evidence.
- **Stop:** Record exact commands, assertions, observable evidence and limitations in VERIFICATION.md; stop for owner acceptance before dependent work. If incomplete, preserve a passing checkpoint and request a bounded continuation; never mark the slice accepted yourself.

### SLICE-42 — Receipts and Payments: atomic canonical persistence

- **Status:** Proposed; not authorized.
- **Requirements:** REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006, REQ-007, REQ-008, REQ-009, REQ-010, REQ-012, REQ-013, REQ-014, REQ-015, REQ-016, REQ-017, REQ-021, REQ-051, REQ-055. Also covers the domain/section named in the work or review below.
- **Prerequisites:** 41,16,17; accepted supporting domain contracts.
- **Likely files:** backend/app/ domain repository; backend/migrations/ next additive migration; cleanup and domain tests.
- **Work:** Store receipt/payment voucher and cash/bank/counterparty/bill allocations with scoped native identity, accepted generations and supporting versions; add cleanup in the same slice. Apply REQ-007 only to open bills, never other domains.
- **Checks:** Isolated migration rerun, tenant constraints, lost response/concurrent changes, missing-input semantics, quarantine and cleanup; assert split allocations, Contra transfers, duplicate references, sign/currency and zero/missing values.
- **Review:** Accepted generation and counters from fixture replay; invalid/weak input cannot mutate trusted KPIs.
- **Stop:** Record exact commands, assertions, observable evidence and limitations in VERIFICATION.md; stop for owner acceptance before dependent work. If incomplete, preserve a passing checkpoint and request a bounded continuation; never mark the slice accepted yourself.

### SLICE-43 — Receipts and Payments: deterministic metrics and API

- **Status:** Proposed; not authorized.
- **Requirements:** REQ-010, REQ-014, REQ-021, REQ-027, REQ-031, REQ-032, REQ-051. Also covers the domain/section named in the work or review below.
- **Prerequisites:** 42,19; G02 accepted.
- **Likely files:** backend/app/ domain metric service and authorized dashboard routes; metric tests.
- **Work:** Compute received/paid totals, trends, counterparties and transactions without statutory cash-flow claim from accepted same-source facts under the documented Decimal formulas.
- **Checks:** Assert split allocations, Contra transfers, duplicate references, sign/currency and zero/missing values; zero/negative/null/stale inputs; exact count/value comparison to Receipt/Payment registers and Cash/Bank Book using matched company/period/states and documented rounding.
- **Review:** Inspectable authorized API with provenance and independently separated Both envelopes.
- **Stop:** Record exact commands, assertions, observable evidence and limitations in VERIFICATION.md; stop for owner acceptance before dependent work. If incomplete, preserve a passing checkpoint and request a bounded continuation; never mark the slice accepted yourself.

### SLICE-44 — Receipts and Payments: localized business view

- **Status:** Proposed; not authorized.
- **Requirements:** REQ-021, REQ-027, REQ-028, REQ-029, REQ-030, REQ-031, REQ-032, REQ-038, REQ-039. Also covers the domain/section named in the work or review below.
- **Prerequisites:** 43,20; accepted overlapping Change 002 UI.
- **Likely files:** frontend/src/components/ domain view; presentation helpers/tests; i18n.js.
- **Work:** Present received/paid totals, trends, counterparties and transactions without statutory cash-flow claim with source, period, freshness/trust and reviewable exclusions, preserving answer-first navigation.
- **Checks:** Frontend tests/build; live all-language keyboard/mobile/zoom review with empty/error/partial/stale/Both states and delayed company switch. Compare displayed figures to Receipt/Payment registers and Cash/Bank Book fixture.
- **Review:** Recorded live business journey and domain end-to-end source comparison; extraction/storage alone is not completion.
- **Stop:** Record exact commands, assertions, observable evidence and limitations in VERIFICATION.md; stop for owner acceptance before dependent work. If incomplete, preserve a passing checkpoint and request a bounded continuation; never mark the slice accepted yourself.

### SLICE-45 — Inventory: bounded extraction

- **Status:** Proposed; not authorized.
- **Requirements:** REQ-001, REQ-005, REQ-006, REQ-010, REQ-011, REQ-013, REQ-014, REQ-015, REQ-053. Also covers the domain/section named in the work or review below.
- **Prerequisites:** 05,18; G01/G02 accepted for specification 5.10; supporting extraction 33,37.
- **Likely files:** connector/src/arq_connector/tally/ domain modules; connector/tests/; change-003/contracts/inventory.md.
- **Work:** Extract stock groups/items/units, opening/current quantities and source-supported movements/valuation under the accepted mapping; include completeness/period and classification evidence.
- **Checks:** Fixture assertions cover compound/unknown units, negative stock, unsupported value basis and sales/purchase relationships; requests are export-only; no raw source/cloud or business logs.
- **Review:** Parsed synthetic/anonymized example reconciles to Stock Summary and item movement reports; no live source claim without actual evidence.
- **Stop:** Record exact commands, assertions, observable evidence and limitations in VERIFICATION.md; stop for owner acceptance before dependent work. If incomplete, preserve a passing checkpoint and request a bounded continuation; never mark the slice accepted yourself.

### SLICE-46 — Inventory: atomic canonical persistence

- **Status:** Proposed; not authorized.
- **Requirements:** REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006, REQ-007, REQ-008, REQ-009, REQ-010, REQ-012, REQ-013, REQ-014, REQ-015, REQ-016, REQ-017, REQ-021, REQ-051, REQ-055. Also covers the domain/section named in the work or review below.
- **Prerequisites:** 45,16,17; accepted supporting domain contracts.
- **Likely files:** backend/app/ domain repository; backend/migrations/ next additive migration; cleanup and domain tests.
- **Work:** Store stock groups/items/units, opening/current quantities and source-supported movements/valuation with scoped native identity, accepted generations and supporting versions; add cleanup in the same slice. Apply REQ-007 only to open bills, never other domains.
- **Checks:** Isolated migration rerun, tenant constraints, lost response/concurrent changes, missing-input semantics, quarantine and cleanup; assert compound/unknown units, negative stock, unsupported value basis and sales/purchase relationships.
- **Review:** Accepted generation and counters from fixture replay; invalid/weak input cannot mutate trusted KPIs.
- **Stop:** Record exact commands, assertions, observable evidence and limitations in VERIFICATION.md; stop for owner acceptance before dependent work. If incomplete, preserve a passing checkpoint and request a bounded continuation; never mark the slice accepted yourself.

### SLICE-47 — Inventory: deterministic metrics and API

- **Status:** Proposed; not authorized.
- **Requirements:** REQ-010, REQ-014, REQ-021, REQ-027, REQ-031, REQ-032, REQ-051. Also covers the domain/section named in the work or review below.
- **Prerequisites:** 46,19; G02 accepted.
- **Likely files:** backend/app/ domain metric service and authorized dashboard routes; metric tests.
- **Work:** Compute item quantities, movements and reproducible labelled value without invented units from accepted same-source facts under the documented Decimal formulas.
- **Checks:** Assert compound/unknown units, negative stock, unsupported value basis and sales/purchase relationships; zero/negative/null/stale inputs; exact count/value comparison to Stock Summary and item movement reports using matched company/period/states and documented rounding.
- **Review:** Inspectable authorized API with provenance and independently separated Both envelopes.
- **Stop:** Record exact commands, assertions, observable evidence and limitations in VERIFICATION.md; stop for owner acceptance before dependent work. If incomplete, preserve a passing checkpoint and request a bounded continuation; never mark the slice accepted yourself.

### SLICE-48 — Inventory: localized business view

- **Status:** Proposed; not authorized.
- **Requirements:** REQ-021, REQ-027, REQ-028, REQ-029, REQ-030, REQ-031, REQ-032, REQ-038, REQ-039. Also covers the domain/section named in the work or review below.
- **Prerequisites:** 47,20; accepted overlapping Change 002 UI.
- **Likely files:** frontend/src/components/ domain view; presentation helpers/tests; i18n.js.
- **Work:** Present item quantities, movements and reproducible labelled value without invented units with source, period, freshness/trust and reviewable exclusions, preserving answer-first navigation.
- **Checks:** Frontend tests/build; live all-language keyboard/mobile/zoom review with empty/error/partial/stale/Both states and delayed company switch. Compare displayed figures to Stock Summary and item movement reports fixture.
- **Review:** Recorded live business journey and domain end-to-end source comparison; extraction/storage alone is not completion.
- **Stop:** Record exact commands, assertions, observable evidence and limitations in VERIFICATION.md; stop for owner acceptance before dependent work. If incomplete, preserve a passing checkpoint and request a bounded continuation; never mark the slice accepted yourself.

### SLICE-49 — Uploaded finance identity and accumulation

- **Status:** Proposed; not authorized.
- **Requirements:** REQ-022, REQ-023, REQ-025, REQ-026, REQ-051, REQ-055. Also covers the domain/section named in the work or review below.
- **Prerequisites:** 07,19; upload identity contract reviewed.
- **Likely files:** backend/app/spreadsheet_import.py, routers/imports.py; finance migration/cleanup; tests.
- **Work:** Classify reliable/weak uploaded identities, retain review evidence and cross-file upsert only strong facts; preserve separate connector namespace and exact-file dedup.
- **Checks:** Identical file unchanged; overlapping strong rows update/insert; weak excluded count explicit; absence does not delete; connector GUID never matches upload.
- **Review:** Inspectable uploaded overlap examples and resulting canonical/excluded counts.
- **Stop:** Record exact commands, assertions, observable evidence and limitations in VERIFICATION.md; stop for owner acceptance before dependent work. If incomplete, preserve a passing checkpoint and request a bounded continuation; never mark the slice accepted yourself.

### SLICE-50 — Uploaded-file and Smart Excel presentation

- **Status:** Proposed; not authorized.
- **Requirements:** REQ-022, REQ-024, REQ-025, REQ-026, REQ-027, REQ-030, REQ-031, REQ-032. Also covers the domain/section named in the work or review below.
- **Prerequisites:** 49,20.
- **Likely files:** frontend/src/components/FinancialUpload.jsx, FinancialOverview.jsx, SmartDataExplorer.jsx; i18n/tests.
- **Work:** Show Uploaded files source and identity exclusions while preserving selected/latest Smart Excel datasets and existing supported formats.
- **Checks:** Parser regression and frontend tests/build; live four-language reupload, weak rows, source switch and dataset selection review.
- **Review:** Recorded upload journey demonstrating no canonical KPI contribution from weak rows.
- **Stop:** Record exact commands, assertions, observable evidence and limitations in VERIFICATION.md; stop for owner acceptance before dependent work. If incomplete, preserve a passing checkpoint and request a bounded continuation; never mark the slice accepted yourself.

### SLICE-51 — Source/trust enforcement for Ask ARQ

- **Status:** Proposed; not authorized.
- **Requirements:** REQ-021, REQ-033, REQ-034, REQ-035, REQ-038, REQ-039, REQ-051. Also covers the domain/section named in the work or review below.
- **Prerequisites:** 19,20,23,35,39; source AI contract reviewed.
- **Likely files:** backend/app/routers/ask.py; schemas_ask.py; metric context and provider tests; Copilot.jsx/i18n.
- **Work:** Pass explicit accepted source/generation to Ask; separate Both explanations and prevent combined financial conclusions and blocked-capability recommendations using constrained output and validation.
- **Checks:** Adversarial provider output cannot introduce combined numbers/rankings; failure returns honest response; provider fallback unchanged; live localized source/company switch clears stale conversation.
- **Review:** Inspectable prompt/structured-output fixtures without customer data and live Ask source/trust journey.
- **Stop:** Record exact commands, assertions, observable evidence and limitations in VERIFICATION.md; stop for owner acceptance before dependent work. If incomplete, preserve a passing checkpoint and request a bounded continuation; never mark the slice accepted yourself.

### SLICE-52 — Research and business snapshot source isolation

- **Status:** Proposed; not authorized.
- **Requirements:** REQ-021, REQ-033, REQ-034, REQ-035, REQ-038, REQ-039, REQ-051, REQ-055. Also covers the domain/section named in the work or review below.
- **Prerequisites:** 51; all consuming domain metrics accepted.
- **Likely files:** backend/app/research.py, routers/research.py; provenance migration/cleanup; ResearchAgent.jsx; tests/i18n.
- **Work:** Persist source/period/generation with derived runs, scope latest-result retrieval, invalidate stale context and block recommendations depending on verification-required facts.
- **Checks:** Different source/company cannot restore another context; cleanup removes derived facts; no credential fabricated leads; live four-language state review and frontend build.
- **Review:** Recorded My Business Snapshot/Research context switch and suppressed unsafe recommendation.
- **Stop:** Record exact commands, assertions, observable evidence and limitations in VERIFICATION.md; stop for owner acceptance before dependent work. If incomplete, preserve a passing checkpoint and request a bounded continuation; never mark the slice accepted yourself.

### SLICE-53 — One-page report source and trust provenance

- **Status:** Proposed; not authorized.
- **Requirements:** REQ-021, REQ-032, REQ-033, REQ-034, REQ-038, REQ-039. Also covers the domain/section named in the work or review below.
- **Prerequisites:** 51,52; domain views accepted.
- **Likely files:** frontend/src/components/OnePageReport.jsx; report presentation tests/styles/i18n.
- **Work:** Render deterministic source-separated charts and printed provenance, with last-trusted warning and no Both aggregate.
- **Checks:** Tests/build and live print/A4 landscape review in four languages; report values equal API; company/source changes cannot retain old chart.
- **Review:** Recorded screen and print review with source/period/freshness/trust visible.
- **Stop:** Record exact commands, assertions, observable evidence and limitations in VERIFICATION.md; stop for owner acceptance before dependent work. If incomplete, preserve a passing checkpoint and request a bounded continuation; never mark the slice accepted yourself.

### SLICE-54 — Complete cleanup and retention enforcement

- **Status:** Proposed; not authorized.
- **Requirements:** REQ-019, REQ-021, REQ-051, REQ-052, REQ-053, REQ-054, REQ-055, REQ-056. Also covers the domain/section named in the work or review below.
- **Prerequisites:** All business table slices; G05 retention/diagnostic decisions explicitly approved.
- **Likely files:** backend/app/routers/data_management.py; retention job/admin; Research repositories; tests; lifecycle docs.
- **Work:** Audit complete data inventory, delete derived/quarantine/staging/context/business provenance and enabled state atomically; retain only approved minimal audit and enforce expiry. Recheck cleanup generation for in-flight work.
- **Checks:** Wrong password/access denied; concurrent upload/sync/Research cannot resurrect data; preserved tenant/access/devices confirmed; expiry failure observable; no names/amounts/rows/raw XML in residual audit.
- **Review:** Isolated before/after inventory and retention sweep evidence; owner sees exact boundary.
- **Stop:** Record exact commands, assertions, observable evidence and limitations in VERIFICATION.md; stop for owner acceptance before dependent work. If incomplete, preserve a passing checkpoint and request a bounded continuation; never mark the slice accepted yourself.

### SLICE-55 — Operator run visibility and failure signals

- **Status:** Proposed; not authorized.
- **Requirements:** REQ-012, REQ-019, REQ-021, REQ-051, REQ-053. Also covers the domain/section named in the work or review below.
- **Prerequisites:** 17,18,54.
- **Likely files:** backend/app/admin.py; operational event/report modules; monitoring config/docs/tests.
- **Work:** Expose scoped per-capability outcomes/counts/freshness/extractor/protocol and testable alerts for stale/failed/quarantined/old clients and sweep failures.
- **Checks:** Tenant access, content-free log/report review and deterministic injected failures; document notification destination, thresholds and cancellation before any authorized external sending.
- **Review:** Inspectable operator report and locally captured alert events, no unsolicited external notification.
- **Stop:** Record exact commands, assertions, observable evidence and limitations in VERIFICATION.md; stop for owner acceptance before dependent work. If incomplete, preserve a passing checkpoint and request a bounded continuation; never mark the slice accepted yourself.

### SLICE-56 — Legacy compatibility and recovery rehearsal

- **Status:** Proposed; not authorized.
- **Requirements:** REQ-001, REQ-007, REQ-008, REQ-009, REQ-017, REQ-021, REQ-040, REQ-051, REQ-055. Also covers the domain/section named in the work or review below.
- **Prerequisites:** 21–55 accepted; G04.
- **Likely files:** backend/ migration/backfill and v1/v2 guards; connector upgrade tests; recovery docs.
- **Work:** Rehearse source/identity backfill, promoted-workspace v1 refusal, mixed versions, rollback-compatible backend and capability kill switch in isolation.
- **Checks:** Migration rerun, legacy unmigrated acceptance, promoted old-client rejection, scheduler pause, last-trusted retention and forward recovery; no destructive rollback.
- **Review:** Rehearsal transcript with counts, versions, containment and recovery steps.
- **Stop:** Record exact commands, assertions, observable evidence and limitations in VERIFICATION.md; stop for owner acceptance before dependent work. If incomplete, preserve a passing checkpoint and request a bounded continuation; never mark the slice accepted yourself.

### SLICE-57 — Eligible signed connector download journey

- **Status:** Proposed; not authorized.
- **Requirements:** REQ-040, REQ-047, REQ-048, REQ-051, REQ-052. Also covers the domain/section named in the work or review below.
- **Prerequisites:** 14,18,56; G06 hosting decision and signing setup approved.
- **Likely files:** connector/build.ps1; release verifier/manifest; authorized download route; frontend setup/i18n/tests.
- **Work:** Build verified universal signed Windows x64 artifact and eligibility-controlled download/setup with immutable checksum/manifest and expiring access. No publication under this slice without separate owner authority.
- **Checks:** Signature/hash/version/protocol checks on Windows 10/11; ineligible access denied; expired URL/hash mismatch safe; live four-language download/setup states.
- **Review:** Reviewable signed artifact and local/staging download journey; absence of certificate is an explicit blocker.
- **Stop:** Record exact commands, assertions, observable evidence and limitations in VERIFICATION.md; stop for owner acceptance before dependent work. If incomplete, preserve a passing checkpoint and request a bounded continuation; never mark the slice accepted yourself.

### SLICE-58 — Representative company acceptance

- **Status:** Proposed; not authorized.
- **Requirements:** REQ-001, REQ-006, REQ-007, REQ-010, REQ-014, REQ-020, REQ-032, REQ-054. Also covers the domain/section named in the work or review below.
- **Prerequisites:** All domain UI slices,50–57; G07 consented companies.
- **Likely files:** change-003/VERIFICATION.md; minimized reconciliation evidence.
- **Work:** Reconcile every mandatory domain for service, GST/inventory trading and manufacturing/materially different structure, with consent and named report boundaries.
- **Checks:** Exact identities/counts and documented value tolerances across company/period/states/valuation; include empty/negative/partial/altered data and unknown custom configurations.
- **Review:** Owner-reviewed company/domain matrix; missing participants/data stays incomplete, never synthetic substitution for real proof.
- **Stop:** Record exact commands, assertions, observable evidence and limitations in VERIFICATION.md; stop for owner acceptance before dependent work. If incomplete, preserve a passing checkpoint and request a bounded continuation; never mark the slice accepted yourself.

### SLICE-59 — Owner-authorized production rollout and reconciliation

- **Status:** Proposed; not authorized.
- **Requirements:** REQ-021, REQ-047, REQ-051, REQ-053, REQ-055, REQ-056. Also covers the domain/section named in the work or review below.
- **Prerequisites:** 01–58 accepted; explicit production migration/deployment/distribution/release approvals.
- **Likely files:** release checklist; VERIFICATION.md; baseline specs; AGENTS.md; Change 001 status.
- **Work:** Execute approved migration/backend/frontend/signed pilot order with capability allowlists, health/access checks and containment; broaden only after all gates pass. Reconcile baseline docs and supersede Change 001 only with proven protections.
- **Checks:** Verify stable-alias health/db, source/company boundaries, signed client, capability outcomes and recovery signals; retain v1 compatibility window and record owner acceptance.
- **Review:** Production release evidence with versions, approvals and limitations; Change 003 Released only when full Definition of Done passes.
- **Stop:** Record exact commands, assertions, observable evidence and limitations in VERIFICATION.md; stop for owner acceptance before dependent work. If incomplete, preserve a passing checkpoint and request a bounded continuation; never mark the slice accepted yourself.

## Task-list approval

- [x] All 56 numbered requirements map to slices.
- [x] All 27 acceptance scenarios have planned verification in VERIFICATION.md.
- [x] Each slice specifies prerequisites, files, work, checks, review and stop.
- [ ] Owner approves this complete task list.
- [ ] Owner authorizes named slice IDs or a named batch.

Recommended first authorization: **SLICE-01 only**. It establishes the available evidence and
what source access is needed before the domain contracts are executed. No new customer capture,
production access, or completed feasibility claim is implied by that authorization.
