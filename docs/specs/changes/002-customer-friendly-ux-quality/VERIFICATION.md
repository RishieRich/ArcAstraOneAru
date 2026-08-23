# Verification: customer-friendly UX quality

| Field | Value |
|---|---|
| Status | SLICE-01 through SLICE-06 ready for owner review; not deployed |
| Authorized batch | SLICE-01 through SLICE-06, owner authorized 2026-08-23 |
| Owner override | Missing in-app browser may not block this batch; use safe local alternatives and record gaps |
| Current gate | Owner reviews SLICE-04 through SLICE-06 in the UI and accepts or requests a bounded correction |

## Slice evidence

| Slice | Result | Evidence |
|---|---|---|
| SLICE-01 | Ready for review with waived gaps | Pre-change login/navigation source baseline is in `UX_AUDIT.md`. The unavailable in-app live matrix is explicitly owner-waived, not counted as a pass. |
| SLICE-02 | Ready for review with waived gaps | Business-chart inventory is reconciled in `UX_AUDIT.md`. Real workbook, touch and chart-value interactions remain `Not verified` for later chart slices. |
| SLICE-03 | Ready for review with waived gaps | Snapshot/research findings are classified in `UX_AUDIT.md`; no financial, security, tenant or external-action boundary was contradicted. Current real research results remain `Not verified`. |
| SLICE-04 | Ready for owner review | Pure tests cover receivables-first, finance fallback and guided empty home. Rendered tests verify DOM click and keyboard Space, all transient panels closing, and company/language/theme preservation. |
| SLICE-05 | Ready for owner review | Rendered tests verify explicit company/work-area/subsection text and `aria-current` for all three areas, visible current markers, the grouped tools menu, responsive layout and no document-width overflow. |
| SLICE-06 | Ready for owner review | Pure tests cover error classification and secret clearing. Rendered tests verify mode reset, friendly mock-401 recovery, email/phone support, no internal form scrolling and keyboard completion. |

## Automated checks

| Check | Result | Notes |
|---|---|---|
| `cd frontend; npm test` | Pass — 13/13 | Existing receivables tests plus navigation, home-state, auth-error, secret-reset and four-language key tests. |
| `cd frontend; npm run build` | Pass | Vite production build; 58 modules transformed. |
| `git diff --check` | Pass | No whitespace errors; Git reports only existing Windows line-ending notices. |
| Local Chrome rendered smoke | Pass — 66/66 | Installed Chrome, package-free CDP, reduced motion, mock API and local Vite; no production data or mutation. |
| Runtime exception capture | Pass | No uncaught page exception in signed-out or signed-in runs at any tested viewport. |

## Rendered UI matrix

The owner authorized local Chrome automation after the in-app browser was unavailable. The
repeatable local-only harness is `magic_mds/ux_002_smoke.mjs`; exact results and 21 screenshots
are in `magic_mds/ux-002-evidence/`. Both paths are gitignored.

| Viewport | Result | Covered behavior |
|---|---|---|
| 1366×768 | 22/22 pass | Login/recovery, all homes and locations, tools grouping, open panels, logo reset, preserved state. |
| 390×844 | 22/22 pass | Same behavior at phone width; document has no horizontal overflow. Workspace cards intentionally scroll inside their own labelled strip. |
| 683×384 CSS at 2× | 22/22 pass | 1366×768 200%-zoom equivalent; main action and recovery remain reachable without an internal form scrollbar. |

The harness separately verifies an ordinary DOM click and focused keyboard Space activation for
the logo. It also uses focused keyboard Space for tabs, submit and the tools summary. Mock API
fixtures cover receivables-first, finance-only and empty-data home selection without touching a
real tenant.

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

Review at normal laptop width and once at phone width or 200% zoom. Acceptance may be recorded
for SLICE-01 through SLICE-06 together, or the owner may request one bounded correction.

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
- No backend, connector, database migration, formula, research scoring, deployment, commit or
  push action occurred. SLICE-07 and later remain unauthorized and untouched.
