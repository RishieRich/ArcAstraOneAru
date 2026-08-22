# How to develop ARQ Astra

This workflow is repository-native. It requires no external SDD framework.

## The normal workflow

### 1. Create a change folder

Copy `docs/specs/changes/_template/` to a numbered folder such as:

```text
docs/specs/changes/002-owner-operator-roles/
```

Use the next available number and a short outcome-based name.

### 2. Write and review `SPEC.md`

Describe the required behavior, not the code. Include current behavior, requirements,
acceptance scenarios, non-goals, risks, and open decisions.

Ask the coding agent:

> Review this specification against the constitution, baseline specs, code, migrations, and
> tests. Find ambiguity and missing edge cases. Do not implement anything.

Resolve every blocking question. The owner changes the status from `Draft` to `Approved`.

### 3. Write and review `PLAN.md`

Only plan an approved specification. Map affected files and contracts, test strategy,
rollout order, monitoring, and recovery. Create an ADR only if the plan makes a lasting
architecture decision.

### 4. Create `TASKS.md`

Split the plan into small tasks. Every task cites requirement IDs such as `REQ-003`.
Tests normally come before or with the behavior they verify.

### 5. Implement one task at a time

Ask the agent to implement specific task IDs, run the relevant checks, and report exactly
what changed. Do not authorize unrelated cleanup inside a feature change.

### 6. Complete `VERIFICATION.md`

Record commands, results, manual checks, unresolved limitations, deployment evidence, and
the requirement-to-test matrix. A passing test name without its assertion is not enough.

### 7. Release and reconcile

After release:

1. Update the affected baseline specs to reflect the verified behavior.
2. Update `AGENTS.md` when architecture, endpoints, environment variables, deployment, or
   known traps changed.
3. Mark the change `Released` and keep its folder as the audit trail.
4. Mark replaced ADRs `Superseded`; never rewrite their history.

## Change size

| Change | Required process |
|---|---|
| Copy, comments, or documentation only | PR/checklist; no change spec unless meaning changes |
| Contained UI or low-risk bug | Short spec, plan, tasks, and verification |
| Feature or cross-component behavior | Full workflow |
| Auth, tenant, money, Tally, migration, deletion, AI authority, external action | Full workflow plus adversarial review |
| Production incident | Abbreviated spec allowed; constitution and verification still apply |

## Approval gates

| Gate | Who decides | What must be true |
|---|---|---|
| Scope | Owner | Outcome and non-goals are clear |
| Specification | Owner | Requirements and acceptance scenarios are approved |
| Plan | Owner or designated reviewer | Risks, tests, rollout, and recovery are credible |
| Release | Owner | Diff and verification evidence match the approved spec |

An agent may prepare every artifact. It may not approve its own work.
