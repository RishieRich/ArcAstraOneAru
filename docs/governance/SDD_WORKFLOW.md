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

Split the plan into vertical review slices. Each slice targets one focused session, normally
45-60 minutes, and names its requirement IDs, prerequisites, outcome, likely files, checks,
live or inspectable review, and safe stop condition. This duration is a sizing guide, not a
timer. Tests and build checks belong in the same slice as the behavior they protect.

The owner reviews and approves the complete task list before any product-code slice starts.

### 5. Implement only authorized slices

Ask the agent to implement named slice IDs, for example `Start SLICE-03` or
`Start SLICE-03 through SLICE-04`. The agent runs the listed checks, records the result, and
stops after the last authorized slice. A UI slice ends with a live UI check; a non-visual slice
ends with equivalent inspectable evidence. Do not authorize unrelated cleanup inside a slice.

If a slice becomes too large or unsafe, stop at a passing checkpoint and propose smaller slices
for owner approval. Do not use elapsed time to mark unfinished work complete, and do not split
an atomic migration, release, or recovery action merely to fit the target.

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
| Task list | Owner | Slices are coherent, reviewable, bounded, and cover every requirement |
| Slice execution | Owner | Specific slice IDs or a specific batch are authorized |
| Slice acceptance | Owner | Evidence and the observable result are accepted before dependent work |
| Release | Owner | Diff and verification evidence match the approved spec |

An agent may prepare every artifact. It may not approve its own work.

## Bounded execution

- Every `PLAN.md` states its work limits and stop conditions.
- A review slice normally targets 45-60 focused minutes, includes its checks, and produces one
  observable result. It is not a hard timer or a promise that uncertain work will fit exactly.
- Stop after the last owner-authorized slice. Do not silently continue into the next slice.
- If a slice cannot finish safely, leave the repository at a passing checkpoint, record what is
  incomplete, and propose a smaller replacement or continuation slice for approval.
- Do not retry the same failed operation more than three times unless new evidence changes the
  approach. Record the failure and ask for the required decision instead.
- After three unresolved review rounds at one gate, the owner chooses to approve, narrow, split,
  defer, or reject the change.
- Audits and usability sessions use a stated duration. Reaching the limit records an incomplete
  result; it never creates a false pass.
- Background polling, external calls, and autonomous workflows require a maximum attempt count
  or deadline plus a cancellation path.
