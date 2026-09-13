# Implementation plan: Essential Tally Data Foundation and Source-Aware Analytics

| Field | Value |
|---|---|
| Change | 003 |
| Status | Approved — evidence gates remain open |
| Plan approval | Owner approved in conversation on 2026-09-05; task-list preparation authorized |
| Date | 2026-09-05 |
| Specification | Approved by owner on 2026-09-05 |
| Scope of this artifact | Technical proposal and review sequence; no implementation authorization |

## 1. Approach and evidence boundary

Introduce an opt-in versioned ingestion path with independently accepted capabilities,
domain-specific canonical models, and explicit source/trust context through analytics and AI.
Preserve the existing receivables path during a controlled compatibility window. Deliver each
mandatory business capability through extraction, persistence, deterministic metrics, authorized
API, multilingual UI, and reconciliation; extraction alone never completes a capability.

This plan is grounded in the seven baseline specs and current connector snapshot/envelope,
credential/scheduler, backend schema/sync/import/dashboard/cleanup, and test-fixture code.
It does not claim a live Tally feasibility study, production inspection, or migration rehearsal.
Exact extraction fields for new domains remain an evidence gate, not an assumed API contract.

Observed implementation constraints:

- `SyncPayload` contains only ledgers and bills; default empty arrays do not express failure,
  omission, disabled state, or positive completeness evidence.
- `routers/sync.py` closes absent bills for every accepted snapshot. Its reference-less fallback
  includes amount, so a changed amount is not a reliable stable identity under the new contract.
- Existing finance tables are uploaded-file facts. Keep their identity namespace separate from
  connector vouchers even when both contain the same Tally GUID.
- Credential Manager currently uses one `device-token` entry and scheduling uses one task name.
- Cleanup currently omits Research tables. New business data must ship with cleanup coverage.
- Backend test fixtures use the configured database; establish an isolated test database before
  running integration suites. Do not point these tests at the live Neon database.

## 2. Evidence-first extraction contract

Before approving a domain's product-code tasks, create an inspectable mapping containing actual
request/response structure, identity, alterations, voucher states, period and completeness signals,
classification, named source report, and matching expected counts/values. Candidate mappings below
are investigation targets, not verified Tally method or field guarantees.

| Domain / specification section | Candidate source to investigate | Identity and named comparison boundary |
|---|---|---|
| Company and structure, 5.1 | Existing Company collection; group, voucher-type, stock-item and unit masters | Company GUID; master native IDs; company settings and master exports |
| Ledgers/accounts, 5.2 | Extend existing Ledger collection beyond debtor group; accounting voucher postings | Ledger native GUID; Trial Balance and individual Ledger report at identical dates |
| Receivables, 5.3 | Existing Bills Receivable export plus party/reference relationships | Party GUID + unambiguous bill identity; Bills Receivable report including all open ages |
| Payables, 5.4 | Investigate Bills Payable export and creditor relationships | Creditor GUID + unambiguous bill identity; Bills Payable report |
| Sales/customers, 5.5 | Posted voucher objects, accounting and inventory allocations, base voucher classification | Voucher GUID; Sales Register and invoice drill-down |
| Purchases/suppliers, 5.6 | Posted purchase voucher objects and allocations | Voucher GUID; Purchase Register and invoice drill-down |
| Receipts/payments, 5.7 | Receipt/Payment voucher objects and cash/bank/bill allocations | Voucher GUID; Receipt/Payment registers and Cash/Bank Book |
| Credit/debit notes, 5.8 | Note vouchers, base type and related allocations | Voucher GUID; Credit/Debit Note registers and related source invoices |
| Journal/Contra, 5.9 | Journal/Contra vouchers and balanced ledger postings | Voucher GUID; Journal/Contra registers and Ledger report |
| Inventory, 5.10 | Stock masters, voucher inventory entries, opening/current stock reports | Stock native ID; Stock Summary and item movement report with valuation basis |
| Cash/bank, 5.11 | Classified ledger masters, balances and supported postings | Ledger GUID; Cash/Bank Book, explicitly excluding bank reconciliation |

Use consented local data or clearly synthetic fixtures. A real customer fixture requires consent
and anonymization before tracking. Preserve no raw XML in normal cloud ingestion or application
logs. Record unsupported structure families and custom voucher classification explicitly.

Proposed extraction boundary: current Indian financial year through extraction date, plus the
previous financial year's final 90 days as a bounded overlap on repeat extraction. All currently
open receivables/payables are extracted irrespective of age. Evidence review must validate or
revise this window before implementation; older alterations need an explicit bounded rescan, never
an implied lifetime-complete history. Native alteration cursors may optimize only after their
ordering/reset/cancellation semantics are proven. Missing transactional rows never imply deletion.

## 3. Versioned protocol and acceptance

Proposed new routes live alongside `/v1/sync`; names below are draft contracts:

| Contract | Caller and behavior |
|---|---|
| `POST /v2/devices/pairing-preview` | One-time pairing code; minimal target workspace identity and allowed set; no consumption or token issuance |
| `POST /v2/devices/register` | Code, confirmed company GUID, initial subset and configuration revision; atomic consume/bind/register |
| `GET /v2/devices/config` | Device token; bound workspace, allowed/enabled/supporting domains, protocol and configuration revision |
| `POST /v2/sync/runs` | Device token; immutable run ID, company GUID, cleanup generation, protocol/extractor version, configuration revision and capability manifest |
| `PUT /v2/sync/runs/{run_id}/capabilities/{capability}/chunks/{index}` | Bounded parsed-fact staging, immutable chunk digest and index; no canonical publication |
| `POST /v2/sync/runs/{run_id}/capabilities/{capability}/complete` | Validate complete chunk manifest and evidence, then atomically accept/quarantine capability |
| `GET /v2/sync/runs/{run_id}` | Owning device/workspace authorization; saved result and per-capability status for lost-response recovery |
| `GET /v2/dashboard/analytics/{tenant_id}/{area}` | Dashboard authorization; explicit source and period; independent source result envelopes |
| `GET/PUT /v2/dashboard/source-preferences/{tenant_id}/{area}` | Dashboard authorization; preference keyed by authenticated user, workspace and business area |
| `GET /v2/dashboard/connector/{tenant_id}` | Dashboard authorization; eligibility, compatible signed release metadata and setup state |

All v2 writes reject wrong company, disabled/unauthorized domains, unsupported protocol, stale
configuration, and stale cleanup generation before ingesting. Supporting-domain permission is a
server-derived dependency closure, not permission to enable unrelated analytics. Registration
serializes initial selection: a second device reads the established set and cannot overwrite it.
Admin CLI commands manage eligibility/capabilities and audited promotion; no new general role
system or device-controlled administration is introduced.

Manifest distinguishes disabled, not attempted, local extraction failure, and attempted capabilities.
Each attempted capability supplies extraction mode, covered period, observed company GUID,
extractor/structure version, source counts/control evidence, dependencies and content digests.
Server result separates extraction/submission/processing result from completeness and trust.
Decimal values travel as decimal strings, dates as ISO dates, timestamps with timezone, and
currencies/units remain explicit. No raw XML field is accepted.

Proposed bounds: at most 1 MiB and 1,000 facts per chunk, 200 chunks per capability, one active
run per device/profile, and a 30-minute local run deadline with cancellation. Validate these
bounds against representative fixtures and deployment limits before protocol approval. Oversized
or timed-out work fails visibly; it never truncates into a trusted result. Expire incomplete
staging after 24 hours through a monitored cleanup job, subject to the approved retention policy.

Acceptance algorithm:

1. Authorize and check generation/configuration; verify immutable request and chunk digests.
   Reusing an ID with different content returns a conflict; identical retry returns saved results.
2. Take the established tenant advisory transaction lock, retaining `cast(%s as text)`.
   Recheck authority and generation inside the transaction. All writers and cleanup share it.
3. Validate identity, dependencies, classification, freshness/order and completeness before mutation.
   Reject conflicting same-identity input rather than silently choosing the last row.
4. Quarantine suspicious empty/incomplete data without changing last-trusted facts. Initially all
   unvalidated extractor zeros require admin verification. Automatic zero acceptance requires an
   approved extractor/structure registry entry and positive completeness evidence.
5. Publish a coherent capability generation and its supporting relationships atomically with
   result counters. Other capabilities may succeed independently; incomplete ones do not alter it.
6. Close absent bills only within that accepted authoritative open-bill capability. Apply explicit
   voucher state transitions only from proven source evidence. Store and return the result.

Prevent delayed devices from overwriting newer accepted snapshots: runs carry the server-issued
base capability generation; a stale base conflicts and requires re-extraction. Native source
revision evidence may permit a later reviewed optimization. Shared masters referenced by two
capabilities retain versioned snapshots so one capability cannot change another's accepted meaning.
Admin promotion rechecks generation and authority, records actor/time/reason/result, and refuses
to promote obsolete quarantine over newer trusted facts.

## 4. Persistence and identity proposal

Use relational domain models and shared provenance/trust metadata. Proposed table families:

- Workspace capability policy, pilot eligibility, configuration revision, cleanup generation,
  extractor validation registry and user/workspace/area source preferences.
- Sync runs, capability attempts, immutable chunk staging, accepted generations, quarantined parsed
  evidence and minimal operational events. Business-bearing evidence is deleted by company cleanup.
- Tally master versions (company structure, ledger/group, voucher type, stock item/unit), voucher
  headers, accounting postings, inventory lines, bill allocations and open payable bills.
- Existing receivable bills extended with accepted-generation/identity-quality metadata; existing
  uploaded finance facts extended with provenance, identity quality and acceptance metadata.

Every fact belongs to a tenant and ingestion channel and references its source domain, identity,
run/generation, covered period, first/latest observation and accepted/trust state. Enforce tenant
consistency in foreign keys and unique constraints, not only application filtering. Keep Tally
voucher storage separate from existing uploaded finance storage. Do not introduce an EAV facts table.

Prefer company-scoped native GUIDs. Voucher lines without native stable IDs are replaced as a
complete child set of a trustworthy voucher revision; line position is not a cross-run identity.
Fallback identity must survive value/date/name changes relevant to the supported structure, with
collision tests and explicit quality. Amount-based bill fallback is legacy evidence, not automatically
trusted v2 identity. Weak or conflicting records stay in scoped review evidence outside canonical
accumulative KPIs. Unknown material exclusions quarantine the affected capability; there is no
invented percentage threshold that makes an incomplete total trustworthy.

Reserve migration numbers only when implementing, after checking the existing sequence (currently
through 0008 in the inspected tree). Split additive schema, reviewed backfill, and activation.
Backfill proven source labels only; never invent native identity, coverage or trust for historical
rows. Re-run migrations on a dedicated database, verify row counts and constraints, and measure
locks before requesting production approval. No destructive schema contraction in the first rollout.

## 5. KPI, source and AI contracts

Before a capability UI is authorized, its mapping document must include exact Decimal formulas,
state and currency handling, tax/note treatment, unit handling and rounding tolerance. Proposed
business meanings to finalize against matched source reports:

| Area | Deterministic interpretation and limiting rule |
|---|---|
| Receivables/payables | Outstanding from accepted open bills; positive exposure presentation preserves raw signs; overdue from supported due date and stated as-of date; unknown due dates separate |
| Sales | Posted non-cancelled Sales gross recorded value less supported posted Credit Note effects; show gross, notes and net distinctly; exclude orders and unclassified voucher types |
| Purchases | Posted non-cancelled Purchases less supported posted Debit Note effects; same separation and state rules |
| Products | Accepted item-line values only; quantities aggregate by compatible unit; never allocate invoice taxes/charges to products without a documented method |
| Receipts/payments | Supported Receipt/Payment cash/bank allocations counted once, with splits explicit; internal Contra transfers excluded from received/paid totals |
| Ledger/cash/bank | Opening, debit/credit movements and boundary closing balance per account; no all-ledger aggregate or statutory cash-flow claim |
| Inventory | Quantities and movements by item/unit; value only with reproducible source valuation method and date; unknown value/unit stays unknown |

Retain original currency and reported base-currency amounts/rates where supported; do not invent
exchange rates or sum mixed currencies. Use exact Decimal arithmetic and round only at documented
presentation/reconciliation boundaries. A zero denominator yields unavailable ratio with explanation,
not infinity or fabricated zero. Negative transactions, optional/draft/cancelled/reversed vouchers,
returns, tax-inclusive values and compound units require explicit fixture cases.

Each result envelope includes source, period, last accepted freshness, latest attempt, completeness,
trust, warnings, exclusions and capability generation. Both mode returns two independent envelopes,
never a combined server aggregate. Freshness threshold is a named configurable policy; propose
24 hours for pilot source-default selection, visible in tests and subject to owner review.

First use with both sources prefers fresh trusted Tally. If that condition fails, offer explicit
source choice with status; never default to Both. A remembered missing source stays selected with
an explanation and switch action. Store preference per authenticated user/workspace/area. Smart
Excel stays selected/latest-dataset oriented; recognized uploads upsert only reliable identities,
retain exact-file SHA deduplication, and never match against connector facts.

Refactor the authorized metric service so dashboard, Ask ARQ, report and My Business Snapshot
receive the same explicit source/generation context. Both-mode AI gets separate labelled contexts;
deterministic response validation blocks combined numeric claims. Capabilities requiring verification
may explain last-trusted facts with warnings but cannot drive new recommendations. Persist source,
period and generation with Research output and invalidate stale derived context after cleanup or
source/company change. Preserve current provider fallback behavior and external-action boundaries.

Company switching cancels outstanding requests and rejects late results using a context generation;
clear company-specific panels, caches, AI conversation, Research results and upload state before
rendering the next company. First multi-company use requires explicit choice. Integrate work areas
into accepted Change 002 navigation, with progressive disclosure and four-language strings in
`i18n.js`; do not create a tab for every underlying Tally object.

## 6. Profiles, distribution and lifecycle

Introduce opaque local profile IDs, non-secret settings per profile, Credential Manager entries
per profile, profile-scoped locks/state and explicitly named scheduled tasks invoking
`run --profile <id>`. Task arguments contain no credentials. Migrate the legacy single profile by
copying and verifying its credential entry before switching the scheduler; preserve a recoverable
checkpoint on failure. Reset affects only the selected profile and retains the established local
reset/server-revocation distinction. Never guess a profile when several exist.

Introduce a connector localization catalog for new profile/capability/trust/status strings and
review all four languages. Registration previews both identities before binding; recovery uses
audited administration and never rebinds a populated workspace silently.

Distribution proposal: an Astra-controlled private release artifact store, with the authorized
backend granting short-lived download access only to eligible workspaces. Store an immutable
manifest with version, protocol support, SHA-256, supported Windows x64 versions and signing
identity. The hosting service and operational ownership must be approved before distribution
implementation; no provider is assumed provisioned. Signing environment/certificate and Windows
10/11 verification are release gates, not reasons to label an unsigned build client-ready.

Cleanup adds every new fact, staging/quarantine/provenance/capability state and derived Research
table, plus existing Research data, under the existing re-authenticated transaction and tenant lock.
Preserve tenant/access/devices, increment a minimal cleanup generation, and invalidate in-flight
work. After cleanup, enabled capability state is empty; preserved devices cannot repopulate facts
until assisted re-enablement. No implicit resync resurrects removed business content.

Residual security audit must have a fixed, disclosed, owner-approved retention period before release.
No duration is approved by this draft. Records contain only minimized pseudonymized security evidence,
never business rows/amounts/names/raw XML or reusable credentials. Define pseudonym rotation,
deletion schedule and diagnostic-consent access/retention rules in the lifecycle review.

## 7. Impact map

| Area | Existing files / proposed extensions |
|---|---|
| Extraction | `connector/src/arq_connector/tally/{envelopes,parsers,client,detect}.py`; new domain extractors/contracts |
| Connector orchestration | `sync/{snapshot,pusher}.py`, `runner.py`, `cli.py`, `gui.py`, `registration.py`, `settings.py`, `state.py`, `lock.py`, `scheduler.py`, `security/credentials.py`; profile/localization modules |
| API/security | `backend/app/{schemas,auth,dashauth,admin,main}.py`; device/sync/dashboard/import/ask/research/data_management routers; new v2 routers and domain services |
| Persistence | `backend/migrations/`; shared acceptance/provenance service and domain repositories |
| UI | `frontend/src/{App,api,navigation,i18n}.js` (App is `.jsx`), receivable/finance/product/Research/Copilot/OnePageReport/upload/cleanup components; source-context helpers and capability views |
| Tests/build | `connector/tests/`, `backend/tests/`, frontend unit tests and live browser checks; `connector/build.ps1` and release validation |
| Documentation | Mapping/evidence records in this change; later approved `TASKS.md`, `VERIFICATION.md`; affected baseline specs at verified release |

## 8. Requirement coverage and proposed review sequence

These are planning groups, not authorized execution slices. After plan review, `TASKS.md` must
split them into roughly 45–60-minute coherent outcomes with prerequisites, files, checks, review
evidence and safe stops. Each large domain needs separate contract, ingestion and presentation
slices while retaining an end-to-end completion gate.

| Group | Requirements / acceptance | Outcome and verification |
|---|---|---|
| P01 Evidence and formula contracts | Sections 5–6, 10, 13, 25; AC-010, AC-017–023, AC-027 | One mapping and named-source reconciliation fixture per mandatory domain; unsupported cases explicit |
| P02 Isolated test infrastructure and additive schema | REQ-001, REQ-009, REQ-051–056; AC-007, AC-024–025 | Isolated DB guard, schema replay/backfill/cleanup rehearsal and cross-tenant FK tests |
| P03 Pilot policy and assisted pairing | REQ-036, REQ-041–050; AC-001–002, AC-004 | Eligibility/configuration enforcement; expired/reused code, racing devices and wrong-company checks |
| P04 Profile isolation and localization | REQ-040, REQ-052; AC-003 | Two profiles, two credential entries/tasks; migration/reset/failure and company-rename review |
| P05 Versioned ingestion and trust kernel | REQ-001–021, REQ-043–046, REQ-051–054; AC-005–012, AC-024 | Immutable retries, lost response, staging, atomic acceptance, stale generation, suspicious zero and audited promotion |
| P06 Receivables migration end-to-end | REQ-001–021, REQ-032; Section 5.3; AC-018 | Existing exposure regression plus trusted snapshot closure and source-labelled live UI |
| P07 Ledgers and cash/bank foundation | REQ-001–015, REQ-032; Sections 5.1–2, 5.9, 5.11; AC-017, AC-022 | Masters/postings, Journal/Contra, account detail and matched balances without invalid aggregate |
| P08 Payables end-to-end | REQ-001–021, REQ-032; Section 5.4; AC-019 | Creditor/open-bill acceptance, ageing, source-labelled detail and named-report match |
| P09 Sales and Credit Notes end-to-end | REQ-001–015, REQ-032; Sections 5.5, 5.8; AC-009–010, AC-020 | Posted Sales, notes, customers/items/trend; custom type, cancellation, tax and unit tests |
| P10 Purchases and Debit Notes end-to-end | REQ-001–015, REQ-032; Sections 5.6, 5.8; AC-021 | Posted Purchases, notes, suppliers/items/trend and named-report match |
| P11 Receipts and Payments end-to-end | REQ-001–015, REQ-032; Section 5.7; AC-022 | Allocated received/paid totals and detail without transfer double-counting |
| P12 Inventory end-to-end | REQ-001–015, REQ-032; Section 5.10; AC-023 | Stock identities, quantity/movement and supported labelled valuation |
| P13 Uploaded identity and source experience | REQ-022–032, REQ-037–039; AC-013–014, AC-016 | Exact-file/cross-file tests, weak exclusions, independent Both, preference and stale-response UI checks |
| P14 Source/trust-aware AI and reports | REQ-033–035, REQ-038–039; AC-015–016 | Deterministic contexts, no combined conclusions/recommendations from blocked capability; all-language live review |
| P15 Lifecycle and operator visibility | REQ-019, REQ-021, REQ-051–056; Section 21; AC-012, AC-024–026 | Complete cleanup/race tests, retention sweep, scoped operational run view and content-free event inspection |
| P16 Compatibility, signed pilot and release | Sections 18, 25–26; AC-001–027 | Rehearsed migration/rollout/recovery, Windows signing, structurally different company evidence and owner release review |

Source envelope and context plumbing in P13 must precede dependent domain UI even if upload
identity improvements follow domain ingestion. Cleanup coverage from P02/P15 accompanies every
new table; it is never deferred until the release group. P05 precedes all domain acceptance.
Change 002 overlapping UI behavior must be inspected again before frontend work. Change 001 is
marked Superseded only after its protections are implemented and verified in this change.

## 9. Test strategy and evidence

- Unit: fixture-based extraction/classification, strong/fallback identity collisions, Decimal KPI
  formulas, trust state transitions, chunk hashes, source selection and profile migration.
- Integration: isolated Postgres, concurrent run/import/cleanup/configuration writers, partial
  capability failure, cancellation, stale snapshot, replay, wrong-tenant IDs, unauthorized domains,
  generation conflicts, rollback and migration reruns. Inspect assertions and final rows/counters.
- Regression: existing connector offline tests, backend provider/import/receivables/auth tests in
  their appropriate isolated environment, frontend unit suite and production build.
- UI: live browser review after each UI slice, all four languages, keyboard access, mobile and
  zoom, empty/error/partial/stale states, A-to-B switch with delayed A response, source changes,
  Both separation, report charts and print provenance. Connector GUI needs live Windows review.
- Real-world: consented service, GST/inventory trading, and manufacturing or materially different
  companies; same company/period/states/valuation source comparisons with exact identities/counts
  and documented currency tolerances. Fewer pilot fixtures do not satisfy broad-release coverage.
- Operational: test operator access and content-free counters, expiry jobs, kill switch, stopped
  schedules, mixed-version clients, unavailable dependencies, signing and checksum failure.

Create `VERIFICATION.md` with every REQ and AC mapped to named assertions, fixture provenance,
commands/results and review evidence when `TASKS.md` is prepared. Never record proposed tests as
passed. This planning pass only validates documentation consistency and requirement coverage.

## 10. Rollout, monitoring and recovery

1. Approve plan and evidence contracts, then complete/approve tasks and authorize named slices.
2. Rehearse additive migrations and backfills against an isolated representative database.
   Obtain explicit owner approval before each production migration.
3. Deploy backward-compatible backend with v2 disabled by default and cleanup already complete.
   Verify stable-alias `/health`, `/health/db`, tenant authorization and v1 regression.
4. Deploy source-aware frontend after API compatibility checks; enable only reviewed pilot
   workspaces. Distribute signed connector only after eligibility, package and profile checks.
5. Activate capabilities per allowlisted workspace after evidence review. Never allow v1 and v2
   to mutate the same promoted capability concurrently. Once a workspace enters v2, reject v1
   writes visibly with upgrade-required state; do not silently downgrade it on rollback.
6. Proposed compatibility window: retain v1 for unmigrated workspaces for at least 90 days after
   the first signed v2 pilot, and until active devices are accounted for and owner approves
   retirement. Legacy v1 data is not retroactively called v2-verified or a completed trust rollout.
7. Broaden only after all mandatory end-to-end capability gates, representative company tests,
   retention/distribution approvals and owner release acceptance. Update baseline specs and AGENTS.

Operators need a scoped CLI/report surface for run/capability status, extractor/protocol,
attempted/accepted freshness, trust, completeness and inserted/updated/unchanged/excluded/rejected/
conflicting counts. Alert on failed runs, overdue freshness, growing quarantine, rejected old
clients and staging/retention sweep failure. Thresholds and notification destination must be
configured and tested before broad rollout; no external notification is sent without authority.

Containment disables v2/capability acceptance, pauses affected profile schedules and preserves
last-trusted data with warnings. Frontend rollback hides new surfaces but cannot erase source/trust
boundaries. Backend rollback must remain schema-compatible and refuse legacy writes for promoted
workspaces; if no compatible previous build exists, use forward recovery. Never drop accepted
tables to roll back. Rebuild erroneous generations only from approved trusted evidence under an
audited recovery procedure; database restore scope and business impact require owner approval.

## 11. Work bounds, open gates and review

The owner approved this plan on 2026-09-05. `TASKS.md` and `VERIFICATION.md` have been
prepared for the next review. No product code, database changes, live Tally extraction,
commits, pushes or deployments are authorized by plan approval alone.
Stop before execution until the complete task list and named
slices are approved as required by `docs/governance/SDD_WORKFLOW.md` and constitution section 14.

Planning/evidence reviews target one 60-minute pass per domain; stop with explicit incomplete
evidence when the pass cannot resolve it. Three equivalent failed attempts or three unresolved
review rounds require an owner decision. A blocked domain does not authorize silently dropping it.
Implementation stops after the last authorized slice or at a passing checkpoint requiring reslicing.

Open gates before affected implementation/release:

| Gate | Needed evidence / decision | Blocks |
|---|---|---|
| G01 Source feasibility | Actual new-domain source fields, identity/state/classification/completeness and named reports | Domain contract approval and dependent code |
| G02 Financial semantics | Formula, tax/notes/currency/unit/rounding and period-window review | Domain KPI and UI approval |
| G03 Protocol capacity | Bounded chunk/runtime tests, partial publication and shared-master generation design | Protocol/schema approval |
| G04 Legacy migration | Identity backfill and v1/v2 transition rehearsal; no invented trust | Pilot migration |
| G05 Lifecycle | Approved retention duration, diagnostic consent and cleanup-generation design | Business-data pilot/release |
| G06 Distribution | Artifact hosting decision, certificate/SignTool, Windows 10/11 proof | Client download/release |
| G07 Representative evidence | Owner-provided/consented structurally different companies | Broad support and change completion |

Architecture decisions requiring Proposed ADRs during plan refinement: versioned capability
acceptance with generation isolation; domain storage/provenance and source separation; multi-profile
credential/scheduler migration. Record alternatives and failure evidence before accepting these
lasting choices; no ADR is represented as approved by this draft.

## Plan approval

- [x] Owner accepts architecture, scope and evidence-first sequence (2026-09-05)
- [ ] G01–G03 contracts are sufficiently evidenced for the proposed initial implementation batch
- [x] Compatibility, migration, cleanup and recovery approach approved
- [x] Test strategy and adversarial-case approach approved
- [x] Proposed review groups accepted for expansion into `TASKS.md`
- [ ] Remaining external/release prerequisites and owners recorded

Approval records acceptance of the plan, not completion of its evidence gates; unverified checks
above remain open. Next owner review item: `TASKS.md`, followed by authorization of named slices.
Plan approval does not itself authorize product-code slices, production migrations or release.
