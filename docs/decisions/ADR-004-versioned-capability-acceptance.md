# ADR-004: Versioned capability acceptance with generation isolation

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-09-06 |
| Deciders | Rishi |
| Related change | 003-essential-tally-data-foundation |

## Context

The existing `/v1/sync` contract accepts one flat `{ledgers, bills}` payload per call, with no
per-capability independence, no immutable staging, and no protection against a delayed device
overwriting a newer accepted snapshot with stale data. Change 003 must support many independent
capabilities (receivables, payables, ledgers, sales, purchases, receipts/payments, inventory)
committing safely under concurrent devices, retries, and partial failure, per REQ-008, REQ-009,
REQ-012, and REQ-013. `docs/specs/changes/003-.../contracts/protocol.md` (SLICE-06) is the
detailed design; this ADR records the durable architectural choice behind it.

## Decision

Introduce a versioned `/v2/sync/*` protocol where:

1. Every sync run pins a server-issued **configuration revision** and **cleanup generation**
   at creation; either going stale rejects the run before any staging write.
2. Each capability inside a run stages immutable, digest-keyed chunks
   (`run_id, capability, chunk_index, digest`) and publishes independently through its own
   **accepted generation** counter — one capability's failure or quarantine never blocks or
   corrupts another's acceptance.
3. Shared masters referenced by more than one capability are stored as versioned snapshots keyed
   to the generation that last confirmed them, so accepting capability A never silently changes
   what capability B's already-accepted facts meant by a shared ledger/party/item.
4. Retrying an identical `(run_id, capability, chunk_index, digest)` returns the prior saved
   result; the same key with different content conflicts (409) rather than overwriting.

This generalizes and supersedes Change 001's trust/quarantine model rather than running a
competing parallel one.

## Alternatives considered

### Extend the existing flat `/v1/sync` payload with more fields per capability

- Benefits: no new route surface; smaller initial diff.
- Costs: no natural place for per-capability independent commit, immutable chunk replay, or
  generation isolation without turning the payload schema into an ad hoc mess; the existing
  contract already conflates "empty" with "not attempted"/"disabled" (`PLAN.md` §1's observed
  constraint), which a v1 extension would inherit rather than fix.
- Why not chosen: REQ-012/013's independent-commit and atomicity requirements need a protocol
  shape v1 was never designed for.

### One global "run generation" instead of per-capability accepted generations

- Benefits: simpler counter model.
- Costs: one capability's failure would force re-validating or blocking unrelated capabilities'
  already-good data, violating REQ-012's independent-commit requirement directly.
- Why not chosen: fails an explicit requirement, not just a design preference.

### Trust native Tally alteration/revision cursors immediately for incremental sync

- Benefits: potentially smaller payloads, less re-extraction.
- Costs: `PLAN.md` §2 explicitly flags cursor ordering/reset/cancellation semantics as unproven;
  no evidence exists for any domain besides receivables (`EVIDENCE.md`).
- Why not chosen: deferred to "a later reviewed optimization" per `PLAN.md` §3; premature given
  the current evidence gap.

## Consequences

- Positive: retries, partial failure, and concurrent devices become protocol-level guarantees
  instead of per-endpoint ad hoc handling.
- Positive: v1 keeps working unmodified during a compatibility window (`PLAN.md` §10); no
  workspace is force-migrated.
- Negative: meaningfully more schema and endpoint surface than v1; SLICE-08/09/15/16 carry real
  implementation cost.
- Follow-up: the bounded synthetic capacity probe (`contracts/protocol.md` §3) found the proposed
  1,000-fact and 1 MiB chunk bounds are not both safe as independent limits at once — revise to
  "whichever is reached first" before SLICE-15 implements chunk assembly.

## Revisit when

A representative company's real transaction volume (G07) either confirms or contradicts the
200-chunks/200,000-facts-per-capability ceiling, or native alteration-cursor evidence becomes
available for a second domain beyond receivables.
