# Verification: customer-friendly UX quality

| Field | Value |
|---|---|
| Status | SLICE-01 through SLICE-06 deployed to production, owner review pending. SLICE-07 through SLICE-15 implemented, tested, built and pushed to `main`; this file's live-evidence gap for them is now closed below. SLICE-16 is committed in `3c94663`, code-only and not deployed. SLICE-17 through SLICE-19 are implemented, tested and built locally, awaiting owner review; their rendered live review is not verified because this session has no in-app browser. SLICE-20 through SLICE-23 are owner-authorized code work not yet started. SLICE-24 through SLICE-27 require owner-provided human usability participants that no agent can supply. |
| Authorized batch | SLICE-01 through SLICE-23; owner extended authorization to the remaining code slices on 2026-08-31 (see `TASKS.md`) |
| Owner override | Missing in-app browser may not block this batch; use safe local alternatives and record gaps |
| Current gate | Owner reviews SLICE-04 through SLICE-19 in the UI and accepts or requests a bounded correction; SLICE-20 through SLICE-23 remain authorized code work. |
| Correction (this session) | SLICE-07 through SLICE-15 were coded and pushed to `main` (commit `6294d74`) in an earlier session but this file and `TASKS.md`'s per-slice rows were never updated to match — they still read "Proposed; not authorized" / "untouched". That was a documentation gap, not a scope violation: no additional product code was written this session beyond the local test-harness fixtures below. |

## Slice evidence

| Slice | Result | Evidence |
|---|---|---|
| SLICE-01 | Ready for review with waived gaps | Pre-change login/navigation source baseline is in `UX_AUDIT.md`. The unavailable in-app live matrix is explicitly owner-waived, not counted as a pass. |
| SLICE-02 | Ready for review with waived gaps | Business-chart inventory is reconciled in `UX_AUDIT.md`. Real workbook, touch and chart-value interactions remain `Not verified` for later chart slices. |
| SLICE-03 | Ready for review with waived gaps | Snapshot/research findings are classified in `UX_AUDIT.md`; no financial, security, tenant or external-action boundary was contradicted. Current real research results remain `Not verified`. |
| SLICE-04 | Ready for owner review | Pure tests cover receivables-first, finance fallback and guided empty home. Rendered tests verify DOM click and keyboard Space, all transient panels closing, and company/language/theme preservation. |
| SLICE-05 | Ready for owner review | Rendered tests verify explicit company/work-area/subsection text and `aria-current` for all three areas, visible current markers, the grouped tools menu, responsive layout and no document-width overflow. |
| SLICE-06 | Ready for owner review | Pure tests cover error classification and secret clearing. Rendered tests verify mode reset, friendly mock-401 recovery, email/phone support, no internal form scrolling and keyboard completion. |
| SLICE-07 | Ready for owner review | `businessSummary.js`/test cover the receivables-answer model (unchanged totals, filtered scope, empty-filter guidance). Live: answer summary renders before the first chart, and source/period/freshness are all stated (`desktop-receivables-answer.png`). |
| SLICE-08 | Ready for owner review | `financePresentation.js`/test cover the finance trend/book/mix models. Live: finance answer states 1-5 supported facts plus full source/period/freshness context (`desktop-finance-answer.png`). Building this fixture surfaced that the mock API's `totals` object needs every field the real backend always sends (`margin_pct`, `cost_ratio_pct`, `profit`, `loss`, `tax`, `transactions`, per-kind averages) — confirmed against `backend/app/routers/dashboard.py:494-505`, which always populates them (default `0.0`), so this was a test-fixture gap, not a product defect. |
| SLICE-09 | Ready for owner review | `smartPresentation.js`/test cover meaning-building and warning classification. Live: Smart Excel states source sheet, metric, grouping, aggregation and unit before its charts, and shows the non-statutory notice (`desktop-finance-smart-charts.png`). |
| SLICE-10 | Ready for owner review | `chartModel.js`/test cover formatting, extent and direct-label rules. Live: all 7 dev-only fixture-gallery cases (zero, negative, missing, null, one-point, 36-periods, large) render with full title/metric/unit/period/axes/legend, an exact-value table matching the point count, the 36-period case reduced to a single direct label, the missing case marked (not fabricated), and both mouse-click and keyboard-Space open the same tooltip (`desktop-chart-fixture-gallery.png`). |
| SLICE-11 through SLICE-15 | Ready for owner review, with a scope caveat | The shared chart contract (`BusinessChart`) is applied consistently: live inspection of the signed-in Finance/Smart Excel view found 9 rendered business charts (finance trend, book explorer, product ranking, Smart line/bar/donut, plus receivables' Aging/DueTimeline), and every one exposes a filled metric/unit/period/source context and a non-empty exact-value table. **Not verified**: per-chart-family interaction detail beyond this generic contract check — e.g. Book Explorer's kind-switch tabs, Aging's bucket boundaries, and ProductAnalytics' missing-unit case were not individually exercised live this session. |
| SLICE-16 | Code-only, ready for owner review | `OnePageReport.jsx` monthly-trend bars and ranking rows now get direct exact-value labels, keyboard/tap focus (`useChartSelection`/`ChartTooltip` reused from `BusinessChart.jsx`), a metric/unit/period/source context line, and an on-screen "Show exact values" table, reusing existing `t.ux`/`t.value`/`t.month` copy — zero new i18n strings. The print path is deliberately unchanged: the new context line, tooltip and exact-value table are scoped under a new `.no-print` utility (hidden via `@media print`) so the already-accepted one-page A4-landscape layout does not risk overflow inside `.report-sheet`'s fixed `overflow:hidden` box; ranking rows already showed exact values visibly pre-slice, so print output is effectively unchanged there too. `npm test` (39/39) and `npm run build` pass. **Not verified this session:** live print-preview screenshot, screen-reader pass, and on-screen exact-value table appearance in dark theme (it reuses shared `chart-data-details` styling driven by CSS variables against the report's fixed light palette — cosmetic risk only, does not affect the printed page). |
| SLICE-17 | Ready for owner review, local code evidence | Renamed the user-facing `Business pattern`/`Understand my business` route to **My business snapshot** in all four supported languages. `snapshotPresentation.js` supplies only existing sales products, sales customers, and current receivables as separate evidence types, keeps the API's ordering/scoring untouched, chooses a deterministic urgent collection before a product/customer watch, and keeps the profile's generated timestamp and a constrained sales-date range explicit. Fixtures cover sales-only, receivables-only, both, and empty data. **Not verified:** rendered desktop/phone review and a human plain-language explanation, because the in-app browser listed no session. |
| SLICE-18 | Ready for owner review, local code evidence | Replaced the percentage readiness ring and visible ICP score with a connected/missing evidence checklist that states what each missing input prevents. Product/customer/collection ranking rows now show value, share, orders, customers, last sale, overdue age, bill count, or current open value as applicable; sales customers, debtors, researched leads, and suppliers remain visibly distinct. Four-language snapshot-copy coverage is tested. **Not verified:** rendered keyboard/phone review and live ranking explanation, because the in-app browser listed no session. No Change-001 quarantine claim was added. |
| SLICE-19 | Ready for owner review, local code evidence | Customer and supplier briefs now state the purpose of every field, mark required vs optional inputs, retain familiar examples, and explain the precise existing prerequisite when a search button is disabled. `researchPresentation.js` mirrors only the existing API conditions: a recorded product or entered industry for customer research; material plus current price for supplier research. No request payload, Tavily capability, scoring, or evidence behavior changed. **Not verified:** rendered desktop/phone keyboard completion and a plain failure/recovery state, because the in-app browser listed no session. |

## Automated checks

| Check | Result | Notes |
|---|---|---|
| `cd frontend; npm test` | Pass — 46/46 (2026-08-31, this session) | Includes Slice 17/18 snapshot tests and Slice 19 valid/invalid brief-state plus four-language guidance tests. |
| `cd frontend; npm run build` | Pass (2026-08-31, this session) | Vite production build; 67 modules transformed. |
| `git diff --check` | Pass | No whitespace errors; Git reports only existing Windows line-ending notices. |
| Local Chrome rendered smoke (Slice 1-6) | Pass — 66/66 | Installed Chrome, package-free CDP, reduced motion, mock API and local Vite; no production data or mutation. |
| Local Chrome rendered smoke (Slice 7-15, this session) | Pass — 104/104 (78 original + 26 new checks × desktop/mobile, extended gallery pass) | Same harness, extended with realistic financials/Smart Excel fixtures and a pass over the dev-only chart fixture gallery. See the Slice evidence table above. |
| Runtime exception capture | Pass | No uncaught page exception in signed-out or signed-in runs at any tested viewport, including Finance/Smart Excel with populated data. |
| Production frontend response | Pass (as of 2026-08-23 deploy) | `https://arq-receivables.vercel.app/` returned HTTP 200 after the Slice 1-6 deployment. Not re-checked this session — SLICE-07 through SLICE-15 have not been deployed. |
| Production asset identity | Pass (as of 2026-08-23 deploy) | Live bundle `assets/index-Bj4wlVUz.js` contains the Slice 1-6 markers `Tools & settings`, `Need help getting in?`, and `Go to dashboard home`. |
| Production backend health | Pass (as of 2026-08-23 deploy) | Existing backend `/health` returned `status: ok`; `/health/db` returned `status: ok` and `db: reachable`. |

## Production deployment

| Field | Evidence |
|---|---|
| Owner authorization | Commit, push, and live deployment requested on 2026-08-23 |
| Git branch and source commit | `main` at `a84c1fb` (`feat(frontend): deliver UX quality slices 1-6`) |
| Frontend target | Existing Vercel project `arq-receivables` |
| Deployment | `dpl_9FrVjmcLiQnte5JykVhXYmnGKHBV`, state `READY` |
| Production alias | `https://arq-receivables.vercel.app` |
| Backend | Not redeployed; no backend code changed |
| Release state | Live for owner acceptance; SLICE-01 through SLICE-06 are not marked accepted until the owner completes the UI review |

The in-app browser listed no available session during the post-deploy check. The public page,
deployed bundle, and backend health were verified directly. A real signed-in production journey
was not attempted because no production credentials were supplied; the owner review below is
the remaining release-acceptance evidence.

## Rendered UI matrix

The owner authorized local Chrome automation after the in-app browser was unavailable, and this
session re-confirmed the in-app browser still lists no session before reusing that same
alternative. The repeatable local-only harness is `magic_mds/ux_002_smoke.mjs`; exact results and
screenshots are in `magic_mds/ux-002-evidence/`. Both paths are gitignored.

| Viewport | Result | Covered behavior |
|---|---|---|
| 1366×768 (desktop) | 22/22 + 26/26 pass | Slice 1-6 login/nav/home coverage, plus (this session) receivables/finance/Smart Excel answer-first ordering and context, the chart contract across 9 live business charts, mark tooltip via mouse and keyboard, and all 7 chart-fixture-gallery edge cases. |
| 390×844 (mobile) | 22/22 + 26/26 pass | Same new Slice 7-15 coverage repeated at phone width; document has no horizontal overflow. Workspace cards intentionally scroll inside their own labelled strip. |
| 683×384 CSS at 2× (200% zoom) | 22/22 pass | Slice 1-6 coverage only. Slice 7-15 answer-first/chart-contract checks were not run at 200% zoom this session — recorded as `Not verified` below. |

The harness separately verifies an ordinary DOM click and focused keyboard Space/Enter activation
for the logo and for chart marks. Mock API fixtures cover receivables-first, finance-only and
empty-data home selection, plus (this session) a populated Finance/Smart Excel fixture built to
match the real backend's `totals` and dataset shape, without touching a real tenant.

## Owner UI review — next step

1. Signed out: switch between **Log in** and **Start free**. Enter sample text, reveal the
   password, then click the logo. Confirm it returns to clean Log in, clears the password and
   leaves the selected language/theme unchanged.
2. Trigger one wrong-login or offline state. Confirm the message explains the next step and the
   email/call support links are visible.
3. Signed in: open **Tools & settings**, then inspect Upload, language, theme, cleanup and logout.
   Confirm the main three work areas remain visually stronger.
4. Visit **Money to collect**, **Sales and costs**, and **Astra Agents**, including an Agent
   subsection. Confirm company, work area, subsection and the visible **Current** marker agree.
5. Open Upload, Ask ARQ and Clear company data, then activate the logo. Confirm the panels close,
   the predictable home opens, and company/language/theme remain unchanged.
6. Open **Money to collect** with real receivables data. Confirm the answer card (collection
   position, source, covered period, last updated, "Look here next") appears before the filters
   and charts, then open a chart's **Show exact values** table and confirm it matches the chart.
7. Open **Sales and costs** with real finance data. Confirm up to five headline facts plus source/
   period/freshness appear before the detailed tiles, trend, Book Explorer and product rankings.
8. If Smart Excel data exists, confirm it states source sheet, what is measured, grouping,
   calculation and unit before its charts, and visibly says it is a generic, non-statutory view.

Review at normal laptop width and once at phone width or 200% zoom. Acceptance may be recorded
for SLICE-01 through SLICE-15 together, or the owner may request one bounded correction.

## Deliberately not verified or changed

- No production account, real tenant, real workbook or live research result was used. Those
  Stage-0 gaps remain visible rather than being converted into passes.
- Chrome emulation does not prove a physical touch device or a real screen reader. Keyboard and
  DOM semantics passed; assistive-technology confirmation remains an owner/release check.
- English rendered screenshots and Gujarati/dark state preservation were exercised. All four
  languages have explicit automated key coverage; manual long-copy review in Hinglish,
  Gujarati-Roman and Marathi-Roman remains useful before release.
- Automated password reset was not added. Recovery intentionally routes to the existing human
  support email and phone.
- No backend, connector, database migration, formula, or research-scoring change occurred this
  session. The frontend-only commit, push, and production deployment for SLICE-01 through
  SLICE-06 were separately authorized by the owner on 2026-08-23.
- SLICE-07 through SLICE-15's code was already committed and pushed to `main` (`6294d74`) before
  this session; this session added and ran the missing live-evidence pass and corrected this file
  and `TASKS.md` to match, but did not deploy it — the production frontend still serves only
  Slice 1-6.
- Slice 7-15 live coverage this session is desktop/mobile only; 200% zoom, dark theme, and the
  three non-English languages were not exercised for the new answer-first/chart-contract screens
  and remain `Not verified`. Per-chart-family interaction (Book Explorer kind switching, Aging
  bucket boundaries, ProductAnalytics missing-unit case, donut-eligibility edge cases inside the
  live app rather than the fixture gallery) also remains `Not verified`.
- Assistive-technology (screen reader) confirmation for the new chart marks and tooltips remains
  an owner/release check, as it did for Slice 1-6.
- SLICE-17 through SLICE-19 rendered local review is **Not verified**: the required browser-control surface found no in-app browser session (`[]`). This is not counted as a pass. No production data, deployment, commit, or push was performed in this session.
