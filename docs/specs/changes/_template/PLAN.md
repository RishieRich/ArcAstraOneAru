# Implementation plan: <outcome>

Do not complete this plan until `SPEC.md` is approved.

## Requirement coverage

| Requirement | Planned implementation | Planned verification |
|---|---|---|
| REQ-001 | | |

## Impact map

- Files/modules:
- API contracts:
- Data and migrations:
- Connector compatibility:
- Frontend and translations:
- External services:

## Implementation sequence

1.

## Proposed review-slice sequence

List the coherent outcomes that `TASKS.md` will turn into owner-authorized slices. A normal
slice targets 45-60 focused minutes and includes supporting checks plus one observable result.

1. `<slice outcome>`

## Test strategy

- Unit:
- Integration:
- Security/tenant isolation:
- Regression:
- Manual/visual:

## Work bounds and stop conditions

- Maximum duration or attempt count per audit/test pass:
- Maximum equivalent retries before reporting a blocker: 3
- Maximum unresolved review rounds before owner decision: 3
- Cancellation or pause condition:
- Slice sizing: normally 45-60 focused minutes; stop green and reslice if the outcome is larger
- UI review: live UI check at the end of every UI slice
- Authorization: stop after the last owner-authorized slice

## Rollout and recovery

- Deployment order:
- Feature flag or containment:
- Health checks:
- Failure signals:
- Rollback or forward-recovery:

## Decision record

List required ADRs, or state `No ADR required`.

## Plan approval

- [ ] Every requirement is covered
- [ ] Compatibility and migration order reviewed
- [ ] Tests and failure paths reviewed
- [ ] Rollout and recovery reviewed
- [ ] Proposed slices are coherent, independently reviewable, and safely bounded
