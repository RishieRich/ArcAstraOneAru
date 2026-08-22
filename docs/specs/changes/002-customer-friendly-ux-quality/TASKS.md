# Tasks: customer-friendly UX quality

| Field | Value |
|---|---|
| Status | Draft — owner review required |
| Approved plan | `PLAN.md`, approved 2026-08-23 |
| Execution gate | Complete TASK-000 and obtain owner approval of this task list |

Complete tasks in order within each stage. Do not begin a later stage until the earlier stage's
review task passes. Do not include unrelated cleanup.

## Requirement coverage index

| Requirements | Primary tasks |
|---|---|
| REQ-001, REQ-002, REQ-003, REQ-004 | TASK-102, TASK-201, TASK-202, TASK-204 |
| REQ-005, REQ-006, REQ-007 | TASK-105, TASK-203, TASK-204, TASK-704 |
| REQ-008, REQ-009, REQ-010, REQ-011 | TASK-103, TASK-301–304, TASK-701 |
| REQ-012, REQ-013, REQ-014, REQ-015, REQ-016, REQ-017 | TASK-103, TASK-401–405 |
| REQ-018, REQ-019, REQ-020, REQ-021, REQ-022, REQ-023 | TASK-104, TASK-501–503 |
| REQ-024, REQ-025, REQ-026, REQ-027 | TASK-104, TASK-601–604 |
| REQ-028, REQ-029, REQ-030, REQ-031, REQ-032 | TASK-105, TASK-701–705 |
| REQ-033, REQ-034, REQ-035 | TASK-000–001, TASK-101, TASK-106, TASK-705, TASK-801–805 |

## Stage 0 — live baseline gate

- [ ] **TASK-000 / REQ-001–035 / TEST-001:** Run one current-build browser audit, limited to
  90 minutes. Record steps, actual/expected behavior, severity, evidence, recommendation, and
  requirement link in `UX_AUDIT.md`. If no browser is available after one connection attempt,
  stop and record the blocker. Add only in-scope findings to this task list.
- [ ] **TASK-001 / REQ-033–035:** Review the live observations for financial, tenant, research,
  or external-action risk. Amend the specification before coding if any approved boundary is
  contradicted; otherwise mark Stage 0 complete.

## Stage 1 — tests and deterministic presentation models

- [ ] **TASK-101 / REQ-033–034 / tests first:** Run and record the existing frontend tests and
  production build as the unchanged-behavior baseline.
- [ ] **TASK-102 / REQ-001–004 / TEST-002 / tests first:** Add pure tests for default-home choice,
  home reset, temporary-panel closure, and preservation of company/language/theme/data state.
- [ ] **TASK-103 / REQ-008–017 / TEST-004–007 / tests first:** Add pure tests for summary order,
  source/period/freshness facts, chart labels, comparisons, Indian formatting, and all required
  zero/negative/missing/single/long/large edge cases.
- [ ] **TASK-104 / REQ-018–027 / TEST-008–009 / tests first:** Add pure tests for business
  snapshot facts, evidence checklist, distinct evidence types, safe next checks, research brief,
  result hierarchy, and create/copy wording.
- [ ] **TASK-105 / REQ-007, REQ-028, REQ-032 / TEST-010, TEST-012 / tests first:** Add recursive
  four-language key-parity tests and plain error/state presentation tests.
- [ ] **TASK-106 / REQ-033–034:** Review Stage 1 tests against existing receivables formulas,
  research scoring, API shapes, auth, cleanup, and AI authority. Record the result before UI work.

## Stage 2 — navigation and sign-in

- [ ] **TASK-201 / REQ-001, REQ-004 / TEST-002:** Make `BrandLogo` an accessible button and
  implement the tested signed-in/signed-out home behavior without changing stored settings.
- [ ] **TASK-202 / REQ-002–004 / TEST-002, TEST-011:** Add clear company/work-area location,
  non-color active states, and a calmer grouping of secondary header controls.
- [ ] **TASK-203 / REQ-005–007 / TEST-003, TEST-012:** Separate sign-in/trial modes, clear stale
  errors and secrets when switching, remove internal form scrolling, and provide plain recovery
  plus human support.
- [ ] **TASK-204 / REQ-001–007, REQ-029–032 / stage review:** Verify laptop, phone, 200% zoom,
  keyboard flow, light/dark theme, and reduced motion. Stop after three equivalent failures and
  record any blocker.

## Stage 3 — answer-first information hierarchy

- [ ] **TASK-301 / REQ-008–011 / TEST-004:** Create the reusable business-summary and
  source/period/freshness presentation using deterministic facts only.
- [ ] **TASK-302 / REQ-008–010, REQ-033 / TEST-004, TEST-013:** Apply the summary-first hierarchy
  to receivables without changing filters, calculations, bill lists, or trajectory meaning.
- [ ] **TASK-303 / REQ-008–011, REQ-033 / TEST-004, TEST-013:** Apply the hierarchy to finance
  and Smart Excel, reduce repeated headline prominence, and disclose details/history clearly.
- [ ] **TASK-304 / REQ-008–011, REQ-028–032 / stage review:** Verify summary order, terminology,
  source, period, freshness, disclosure, languages, responsive behavior, and themes.

## Stage 4 — graphs and exact values

- [ ] **TASK-401 / REQ-012–017, REQ-030 / TEST-005–007 / tests first:** Implement reusable chart
  structure for titles, units, axes, legends, direct labels, designed tooltips, focus/tap, chart
  summaries, and exact-value tables.
- [ ] **TASK-402 / REQ-012–017, REQ-028–031 / TEST-005–007:** Apply the shared behavior to
  `FinancialOverview` graphs without changing their deterministic values.
- [ ] **TASK-403 / REQ-010–017, REQ-028–031 / TEST-005–007:** Apply it to Smart Excel graphs,
  including source sheet, grouping, metric, unit, period, and missing-data explanations.
- [ ] **TASK-404 / REQ-012–017, REQ-028–031, REQ-033 / TEST-005–007, TEST-013:** Apply equivalent
  exact-value access to receivables and one-page report charts while preserving their semantics.
- [ ] **TASK-405 / REQ-012–017, REQ-028–031 / stage review:** Verify every chart by mouse,
  keyboard, touch-sized interaction, exact-value table, print, themes, zoom, and edge fixtures.

## Stage 5 — My business snapshot

- [ ] **TASK-501 / REQ-018–023 / TEST-008 / tests first:** Implement the deterministic snapshot
  model for strongest recorded product/customer, collection priority, concentration/change,
  missing evidence, and safe next checks.
- [ ] **TASK-502 / REQ-018–021 / TEST-008:** Rename the area in all four languages, show up to
  five supported facts first, explain rankings, and replace the readiness percentage with a
  connected/missing checklist.
- [ ] **TASK-503 / REQ-022–023, REQ-028–033 / TEST-008, TEST-010, TEST-013:** Keep sales customers,
  debtors, leads, suppliers, and collection priorities visibly separate; verify freshness,
  trust boundaries, accessibility, and no claim of unreleased sync quarantine.

## Stage 6 — customer and supplier research polish

- [ ] **TASK-601 / REQ-024–025 / TEST-009:** Add required/optional labels, familiar examples,
  input purpose, and a plain reason whenever research cannot start.
- [ ] **TASK-602 / REQ-024, REQ-026 / TEST-009:** Reorder candidate cards so name, location,
  match reason, source strength, and review action come before disclosed scoring detail.
- [ ] **TASK-603 / REQ-024, REQ-027 / TEST-009–010:** Make final actions and confirmations say
  create/copy only, and preserve the statement that ARQ contacts nobody automatically.
- [ ] **TASK-604 / REQ-022, REQ-024–027, REQ-033 / TEST-009, TEST-013 / stage review:** Confirm
  evidence, scoring, approve/reject behavior, latest-run restore, and tenant authority are
  unchanged.

## Stage 7 — language, accessibility, and calm states

- [ ] **TASK-701 / REQ-011, REQ-028 / TEST-010:** Complete English, Hinglish, Gujarati-Roman,
  and Marathi-Roman strings for every changed label, tooltip, table, state, and accessible name.
- [ ] **TASK-702 / REQ-003, REQ-005, REQ-029 / TEST-003, TEST-011:** Raise essential typography,
  remove critical truncation/hover-only text, and finish laptop/phone/200%-zoom layouts.
- [ ] **TASK-703 / REQ-030–031 / TEST-006, TEST-011:** Finish focus visibility, accessible names,
  headings, tab order, theme contrast, chart-series distinction, reduced motion, and print.
- [ ] **TASK-704 / REQ-007, REQ-028, REQ-032 / TEST-012:** Apply the calm actionable state pattern
  to loading, empty, partial, stale, error, no-access, login, and research states.
- [ ] **TASK-705 / REQ-028–034 / TEST-010–013 / stage review:** Run all frontend tests and the
  production build; complete the four-language, accessibility, responsive, theme, print, and
  safety regression matrix.

## Stage 8 — usability, verification, and release handoff

- [ ] **TASK-801 / REQ-035 / TEST-014:** Prepare the same bounded core-task script and observation
  sheet for all participants without leading them toward the expected answer.
- [ ] **TASK-802 / REQ-011, REQ-024, REQ-035 / TEST-014:** Run three sessions of at most 30 minutes
  each, including one Gujarati-first and one Marathi-first business user. Record task success,
  confusion, terminology, and understanding of source/period/no-contact boundaries.
- [ ] **TASK-803 / REQ-001–035:** Correct evidence-backed issues only when they remain inside the
  approved requirements. Create a separate change for new scope.
- [ ] **TASK-804 / REQ-001–035:** Complete `VERIFICATION.md` with assertions, commands, results,
  manual evidence, limitations, and the requirement-to-test matrix.
- [ ] **TASK-805 / REQ-033–035:** Present the final diff and verification evidence for owner
  release approval. After verified release, update affected baseline specs and status records.

## Task-list approval

- [x] All 35 requirements are covered
- [x] Tests precede or accompany behavior changes
- [x] Stages have review and stop conditions
- [x] No migration, backend, connector, deploy, commit, or push is included
- [ ] Stage 0 live baseline gate completed or explicitly waived with risk recorded
- [ ] Owner approved this task list for implementation
