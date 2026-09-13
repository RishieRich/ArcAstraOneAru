# Change specification: Essential Tally Data Foundation and Source-Aware Analytics

| Field | Value |
|---|---|
| Change ID | 003 |
| Status | Approved |
| Approval | Owner approved in conversation on 2026-09-05; technical planning authorized |
| Owner | Rishi |
| Risk | Critical |
| Product | ARQ Astra |
| Baseline specs | `01-identity-and-access`, `02-tally-connector`, `03-receivables-sync`, `04-financial-imports`, `05-ai-and-research`, `06-operations-and-data-lifecycle`, `07-dashboard-entry-and-navigation` |
| Related changes | Change 001 — unexpected empty sync protection; Change 002 — customer-friendly UX quality |
| Components | Connector, Backend, Database, Frontend |
| Delivery model | Repository-native SDD with owner-authorized review slices |

## 1. Outcome

ARQ Astra provides a complete and reliable path from a customer's TallyPrime company to
meaningful business analytics. A customer can:

1. discover the Tally Connector from Astra;
2. download and install the approved connector;
3. connect the correct Tally company to the correct Astra company workspace;
4. select the business capabilities that the workspace is allowed to synchronize;
5. synchronize the important Tally accounting data required by those capabilities;
6. repeat synchronization without duplicating or corrupting accepted data;
7. see deterministic, source-labelled KPIs and business views;
8. upload supported Excel files independently;
9. choose `Tally`, `Uploaded files`, or `Both` in relevant business areas; and
10. understand the source, company, covered period, freshness, completeness, and trust state
    behind every important result.

Change 003 delivers every mandatory domain in Section 5 end-to-end. Internal development and
tenant-allowlisted pilots may release capabilities in stages, but the change remains incomplete
until every mandatory capability satisfies Section 25's Definition of Done.

A capability is not complete because rows were merely extracted or stored. Its required path is:

```text
Tally
  -> ARQ Connector
  -> Versioned sync contract
  -> Validation, identity, completeness, and trust
  -> Canonical storage
  -> Deterministic business logic
  -> Authorized API
  -> Source-labelled Astra KPI or business view
  -> Reconciliation against a named Tally source report/export
```

## 2. Why this change exists

The current connector primarily covers debtor ledgers and receivable bills. Useful customer
accounting data also spans ledgers, payables, posted sales and purchase vouchers, receipts,
payments, notes, journals, cash/bank activity, stock items, and inventory movements.

Customers should select business information, not internal Tally XML collections. Astra resolves
the supporting masters, vouchers, allocations, and relationships required by the selected
capabilities.

Astra also receives information through the Tally Connector and uploaded files. Those channels
must remain understandable, traceable, independently duplicate-safe, and visibly separate.

## 3. Core product decisions

### DEC-001 — Essential Tally Coverage V1

The mandatory domains are defined in Section 5. Change 003 does not support every Tally feature,
screen, report, extension, or specialized workflow.

### DEC-002 — Tally screens are not Astra's data model

Astra does not create a one-to-one `Tally screen -> database table -> Astra tab` architecture.
It extracts reliable source objects and normalizes them into stable, domain-appropriate models.
This protects the product from renamed voucher types, custom configurations, Tally UI changes,
and duplicate concepts across reports.

### DEC-003 — Tally remains read-only

ARQ may only read/export data from Tally. Any future write-back requires a constitutional
amendment and is not part of this change.

### DEC-004 — Tally and uploaded files remain separate

Connector data and uploaded-file data remain independent ingestion channels. Change 003 does
not merge, reconcile, cross-match, or calculate a combined total across them. Apparently
identical invoices may exist independently in both channels.

### DEC-005 — Source-aware business areas

Relevant areas offer `Tally`, `Uploaded files`, and `Both`. Both mode presents compact,
separate sections and produces no combined KPI, ranking, variance, or reconciliation result.

### DEC-006 — One Tally company per isolated workspace

A login may access several authorized workspaces, but each workspace remains bound to one Tally
company GUID. Company switching changes the complete business context. Change 003 introduces no
cross-company consolidation.

### DEC-007 — Capability-oriented connector

The connector exposes Ledgers & accounts, Money to collect, Money to pay, Sales & customers,
Purchases & suppliers, Payments & receipts, Inventory, and Sync all available business data.
It does not expose XML collections or other extraction internals.

### DEC-008 — Correct incremental results over extraction technique

A capability may use a native delta, bounded re-extraction, or complete domain snapshot. The
accepted result must remain deterministic, idempotent, concurrency-safe, and duplicate-safe.

### DEC-009 — Staged rollout does not weaken completion

Feature flags and tenant allowlists may stage development and pilots. A staged capability may
not be represented as broadly supported before its end-to-end contract and representative Tally
verification pass. Change 003 is Released only when every mandatory capability passes.

## 4. Customer journey

### 4.1 Discover and download

Login, signup, or onboarding explains that Astra can connect to TallyPrime through a Windows
connector and that Astra never changes Tally. An authenticated workspace sees a download action
only when ARQ has explicitly enabled connector access for that workspace. Free-trial status by
itself does not authorize live Tally ingestion.

Production distribution uses one universal, signed Windows x64 package with version metadata,
integrity verification, and Astra-controlled delivery. Customer-specific binaries never provide
tenancy isolation. Internal unsigned builds remain clearly labelled and are not client releases.

### 4.2 Pair and confirm identity

Founder/admin-assisted pairing is acceptable for the first production/pilot release. Before a
pairing code is consumed and permanent binding occurs, the connector displays both the target
Astra workspace and detected Tally company, including the authoritative company GUID identity.
Incorrect binding has no casual one-click rebind path.

One connector installation supports multiple explicit company profiles. Each profile has its own
workspace, Tally company GUID, credential, enabled-capability state, and synchronization status.
Profiles remain separate and are never consolidated. Scheduled or manual execution must identify
the intended profile unambiguously.

### 4.3 Select capabilities

The backend stores two company-workspace-level sets:

- capabilities the workspace is allowed to use; and
- capabilities currently enabled for synchronization.

During assisted pairing, the connector operator may select the initial enabled subset from the
allowed set. After pairing, connector runs read the backend-authoritative enabled set and cannot
overwrite it. Multiple devices cannot establish conflicting configuration through last-writer
wins. During the founder-assisted release, only ARQ administration may change the enabled set.

Required supporting masters may synchronize automatically even when their broader customer-facing
capability is not selected. They may be used only to make an enabled capability correct, and the
selection experience explains this without exposing technical Tally objects.

### 4.4 Synchronize

The connector validates Tally availability and company identity, resolves the backend-authorized
capabilities, extracts their required data, submits a versioned contract, and displays domain-level
results. A partially completed run is never described as fully successful.

```text
Sync partially completed

Ledgers & accounts       Accepted
Money to collect         Accepted
Sales & customers        Accepted with warnings — 3 records excluded
Inventory                Failed
Money to pay             Not attempted
```

## 5. Essential Tally Coverage V1

### 5.1 Company and accounting structure

Where reliably available, preserve company GUID and name, accounting/financial period, ledger
groups and masters, voucher types, stock groups and items, and units required by enabled
capabilities. These objects provide identity and accounting interpretation; their presence does
not by itself create a KPI.

### 5.2 Ledgers & Accounts

Support ledger identity, name, parent/group, opening and extraction-boundary closing balances,
debit/credit orientation, supported postings, and provenance. Users can inspect balances,
classification, movement, and ledger detail. Do not create one meaningless total across all
ledgers or label a balance revenue, expense, profit, receivable, or cash without deterministic
classification.

### 5.3 Money to Collect — Receivables

Preserve and extend the current debtor/open-bill contract: party, bill reference, reference and
due dates, outstanding value, ageing, and relationships required to establish the open bill.
Provide deterministic total outstanding, overdue, ageing, due timing, top debtors, bill details,
and existing collection-priority facts.

### 5.4 Money to Pay — Payables

Support creditor/supplier, payable bill and reference, reference/due dates, outstanding value,
and ageing. Provide deterministic total and overdue payable, ageing, top creditors/suppliers,
and bill detail. Payables remain visibly distinct from receivables.

### 5.5 Sales & Customers

Support posted sales voucher identity, date, customer ledger, voucher number, gross recorded
value, taxable/base value where deterministic, item lines, quantity, unit, supported credit-note
effects, and voucher state. Provide recorded sales, transaction count/detail, monthly trend,
strongest recorded customers and products/items, and customer detail. Do not call invoice value
revenue. Sales Orders are not recorded Sales.

### 5.6 Purchases & Suppliers

Support posted purchase voucher identity, date, supplier ledger, voucher number, gross recorded
value, taxable/base value where deterministic, item lines, quantity, unit, supported debit-note
effects, and voucher state. Provide recorded purchases, transaction count/detail, trend,
strongest suppliers/items, and supplier detail. Purchase Orders are not recorded Purchases.

### 5.7 Payments & Receipts

Support Receipt and Payment voucher identity, date, amount, counterparty, bank/cash ledger, and
supported bill references. Provide deterministic money received, money paid, trends,
counterparties, and transaction detail. These views are not a complete or statutory Cash Flow
Statement.

### 5.8 Credit Notes and Debit Notes

Capture notes required to interpret supported Sales and Purchases. Their effects follow explicit,
tested formulas and are not ignored merely because the primary transaction is called an invoice.

### 5.9 Journal and Contra

Preserve underlying facts needed for truthful ledger/account movement. Journal and Contra do not
automatically contribute to sales, purchases, profit, or expenses without an approved
classification contract.

### 5.10 Inventory

Where the company uses inventory and Tally provides reliable data, support stock identity,
group/category, unit, quantity, supported opening/current quantities, item relationships,
movements, and value only where the valuation basis is trustworthy and labelled. Provide item,
quantity, movement, and sales/purchase-linked facts without inventing units or value.

### 5.11 Cash and bank context

Preserve cash/bank ledger balances and supported movement required by Payments & Receipts and
ledger analysis. This does not constitute bank reconciliation.

## 6. Custom Tally configuration

Astra must not classify accounting meaning primarily through visible names such as `Sales` or
`Purchase`. It uses reliable native/default/base classification where Tally exposes it.

An unclassifiable custom voucher is retained as reviewable `Unknown/unsupported` source evidence,
excluded from classified KPIs, and counted with a clear reason. If Astra cannot establish whether
the excluded records belong inside an advertised total, the capability requires verification
rather than presenting a materially incomplete KPI as trusted.

## 7. Synchronization and identity requirements

- **REQ-001 — Stable identity:** Prefer reliable native Tally identifiers. Fallback identities
  are deterministic, domain-specific, documented, and tested.
- **REQ-002 — Insert:** A newly observed trustworthy identity creates one logical source record.
- **REQ-003 — Update:** Changed values for a known trustworthy identity update the canonical
  record rather than appending another copy.
- **REQ-004 — Unchanged:** An unchanged known record remains one record and is operationally
  distinguishable from inserted or updated.
- **REQ-005 — Missing incremental records:** Absence from an incremental extract does not mean
  deleted, reversed, cancelled, closed, or invalid.
- **REQ-006 — Explicit transitions:** Closure, cancellation, reversal, or deletion requires a
  trustworthy source signal or explicitly authoritative domain contract.
- **REQ-007 — Open-bill snapshot exception:** A trusted complete receivable/payable snapshot may
  close a formerly open bill absent from the next trusted complete snapshot. This rule does not
  generalize to Sales, Purchases, Ledger postings, Payments, Receipts, or Inventory movements.
- **REQ-008 — Retry idempotency:** Retrying a run cannot create another logical fact or accepted
  run. A retry after a lost response returns the earlier result.
- **REQ-009 — Concurrency:** Concurrent writers for one company cannot produce mixed or duplicate
  accepted state.
- **REQ-010 — Weak identity:** Records without trustworthy native or fallback identity remain
  reviewable source evidence but are excluded from canonical accumulation and KPIs. The customer
  sees the excluded count and reason.
- **REQ-011 — Raw-source minimization:** Ordinary synchronization sends canonical parsed facts and
  run evidence, not retained cloud copies of raw Tally XML. Raw customer source collection requires
  the explicit diagnostic contract in Section 20.

## 8. Capability-level synchronization state

Every enabled capability distinguishes:

- disabled;
- not attempted;
- local extraction failed;
- backend submission failed;
- synchronization failed;
- successful with data;
- successful empty;
- accepted with warnings;
- requires verification; and
- accepted/trusted.

An empty collection never ambiguously represents these different states.

- **REQ-012 — Independent capability result:** Capabilities may commit independently when safe.
  A partially completed run reports its capability results and overall partial state.
- **REQ-013 — Capability atomicity:** Dependent facts inside a capability do not commit into an
  inconsistent state.
- **REQ-014 — Accepted with warnings:** Safely identified facts may be accepted while explicitly
  excluded facts remain outside KPIs, but only when the exclusion cannot make the advertised KPI
  materially misleading. Otherwise the capability requires verification.
- **REQ-015 — Supporting-data atomicity:** An enabled capability includes the supporting party,
  item, ledger, allocation, or master relationships required for its accepted facts, regardless
  of whether the broader supporting capability is enabled.

## 9. Data trust and unexpected-empty protection

Change 003 generalizes and supersedes Change 001's intended trust model while preserving its
receivables protections.

- **REQ-016 — Evaluate before mutation:** Unexpected empty results are evaluated before they can
  replace trusted business truth.
- **REQ-017 — Preserve last trusted state:** A suspicious zero cannot overwrite previously trusted
  capability data before verification.
- **REQ-018 — First-ever zero:** During pilot operation, the first zero for an extractor whose
  reliability is not broadly validated cannot establish trusted truth automatically.
- **REQ-019 — Audited promotion:** During founder-assisted release, only an ARQ administrator may
  promote a quarantined genuine-zero state, and the promotion records actor, time, company,
  capability, run, reason, and resulting state without logging business content.
- **REQ-020 — Mature zero acceptance:** A first-ever zero may be accepted without human promotion
  only when the capability/extractor version is approved as broadly validated for the detected
  Tally structure and the extraction supplies positive completeness evidence beyond an empty list.
- **REQ-021 — Trust-aware use:** Analytics and AI distinguish latest attempt, latest trusted data,
  and current trust state. Last-trusted facts may remain visible with a warning; quarantined facts
  are never presented as current truth.

## 10. Initial extraction boundary

The normal first sync covers the current Indian financial year for transactional domains. Open
receivables/payables include all currently open supported bills regardless of original age.
A bounded rollover overlap captures late alterations to the prior financial year. Exact windows
belong in the plan after Tally evidence review.

## 11. Uploaded files

The customer-facing ingestion-channel label is `Uploaded files`, even when an uploaded export
contains Tally GUIDs.

- **REQ-022 — Exact-file deduplication:** Re-uploading identical file bytes does not duplicate
  facts.
- **REQ-023 — Recognized finance upsert:** Recognized finance books with reliable identities may
  accumulate history through deterministic cross-file upsert. Matching overlapping rows update;
  new rows insert; absence does not delete.
- **REQ-024 — Smart Excel remains dataset-oriented:** Arbitrary Smart Excel datasets stay
  selected/latest-dataset oriented until a schema-specific identity contract exists.
- **REQ-025 — Weak uploaded identity:** Weak-identity rows remain reviewable evidence but are
  excluded from canonical accumulative KPIs with a visible count and reason.
- **REQ-026 — No cross-channel matching:** A connector invoice and uploaded-file invoice are not
  automatically treated as the same record.

## 12. Source-aware analytics

- **REQ-027 — Business-area source selection:** Relevant areas expose `Tally`, `Uploaded files`,
  and `Both`; the selector is not one global setting for unrelated Astra functionality.
- **REQ-028 — Preference scope:** Remember source preference per user, company, and business area.
- **REQ-029 — First-use default:** When both supported channels exist and no preference exists,
  prefer fresh trusted Tally data, never Both.
- **REQ-030 — Missing source:** Preserve the selected source, explain missing data, and offer a
  clear switch. Never silently switch.
- **REQ-031 — Both mode:** Present compact, separated source sections. Do not calculate combined
  totals, rankings, variances, or reconciliation differences.
- **REQ-032 — Provenance presentation:** Important results identify ingestion channel, covered
  period, last accepted freshness, completeness/warnings, and trust state close to the result.

## 13. KPI contract

Every KPI has a deterministic formula, clear accounting/business meaning, ingestion channel,
covered period, freshness, completeness, trust state, and defined handling of zero, negative,
missing, partial, and stale inputs. AI prose never originates a financial number.

Sales and Purchases use recorded posted transaction values, not orders. A UI slice cannot be
approved until its formulas, note treatment, voucher-state treatment, and any currency/rounding
rules are documented and tested.

## 14. Ask ARQ and My Business Snapshot

- **REQ-033 — Explicit AI source context:** Ask ARQ and My Business Snapshot use an explicit
  source context and do not silently combine ingestion channels.
- **REQ-034 — Both-mode AI:** AI may explain two separately labelled sources but cannot produce a
  combined amount, ranking, KPI, or conclusion that assumes reconciliation.
- **REQ-035 — Trust-aware AI:** AI may explain last-trusted facts with a warning but cannot create
  new action recommendations dependent on a capability requiring verification.

## 15. Company isolation and connector profiles

- **REQ-036 — One company per workspace:** A workspace remains bound to one Tally company GUID;
  a rename does not create a workspace.
- **REQ-037 — Multiple workspaces per login:** First multi-company use requires explicit company
  choice; later sessions may restore the last explicit choice.
- **REQ-038 — Complete context switch:** Switching company refreshes KPIs, source preference,
  sync/trust state, uploads, AI/Research context, and business details. No previous-company fact
  remains visible through frontend state leakage.
- **REQ-039 — No consolidation:** No cross-company totals, ledgers, receivables, sales, or AI
  context are introduced.
- **REQ-040 — Multiple local profiles:** One connector installation can maintain several explicit,
  independently credentialed company/workspace profiles. Manual and scheduled sync always name
  the intended profile and never combine profile data.

## 16. Capability authorization

- **REQ-041 — Backend-authoritative sets:** Allowed and enabled capability sets are stored per
  company workspace on the backend.
- **REQ-042 — Initial selection:** During assisted pairing, the connector operator may choose the
  initial enabled subset from the allowed set.
- **REQ-043 — Post-pairing authority:** During founder-assisted release, only ARQ administration
  may change enabled capabilities. Connector devices read the set and cannot overwrite it.
- **REQ-044 — Backend enforcement:** The backend rejects a payload domain not enabled and allowed
  for that workspace.
- **REQ-045 — Multiple-device consistency:** Devices cannot create conflicting effective
  configuration through last-writer-wins behavior.
- **REQ-046 — Supporting data:** Backend policy may permit the minimum supporting source facts
  necessary to make an enabled capability correct without enabling an unrelated KPI surface.

## 17. Pairing and eligibility

- **REQ-047 — Explicit pilot eligibility:** Authentication or free-trial status alone does not
  enable connector download or pairing; the workspace must be explicitly enabled.
- **REQ-048 — Identity confirmation:** The connector shows the Astra workspace and detected Tally
  company before permanent binding.
- **REQ-049 — Assisted pairing:** Initial production/pilot pairing may remain ARQ-admin assisted;
  self-service pairing is not required.
- **REQ-050 — Safe recovery:** Incorrect binding recovery is audited and cannot silently rebind a
  populated workspace or weaken permanent company isolation.

## 18. Versioning, compatibility, and distribution

The plan defines an explicit versioned multi-domain sync contract and a compatibility window for
the current receivables connector. Omitted, disabled, failed, and successful-empty domains must
not share an ambiguous payload shape. A partially upgraded customer fails visibly and safely.

Production connector download requires a signed universal Windows x64 package, checksum,
version manifest, supported OS validation, and Astra-controlled distribution. A signing
certificate and verified signing environment are release prerequisites.

## 19. Security and privacy

- **REQ-051 — Server authorization:** Every company-scoped sync, import, analytics query, AI
  request, cleanup, and capability change enforces authorization on the backend.
- **REQ-052 — Credential protection:** Device-token hashing and Windows Credential Manager
  storage remain intact. Credentials never enter logs or tracked files.
- **REQ-053 — Safe logs:** Operational logs may contain safe identifiers, capability, counts,
  duration, result, and reason code, but no party names, amounts, rows, secrets, or raw XML.
- **REQ-054 — Diagnostics:** Raw customer Tally data is never silently uploaded. Collection
  requires explicit consent, purpose, minimization, access, and retention rules.

## 20. Provenance, cleanup, and retention

Canonical Tally and normalized uploaded-file facts preserve workspace, ingestion channel,
source domain/object, stable identity where available, run, accepted/trust state, and reliable
first/latest-seen information. Shared provenance/trust primitives accompany domain-appropriate
models; Change 003 does not introduce one universal EAV business-facts table.

- **REQ-055 — Complete cleanup:** Existing re-authenticated company cleanup removes every new
  Tally/uploaded business fact, capability state, quarantine state, stored business provenance,
  and derived Ask ARQ/Research business context while preserving the established tenant/access/
  device boundary unless separately approved.
- **REQ-056 — Residual audit minimization:** Only minimal pseudonymized security/audit evidence may
  survive cleanup, under a fixed disclosed retention period approved before release. It contains
  no party, amount, row, raw XML, or reusable credential.

## 21. Operational observability

Before broad rollout, authorized operators can determine company, run, extractor/protocol
version, capability attempted, local/submission/processing result, empty/completeness/trust state,
inserted/updated/unchanged/excluded/rejected/conflicting counts, and latest accepted freshness.
Monitoring cannot rely only on manually reading generic deployment logs.

## 22. UX and language principles

The additional data must not produce a wall of cards or accounting jargon. Astra preserves the
answer-first hierarchy:

1. What is happening?
2. Why does it matter?
3. Which facts support it?
4. What should I inspect next?
5. What is the source, period, freshness, completeness, and trust state?

Details use progressive disclosure. Astra does not add one top-level navigation item per Tally
object. New product-owned dashboard strings ship in English, Hinglish, Gujarati-Roman, and
Marathi-Roman. Connector capability, profile, trust, and status strings introduced by this change
must use a reviewed localization mechanism rather than scattered literals.

## 23. Acceptance scenarios

- **AC-001 / REQ-047:** An authenticated but ineligible trial sees an honest setup state and
  cannot download/pair the production connector; an enabled workspace can.
- **AC-002 / REQ-048–050:** Pairing shows both identities, binds only the intended GUID, and does
  not offer unsafe rebinding.
- **AC-003 / REQ-040:** One installation maintains Company A and Company B as separate profiles;
  syncing either uses only its credential, workspace, capabilities, state, and schedule.
- **AC-004 / REQ-041–046:** The connector can select an allowed subset during pairing; later
  devices obey the backend set, and unauthorized domains are rejected before ingestion.
- **AC-005 / REQ-001–004:** Repeating unchanged trustworthy source identities creates no duplicate;
  changed values update the existing facts and result counters distinguish the outcomes.
- **AC-006 / REQ-005–007:** Missing incremental Sales does nothing, while a missing bill in a
  trusted authoritative open-bill snapshot may close the bill exactly once.
- **AC-007 / REQ-008–009:** Retry after a lost response and concurrent writers preserve one
  accepted result and consistent canonical state.
- **AC-008 / REQ-010, REQ-014:** Weak-identity or safely excluded records remain reviewable,
  contribute to no canonical KPI, and produce visible warning/count evidence.
- **AC-009 / REQ-014:** If excluded records could materially alter a Sales total, the capability
  requires verification rather than publishing a trusted incomplete total.
- **AC-010 / Section 6:** A reliably classified custom Sales voucher contributes correctly; an
  unknown custom voucher is retained as unsupported evidence and cannot silently distort KPIs.
- **AC-011 / REQ-012–015:** Sales can be accepted while Inventory fails; the run is Partially
  completed, and dependent facts inside Sales remain atomic.
- **AC-012 / REQ-016–021:** Suspicious zero preserves last-trusted data; only an audited ARQ admin
  can promote it during pilot; a validated extractor may accept zero only with positive
  completeness evidence.
- **AC-013 / REQ-022–026:** Exact file re-upload does not duplicate; recognized overlapping finance
  rows upsert; Smart Excel remains dataset-oriented; no upload matches a connector fact.
- **AC-014 / REQ-027–032:** Source choice persists per user/company/area, defaults to fresh Tally on
  first use, never silently switches, and Both remains separate with no variance or combined KPI.
- **AC-015 / REQ-033–035:** Ask ARQ and My Business Snapshot enforce explicit source and trust
  context and produce no unreconciled combined financial conclusion.
- **AC-016 / REQ-036–039:** Explicit company selection/switch refreshes every business and AI
  context without consolidation or stale frontend leakage.
- **AC-017 / Section 5.2:** A supported ledger is traceable end-to-end and presented with debit/
  credit meaning without a meaningless aggregate.
- **AC-018 / Section 5.3:** Accepted receivables reconcile to the named Tally source boundary for
  outstanding, overdue, ageing, party, and bill detail.
- **AC-019 / Section 5.4:** Accepted payables reconcile to the named Tally source boundary and
  remain visibly separate from receivables.
- **AC-020 / Sections 5.5 and 5.8:** Posted Sales and supported Credit Notes produce deterministic
  recorded-sales, customer, trend, and product facts; Sales Orders do not contribute.
- **AC-021 / Sections 5.6 and 5.8:** Posted Purchases and supported Debit Notes produce deterministic
  purchase, supplier, trend, and item facts; Purchase Orders do not contribute.
- **AC-022 / Sections 5.7, 5.9, and 5.11:** Receipts/Payments and necessary ledger movements are
  represented without claiming a complete Cash Flow Statement or bank reconciliation.
- **AC-023 / Section 5.10:** Inventory exposes trustworthy identities, quantities, movements, and
  only valuation whose basis is reproducible and labelled.
- **AC-024 / REQ-011, REQ-053–054:** Ordinary cloud storage and logs contain no raw XML or customer
  business content; consented diagnostics follow the explicit boundary.
- **AC-025 / REQ-055–056:** Re-authenticated cleanup removes all new and derived company business
  content, leaving only the approved minimal pseudonymized audit record for its fixed period.
- **AC-026 / Section 21:** Operators can inspect capability-level results, trust, completeness,
  freshness, and outcome counts without reading customer content.
- **AC-027 / Section 25:** For each mandatory domain, validation compares the same company, period,
  voucher states, and valuation boundary against a named Tally report/export; identities/counts
  match and currency values match within documented rounding tolerances.

## 24. Non-goals

Change 003 does not include Tally write-back; cross-source reconciliation or combined KPIs;
cross-company consolidation; Payroll; statutory GST/TDS functionality; a complete Cash Flow
Statement; automated bank reconciliation; treating Sales/Purchase Orders as recorded Sales/
Purchases; budgeting; arbitrary TDL support; every manufacturing/job-work workflow; every Tally
report/menu; invented classifications; AI-originated financial truth; autonomous external
actions; or customer-managed connector/capability administration without a reviewed permission
model.

## 25. Definition of Done and real-world verification

Every mandatory capability must demonstrate:

- extraction contract and supported Tally structures;
- trustworthy native or documented fallback identity strategy;
- incremental, retry-idempotent, and concurrency-safe behavior;
- completeness and trust behavior;
- domain-appropriate canonical persistence and provenance;
- deterministic formulas and business interpretation;
- authorized API contract;
- source-labelled, multilingual UI and error/empty/warning states;
- adversarial tests for empty, zero, negative, missing, partial, stale, duplicate, changed,
  cancelled/reversed where supported, retry, lost response, and concurrent input; and
- reconciliation to a named Tally source report/export for the same company, period, voucher
  states, and valuation boundary. Identities/counts match exactly; currency values match exactly
  except documented rounding tolerances.

Before broad support, mandatory capabilities are validated against consented, structurally
different companies including service/non-inventory, trading with GST/inventory, and
manufacturing or another materially different configuration. Pilot development may use fewer
fixtures while uncertainty remains explicit. Customer XML does not become a permanent fixture
without approved consent and anonymization.

The full change also requires existing receivables behavior preserved; source separation and
company isolation proven; uploaded-file behavior preserved; signed connector release; compatible
migrations and version rollout; rollback/forward recovery; capability monitoring; complete
cleanup; owner verification; and release approval.

## 26. Relationships to existing changes

### Change 001

Change 003 generalizes its trust model and preserves its receivables protection scenarios. Once
implemented, Change 001 is formally marked Superseded rather than maintained as a competing model.

### Change 002

Data-foundation work may proceed independently where no frontend contract overlaps. Navigation,
charts, My Business Snapshot, Research, and shared source/freshness presentation must reconcile
with accepted Change 002 behavior and preserve its answer-first UX.

## 27. Planning questions after specification approval

The plan must determine exact Tally collections/objects, versioned payloads and API contracts,
native and fallback identities, alteration/cancellation evidence, inventory valuation support,
foreign-currency preservation, deterministic formulas, canonical schemas, migrations, old/new
connector compatibility, profile credential/scheduler design, package hosting/version manifests,
feature flags, monitoring, recovery, test fixtures, and vertical review slices.

These questions may narrow a capability's supported Tally structures but may not silently remove
a mandatory end-to-end capability or weaken the approved safety contract.

## 28. Approval decision

### OPEN-001 — Evidence required before approving this specification

In this repository, the specification is the product-behaviour contract: what ARQ must do and
must not do. It precedes the technical `PLAN.md` and product-code work.

Owner approved the specification and requested next steps on 2026-09-05. This is
recorded as the Option B path below: product-contract approval precedes technical
feasibility proof. No completed feasibility review is implied. Planning must return
any infeasible mandatory capability to the owner for specification review.

Original alternatives retained for the decision history:

- **Option A — Recommended:** Before changing this file to `Approved`, complete a read-only
  feasibility review that identifies at least one credible Tally source mapping and native
  identity candidate for every mandatory domain. Detailed mappings and multi-company proof remain
  plan/release work.
- **Option B:** Approve the product contract now and permit the plan to discover whether every
  mandatory domain is technically supportable. If a domain proves infeasible, return the
  specification to Draft for owner review rather than silently narrowing it.

## 29. Approval gate

The owner's 2026-09-05 approval accepts the following product-contract checklist.
These checkmarks record approval, not implementation or verification:

- [x] OPEN-001 resolved through approval-before-feasibility (Option B)
- [x] Essential Tally Coverage V1 reviewed
- [x] Every-capability end-to-end Definition of Done accepted
- [x] Multi-profile connector behavior accepted
- [x] Allowed/enabled capability authority accepted
- [x] Pilot eligibility and founder-assisted administration accepted
- [x] Tally versus Uploaded-files separation accepted
- [x] Both-mode no-combination rule accepted
- [x] Company isolation accepted
- [x] Incremental and authoritative open-bill snapshot semantics accepted
- [x] Weak-identity and Accepted-with-warnings behavior accepted
- [x] Change 001 trust/promotion direction accepted
- [x] Custom Tally handling accepted
- [x] KPI and named-Tally-source verification principles accepted
- [x] Raw-source, diagnostics, cleanup, and retention boundaries accepted
- [x] Non-goals accepted
- [x] Requirements and acceptance scenarios reviewed
- [x] Owner approval recorded as `Approved`

`PLAN.md` is the next review artifact. Product implementation still requires plan/task-list
approval and authorization of named slices under the repository workflow.
