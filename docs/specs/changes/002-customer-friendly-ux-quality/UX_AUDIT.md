# UX quality audit

| Field | Value |
|---|---|
| Change | 002 — Customer-friendly UX quality |
| Audit status | Source and saved-screenshot review complete; live browser review pending |
| Reviewer role | Staff-level product quality and usability reviewer |
| Reviewed | 2026-08-22 |

## Review boundary

This audit used the current frontend source, translations, frontend tests, backend metrics used
by the UI, and saved product screenshots. The in-app browser was unavailable, so live clicking,
current-production screenshots, keyboard behavior, touch behavior, and screen-reader output are
not yet verified. Those checks are required before this specification can be approved.

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

## Live-review attempt log

- **2026-08-22:** One bounded attempt was made to connect to the in-app browser. No browser
  session was available, so the attempt stopped without fallback automation. No live behavior
  is claimed as verified. The current-build audit remains an implementation gate in `PLAN.md`.
