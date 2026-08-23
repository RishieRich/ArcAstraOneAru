# UX quality audit

| Field | Value |
|---|---|
| Change | 002 — Customer-friendly UX quality |
| Audit status | Stage-0 source baseline complete; unavailable in-app live baseline explicitly waived by owner |
| Reviewer role | Staff-level product quality and usability reviewer |
| Reviewed | 2026-08-22 |

## Review boundary

This audit used the current frontend source, translations, frontend tests, backend metrics used
by the UI, and saved product screenshots. The in-app browser was unavailable, so live clicking,
current-production screenshots, keyboard behavior, touch behavior, and screen-reader output are
not yet verified. Those checks are required before product implementation begins unless the
owner explicitly waives the gate and records the risk.

## What already works well

- Sign-in and free-trial entry are separated, with password visibility, language selection,
  theme selection, browser autocomplete, loading state, and error state.
- The main dashboard has only three top-level work areas: receivables, business performance,
  and Astra Agents.
- Receivables provide useful totals, filters, ageing, due timing, top debtors, a chase list,
  and bill details. Filters consistently update the visible numbers and lists.
- Financial facts and report numbers come from deterministic metrics rather than AI prose.
- Data warnings and incomplete P&L coverage are shown instead of hidden.
- Customer and supplier research is evidence-backed, keeps approve/reject control with the
  user, and states that ARQ does not contact anybody automatically.
- English, Hinglish, Gujarati-Roman, and Marathi-Roman copy exists across the product.
- Responsive breakpoints, light/dark themes, keyboard labels on many controls, and reduced
  motion support already exist.

## Quality findings

| Priority | Area | Finding | Customer effect |
|---|---|---|---|
| P1 | Graphs | Important exact values depend mainly on native SVG hover titles. Smart line charts have no visible Y-axis values, and chart marks are not keyboard/touch controls. | A user sees a shape but cannot confidently read the business fact. |
| P1 | Understand my business | The screen mixes sales, collections, customer-fit scoring, data readiness, and missing research attributes. The `ICP score` and readiness percentage are not natural business language. | The user cannot tell what the score means or what business question the screen answers. |
| P1 | Data readiness | Readiness divides three currently available areas by seven areas, including margin, industry, geography, and size that the current pipeline normally cannot establish. A healthy account can therefore appear only 43% ready. | A useful result looks incomplete or poor. |
| P1 | Information density | The financial view can show eight headline tiles followed by trend, book explorer, products, highlights, insights, breakdowns, counterparties, monthly table, and import history. | A non-technical owner must scan too much before finding the answer. |
| P2 | Logo/home | The brand logo is an image inside a non-interactive span. It cannot return the user to the home view. | A familiar navigation expectation fails. |
| P2 | Login | The page combines marketing story, product preview, benefits, tabs, form, four languages, and theme controls. Saved evidence shows a previous layout where the form required internal scrolling. | Sign-in can feel busy, especially on a laptop or at browser zoom. |
| P2 | Typography | Several chart labels, supporting facts, legends, and warnings use 8–10 px text. | Gujarati-Roman and Marathi-Roman copy is difficult to scan, especially for older users. |
| P2 | Header/navigation | Company, four language buttons, theme, Ask ARQ, upload, logout, logo, and trial status compete in one header. Nested Astra Agent tabs add another navigation layer. | Users need more effort to understand where they are and what to do next. |
| P2 | Smart Excel labels | Generic column names can become chart titles and KPIs without a plain explanation of unit, aggregation, source sheet, or period. Unknown warning text can fall back to raw English. | A technically correct chart can still be meaningless to the owner. |
| P2 | Accessibility | SVG charts have an image label but no keyboard-readable points or data-table alternative. Color and small legends carry substantial meaning. | Keyboard, touch, low-vision, and screen-reader users lose information. |
| P2 | Errors | Login and research surfaces may display raw request error messages. | A non-technical user may see backend wording without a recovery action. |
| P3 | Research results | Candidate cards show score rings, confidence, fit reason, tags, status, sources, approve/reject, and evidence controls at once. | The safe workflow is good, but the result card is visually demanding. |
| P3 | Frontend quality gates | Current automated frontend coverage is five receivables logic tests. Navigation, login, charts, research, language-key parity, responsiveness, and accessibility are not automated. | Visual and interaction regressions can ship unnoticed. |

## Product-quality interpretation

The product does not need more features on these screens. It needs clearer hierarchy:

1. What is happening?
2. Why does it matter?
3. Which numbers support it?
4. What should I check next?
5. Where did the data come from, and how recent is it?

Details, formulas, source evidence, import history, and technical warnings should remain
available through progressive disclosure rather than competing with the first answer.

## Required live validation before approval

- Current login and dashboard at 1366×768, 1440×900, and 390×844.
- Browser zoom at 100%, 125%, and 200%.
- Light and dark themes.
- All four supported languages, including long translated labels.
- Mouse, keyboard-only, and touch-size interaction.
- Empty, loading, error, partial-data, one-month, long-period, and large-number states.
- At least one real financial workbook and one Smart Excel workbook.
- Current customer and supplier research results with evidence expanded.

## Stage-0 baseline record

The owner explicitly instructed the agent on 2026-08-23 to continue through SLICE-06 and not
treat the unavailable in-app browser as a blocker. This waives the exclusive-tool gate for the
authorized batch; it does not turn unchecked behavior into a pass. The pre-change baseline below
therefore combines source inspection and existing saved evidence. Real-account, real-workbook,
assistive-technology, and current research-result cases remain `Not verified`.

### SLICE-01 — login and navigation

| Check | Pre-change observation | Result |
|---|---|---|
| Signed-out home | The logo was a non-interactive `span`; it could not restore normal sign-in state. | Fail, REQ-001 |
| Login/signup separation | Tabs, headings, fields and submit copy differed, but mode switching left password visibility stale. | Partial, REQ-006 |
| Login recovery | Raw `requestError.message` was the only error explanation and no human-support route appeared beside the form. | Fail, REQ-007 |
| Form scrolling | A historical internal-scroll rule was overridden later by `overflow: visible`; final source avoided a card scrollbar, but live zoom/layout remained unchecked. | Source pass; live Not verified, REQ-005 |
| Signed-in home | The dashboard logo was non-interactive and tenant metric refresh could retain a stale work area. | Fail, REQ-001/004 |
| Location | Company and selected top-level tab existed, but there was no explicit company → work-area → subsection trail. | Fail, REQ-002 |
| Header hierarchy | Company, four languages, theme, Ask ARQ, upload and logout competed in one row; cleanup appeared separately below. | Fail, REQ-003 |
| Keyboard/mobile/200%/themes/languages | Semantics and responsive CSS were inspected; the complete pre-change live matrix could not be run. | Owner-waived; Not verified |

### SLICE-02 — dashboard and business-chart inventory

| Chart family | Source observation | Baseline result |
|---|---|---|
| Receivables Aging and Due Timeline | Business values are drawn, but exact point access relies on visual labels/native SVG behavior rather than a shared keyboard/touch/table contract. | In scope, REQ-012–017 |
| Finance monthly trend and Book Explorer | Multiple series and book views exist; exact values, axes, dense periods and edge states need the shared graph contract. | In scope, REQ-012–017 |
| Product/ranking value visuals | Rankings encode business value and need visible evidence plus exact-value alternatives. | In scope, REQ-010/016 |
| Smart Excel line, bar and donut | Generic metric/category choices can lack a plain unit, aggregation, source sheet and period explanation. | In scope, REQ-010–017 |
| One-page report charts | Printed monthly and ranking visuals need the same exact-value and provenance checks. | In scope, REQ-012–017 |
| Waitlist sample visuals | Sample sales, cost and product graphics encode amounts and must be labelled consistently as sample business charts. | In scope, REQ-012–017 |
| Real workbook and edge fixtures | No representative live account/workbook was available in this session. | Owner-waived; Not verified |

The inventory matches the bounded chart families in `TASKS.md`; no additional architecture,
formula, API, tenant, security, or external-action work was discovered.

### SLICE-03 — business snapshot, research and boundary gate

| Area | Baseline observation | Classification |
|---|---|---|
| Understand my business | Sales products/customers, collection priority and research readiness are mixed around an `ICP` concept instead of one plain business question. | In scope, REQ-018/019/022 |
| Rankings | Product/customer rows expose some facts, but an opaque customer score remains prominent. | In scope, REQ-020 |
| Readiness | A percentage includes evidence the current product cannot normally collect and can look like poor business health. | In scope, REQ-021 |
| Next checks | Existing deterministic action-plan logic is useful but needs explicit evidence/freshness language. | In scope, REQ-023 |
| Customer/supplier research | Source-backed evidence, approve/reject review, and the no-automatic-contact boundary are already strong. | Preserve, REQ-024/027 |
| Brief/results density | Inputs and candidate cards require simpler explanations and first-layer hierarchy. | In scope, REQ-025/026 |
| Current real results | No authenticated current customer/supplier result was available for live expansion. | Owner-waived; Not verified |

No approved financial, security, tenant-isolation, connector, or external-action boundary was
contradicted. The Stage-0 risk gate therefore allowed the owner-authorized frontend work to
continue, with the named live gaps retained for later owner acceptance rather than hidden.

## Live-review attempt log

- **2026-08-22:** One bounded attempt was made to connect to the in-app browser. No browser
  session was available, so the attempt stopped without fallback automation. No live behavior
  is claimed as verified. The current-build audit remains an implementation gate in `PLAN.md`.
- **2026-08-23 / SLICE-01:** The owner authorized SLICE-01 through SLICE-06. Browser setup
  completed, but the supported in-app browser list was empty. The bounded connection attempt
  stopped without using another browser mechanism. SLICE-01 is `Blocked`; no live behavior is
  claimed as verified and no product code was changed.
- **2026-08-23 / owner override:** The owner explicitly directed the agent not to use the
  missing in-app session as a blocker and to finish through SLICE-06 using safe alternatives.
  Stage-0 source observations were completed, unavailable real-data cases stayed `Not verified`,
  and post-change local Chrome automation was authorized as rendered interaction evidence.
