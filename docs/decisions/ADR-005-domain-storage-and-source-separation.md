# ADR-005: Domain-appropriate storage with explicit source/provenance separation

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-09-06 |
| Deciders | Rishi |
| Related change | 003-essential-tally-data-foundation |

## Context

Change 003 adds many new business domains (ledgers, payables, sales, purchases, receipts,
payments, notes, journal/contra, inventory) on top of existing connector-sourced receivables and
uploaded-file finance tables. `PLAN.md` §4 and DEC-002/DEC-004 require that Astra not build one
`Tally screen -> table -> tab` architecture, not merge Tally and uploaded-file identity
namespaces even when both carry the same Tally GUID, and not introduce a universal EAV facts
table. A durable storage shape decision is needed before any migration is written.

## Decision

- Each domain gets its own relational table family (voucher headers, accounting postings,
  inventory lines, bill allocations, master versions) rather than one generic facts table.
- Every fact table carries the same shared provenance/trust columns (tenant, ingestion channel,
  source domain/object, stable identity where available, run/generation reference, covered
  period, first/latest observation, accepted/trust state) as a documented convention, not a
  shared inheritance table — enforced by tenant-scoped foreign keys and unique constraints, not
  application-layer filtering alone.
- Tally-connector voucher/ledger storage remains a separate identity namespace from the existing
  `financial_transactions`/`financial_transaction_lines` uploaded-file tables, even when a
  connector voucher and an uploaded row carry the same underlying Tally GUID (DEC-004 — no
  automatic cross-channel matching).
- Existing receivable `bills` and uploaded finance tables are *extended* with provenance/identity
  quality/acceptance-generation columns rather than replaced, preserving the current receivables
  path during the compatibility window (`PLAN.md` §10).

## Alternatives considered

### One universal EAV (entity-attribute-value) business-facts table

- Benefits: a single schema handles any future domain without new migrations.
- Costs: loses type safety and query-plan efficiency for Decimal/date-heavy accounting data;
  makes tenant-scoped uniqueness and domain-specific validation much harder to enforce at the
  database layer; explicitly rejected by `PLAN.md` §4 and spec Section 20.
- Why not chosen: the spec and plan both name this as a non-goal in unambiguous terms.

### Merge connector and uploaded-file identity into one shared table keyed by Tally GUID

- Benefits: a GUID match could look like natural deduplication.
- Costs: violates DEC-004/DEC-026 (no cross-channel matching) and REQ-026; an uploaded export and
  a live connector sync of the same voucher are independently-trusted evidence, not the same
  canonical row, until a reconciliation feature is separately specified.
- Why not chosen: contradicts an explicit product decision, not just a style preference.

### A per-domain inheritance hierarchy (single "business_fact" base table, domain subtype tables)

- Benefits: shared provenance columns enforced by the schema itself, not convention.
- Costs: Postgres table inheritance/partitioning adds migration and query complexity without a
  clear win over shared-column convention plus foreign-key discipline, given the domain count
  (11 sections) and the additive-migration-only constraint in `PLAN.md` §4.
- Why not chosen: convention-plus-constraints is simpler to implement and audit incrementally,
  one domain slice at a time, without a large upfront schema commitment.

## Consequences

- Positive: each domain's persistence slice (SLICE-22/26/30/34/38/42/46) is independently
  reviewable and cleanly maps to spec Section 5's separate sections.
- Positive: cleanup (REQ-055) can delete per-table by tenant without traversing a shared EAV
  table's mixed content.
- Negative: shared provenance/trust behavior must be re-verified per domain table rather than
  centrally guaranteed by one base table's constraints; SLICE-54's full-boundary cleanup audit
  exists specifically to catch a missed table.
- Follow-up: define the exact shared provenance column set once SLICE-09 (run/evidence schema)
  is implemented, so every subsequent domain migration reuses identical column names/types.

## Revisit when

If a domain proves to need a genuinely different provenance shape than the shared convention
(e.g., inventory valuation's "unknown until proven reproducible" state doesn't fit the same
accepted/trust enum as a voucher), or if the shared-column convention causes real migration drift
across three or more domain slices.
