# ARQ Astra Research Agent

The Research Agent is an optional, tenant-scoped surface for deterministic ICP analysis,
cited customer discovery and triggered supplier research. It never sends outreach and never
delivers an unapproved candidate.

## Research pipeline

1. ICP generation reads only normalized `financial_transactions` and item-level
   `financial_transaction_lines` for the authorized tenant.
2. Customer ranking is deterministic: 45% recorded revenue, 30% repeat orders and 25%
   recency. Margin remains explicitly unknown until reliable product-level cost attribution
   exists.
3. A run turns the top recorded products plus optional operator geography/industry into
   several distinct queries. Supplier runs use the requested product, specification and cost
   baseline.
   A per-tenant advisory lock and 45-second cooldown prevent concurrent or rapid repeat runs.
4. Tavily searches those angles concurrently. Default bounds are four advanced queries with
   six results each; hard caps prevent accidental cost fan-out.
5. Results must have an HTTP(S) citation, useful source text, a product match and a business
   signal. Generic listicles and reports are discarded.
6. Company-like results are deduplicated. Evidence from additional domains becomes
   corroboration rather than another lead.
7. Fit scoring exposes its components: product match, geography, contact verification,
   source quality, corroboration and provider relevance. No LLM invents missing facts.
8. Every accepted result is persisted as `draft`. Only explicit approval makes it eligible
   for the top-five delivery brief.

The candidate `enrichment_json` retains source excerpts, domains, query provenance,
verification level and score components. `source_url` and `retrieved_at` remain first-class
audit fields.

## Configuration

- `ARQ_RESEARCH_ENABLED` / `VITE_RESEARCH_ENABLED`: backend and build-time frontend flags.
- `TAVILY_API_KEY`: the only web provider credential.
- `RESEARCH_SEARCH_DEPTH`: `advanced` by default; `basic` or `fast` are supported.
- `RESEARCH_MAX_QUERIES`: default 4, range 2–6.
- `RESEARCH_RESULTS_PER_QUERY`: default 6, range 3–8.
- `RESEARCH_MAX_CANDIDATES`: default 20, range 5–30.

Tavily failures are isolated per query. A run may return useful partial results, but if every
query fails it is marked failed and no candidates are invented.

## UI

The dedicated surface has overview, ICP, customer and supplier views. It includes ICP
readiness, research progress, deterministic run insights, filterable candidate cards,
expandable evidence, visible score breakdowns and a sticky approval/delivery action. Motion
respects the app-wide `prefers-reduced-motion` rule, and mobile layouts collapse to one column.
