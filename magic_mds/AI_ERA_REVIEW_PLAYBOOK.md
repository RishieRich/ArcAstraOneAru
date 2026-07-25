# The Review Playbook — How to Stay in Control of a Codebase You Didn't Type

*Written for ARQ Astra, July 2026. Read time ~20 minutes. Act time ~1 weekend.*

---

## 0. The short answer

Your worry is the right worry, and it is **the** industry conversation of 2026. But before the theory, one number about your specific situation:

```
Total application code in this repo:  ~4,700 lines
  backend/app (FastAPI)                1,199
  connector/src (Tally + GUI)          ~1,400
  frontend/src (React dashboard)         900
  tests                                  ~900
```

That is a **small codebase**. A focused person reads 4,700 lines in a few sittings. You have not been buried — you've been handed something that is still entirely within one human's head. The problem is not volume. The problem is that you never built the *habits and gates* that normally come free when you type code yourself.

This document is about building those gates.

---

## 1. What actually changed

The old bottleneck was **writing** code. That cost has collapsed to near zero.

The new bottleneck is **verifying** code. That cost has not moved at all — it is still a human reading, thinking, and deciding.

> "Even if agents write code at near-zero marginal cost, reviewing all that code becomes the new bottleneck. Code generation friction dissolves; the cognitive burden of verification becomes the binding constraint."

This has a name now: **the verification bottleneck**. Every serious voice in the field converged on it independently during 2025–26.

The data backs it up. Google's **DORA 2025 report** (90% of technology professionals now use AI at work) found AI adoption improves delivery throughput by 2–18% — a reversal from 2024's negative result — *but* often alongside **declining stability and higher change-failure rates**. The report's summary of the mechanism is blunt: **time saved generating code is re-spent auditing it**, and AI acts as an *amplifier* — it magnifies the strengths of a disciplined team and magnifies the dysfunction of an undisciplined one.

Individual-level gains are dramatic and organizational-level gains are not: studies cited in the 2025/26 DORA work show ~21% more tasks completed and ~98% more PRs merged per developer, while org delivery metrics stayed roughly flat. All that extra output piled up at the review step.

**Read that as: your instinct to stop and ask "how do I review this?" is exactly the step that separates the teams AI helps from the teams AI hurts.**

---

## 2. What the pioneers are saying

### Andrej Karpathy — "agentic engineering"

Karpathy has said roughly **80% of his code is now AI-generated**, and he coined **"agentic engineering"** (Sequoia Ascent, 2026) specifically to separate serious practice from casual "vibe coding" — a term he also coined, and has since spent a lot of energy warning people not to apply to production systems.

His framing of the new job:

> The human bottleneck becomes **taste, judgment, task decomposition, instruction quality, verification, and the ability to manage many AI-driven processes at once.**

And on why some people get much more out of agents than others — he calls it a *skill issue*: the developer who can decompose tasks precisely, specify clearly, and review efficiently outperforms the one who can't, **regardless of raw coding ability.**

The named skills of agentic engineering: **spec design, diff review, eval design, security oversight, quality taste.** Note that four of five are review/verification skills. Only one is about creating.

### Simon Willison — the accountability line

Willison draws the sharpest ethical line, and it is the single rule most worth internalizing:

> **"Don't file pull requests with code you haven't reviewed yourself."**

His description of the failure mode is memorable:

> "Code reviewing coworkers are rapidly losing their minds as they come to the crushing realization that they are now the first layer of quality control instead of one of the last."

He splits the field into irresponsible vibe coding and the responsible end, where professionals accelerate with LLMs while staying **"proudly and confidently accountable for the software they produce."** His concrete patterns:

| Pattern | Why |
|---|---|
| **Red/green TDD** — write the failing test first | Agents produce far more reliable code with minimal prompting when there's a target to hit |
| **First, run the tests** | *"If the code has never been executed it's pure luck if it actually works when deployed."* |
| **Linear walkthroughs** — make the agent explain the code to you, top to bottom | This is the highest-leverage technique for understanding a codebase you didn't write. See §6. |
| **Hoard domain knowledge** | Knowing what's possible and what isn't is how you steer. Your Tally/receivables domain knowledge is the thing the model does *not* have |
| **Human-directed, not autonomous** | "hundreds of small prompts, steering the agents" — not one big unleash |

### The research consensus

An arXiv study of 3,100 practitioner opinions on code review in an AI world (2026) found the reviewer's job shifts from *finding defects* to *ensuring outputs align with architectural intent and stakeholder values.* Three things break down:

1. **Traditional gatekeeping fails** — you cannot line-by-line inspect everything at agent scale.
2. **Trust assumptions collapse** — the implicit assumption "the author understands their contribution" no longer holds.
3. **Context interpretation becomes critical** — the AI cannot infer your business constraints.

Their recommended adaptations: **risk-based review** (spend your attention where blast radius is high, skim elsewhere), **explicit acceptance criteria**, and **verification checkpoints** (tests/gates) rather than inspection alone.

### Cautionary numbers (vendor-sourced — treat as directional, not gospel)

Tooling vendors publishing in 2026 report AI-generated PRs containing ~1.7× more issues than human-only PRs, ~45% of AI-generated code containing at least one security weakness, and ~24% more incidents per PR. These come from companies selling review tools, so discount accordingly — but the *direction* matches DORA's independent finding on stability. The characteristic AI defects they name are worth memorizing:

- **Plausible-looking logic that is subtly wrong** (right shape, wrong edge case)
- **Invented/hallucinated APIs and dependencies**
- **Tests that assert the wrong thing** — the most dangerous one, because it looks like safety

---

## 3. So what is *your* job now?

Five skills, in the order they pay off for you.

### 1. Specification — say what "correct" means before code exists
The dominant methodology of 2026 is **Spec-Driven Development (SDD)**. GitHub's Spec Kit popularized it in late 2025; by mid-2026 every major coding tool ships a flavor of it (Kiro, Spec Kit, Claude Code plan mode, etc.).

The core idea: **versioned specs are the source of truth, code is the output.** The framing from the Feb 2026 arXiv paper *"From Code to Contract in the Age of AI"* is the useful one — traditional specs are read by humans; **SDD specs execute as validation gates.**

Practical version for you: before asking for a feature, write down the acceptance criteria, the edge cases, and what must *not* change. Ten minutes of that beats an hour of review afterward. **Spec quality, not prompt cleverness, determines output quality.**

### 2. Reading code — non-negotiable, and cheaper than you think
You do not need to be able to *write* FastAPI from memory. You need to be able to *read* it and say "that's wrong." Reading fluency is maybe 20% of the effort of writing fluency, and it is the entire job now.

### 3. Automated gates — make the machine check the machine
Linters, type checkers, tests, security scanners, and CI catch an estimated 70–80% of mechanical issues, including hallucinated dependencies. Every issue a gate catches is one you never have to hold in your head. **This is the highest ROI item in this document and §5 is your list.**

### 4. Risk-based attention — read the dangerous 10% properly
You will never read every line with full attention. Don't try. Sort by blast radius (§7).

### 5. Architecture & data-model literacy — the part AI is worst at
The model knows Python. It does not know that Tally sends receivables as negative amounts, or that a tenant binds permanently to the first-registered company GUID. **Your domain knowledge is the moat.** Guard it, write it down (you already do — `magic_mds/DATA_MODEL.md`), and feed it to the agent every time.

---

## 4. The defense-in-depth model

Stop thinking "I must review everything." Think in layers, each catching what the previous one missed. You only personally read what survives to layer 5.

```
Layer 1  TYPES + LINT        seconds     typos, unused vars, undefined names, bad imports
Layer 2  TESTS               seconds     "does it actually do the thing?"
Layer 3  SECURITY SCAN       seconds     injection, secrets, vulnerable deps, hallucinated packages
Layer 4  AI REVIEW           ~90 sec     second-opinion pass on the diff, catches sloppy patterns
Layer 5  YOU                 minutes     intent, architecture, business rules, blast radius
Layer 6  OBSERVABILITY       ongoing     what actually happens in production
```

Layers 1–4 are cheap, automatable, and you have **almost none of them today**. Layer 5 is the only one you can't delegate — and it's the only one you're currently doing, unassisted. That's why it feels overwhelming.

---

## 5. Where ARQ Astra stands today

Honest audit of this repo as of today:

| Gate | Status | Fix |
|---|---|---|
| Tests exist | 🟡 8 test files (5 connector, 2 backend, 1 conftest) — **zero** for `dashboard.py`, `ask.py`, `auth_dashboard.py`, `dashauth.py` | Add tests for auth + money math first |
| Tests run automatically | 🔴 None. No CI at all (`.github/` doesn't exist) | GitHub Actions, ~20 lines |
| Linter | 🔴 None | `ruff` (Python), `eslint` (JS) |
| Type checking | 🔴 None | `mypy` or `pyright` on `backend/app` |
| Security scan | 🔴 None | `pip-audit` + `bandit`, or GitHub CodeQL (free) |
| Dependency pinning | 🟡 `>=` ranges only, and deps duplicated in `pyproject.toml` + `requirements.txt` (a comment already warns "keep both in sync" — that's a bug waiting) | Lockfile |
| Frontend deps | 🔴 `react`, `vite` only — no eslint, no tests | `eslint` + `vitest` |
| Coverage measurement | 🔴 None | `pytest --cov` |
| Docs / architecture notes | 🟢 **Genuinely good.** `magic_mds/` has DATA_MODEL, HOW_IT_ALL_WORKS, USER_MANUAL, ERROR101_RESOLUTION | Keep doing this |
| Code comments explaining *why* | 🟢 Strong — e.g. `backend/app/main.py:16-19` explains the Vercel error-boundary rationale | Keep demanding this |
| Secrets in repo | 🟢 Clean — env vars + keyring | — |

**The two green rows are why you're in better shape than you feel.** The documentation and the *why*-comments are the expensive part of comprehension, and they exist. What's missing is entirely mechanical, and it's a weekend of work.

---

## 6. How to actually understand this codebase (a 3-hour plan)

Do this once, in order, and you will own the mental model. Read in **data-flow order**, never alphabetically.

### Hour 1 — the spine (read these 6 files, ~250 lines total)

| # | File | Lines | Question to answer while reading |
|---|---|---|---|
| 1 | `magic_mds/HOW_IT_ALL_WORKS.md` | — | What are the three moving parts? |
| 2 | `magic_mds/DATA_MODEL.md` + `backend/migrations/0001_target_schema.sql` | — | **The tables. Learn these cold — everything else is plumbing around them.** |
| 3 | `backend/app/main.py` | 63 | Where do requests enter? What middleware wraps them? |
| 4 | `backend/app/db.py` | 37 | How does it talk to Neon? |
| 5 | `backend/app/auth.py` | 47 | How does the connector prove who it is? |
| 6 | `backend/app/schemas.py` | 46 | What shapes of data move over the wire? |

### Hour 2 — follow one bill, end to end
Pick a single receivable and trace it through every hop. This is the single most valuable exercise in the document:

```
connector/src/arq_connector/tally/client.py      ← asks Tally (port 9000)
  → tally/parsers.py                             ← XML into Python  ★ the sign quirk lives near here
  → sync/snapshot.py                             ← builds the payload
  → sync/pusher.py                               ← HTTPS to backend
      → backend/app/routers/sync.py       (109)  ← receives, validates, writes
          → Neon Postgres
      → backend/app/routers/dashboard.py  (303)  ← reads, aggregates  ★ abs() applied here
          → frontend/src/api.js             (95)
              → frontend/src/App.jsx       (244)  ← renders
```

At each hop ask one question: **"what happens if the input is missing, zero, or negative?"** That single question finds most AI bugs.

### Hour 3 — the risky bits, read slowly
- `backend/app/routers/dashboard.py` (303) — **the money math.** Biggest file, highest business risk.
- `backend/app/dashauth.py` (90) + `auth_dashboard.py` (54) — **the login.** Security-critical, zero tests.
- `backend/app/routers/ask.py` (197) — the AI copilot. Untrusted-input surface, currently being modified.
- `connector/src/arq_connector/tally/parsers.py` — where wrong data becomes wrong numbers.

### The technique that makes all of this 5× faster: **linear walkthroughs**

Willison's pattern, and it is tailor-made for your situation. Ask for one file at a time, like this:

> "Walk me through `backend/app/routers/dashboard.py` line by line, in plain English. For each function: what it takes, what it returns, what could go wrong. Flag anything you'd expect a senior reviewer to question. Don't change any code."

Then — and this is the part that matters — **ask adversarial follow-ups**: *"what happens if the tenant has zero bills?"*, *"what if two connectors push at once?"*, *"show me the line that applies abs()."* If the explanation doesn't survive your questions, that's the bug.

The reason this works: the model can't fake a walkthrough of code that doesn't hold together, and *you* only need to evaluate the explanation — which is a much cheaper cognitive task than reconstructing the code from scratch.

---

## 7. Risk-based review — where to actually spend attention

Sort every change into one of three buckets. Be ruthless about the bottom bucket.

**🔴 READ EVERY LINE.** Anything touching: authentication/PIN/session tokens, money arithmetic, tenant isolation (one customer seeing another's data), database migrations, or anything a customer's data flows through irreversibly.
→ In this repo: `dashauth.py`, `auth.py`, `auth_dashboard.py`, `dashboard.py`, `migrations/*.sql`, `security.py`

**🟡 READ THE DIFF + RUN IT.** Business logic, parsers, API contracts.
→ `sync.py`, `parsers.py`, `snapshot.py`, `pusher.py`, `ask.py`

**🟢 SKIM, TRUST THE GATES.** Styling, copy, layout, icons, i18n strings, build config.
→ `styles.css`, `icons.jsx`, `i18n.js`, most of `components/`

### The AI-code review checklist
When you read a red or yellow diff, hunt these specifically — they are the documented AI failure modes, not generic advice:

- [ ] **Does it handle empty / zero / negative / null?** (your negative-Dr-amounts quirk is exactly this class)
- [ ] **Are the tests actually asserting the right thing,** or just asserting that the code does what it does? *(Read the assertions, not the test names.)*
- [ ] **Do all imported packages actually exist,** and are they ones you meant to add?
- [ ] **Is there a silent `except: pass`** or a swallowed error hiding a failure?
- [ ] **Is tenant/user identity checked** on every data-returning path — not just the first one?
- [ ] **Did it duplicate logic** that already exists elsewhere in the repo?
- [ ] **Is it doing more than you asked?** Unrequested scope is a smell.
- [ ] **Would you be able to debug this at 2am?** If not, ask for it simpler.

---

## 8. The plan — three weekends

### Weekend 1: build the gates (highest ROI, do this first)
```bash
# Python: lint + format + import hygiene
pip install ruff mypy pytest-cov pip-audit bandit
ruff check backend connector          # will find real things immediately
pip-audit                             # vulnerable / non-existent dependencies
```
1. Add `[tool.ruff]` and `[tool.pytest.ini_options]` to both `pyproject.toml` files.
2. Add `.github/workflows/ci.yml` — run `ruff`, `pytest`, `pip-audit` on every push. ~20 lines.
3. Add `eslint` + `vitest` to `frontend/package.json`.
4. **Turn on GitHub CodeQL** (free, one click in repo settings) — static security analysis.
5. Resolve the `pyproject.toml` / `requirements.txt` duplication before it bites you.

**Outcome: layers 1–3 exist. You stop needing to look for typos and vulnerable packages by eye.**

### Weekend 2: tests where the money and the auth are
Target, in order: `dashauth.py` (session tokens), `auth_dashboard.py` (PIN login), `dashboard.py` (aggregations — especially the `abs()` sign handling and the zero-bills case). Use red/green: **write the failing test first**, then have it implemented. Get `backend/app` to meaningful coverage and print the number in CI.

**Outcome: layer 2 exists on the code that can actually hurt a customer.**

### Weekend 3: specs and observability
1. Start `magic_mds/SPECS/` — one markdown file per feature, written *before* the code. Acceptance criteria, edge cases, what must not change. This is SDD at the scale that fits you.
2. Write a `CLAUDE.md` at the repo root that encodes your standards permanently: the negative-amounts rule, the tenant-binding rule, "always write the test first," "never add a dependency without asking," "explain *why* in comments." **Every future session then starts already knowing your rules** — this is how you make good review habits compound instead of re-explaining them.
3. Add structured logging + error alerting on the backend so production tells you when it's unhappy (layer 6). You already have `/health` and `/health/db` — build on that instinct.

**Outcome: you stop reviewing after the fact and start constraining before the fact. That's the actual destination.**

---

## 9. The mental model to keep

You are moving from **author** to **editor-in-chief**. An editor-in-chief does not write the articles and does not read every word of every draft. They:

- decide what gets written and why (**specs**)
- set standards the newsroom follows without being told (**CLAUDE.md, linters, CI**)
- read the front-page stories with total attention (**risk-based review**)
- own every word that ships, including the ones they skimmed (**accountability**)

That last one is Willison's point, and it's the one that keeps you honest: **you sign off on this software.** Not the model. The gates in §8 exist so that signature means something.

The reassuring part: those are senior skills. They're the skills that were always scarce, and they don't expire when the model version changes. You are not losing a craft — you're being pushed up the ladder faster than is comfortable. The discomfort you're feeling is the promotion.

---

## 10. Reading list

**Read first (highest signal, shortest):**
- [Simon Willison — Agentic Engineering Patterns](https://simonw.substack.com/p/agentic-engineering-patterns) — the concrete patterns/anti-patterns in §2
- [Simon Willison — Engineering practices that make coding agents work (talk)](https://www.youtube.com/watch?v=owmJyKVu5f8)
- [DORA 2025: Year in Review](https://dora.dev/insights/dora-2025-year-in-review/) — the data, from Google, not a vendor
- [DORA — Balancing AI tensions: from adoption to effective SDLC use](https://dora.dev/insights/balancing-ai-tensions/)

**Then:**
- [Karpathy's agentic engineering framework](https://www.aibuilderclub.com/blog/karpathy-agentic-engineering)
- [Karpathy's Claude Code field notes](https://dev.to/jasonguo/karpathys-claude-code-field-notes-real-experience-and-deep-reflections-on-the-ai-programming-era-4e2f)
- [Microsoft — Spec-Driven Development: a spec-first approach to AI-native engineering](https://developer.microsoft.com/blog/spec-driven-development-ai-native-engineering/)
- [How developers are using AI — Google's 2025 DORA report](https://blog.google/innovation-and-ai/technology/developers-tools/dora-report-2025/)

**Research (if you want the evidence behind the claims):**
- [3,100 Opinions on Code Review in an AI World (arXiv 2607.07980)](https://arxiv.org/pdf/2607.07980)
- [The Specification as Quality Gate: Three Hypotheses on AI-Assisted Code Review (arXiv 2603.25773)](https://arxiv.org/pdf/2603.25773)
- [Vibe Coding in Practice: Motivations, Challenges, and a Future Outlook (arXiv 2510.00328)](https://arxiv.org/pdf/2510.00328)

**Vendor perspectives (useful, but they're selling review tools — discount the statistics):**
- [Best practices for reviewing AI-generated code](https://docs.bswen.com/blog/2026-04-09-ai-code-review-best-practices/)
- [AI code review: hybrid workflows](https://blog.exceeds.ai/ai-code-review-best-practices/)

---

*Next action, if you only do one thing: `pip install ruff && ruff check backend connector`. It takes 30 seconds and it will tell you something true about your codebase that nobody wrote down for you.*
