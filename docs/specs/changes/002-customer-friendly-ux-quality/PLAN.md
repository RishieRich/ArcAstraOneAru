# Implementation plan: customer-friendly UX quality

| Field | Value |
|---|---|
| Status | Draft — owner review required |
| Approved specification | `SPEC.md`, approved 2026-08-22 |
| Product-code gate | Live current-build review, then owner plan approval |
| Expected deploy target | Frontend only |

No product code is authorized by this draft plan. Stage 0 remains open because the in-app
browser had no available session on 2026-08-22.

## Requirement coverage

| Requirement | Planned implementation | Planned verification |
|---|---|---|
| REQ-001 | Make `BrandLogo` an accessible home button and centralize home-state reset. | TEST-002: mouse/keyboard home flow and preserved settings. |
| REQ-002 | Add a clear company/work-area/subsection location line and non-color active states. | TEST-002: location and active-state checks. |
| REQ-003 | Group secondary settings/actions so primary navigation remains dominant. | TEST-002 and TEST-011: desktop/mobile header review. |
| REQ-004 | Keep company, language, theme, and data while closing temporary panels on home. | TEST-002: state-transition cases. |
| REQ-005 | Simplify the sign-in layout and remove internal form scrolling. | TEST-003: 1366×768, 390×844, and 200% zoom. |
| REQ-006 | Give sign-in and trial signup separate copy/state and clear stale errors on switch. | TEST-003: mode-switch, secret, and error-state checks. |
| REQ-007 | Translate technical failures into plain recovery messages and show human support. | TEST-003 and TEST-012: mapped login/connectivity failures. |
| REQ-008 | Add a summary-first block before details in each main work area. | TEST-004: answer/period/next-check order. |
| REQ-009 | Apply one prominence rule so repeated numbers become supporting detail. | TEST-004: information-hierarchy review. |
| REQ-010 | Show source, covered period, and freshness beside important results. | TEST-004: fixture and live-data checks. |
| REQ-011 | Replace jargon with an approved four-language plain-business glossary. | TEST-010 and TEST-014: language parity and user wording. |
| REQ-012 | Use a shared chart frame with title, metric, unit, axes, period, and legend. | TEST-005: all business-chart inventory checks. |
| REQ-013 | Add collision-aware high/low/latest labels where they remain readable. | TEST-005 and TEST-007: dense and edge fixtures. |
| REQ-014 | Add one designed exact-value tooltip pattern with valid comparisons. | TEST-006: exact Indian values and factual comparison. |
| REQ-015 | Make chart facts reachable by hover, focus, and tap. | TEST-006: mouse, keyboard, and touch checks. |
| REQ-016 | Add a table/list alternative to every business chart. | TEST-006: accessible table and print checks. |
| REQ-017 | Normalize and test zero, negative, missing, single-point, long, and large data. | TEST-007: deterministic edge-case fixtures. |
| REQ-018 | Rename and refocus the area as `My business snapshot`. | TEST-008: purpose and section-separation review. |
| REQ-019 | Build up to five evidence-backed summary facts, only when data supports them. | TEST-008: sales-only, receivables-only, both, and empty fixtures. |
| REQ-020 | Show the value/share/orders/recency/overdue facts behind rankings. | TEST-008: ranking explanation cases. |
| REQ-021 | Replace readiness percentage with connected/missing evidence checklist. | TEST-008: checklist meaning and no health implication. |
| REQ-022 | Label sales customers, debtors, leads, suppliers, and priorities separately. | TEST-008 and TEST-009: evidence-type checks. |
| REQ-023 | Generate next checks only from deterministic, fresh, available evidence. | TEST-008 and TEST-013: source/freshness regression. |
| REQ-024 | Preserve evidence, review controls, and no-automatic-contact wording. | TEST-009 and TEST-013: research safety regression. |
| REQ-025 | Add examples, required/optional labels, and disabled-search reasons. | TEST-009: brief completion and invalid-state checks. |
| REQ-026 | Show candidate identity/match/source/action first; disclose scoring details. | TEST-009: result-card scan test. |
| REQ-027 | Rename final actions and confirmations as create/copy, never send/contact. | TEST-009 and TEST-010: action-copy checks. |
| REQ-028 | Add every changed string and accessible label to all four language objects. | TEST-010: recursive translation-key parity. |
| REQ-029 | Raise essential type sizes and remove truncation/hover-only dependencies. | TEST-011: phone, older-user, zoom, and print review. |
| REQ-030 | Provide focus, names, heading order, tab order, summaries, and exact values. | TEST-006 and TEST-011: keyboard/screen-reader-oriented review. |
| REQ-031 | Tune both themes for contrast, series distinction, focus, warnings, and print. | TEST-011: light/dark/reduced-motion/print matrix. |
| REQ-032 | Use one calm, actionable pattern for loading/empty/partial/stale/error states. | TEST-012: state fixture matrix. |
| REQ-033 | Keep formulas, filters, research scoring, auth, cleanup, and authority unchanged. | TEST-013: existing tests, fixture comparison, and focused code review. |
| REQ-034 | Add repeatable logic/i18n tests plus the complete manual UX regression matrix. | TEST-001–TEST-013 recorded in `VERIFICATION.md`. |
| REQ-035 | Run three bounded moderated sessions and record observed task results. | TEST-014: three users, maximum 30 minutes each. |

## Impact map

- Existing frontend entry/navigation: `frontend/src/App.jsx`,
  `frontend/src/components/BrandLogo.jsx`, `frontend/src/pages/Login.jsx`.
- Existing business views: receivables components, `FinancialOverview.jsx`,
  `SmartDataExplorer.jsx`, `OnePageReport.jsx`, and `ResearchAgent.jsx`/CSS.
- Shared presentation expected: a small business-summary component, reusable chart frame,
  exact-value table, tooltip, and calm-state component under `frontend/src/components/`.
- Deterministic view models expected: small pure modules under `frontend/src/` for home choice,
  summary facts, chart facts, and error presentation so the existing Node test runner can test
  behavior without a new framework.
- Styling and language: `frontend/src/styles.css`, `ResearchAgent.css`, and `i18n.js`.
- Tests: keep `node --test`; add focused `*.test.js` files for navigation models, chart models,
  business summaries, edge cases, research presentation, and translation-key parity.
- API contracts: no backend response or formula change is planned. The current metrics already
  expose financial periods, monthly facts, highlights, products, counterparties, receivables,
  activity timestamps, and research evidence. If Stage 0 proves a missing fact, stop and amend
  the spec/plan before changing an endpoint.
- Data and migrations: none.
- Connector compatibility: no change.
- External services: no new service and no change to Ask ARQ or Tavily authority.
- Dependencies: no production dependency, UI framework, state library, or SDD framework added.

## Implementation sequence

### Stage 0 — capture the live baseline

Run one current-build audit covering the approved device sizes, zoom, themes, languages,
keyboard/touch-sized controls, core data states, finance/Smart Excel, and research evidence.
Append each observation to `UX_AUDIT.md` with steps, actual result, expected result, severity,
evidence, recommendation, and linked requirement.

If a financial, security, tenant, or external-action boundary is wrong, stop and revise the
spec. In-scope UX findings become tasks. Out-of-scope findings go into a separate change.

### Stage 1 — establish deterministic UX models and checks

Add failing tests for home-state selection, summary facts, chart fact models, missing-data
treatment, error mapping, and recursive i18n key parity. Preserve the existing five receivables
tests. No visual behavior changes in this stage.

### Stage 2 — navigation and sign-in

Implement logo-home behavior, clear location, a calmer header, simple sign-in/trial modes,
plain recovery actions, and state preservation. Review desktop, phone, zoom, and keyboard flow.

### Stage 3 — answer-first business hierarchy

Add short source/period/freshness summaries to receivables and financial views. Reduce repeated
headline prominence and move detailed diagnostics/history behind clear disclosure without
removing operator access.

### Stage 4 — shared graph quality

Build the reusable chart frame, exact tooltip, keyboard/touch interaction, direct labels, and
data-table alternative. Apply it first to financial and Smart Excel graphs, then to receivables
and report charts. Verify each chart before moving to the next.

### Stage 5 — My business snapshot

Rename and restructure the current area around strongest recorded product/customer, collection
priority, concentration/change, missing evidence, and next checks. Replace the readiness
percentage with a connected/missing checklist and keep all evidence types distinct.

### Stage 6 — research polish

Keep scoring and evidence logic unchanged. Simplify the research brief, result-card hierarchy,
advanced-detail disclosure, review actions, and create/copy wording.

### Stage 7 — language, accessibility, and responsive finish

Complete all four languages, type size, focus and heading order, themes, 200% zoom, reduced
motion, print behavior, and every calm state. Run the full build and regression matrix.

### Stage 8 — usability and release evidence

Run three moderated sessions, including Gujarati-first and Marathi-first users. Fix only issues
inside the approved requirements; otherwise create a new change. Complete `VERIFICATION.md`,
then ask the owner for release approval.

## Test strategy

- **TEST-001 — Baseline:** live observation inventory with screenshots or owner-observed notes.
- **TEST-002 — Navigation:** pure state tests plus mouse/keyboard home and location checks.
- **TEST-003 — Login:** mode, error/recovery, laptop, phone, zoom, and secret-clearing checks.
- **TEST-004 — Hierarchy:** summary order, unique prominence, source, period, and freshness.
- **TEST-005 — Chart meaning:** chart inventory, title/unit/axes/legend/direct-label checks.
- **TEST-006 — Chart access:** exact values through mouse, keyboard, touch, table, and print.
- **TEST-007 — Chart edges:** zero, negative, null, missing, one point, 36 months, large values.
- **TEST-008 — Snapshot:** evidence-backed summaries, ranking facts, checklist, and next checks.
- **TEST-009 — Research:** brief, disabled reason, scannable result, evidence, review, create/copy.
- **TEST-010 — Languages:** recursive key parity and changed journeys in all four modes.
- **TEST-011 — Accessibility/visual:** 200% zoom, focus order, light/dark, reduced motion, print.
- **TEST-012 — States:** loading, empty, partial, stale, error, no access, and recovery action.
- **TEST-013 — Safety regression:** existing receivables tests, production build, deterministic
  fixture comparisons, and review that auth/formulas/scoring/cleanup/authority did not change.
- **TEST-014 — Usability:** task success, confusion, terminology, and evidence-led corrections.

The backend test suite will not run for this frontend-only change because it uses configured
Neon rather than a hermetic test database. No live database write is part of verification.

## Work bounds and stop conditions

- Browser connection: one connection attempt per work session. If unavailable, record the
  blocker and use an owner-observed session later; do not switch to an unsupported browser tool.
- Live baseline audit: maximum 90 minutes for one pass. Unchecked cases remain `Not verified`.
- Implementation: one stage at a time. A stage must pass its relevant tests before the next.
- Equivalent failure: maximum three attempts. Then stop with command/output, suspected cause,
  and the owner decision or external condition needed.
- Review: maximum three unresolved rounds at the spec, plan, or release gate; the owner then
  approves, narrows, splits, defers, or rejects.
- Usability: three sessions, maximum 30 minutes per participant.
- No background polling, autonomous contact, production migration, deploy, commit, or push is
  authorized by this plan.

## Rollout and recovery

- Deployment order: frontend build and owner review; then deploy only the existing frontend
  project after release approval. Backend and connector remain unchanged.
- Containment: stages remain small and reviewable; do not mix formula, API, auth, or research
  scoring changes into visual work.
- Health checks: `npm test`, `npm run build`, frontend sign-in/dashboard smoke, backend `/health`
  and `/health/db`, then core journeys in all four languages.
- Failure signals: missing translation keys, changed figures, mismatched source/period, clipped
  controls, unreachable chart values, unsafe research wording, or failed core task.
- Recovery: redeploy the last known-good frontend deployment. No database recovery is required.

## Decision record

- `ADR-002` governs bounded work and stop conditions.
- No product architecture ADR is required: the plan keeps the current React/CSS architecture,
  API boundary, deterministic metrics, and provider authority.

## Plan approval

- [x] Every requirement has planned implementation and verification coverage
- [x] Compatibility and no-migration boundary reviewed
- [x] Tests, failure paths, work bounds, and stop conditions documented
- [x] Rollout and recovery documented
- [ ] Stage 0 live current-build review completed or explicitly waived with risk recorded
- [ ] Owner approved this plan
