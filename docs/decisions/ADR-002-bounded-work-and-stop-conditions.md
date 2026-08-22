# ADR-002: Bound work with explicit stop conditions

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-08-22 |
| Deciders | Rishi |
| Related change | SDD governance |

## Context

Specification-driven work can still become wasteful if an agent repeatedly researches,
rewrites, polls, or retries without a stopping rule. ARQ needs persistent quality gates without
turning review or implementation into an infinite loop.

## Decision

Every plan and automated loop must define a completion condition and a maximum attempt count,
deadline, or cancellation path. The same failed action stops after three equivalent failures
unless new evidence materially changes the approach. A review gate stops after three unresolved
revision rounds and returns an explicit approve, narrow, split, defer, or reject choice to the
owner.

Time limits expose incomplete work; they do not waive requirements or create a passing result.

## Alternatives considered

### Leave iteration limits to each prompt

- Benefits: no additional governance rule.
- Costs: behavior changes between agents and sessions, and failed actions can repeat silently.
- Why not chosen: the safeguard must survive individual conversations.

### Apply one fixed clock limit to every task

- Benefits: simple to measure.
- Costs: a suitable limit differs for an audit, build, migration review, or usability session.
- Why not chosen: plans need risk-appropriate bounds while sharing the same stop principle.

## Consequences

- Positive: blockers become visible, owner decisions are requested at a predictable point, and
  agents cannot claim success merely because time expired.
- Negative: work may pause even when another attempt might eventually succeed.
- Follow-up: every new plan uses the bounded-work section in the change template.

## Revisit when

Reconsider the default three-attempt or three-review-round limit if repository evidence shows it
regularly stops productive work too early or fails to prevent repeated work.
