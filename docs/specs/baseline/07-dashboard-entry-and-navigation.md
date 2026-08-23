# Baseline: dashboard entry and navigation

| Field | Value |
|---|---|
| Status | Current production behavior |
| Last verified | 2026-08-23 |
| Primary code | `frontend/src/App.jsx`, `BrandLogo.jsx`, `Login.jsx`, `navigation.js`, `authPresentation.js`, and `i18n.js` |
| Production | `https://arq-receivables.vercel.app` |

## Contract

- The ARQ logo is an accessible home control when signed in or signed out.
- Signed-in home opens Money to collect when receivables data exists, otherwise Sales and costs
  when finance data exists, otherwise a guided empty state.
- Going home closes temporary upload, Ask ARQ, cleanup, and similar panels while preserving the
  selected company, language, theme, and loaded business data.
- The signed-in header identifies the current company, work area, and subsection. Current
  navigation is conveyed with text and accessibility state, not color alone.
- Secondary actions such as upload, language, theme, cleanup, and logout are grouped under
  **Tools & settings** so the three primary work areas remain dominant.
- Log in and Start free are separate modes. Switching mode or activating the logo clears stale
  errors and password text while preserving language and theme.
- Authentication failures are mapped to plain next steps. Existing human email and phone
  support remain visible; automated password reset is not implied.
- Product-owned text for these flows is supplied in English, Hinglish, Gujarati-Roman, and
  Marathi-Roman through `frontend/src/i18n.js`.

## Invariants

- These presentation behaviors do not change authentication, tenant access, business formulas,
  cleanup authority, research scoring, API contracts, or backend state.
- Logo-home behavior never clears uploaded or synced business data.
- Password text and stale authentication errors do not carry between login and signup modes.

## Verification boundary

- Change 002 SLICE-01 through SLICE-06 provide the implementation and release evidence.
- Local rendered Chrome coverage passed at laptop, phone, and 200%-zoom-equivalent sizes.
- The production page, deployed JavaScript identity, and backend health passed after deployment.
- A real signed-in production walkthrough and owner acceptance remain pending.
