# Tasks: customer-friendly UX quality

| Field | Value |
|---|---|
| Status | SLICE-01 through SLICE-06 live in production, owner review pending; SLICE-07 through SLICE-15 implemented, tested, built, live-reviewed locally and pushed to `main`, ready for owner review |
| Approved specification | SPEC.md, approved 2026-08-22 |
| Approved plan | PLAN.md, approved and revalidated 2026-08-23 |
| Delivery | 29 proposed owner-authorized review slices |
| Product-code gate | Stage-0 unavailable live cases explicitly waived by owner on 2026-08-23 |
| Authorized batch | SLICE-01 through SLICE-15 |
| Deployment | SLICE-01 through SLICE-06 live in production. SLICE-07 through SLICE-15 are committed and pushed to `main` (commit `6294d74`) but **not deployed** — the production frontend still serves only Slice 1-6; deployment needs separate owner authorization as it did for Slice 1-6. |
| Documentation correction (2026-08-23, later session) | SLICE-07 through SLICE-15 were coded and pushed in an earlier session, but this file's per-slice rows and `VERIFICATION.md` were never updated and still read "Proposed; not authorized". A later session ran `npm test` (39/39 pass), `npm run build` (pass), and the missing live-UI evidence pass, then corrected the statuses below to match reality. See `VERIFICATION.md` for the evidence. |

The owner approved this task list and authorized SLICE-01 through SLICE-06 on 2026-08-23.
After the in-app browser listed no session, the owner explicitly directed the agent to use safe
alternatives and continue rather than treat that tool limitation as a blocker. Stage 0 is
recorded with unavailable real-data cases marked `Not verified`; SLICE-04 through SLICE-06 are
implemented, locally verified, committed, pushed to `main`, and deployed to the production
frontend on the owner's separate 2026-08-23 authorization. On 2026-08-23 the owner authorized
dependent implementation through SLICE-15, which records acceptance of SLICE-01 through
SLICE-06. SLICE-16 and later remain unauthorized.

## How you control the work

1. Review the slices below.
2. Approve this file and name exactly what may start, for example:
   "I approve TASKS.md. Start SLICE-01."
3. A small batch is also valid, for example: "Start SLICE-04 through SLICE-05."
4. After the last authorized slice, the agent reports the changed files, checks, live UI result,
   and anything unfinished, then stops.
5. Accept the result or request a bounded correction before authorizing dependent slices.

## Quick owner review map

Start with this table; the detailed contracts below are for the implementing agent.

| Stage | Slices | What you will review |
|---|---|---|
| 0. Live baseline | 01-03 | Current login/navigation, dashboards/charts, snapshot/research |
| 1. Entry | 04-06 | Working logo-home, clearer header, simpler login/help |
| 2. Business answers | 07-09 | Receivables, finance, and Smart Excel answer-first views |
| 3. Graphs | 10-16 | Exact labels, tooltip, keyboard/touch access, tables, print |
| 4. Snapshot | 17-18 | Clear top facts, ranking evidence, honest readiness checklist |
| 5. Research | 19-20 | Easier brief, scannable evidence, safe create/copy actions |
| 6. Quality closure | 21-23 | Calm states, four languages, accessibility, themes, responsive UI |
| 7. Usability | 24-28 | Script, three users, measured findings, bounded correction proposals |
| 8. Handoff | 29 | Final evidence for your release decision; no deployment |

The normal slice target is one focused 45-60 minute work session. It is a sizing guide, not a
stopwatch or a promise. If a slice is too large, the agent must leave a safe passing checkpoint
and propose smaller continuation slices for approval. Time never turns incomplete work into a
pass.

## Rules that apply to every slice

- Work only on the named slice and its prerequisites. Do not include unrelated cleanup.
- A product-code slice includes focused automated checks, the complete frontend test suite,
  npm run build, all four translations for changed copy, and its named live UI journey.
- Node tests can protect deterministic logic, but they do not prove hover, focus, tap, layout,
  contrast, or screen-reader use. Those claims require recorded live evidence.
- Record the slice separately in VERIFICATION.md; baseline observations go in UX_AUDIT.md.
- Try to connect to the in-app browser once per work session. If it is unavailable, stop the
  live portion unless the owner explicitly authorizes an alternative. Record the alternative
  and keep any real-data or assistive-technology gap `Not verified`.
- Stop after three equivalent failed attempts unless new evidence changes the approach.
- Stop and amend the approved artifacts before crossing into backend, API, migration, connector,
  formula, research-scoring, tenant-authority, deployment, commit, or push work.
- A slice is not accepted merely because its code and automated checks pass. The owner reviews
  the named observable result.

Slice status moves through:
"Proposed -> Authorized -> In progress -> Ready for owner review -> Accepted".
Use "Blocked" when the named result cannot be reached safely.

## Requirement coverage

| Requirements | Primary slices |
|---|---|
| REQ-001, REQ-002, REQ-003, REQ-004 | SLICE-01, SLICE-04, SLICE-05 |
| REQ-005, REQ-006, REQ-007 | SLICE-01, SLICE-06, SLICE-19, SLICE-21 |
| REQ-008, REQ-009, REQ-010, REQ-011 | SLICE-02, SLICE-07 through SLICE-09, SLICE-17, SLICE-20, SLICE-22 |
| REQ-012, REQ-013, REQ-014, REQ-015, REQ-016, REQ-017 | SLICE-02, SLICE-10 through SLICE-16, SLICE-21 |
| REQ-018, REQ-019, REQ-020, REQ-021, REQ-022, REQ-023 | SLICE-03, SLICE-17, SLICE-18, SLICE-20 |
| REQ-024, REQ-025, REQ-026, REQ-027 | SLICE-03, SLICE-19, SLICE-20 |
| REQ-028, REQ-029, REQ-030, REQ-031, REQ-032 | Every changed UI slice; closure in SLICE-21 through SLICE-23 |
| REQ-033, REQ-034 | Every product-code slice; full regression in SLICE-23 and SLICE-29 |
| REQ-035 | SLICE-24 through SLICE-28 and final evidence in SLICE-29 |

## Chart scope

Every data-driven visual that encodes a business value is a business chart, including a sample
preview when it presents sample business amounts. Decorative illustrations are not charts.
SLICE-02 records the final inventory before chart implementation. The expected inventory is:

- AgingChart and DueTimeline;
- FinancialOverview main trend and Book Explorer charts;
- finance/product ranking visuals and ProductAnalytics value bars;
- SmartDataExplorer line, bar, and donut charts;
- OnePageReport monthly and ranking charts;
- any WaitlistPreview visual that encodes sample business values.

If live inspection finds another business chart, add a bounded slice and obtain owner approval
before changing it.

## Stage 0 - live current-build baseline

These are observation slices, not product-code slices. All three must be accepted before
SLICE-04 unless the owner explicitly waives an unavailable check and records the risk.

### SLICE-01 - Baseline login and navigation

- **Status:** Ready for owner review — source baseline complete; unavailable live cases explicitly waived and retained as `Not verified`
- **Requirements:** REQ-001 through REQ-007, REQ-028 through REQ-032, REQ-034
- **Prerequisites:** A reachable current build and an owner-provided test login if authentication is required
- **Likely files:** UX_AUDIT.md only
- **Work:** Inspect signed-out login/signup, signed-in logo/header/company/work-area navigation,
  laptop, phone, 200% zoom, four languages, both themes, keyboard flow, and reduced motion.
- **Checks:** Every named viewport/mode receives Pass, Fail, Blocked, or Not applicable plus evidence.
- **Review:** Owner can follow the recorded steps and see screenshots or observe the same live journey.
- **Stop:** Record actual versus expected behavior and unresolved cases; do not edit product code.

### SLICE-02 - Baseline dashboards and chart inventory

- **Status:** Ready for owner review — source inventory complete; real-workbook interaction cases remain `Not verified`
- **Requirements:** REQ-008 through REQ-017, REQ-028 through REQ-034
- **Prerequisites:** SLICE-01 accepted; representative receivables, finance, and Smart Excel data
- **Likely files:** UX_AUDIT.md only
- **Work:** Inspect answer hierarchy, source/period/freshness, every business chart, exact values,
  mouse/keyboard/touch access, table alternatives, print, and available edge-data states.
- **Checks:** Reconcile the live chart list with the source inventory and mark every interaction/state.
- **Review:** Owner reviews the named chart inventory and evidence for each inspected chart.
- **Stop:** Mark unavailable fixtures and interactions Not verified; do not infer a pass.

### SLICE-03 - Baseline snapshot, research, and risk gate

- **Status:** Ready for owner review — source gate complete; no approved boundary was contradicted
- **Requirements:** REQ-018 through REQ-035
- **Prerequisites:** SLICE-02 accepted; a current snapshot and customer or supplier research result
- **Likely files:** UX_AUDIT.md and, only if a boundary is contradicted, SPEC.md or PLAN.md
- **Work:** Inspect My business snapshot, evidence types, readiness, rankings, next checks,
  research brief/results/review/create-copy language, raw warnings, and no-contact meaning.
- **Checks:** Every finding links a requirement and is classified as in scope, new scope, or blocker.
- **Review:** Owner reviews findings classified as in scope, new scope, or a financial/security/
  tenant/external-action blocker.
- **Stop:** If an approved boundary is contradicted, stop before code and amend the artifact for
  owner review. Otherwise record the baseline gate complete.

## Stage 1 - entry and navigation

### SLICE-04 - Logo returns to the predictable home

- **Status:** Ready for owner review — implemented and verified locally on 2026-08-23
- **Requirements:** REQ-001, REQ-004, REQ-028, REQ-030, REQ-034
- **Prerequisites:** Stage 0 accepted or explicitly waived
- **Likely files:** App.jsx, BrandLogo.jsx, a small pure navigation model/test, i18n.js
- **Work:** Make the logo an accessible home control. Use existing server
  has_receivables_data as the current receivables signal; otherwise choose finance or the
  guided empty state. Preserve company, language, theme, and uploaded data while closing panels.
- **Checks:** Pure state tests, full frontend tests, production build, four-language labels.
- **Live review:** Mouse and keyboard logo activation while signed in and signed out, with
  upload/chat/cleanup panels tested and saved settings visibly preserved.
- **Stop:** Record the home reached in each data state and stop.

### SLICE-05 - Clear location and calmer header

- **Status:** Ready for owner review — implemented and verified locally on 2026-08-23
- **Requirements:** REQ-002 through REQ-004, REQ-028 through REQ-031, REQ-034
- **Prerequisites:** SLICE-04 accepted
- **Likely files:** App.jsx, styles.css, i18n.js, focused navigation tests
- **Work:** Show company, work area, and subsection without color-only meaning; group secondary
  language/theme/upload/account/cleanup controls so primary work navigation stays dominant.
- **Checks:** Navigation-state tests, full frontend tests, production build, translation parity.
- **Live review:** Move through all three work areas at desktop and phone width using mouse and
  keyboard; verify location and active state in both themes.
- **Stop:** Record screenshots and keyboard order, then stop.

### SLICE-06 - Simple sign-in, signup, recovery, and support

- **Status:** Ready for owner review — implemented and verified locally on 2026-08-23
- **Requirements:** REQ-005 through REQ-007, REQ-028 through REQ-032, REQ-034
- **Prerequisites:** SLICE-05 accepted
- **Likely files:** Login.jsx, api.js or a pure error presenter, styles.css, i18n.js, login tests
- **Work:** Separate login/trial state and copy, clear stale errors and secrets on mode switch,
  remove internal form scrolling, map failures to plain next steps, and show human support.
  Animation may be refined only when it does not delay access and honors reduced motion.
- **Checks:** Mode/error state tests, full frontend tests, production build, translation parity.
- **Live review:** Login and trial switching at 1366x768, 390x844, and 200% zoom, including one
  failed login/connectivity state and keyboard-only completion.
- **Stop:** Do not add automated password reset; record recovery wording and stop.

## Stage 2 - answer-first business views

### SLICE-07 - Receivables answer first

- **Status:** Ready for owner review — implemented, tested, built, and live-verified locally on 2026-08-23
- **Requirements:** REQ-008 through REQ-011, REQ-028 through REQ-034
- **Prerequisites:** SLICE-06 accepted
- **Likely files:** App.jsx, ReceivablesOverview.jsx, DataNotes.jsx, summary model/test, styles.css, i18n.js
- **Work:** Put the important collection position, source, covered period/freshness, and next
  useful place before filters and detail; reduce repeated headline prominence.
- **Checks:** Summary-order and unchanged-receivables tests, full frontend tests, production build.
- **Live review:** Open receivables with and without overdue bills, apply filters, and confirm all
  figures/lists still change together while the summary remains clear.
- **Stop:** Preserve current-exposure semantics; record before/after evidence and stop.

### SLICE-08 - Finance answer first

- **Status:** Ready for owner review — implemented, tested, built, and live-verified locally on 2026-08-23
- **Requirements:** REQ-008 through REQ-011, REQ-028 through REQ-034
- **Prerequisites:** SLICE-07 accepted
- **Likely files:** FinancialOverview.jsx, FinancialUpload.jsx, summary model/test, styles.css, i18n.js
- **Work:** Lead with up to five supported finance facts, period/freshness, and a next check;
  demote repeated tiles and disclose detailed explorer/history without removing them.
- **Checks:** Finance hierarchy fixtures and unchanged-value comparisons, full tests, build.
- **Live review:** Use a representative finance workbook and confirm sales, purchases, expenses,
  estimated result, source period, warnings, and detail access in both themes.
- **Stop:** Any formula or API need blocks and returns to the plan; record evidence and stop.

### SLICE-09 - Smart Excel meaning and hierarchy

- **Status:** Ready for owner review — implemented, tested, built, and live-verified locally on 2026-08-23
- **Requirements:** REQ-008 through REQ-011, REQ-017, REQ-028 through REQ-034
- **Prerequisites:** SLICE-08 accepted
- **Likely files:** SmartDataExplorer.jsx, a Smart presentation model/test, styles.css, i18n.js
- **Work:** Explain source sheet, grouping, metric, aggregation, unit, covered period, missing
  meaning, and next check before generic KPIs/charts; keep Smart data visibly non-statutory.
- **Checks:** Known/unknown label and warning fixtures, unchanged-data tests, full tests, build.
- **Live review:** Use one unfamiliar multi-sheet workbook and verify a non-technical user can
  explain each first-layer fact without interpreting raw column names.
- **Stop:** Raw-English warning fallback or uncertain units fail the slice; record and stop.

## Stage 3 - exact, accessible charts

SLICE-10 establishes the shared contract. Later chart slices apply it to one bounded chart
family and may adjust the shared component only when existing accepted behavior remains green.

### SLICE-10 - Shared chart contract and Aging chart pilot

- **Status:** Ready for owner review — implemented, tested, built, and live-verified locally on 2026-08-23 (all 7 fixture-gallery edge cases exercised)
- **Requirements:** REQ-012 through REQ-017, REQ-028 through REQ-031, REQ-033, REQ-034
- **Prerequisites:** SLICE-09 accepted and chart inventory accepted
- **Likely files:** AgingChart.jsx, new small chart model/frame/table/tooltip components and tests,
  a development-only fixture gallery, styles.css, i18n.js
- **Work:** Implement title/metric/unit/period/axes/legend, direct labels, designed exact tooltip,
  focus/tap access, summary, and exact-value table on Aging. Fixtures cover zero, negative,
  missing, one point, 36 periods, and large values without shipping a production test route.
- **Checks:** Deterministic formatting/edge tests, existing receivables tests, full tests, build.
- **Live review:** Exercise Aging by mouse, keyboard, and touch-sized control in the fixture
  states, at phone width and 200% zoom.
- **Stop:** Direct-label rule is latest plus distinct high/low when readable; label once when the
  point is shared, and reduce to latest on dense/small layouts. The table/tooltip always keeps
  every exact value. Record evidence and stop.

### SLICE-11 - Remaining receivables charts

- **Status:** Ready for owner review, generic-contract evidence only — implemented, tested, and built on 2026-08-23; live evidence confirms DueTimeline applies the shared chart contract (context/table), but filter/aging/due-meaning regression was not re-exercised live this session beyond the automated tests
- **Requirements:** REQ-010, REQ-012 through REQ-017, REQ-028 through REQ-031, REQ-033, REQ-034
- **Prerequisites:** SLICE-10 accepted
- **Likely files:** DueTimeline.jsx, ReceivablesOverview.jsx, shared chart files, tests, styles.css, i18n.js
- **Work:** Apply the accepted chart contract to DueTimeline and every remaining receivables
  visual without changing filters, ageing buckets, due meaning, or amounts.
- **Checks:** Chart facts and filtered-value regression tests, full tests, build.
- **Live review:** Compare chart, exact table, and bill list after several filters using mouse,
  keyboard, and phone-width tap.
- **Stop:** Any mismatched amount or current-exposure wording fails the slice; record and stop.

### SLICE-12 - Financial main trend

- **Status:** Ready for owner review, generic-contract evidence only — implemented, tested, and built on 2026-08-23; live evidence confirms the trend chart applies the shared contract with a filled context and exact-value table, but per-series value/sign/legend comparison against source monthly rows was not individually re-exercised live this session beyond the automated tests
- **Requirements:** REQ-010, REQ-012 through REQ-017, REQ-028 through REQ-031, REQ-033, REQ-034
- **Prerequisites:** SLICE-11 accepted
- **Likely files:** FinancialOverview.jsx, shared chart files, finance chart tests, styles.css, i18n.js
- **Work:** Apply the accepted chart contract to the main monthly Sales/Purchase/Expense/Result
  trend, including valid comparisons and honest missing/negative values.
- **Checks:** Series/value/period fixture comparisons, full tests, build.
- **Live review:** Read exact values for every series by mouse, keyboard, and phone-width tap;
  compare them with the table and source monthly rows.
- **Stop:** A value, sign, period, or legend mismatch fails the slice; record and stop.

### SLICE-13 - Finance Book Explorer charts

- **Status:** Ready for owner review, generic-contract evidence only — implemented, tested, and built on 2026-08-23; live evidence confirms Book Explorer applies the shared contract, but switching between individual book types was not exercised live this session beyond the automated tests
- **Requirements:** REQ-010, REQ-012 through REQ-017, REQ-028 through REQ-031, REQ-033, REQ-034
- **Prerequisites:** SLICE-12 accepted
- **Likely files:** FinancialOverview.jsx, shared chart files, Book Explorer tests, styles.css, i18n.js
- **Work:** Apply the accepted chart contract to Book Explorer across available book types and
  keep warnings, periods, values, and missing months explicit.
- **Checks:** Book switching and edge fixtures, full tests, build.
- **Live review:** Switch each available book and verify title, unit, axis, tooltip/table values,
  long-period scrolling, and both themes.
- **Stop:** Do not change import classifications or formulas; record evidence and stop.

### SLICE-14 - Finance product and ranking visuals

- **Status:** Ready for owner review, generic-contract evidence only — implemented, tested, and built on 2026-08-23; live evidence confirms the product ranking chart applies the shared contract, but the missing-unit case and sample-preview classification were not individually exercised live this session beyond the automated tests
- **Requirements:** REQ-010, REQ-012 through REQ-017, REQ-028 through REQ-031, REQ-033, REQ-034
- **Prerequisites:** SLICE-13 accepted
- **Likely files:** FinancialOverview.jsx, ProductAnalytics.jsx, WaitlistPreview.jsx where it
  encodes sample values, shared chart files, tests, styles.css, i18n.js
- **Work:** Make value bars/rankings self-explaining and exact-value accessible while keeping
  product facts limited to normalized item lines. Classify sample preview visuals consistently.
- **Checks:** Ranking/value/share/unknown-unit tests, full tests, build.
- **Live review:** Inspect product/customer rankings, a missing-unit case, phone width, keyboard
  flow, and any data-driven sample preview.
- **Stop:** Never infer a product from a party or ledger row; record evidence and stop.

### SLICE-15 - Smart Excel line, bar, and donut charts

- **Status:** Ready for owner review — implemented, tested, built, and live-verified locally on 2026-08-23; the live fixture included one line, one bar and one donut chart, each rendering with the shared contract and an exact-value table
- **Requirements:** REQ-010 through REQ-017, REQ-028 through REQ-034
- **Prerequisites:** SLICE-14 accepted
- **Likely files:** SmartDataExplorer.jsx, shared chart files, Smart chart tests, styles.css, i18n.js
- **Work:** Apply the chart contract to line, bar, and donut forms with source sheet, grouping,
  metric, aggregation, unit, period, missing-data wording, exact interaction, and table.
- **Checks:** Each chart type plus raw-warning and edge fixtures, full tests, build.
- **Live review:** Exercise all three chart types with a representative workbook, keyboard and
  phone-width tap, and compare exact tables with visible marks.
- **Stop:** If the shared contract cannot cover all three safely, leave accepted types green and
  propose separate continuation slices; record evidence and stop.

### SLICE-16 - One-page report charts and print

- **Status:** Proposed; not authorized
- **Requirements:** REQ-010, REQ-012 through REQ-017, REQ-028 through REQ-031, REQ-033, REQ-034
- **Prerequisites:** SLICE-15 accepted
- **Likely files:** OnePageReport.jsx, shared chart files, report tests, print styles, i18n.js
- **Work:** Apply exact labels and accessible alternatives to report monthly/ranking charts while
  preserving deterministic report numbers and A4 landscape legibility.
- **Checks:** Report fact/value and print-structure tests, full tests, build.
- **Live review:** Open report, compare chart/table values with dashboard facts, then use print
  preview in light and dark themes at A4 landscape.
- **Stop:** AI narrative must not supply a chart number; record print evidence and stop.

## Stage 4 - My business snapshot

### SLICE-17 - Clear purpose and supported top facts

- **Status:** Proposed; not authorized
- **Requirements:** REQ-008 through REQ-011, REQ-018, REQ-019, REQ-022, REQ-023, REQ-028 through REQ-034
- **Prerequisites:** SLICE-16 accepted
- **Likely files:** ResearchAgent.jsx, a pure snapshot model/test, ResearchAgent.css, i18n.js
- **Work:** Rename the area My business snapshot and show only supported strongest product,
  strongest sales customer, collection priority, one attention fact, and missing evidence.
  Keep sales customers, debtors, leads, suppliers, and priorities explicitly separate.
- **Checks:** Sales-only, receivables-only, both, and empty fixtures; full tests and build.
- **Live review:** Open all four data combinations and explain each first-layer fact, source,
  period/freshness, and next check in plain language.
- **Stop:** Choose the attention fact from existing deterministic data: urgent alert before watch,
  otherwise the latest valid period change; stable source order breaks ties. Record and stop.

### SLICE-18 - Ranking evidence, readiness checklist, and next checks

- **Status:** Proposed; not authorized
- **Requirements:** REQ-020 through REQ-023, REQ-028 through REQ-034
- **Prerequisites:** SLICE-17 accepted
- **Likely files:** ResearchAgent.jsx, snapshot model/test, ResearchAgent.css, i18n.js
- **Work:** Replace ICP/readiness score prominence with ranking facts and a connected/missing
  evidence checklist explaining what each missing input prevents; add safe deterministic checks.
- **Checks:** Ranking facts, checklist, evidence-type, freshness, and unreleased-change fixtures;
  full tests and build.
- **Live review:** Ask why the first product/customer/collection item ranks first and verify the
  screen answers with value/share/orders/recency/overdue facts, not an opaque score.
- **Stop:** Do not claim Change 001 quarantine exists; record evidence and stop.

## Stage 5 - customer and supplier research

### SLICE-19 - Simpler research brief

- **Status:** Proposed; not authorized
- **Requirements:** REQ-007, REQ-011, REQ-024, REQ-025, REQ-028 through REQ-032, REQ-034
- **Prerequisites:** SLICE-18 accepted
- **Likely files:** ResearchAgent.jsx, ResearchAgent.css, research presentation tests, i18n.js
- **Work:** Mark inputs required/optional, add familiar examples and purpose, and explain exactly
  why a disabled search cannot start without changing research requests or scoring.
- **Checks:** Valid/invalid/disabled form fixtures, full tests, build, translation parity.
- **Live review:** Complete customer and supplier briefs on desktop and phone using keyboard,
  including each disabled reason and one plain failure/recovery state.
- **Stop:** Do not change Tavily capability or add fields to its request; record and stop.

### SLICE-20 - Scannable candidates and honest final actions

- **Status:** Proposed; not authorized
- **Requirements:** REQ-010, REQ-011, REQ-022, REQ-024, REQ-026, REQ-027, REQ-028 through REQ-034
- **Prerequisites:** SLICE-19 accepted
- **Likely files:** ResearchAgent.jsx, ResearchAgent.css, research presentation tests, i18n.js
- **Work:** Show name/location/match/source/review first, disclose scoring/evidence detail, preserve
  approve/reject, and label final actions create/copy without implying delivery or contact.
- **Checks:** Evidence/status/action-copy and latest-run restore tests, full tests, build.
- **Live review:** Review, approve/reject, expand evidence, restore latest results, create the
  top-five brief, and copy it; verify no state says sent or contacted.
- **Stop:** Any missing citation or authority change fails the slice; record and stop.

## Stage 6 - cross-product quality closure

### SLICE-21 - Calm states and raw-warning closure

- **Status:** Proposed; not authorized
- **Requirements:** REQ-007, REQ-010, REQ-017, REQ-028 through REQ-032, REQ-034
- **Prerequisites:** SLICE-20 accepted
- **Likely files:** App.jsx, Login.jsx, SmartDataExplorer.jsx, ResearchAgent.jsx, a pure state/
  error presenter and tests, styles.css, i18n.js
- **Work:** Give loading, empty, partial, explicit-stale, error, and no-access states a plain
  explanation and next action; prevent raw backend/provider/Smart warning text from being the
  only user explanation.
- **Checks:** State/error/warning fixtures, recursive translation parity, full tests, build.
- **Live review:** Exercise every state in all four languages at phone width and with reduced
  motion; confirm the message stays dominant.
- **Stop:** Always show the exact last update. Use the word stale only when the source provides
  an explicit stale state; this frontend change invents no age threshold. Record and stop.

### SLICE-22 - Four-language and readability closure

- **Status:** Proposed; not authorized
- **Requirements:** REQ-011, REQ-028, REQ-029, REQ-032 through REQ-034
- **Prerequisites:** SLICE-21 accepted
- **Likely files:** i18n.js, all changed components, translation tests, styles.css
- **Work:** Close missing English/Hinglish/Gujarati-Roman/Marathi-Roman strings, replace remaining
  approved-scope jargon, raise essential text, and remove critical truncation/hover-only copy.
- **Checks:** Recursive key and function-shape parity, known raw-warning fixtures, full tests, build.
- **Live review:** Walk every changed journey in all four modes at 100% and 200% zoom, including
  long Gujarati-Roman and Marathi-Roman labels.
- **Stop:** Customer-supplied names remain untranslated; every product string must pass. Record
  gaps as blockers or new correction slices and stop.

### SLICE-23 - Keyboard, screen reader, themes, responsive, print, and safety regression

- **Status:** Proposed; not authorized
- **Requirements:** REQ-029 through REQ-034
- **Prerequisites:** SLICE-22 accepted
- **Likely files:** Focused accessibility tests, styles.css, changed components, VERIFICATION.md
- **Work:** Close visible focus, names, headings, tab order, chart summaries/tables, contrast,
  series distinction, phone/laptop/zoom layout, reduced motion, and print without changing facts.
- **Checks:** Full frontend tests, production build, deterministic fixture comparison, focused
  review that auth, formulas, filters, cleanup, scoring, evidence, and AI authority are unchanged.
- **Live review:** Keyboard-only core journey, Windows Narrator or equivalent screen-reader pass,
  light/dark, 390x844, 1366x768, 1440x900, 200% zoom, reduced motion, and print preview.
- **Stop:** Record each matrix cell Pass, Fail, Blocked, or Not applicable; blanks are not passes.

## Stage 7 - representative usability and evidence-led corrections

### SLICE-24 - Usability script and dry run

- **Status:** Proposed; not authorized
- **Requirements:** REQ-035
- **Prerequisites:** SLICE-23 accepted
- **Likely files:** VERIFICATION.md and a bounded usability script inside this change folder
- **Work:** Prepare neutral core tasks, prompts, observation fields, participant consent boundary,
  and a dry run. Calculate ordinary-task success as unprompted completed tasks divided by
  attempted ordinary tasks, per participant and combined. Report source/period and no-contact
  understanding separately; both require 100%.
- **Checks:** Every success measure maps to an observed task; no prompt reveals the answer.
- **Review:** Owner reviews the script, calculation, participant roles, and dry-run evidence.
- **Stop:** Do not recruit or contact participants; the owner provides each participant.

### SLICE-25 - Gujarati-first usability session

- **Status:** Proposed; not authorized
- **Requirements:** REQ-035
- **Prerequisites:** SLICE-24 accepted and owner-provided Gujarati-first business participant
- **Likely files:** VERIFICATION.md and usability observation record
- **Work:** Run the same moderated core tasks for at most 30 minutes without leading.
- **Checks:** Use the approved script and calculate the participant's result without changing its denominator.
- **Review:** Record task result, help needed, confusion, terminology, source/period understanding,
  no-contact understanding, and participant language preference.
- **Stop:** Record observations only; do not fix code inside the session slice.

### SLICE-26 - Marathi-first usability session

- **Status:** Proposed; not authorized
- **Requirements:** REQ-035
- **Prerequisites:** SLICE-24 accepted and owner-provided Marathi-first business participant
- **Likely files:** VERIFICATION.md and usability observation record
- **Work:** Run the same moderated core tasks for at most 30 minutes without leading.
- **Checks:** Use the approved script and calculate the participant's result without changing its denominator.
- **Review:** Record task result, help needed, confusion, terminology, source/period understanding,
  no-contact understanding, and participant language preference.
- **Stop:** Record observations only; do not fix code inside the session slice.

### SLICE-27 - Third representative usability session

- **Status:** Proposed; not authorized
- **Requirements:** REQ-035
- **Prerequisites:** SLICE-24 accepted and a third owner-provided representative business user
- **Likely files:** VERIFICATION.md and usability observation record
- **Work:** Run the same moderated core tasks for at most 30 minutes without leading.
- **Checks:** Use the approved script and calculate the participant's result without changing its denominator.
- **Review:** Record task result, help needed, confusion, terminology, source/period understanding,
  no-contact understanding, and participant profile.
- **Stop:** Record observations only; do not fix code inside the session slice.

### SLICE-28 - Triage evidence-led corrections

- **Status:** Proposed; not authorized
- **Requirements:** REQ-001 through REQ-035 as linked by each observation
- **Prerequisites:** SLICE-25 through SLICE-27 accepted
- **Likely files:** TASKS.md, VERIFICATION.md, and a new change spec for any new scope
- **Work:** Calculate the usability result, group only approved-scope findings into coherent
  correction proposals, and assign SLICE-28A, SLICE-28B, and so on. Each child slice receives
  its own requirements, tests, live journey, and owner authorization.
- **Checks:** Recalculate the stated success measures and give every observation an explicit disposition.
- **Review:** Owner approves, defers, or moves each finding to a new specification.
- **Stop:** Do not implement an unknown correction under SLICE-28. Final handoff waits for all
  required child slices to be accepted or explicitly deferred with risk recorded.

## Stage 8 - final verification and release handoff

### SLICE-29 - Release-ready evidence

- **Status:** Proposed; not authorized
- **Requirements:** REQ-001 through REQ-035
- **Prerequisites:** SLICE-23 accepted; usability target met; required SLICE-28 children accepted
  or explicitly deferred by the owner
- **Likely files:** VERIFICATION.md, affected baseline specs, and AGENTS.md if verified product
  behavior or operational memory changed
- **Work:** Run the full frontend tests/build, reconcile every requirement and acceptance
  scenario with evidence, record limitations, present the final diff, and prepare release notes.
- **Checks:** No unexplained test failure, missing requirement row, untranslated changed string,
  unverified safety boundary, or blank live-regression result.
- **Live review:** Final smoke of login, home, all work areas, representative charts, snapshot,
  research no-contact action, all four languages, phone, keyboard, and both themes.
- **Stop:** Ask for owner release approval. Do not deploy, commit, or push under this slice.

## Task-list approval

- [x] All 35 requirements map to proposed slices
- [x] Each implementation slice includes tests, build, four-language work, a live UI result, and a stop
- [x] Broad chart, research, accessibility, and usability work is split into reviewable outcomes
- [x] Unknown usability corrections require new bounded child slices and owner authorization
- [x] The original slice authorization excluded backend, API, migration, connector, deploy,
  commit, and push actions
- [x] Owner separately authorized the Slice 1-6 commit, `main` push, and frontend deployment
  on 2026-08-23; no backend, API, migration, or connector action was authorized
- [ ] Stage 0 live baseline completed or explicitly waived with risk recorded
- [x] Owner approved this task list and authorized SLICE-01 through SLICE-06 on 2026-08-23
