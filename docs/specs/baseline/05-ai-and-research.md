# Baseline: Ask ARQ and Research Agent

| Field | Value |
|---|---|
| Status | Current intended behavior |
| Last verified | 2026-08-22 |
| Primary code | ask/research routers, `backend/app/research.py`, dashboard components |

## Contract

- Ask ARQ uses the same authorized deterministic metrics available to the dashboard.
- Gemini is attempted first and Groq is the automatic fallback. Provider-specific request
  fields remain isolated, and an empty provider response is treated as a failure.
- AI-generated narrative may explain facts but does not supply report numbers or chart values.
- The Research Agent always scopes access by tenant and builds its internal profile from
  authorized data.
- External company discovery occurs only when Tavily is configured and returns cited evidence.
  Without it, the system returns an honest search plan with zero external candidates.
- Research candidate delivery produces copyable content; it does not send outreach.
- Research can be disabled through `ARQ_RESEARCH_ENABLED`.

## Invariants

- AI never gains direct database authority or cross-tenant context.
- No uncited external company is presented as a verified lead.
- A draft or copy action is not delivery or customer contact.

## Known gaps

- External AI processor disclosure, consent, and opt-out controls are roadmap work.
- Company-data cleanup does not yet cover Research Agent rows.
