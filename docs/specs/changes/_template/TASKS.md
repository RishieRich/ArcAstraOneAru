# Tasks: <outcome>

| Field | Value |
|---|---|
| Status | Draft - owner review required |
| Approved plan | `PLAN.md` |
| Execution gate | Owner approves this list and authorizes named slices |

Each slice is one coherent review unit, normally 45-60 focused minutes. The estimate is not a
timer. Every slice includes its supporting checks and one observable result. Stop after the last
authorized slice; do not add unrelated cleanup.

## Slice status

`Proposed` -> `Authorized` -> `In progress` -> `Ready for owner review` -> `Accepted`

Use `Blocked` when evidence or an external condition prevents a safe passing checkpoint.

## Requirement coverage

| Requirement | Slice(s) |
|---|---|
| REQ-001 | SLICE-01 |

## Stage 1 - <review milestone>

### SLICE-01 - <one observable outcome>

- **Status:** Proposed; not authorized
- **Requirements:** REQ-001
- **Prerequisites:** <accepted slices or none>
- **Likely files:** <small file list>
- **Work:** <behavior plus its tests/build checks>
- **Review:** <exact live UI journey or other inspectable evidence>
- **Stop:** Record evidence and stop. If the slice cannot finish safely, leave a passing
  checkpoint and propose smaller slices for owner approval.

## Task-list approval

- [ ] Every requirement maps to at least one slice
- [ ] Each slice has one coherent outcome, checks, review evidence, and a safe stop
- [ ] Dependencies and separately authorized external actions are explicit
- [ ] Owner approved this task list
