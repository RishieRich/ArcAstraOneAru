# Change specification: customer-friendly UX quality

| Field | Value |
|---|---|
| Change ID | 002 |
| Status | Approved |
| Owner | Rishi |
| Risk | High |
| Baseline specs | Identity/access, receivables, financial imports, AI/research, operations |
| Supporting review | `UX_AUDIT.md` |
| Delivery model | Owner-authorized review slices |
| Related change | 001 — unexpected empty sync quarantine |

## Outcome

A non-technical Indian business owner should be able to sign in, identify the important
business position, read exact graph values, understand why a metric matters, and find the next
safe action without learning accounting or analytics jargon.

The experience must remain honest, multilingual, calm, and useful. This change improves
clarity and interaction; it does not add unrelated product capabilities.

## Target users

- Owner/CFO who wants a quick business answer, often on mobile.
- Finance operator who needs exact bills, dates, amounts, and source details on desktop.
- Gujarati-first and Marathi-first users who may prefer Roman-script language and familiar
  business words over technical analytics terms.

## Success measures

In a moderated usability check, a representative user should be able to:

- sign in or identify the correct sign-in action without help;
- identify the selected company, current work area, data period, and last update within 30 seconds;
- find outstanding, overdue, sales, purchase, expense, or result figures that exist in the
  connected data within 60 seconds;
- read an exact period and value from a graph within 15 seconds using mouse, keyboard, or touch;
- explain in their own words what `Understand my business` is showing and what data supports it;
- start customer or supplier research and correctly understand that ARQ will not contact anyone.

Release target: at least 80% of ordinary tasks completed without facilitator help and 100%
correct understanding of financial source/period and the no-automatic-contact boundary.

## Requirements

### Navigation and first impression

- **REQ-001 — Predictable home:** The ARQ logo must be an accessible home control. When signed
  in, it returns to the selected company's default home view and closes temporary panels. When
  signed out, it returns to the normal sign-in state and page top.
- **REQ-002 — Clear location:** Every screen must make the selected company, current work area,
  and current subsection obvious without relying only on color.
- **REQ-003 — Calm header:** Primary work navigation must remain prominent. Language, theme,
  upload, account, and cleanup controls must not compete equally with the user's main task.
- **REQ-004 — Preserve useful state:** Returning home or switching work areas must not silently
  change the selected company, language, theme, or uploaded data.

### Login and help

- **REQ-005 — Simple sign-in:** On supported laptop and mobile sizes, the sign-in fields and
  main submit button must be visible without an internal form scrollbar. Product explanation
  may remain, but must not obstruct or delay account access. Animation changes are optional,
  must honor reduced motion, and must not compete with the form or recovery message.
- **REQ-006 — Clear modes:** Sign in and free-trial signup must have distinct headings, fields,
  requirements, and submit actions. Switching modes must not leave misleading errors or secrets.
- **REQ-007 — Useful recovery:** Login, signup, and connectivity failures must use plain language,
  state what the user can do next, and provide a visible human-support route. Raw backend or
  provider messages must not be the only explanation.

### Business information hierarchy

- **REQ-008 — Answer first, detail second:** Each main work area must begin with a short summary
  of the important position, its period/freshness, and the next useful place to look. Detailed
  tables, formulas, imports, and diagnostics remain available below or through disclosure.
- **REQ-009 — No repeated headline clutter:** A number should not appear as several equally
  prominent tiles or panels unless each presentation answers a different business question.
- **REQ-010 — Source and period:** Important KPIs, insights, rankings, and charts must state
  their data source, covered period, and freshness close to the result.
- **REQ-011 — Plain business language:** User-facing labels must prefer words such as money to
  collect, sales, purchases, expenses, estimated result, customers, and suppliers. Terms such
  as ICP, aggregation, dimensions, confidence, and fit score require a plain explanation or a
  clearer replacement.

### Graphs and exact values

- **REQ-012 — Self-explaining graph:** Every graph must show a useful title, metric name, unit,
  period, axis meaning, and readable legend without requiring hover.
- **REQ-013 — Visible business facts:** Important high/low/latest values and important changes
  must be labelled directly when space permits. Labels must avoid collisions and clutter.
- **REQ-014 — Rich exact-value interaction:** Hover, focus, or tap on a data mark must show a
  designed tooltip containing period/category, full metric name, exact Indian-formatted value,
  comparison or share when valid, and a short factual interpretation when deterministically
  available.
- **REQ-015 — Multiple input methods:** The same chart facts must be available by mouse,
  keyboard, and touch. Native SVG `<title>` behavior alone is insufficient.
- **REQ-016 — Data-table alternative:** Every business chart must provide a readable data-table
  or equivalent exact-value list for accessibility, verification, printing, and small screens.
- **REQ-017 — Honest edge cases:** Graphs must remain meaningful for zero, negative, missing,
  single-point, long-period, large-value, and partial-data inputs. Missing data must not be drawn
  as genuine zero unless the contract establishes zero.

### Understand my business

- **REQ-018 — One clear purpose:** The area must answer `What is driving my business and what
  needs attention?` It must not mix business performance, collection urgency, and research-data
  readiness into one unexplained score.
- **REQ-019 — Meaningful summary:** When data exists, the first view must separately show:
  strongest recorded sales product, strongest recorded sales customer, current collection
  priority, important concentration or change, and missing evidence that limits conclusions.
  Sections appear only when their supporting data exists.
- **REQ-020 — Explain every ranking:** Product and customer rankings must show the facts behind
  them—value, share, orders, customers, recency, or overdue age—as applicable. An opaque score
  must never be the only reason.
- **REQ-021 — Replace misleading readiness:** Data readiness must be a clear connected/missing
  checklist that explains what each missing item prevents. A percentage must not imply poor
  business health or include data the current product cannot normally collect.
- **REQ-022 — Separate evidence types:** Sales customers, receivable debtors, researched leads,
  suppliers, and collection priorities remain visibly distinct and are never blended into one
  customer category.
- **REQ-023 — Safe next steps:** Suggested next checks must be deterministic, explain their
  evidence, and respect freshness and trust boundaries. Until change 001 is released, this
  screen must not claim that quarantined-sync protection already exists.

### Customer and supplier research

- **REQ-024 — Preserve the safe workflow:** Keep source-backed results, explicit evidence,
  approve/reject review, and the clear statement that ARQ does not contact anyone automatically.
- **REQ-025 — Simpler brief:** Each input must explain what to enter, show a familiar example,
  distinguish required from optional, and explain why a disabled search cannot start.
- **REQ-026 — Scannable result:** A candidate's name, location status, why it matches, source
  strength, and review action must be understandable before advanced scoring details are opened.
- **REQ-027 — Honest final action:** `Create top-5 brief` and copy/share states must never imply
  that ARQ sent a message or contacted the candidate.

### Languages, readability, and accessibility

- **REQ-028 — Four-language completeness:** Every changed string, tooltip, axis label, error,
  empty state, data-table heading, and accessibility label must exist in English, Hinglish,
  Gujarati-Roman, and Marathi-Roman. Untranslated raw warning strings may not leak into a
  translated screen.
- **REQ-029 — Readable typography:** Essential labels and supporting facts must remain readable
  for older users, at 200% browser zoom, and on common phones. Critical information must not
  depend on 8–10 px text, truncation, or hover-only title attributes.
- **REQ-030 — Keyboard and screen-reader use:** Interactive controls need visible focus,
  meaningful accessible names, logical heading order, and predictable tab order. Charts need
  summaries and exact-value alternatives.
- **REQ-031 — Theme parity:** Light and dark themes must retain readable contrast, chart-series
  distinction, warning severity, focus indication, and print/report legibility.
- **REQ-032 — Calm states:** Loading, empty, partial, stale, error, and no-access states must say
  what happened and the next safe action without animation or decorative UI competing with the
  message.

### Quality protection

- **REQ-033 — Preserve correct behavior:** Receivables calculations, filter behavior, financial
  formulas, research scoring, evidence, tenant isolation, data cleanup, and AI authority must
  not change merely for visual polish.
- **REQ-034 — UX regression checks:** Verification must cover logo-home behavior, login modes,
  header navigation, all chart interactions, data-table alternatives, research review, language
  completeness, themes, responsive sizes, zoom, keyboard flow, and reduced motion.
- **REQ-035 — Representative usability test:** Before release, test the core scenarios with at
  least three representative users, including one Gujarati-first and one Marathi-first business
  user. Record task success, confusion, terminology problems, and changes made from evidence.

## Acceptance scenarios

- **AC-001 / REQ-001–004:** Given a signed-in user inside Astra Agents with a panel open, when
  the logo is activated by mouse or keyboard, then the temporary panel closes and the selected
  company's correct home view appears without changing language, theme, or company.
- **AC-002 / REQ-005–007:** Given a 1366×768 laptop or 390×844 phone, when the login page opens,
  then the correct form and main action are reachable without internal scrolling and errors
  provide a plain recovery step.
- **AC-003 / REQ-008–011:** Given a company with both receivables and finance data, when its home
  view opens, then the user can identify the important position, period, last update, and next
  place to look before encountering detailed tables or import history.
- **AC-004 / REQ-012–016:** Given a multi-series monthly chart, when a user reads it without
  hover, then title, units, axes, legend, and important values are understandable; when a point
  receives hover, focus, or tap, the same exact facts appear in a designed tooltip.
- **AC-005 / REQ-016, REQ-030:** Given a screen-reader or keyboard user, when a graph is reached,
  then a short chart summary and exact-value table are available without interpreting SVG shape.
- **AC-006 / REQ-017:** Given zero, negative, missing, one-month, and 36-month datasets, when
  graphs render, then the scale, labels, missing-data treatment, scrolling, and tooltip remain
  truthful and usable.
- **AC-007 / REQ-018–023:** Given sales, receivables, or both, when `Understand my business`
  opens, then each visible conclusion states its evidence and unavailable sections explain the
  missing input without a misleading overall readiness score.
- **AC-008 / REQ-020:** Given a customer ranking, when the user asks why customer 1 is first,
  then the screen shows the relevant value, orders, recency, or overdue facts rather than only
  an unexplained score.
- **AC-009 / REQ-024–027:** Given customer or supplier research results, when the user reviews a
  candidate, then the match reason and source status are clear before advanced details, and the
  final action clearly creates/copies a brief without claiming contact.
- **AC-010 / REQ-028:** Given any supported language, when every changed journey is exercised,
  then no changed label, tooltip, warning, empty state, or accessible name falls back to English
  unless the underlying customer data itself is English.
- **AC-011 / REQ-029–031:** Given 200% zoom, keyboard-only use, or dark theme, when the user
  completes the core journeys, then no essential fact or control becomes hidden, clipped,
  unreadable, or color-only.
- **AC-012 / REQ-032:** Given backend failure, no data, partial P&L, or a long-running research
  request, when the state appears, then the user sees what happened and the next safe step.
- **AC-013 / REQ-033–035:** Given the finished UX change, when regression and usability checks
  run, then existing deterministic numbers and safety boundaries remain unchanged and the
  documented task-success target is met.

## Non-goals

- Changing financial formulas, Tally signs, receivables semantics, research scoring, or source
  verification merely to improve appearance.
- Adding more top-level work areas, dashboards, agents, or decorative charts.
- Implementing collections messaging, payment attribution, or autonomous actions.
- Adding Gujarati or Marathi native script in this change; the existing Roman-script modes
  remain the supported contract unless the owner chooses otherwise.
- Building automated password recovery; a clear support/recovery path may be included while
  password recovery is specified separately.
- Rebranding ARQ Astra or replacing the current plain React/CSS approach.

## Constitution impact

Rules 2–7 and 9–14 apply. No product-rule amendment is required. This specification was
revalidated after the review-slice rule was ratified in constitution v1.2.0.

## Delivery boundary

The approved requirements and product decisions remain unchanged. Implementation is divided in
`TASKS.md` into owner-authorized review slices, normally sized for one focused 45-60 minute
session. Every UI slice includes supporting checks and ends with a live UI review. If a slice is
too large, it stops at a passing checkpoint and is split for owner approval; elapsed time never
creates a false pass.

## Contract and data impact

- Frontend: navigation, information hierarchy, chart interaction, labels, responsive behavior,
  accessibility, all four translations, and tests will change after approval.
- Backend/API: no formula or response change is planned. If live evidence proves an API fact is
  missing, stop and amend the specification and plan before crossing that boundary.
- Database/migration: none expected. Any proposed migration requires separate owner approval.
- Connector: no behavior change expected.
- Security/privacy: no weakening of login, tenant checks, evidence boundaries, or cleanup.
- Reports/printing: chart labels and data alternatives must remain legible in the one-page report
  where the same components or facts are reused.

## Resolved decisions

- **DEC-001 — Home definition:** Use `Receivables` when trusted receivables exist; otherwise
  use `Business performance` when financial data exists; otherwise show the guided empty state.
- **DEC-002 — Understand label:** Rename the area to `My business snapshot`, with localized
  plain-language wording in every supported language.
- **DEC-003 — Summary depth:** Show up to five important facts, one primary graph, and the next
  checks first. Keep detailed tables and diagnostics in expandable sections.
- **DEC-004 — Roman-language contract:** English, Hinglish, Gujarati-Roman, and Marathi-Roman
  remain the supported language modes for this release.
- **DEC-005 — Usability gate:** Require three representative moderated users before release,
  including one Gujarati-first and one Marathi-first business user.
- **DEC-006 — Password recovery:** Add visible human support in this change. Specify automated
  password reset and verified email separately.
- **DEC-007 — Live review:** Complete a current-build in-app-browser or owner-observed session
  as Plan Stage 0 before product code starts. If the browser is unavailable after one connection
  attempt in a work session, stop and record the blocker instead of retrying indefinitely.
- **DEC-008 — Current home signal:** For this frontend change, trusted receivables means the
  authorized metrics response reports `has_receivables_data`. This does not claim that Change
  001 empty-sync quarantine is released.
- **DEC-009 — Freshness wording:** Always show the relevant exact last-update time. Use `stale`
  only when a source supplies an explicit stale state; do not invent an age threshold here.
- **DEC-010 — Attention fact:** Prefer one existing deterministic urgent alert, then a watch
  alert, then the latest valid period change. Stable source order breaks ties; do not create an
  AI or opaque composite score.
- **DEC-011 — Direct chart labels:** Label the latest and distinct high/low values when readable,
  label a shared point once, and reduce to the latest value on dense or small layouts. The exact
  tooltip and data alternative still expose every value.
- **DEC-012 — Usability calculation:** Ordinary-task success is unprompted completed tasks divided
  by attempted ordinary tasks, reported per participant and combined. Source/period and
  no-contact understanding are reported separately and both require 100% correctness.

## Approval and implementation gates

- [x] Owner reviewed and accepted the UX audit/specification direction on 2026-08-22
- [x] Requirements and acceptance scenarios reviewed
- [x] Non-goals accepted
- [x] DEC-001 through DEC-012 resolved using the specification recommendations
- [x] Owner approved the specification for planning on 2026-08-22
- [x] Revalidated under constitution v1.2.0 on 2026-08-23; requirements did not change
- [ ] Live current-build review completed before product implementation

Product code remains blocked until the live-review gate is completed (or explicitly waived with
the risk recorded), `TASKS.md` is approved, and the owner authorizes named slices.
