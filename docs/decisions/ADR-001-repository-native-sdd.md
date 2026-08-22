# ADR-001: Use a repository-native specification workflow

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-08-22 |
| Deciders | Rishi |
| Related change | SDD foundation |

## Context

ARQ Astra is a production brownfield product with three deploy targets, security invariants,
eight migrations, and behavior encoded across code, tests, `AGENTS.md`, the roadmap, and local
documents. Future work needs reviewed specifications and traceability without introducing a
framework dependency or locking the repository to one coding agent.

## Decision

Use tracked Markdown artifacts in `docs/`:

- one stable engineering constitution;
- capability-level baseline specs;
- one folder per proposed change containing spec, plan, tasks, and verification;
- ADRs only for durable architecture decisions; and
- requirement IDs linked through tasks and verification evidence.

Humans approve the specification, plan, and release. Agents may draft and implement approved
work but cannot approve their own output.

## Alternatives considered

### Install GitHub Spec Kit or OpenSpec

- Benefits: commands, templates, and automation.
- Costs: extra tooling, generated conventions, upgrade drift, and unnecessary framework
  coupling for the current team.
- Why not chosen: the useful workflow is small enough to maintain directly in this repository.

### Continue with `AGENTS.md` and prompts only

- Benefits: no new files or ceremony.
- Costs: no per-change approval, traceability, or durable verification record.
- Why not chosen: it does not control brownfield changes reliably.

## Consequences

- Positive: tool-neutral workflow, clear approval gates, and auditable intent.
- Negative: the team must keep baseline specs synchronized manually until CI checks exist.
- Follow-up: pilot the workflow with anomalous sync quarantine, then add safe CI enforcement.

## Revisit when

Reconsider dedicated SDD tooling when several contributors are creating change specs
concurrently or manual traceability becomes a measurable bottleneck.
