# ADR-003: Deliver changes through owner-authorized review slices

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-08-23 |
| Deciders | Rishi |
| Related change | SDD governance |

## Context

Broad implementation stages are useful for planning, but they can still produce long coding
sessions and delay the owner's chance to inspect the live product. ARQ needs a repeatable unit
of work that gives the owner frequent control without turning elapsed time into a quality gate.

## Decision

After the specification and plan are approved, `TASKS.md` divides delivery into vertical review
slices. Each slice targets about one focused session, normally 45-60 minutes, and includes its
tests or build checks plus one observable result. UI slices end with a live UI review.

The owner approves the task list and explicitly authorizes named slices or a named batch. The
agent records each slice separately and stops after the last authorized slice. If the work is
larger than expected, the agent stops at a safe passing checkpoint and proposes smaller slices;
the target duration never creates a false pass or justifies an unsafe split.

## Alternatives considered

### Authorize a complete implementation stage at once

- Benefits: fewer owner approvals.
- Costs: stages can span several sessions and hide UX drift until late.
- Why not chosen: the owner wants to inspect the live UI after small coherent outcomes.

### Enforce a hard one-hour timer

- Benefits: an unambiguous scheduling rule.
- Costs: can interrupt atomic work or reward declaring unfinished work complete.
- Why not chosen: duration is a sizing signal; correctness and a safe checkpoint remain gates.

### Approve every individual code edit

- Benefits: maximum owner control.
- Costs: excessive interruption and loss of implementation coherence.
- Why not chosen: a vertical slice is the smallest useful review unit, not each edit.

## Consequences

- Positive: the owner sees useful product progress frequently and can redirect later slices.
- Positive: new agents know exactly what was authorized, completed, verified, and still pending.
- Negative: more review checkpoints are required, and some cross-cutting work must be split into
  a pilot slice followed by rollout slices.
- Follow-up: use the updated change templates and record slice evidence in `VERIFICATION.md`.
  The six baseline specifications were reviewed on 2026-08-23; this process amendment changes
  no intended product behavior, so no baseline text changed.

## Revisit when

Reconsider the normal slice size or approval cadence if completed change records show that most
slices are repeatedly too small, too large, or unable to produce a coherent review result.
