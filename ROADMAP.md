# ARQ Astra — Product and Agent Development Roadmap

| Field | Value |
|---|---|
| Owner | Rishi |
| Status | Public product and engineering roadmap |
| Horizon | 18 months |
| Last reviewed | 2026-08-17 |
| Review cadence | Monthly during Alpha/Beta; quarterly after v1 |

ARQ Astra is an **agentic business operating system for Tally-first Indian MSMEs**. Its
commercial entry point is receivables and collections: help an owner see the latest available
position, understand what matters, decide whom to follow up with, and record what the team did.
Ask ARQ and evidence-backed research already broaden that foundation; sales, procurement,
finance, and controlled execution follow only when their data and safety prerequisites are
real.

This is a public roadmap, not a claim that every item below has shipped. It deliberately omits
private pricing, partner economics, customer identities, credentials, and operationally
sensitive details.

## 1. Roadmap contract

Every capability carries one of four maturity labels:

| Label | Meaning |
|---|---|
| **Implemented** | Present in the repository and usable within its documented limits. |
| **Alpha commitment** | Required for the founder-assisted private Alpha; not current behavior until verified. |
| **Candidate** | Intended direction whose design, evidence, or sequencing can still change. |
| **Vision** | Long-term outcome, not a dated product promise. |

Calendar dates are targets. A phase advances only when its exit gates pass. When a target date
and a safety or data-quality gate conflict, the gate wins.

## 2. First market and target user model

The initial beachhead is chemical manufacturing MSMEs in Vapi GIDC, Gujarat, typically with
approximately Rs 1–20 crore in annual turnover and an established Tally-led finance process.
The broader expansion path is Gujarat GIDC clusters, followed by Maharashtra MIDC clusters.

The product serves three distinct responsibilities:

- **Owner/CFO:** buys the product, sees concise management guidance, controls policy, and
  approves external action.
- **Finance Operator:** works with Tally, reviews the queue, performs follow-ups, and records
  outcomes.
- **Viewer:** reads reports without changing data or action state. This is a later role, not an
  Alpha requirement.

The responsive web dashboard remains the source of truth. Operators primarily work on desktop;
owners receive a concise mobile-friendly view. English, Hinglish, Gujarati-Roman, and
Marathi-Roman remain supported modes, with the Gujarat pilot prioritizing English, Hinglish,
and Gujarati-Roman. Gujarati script and voice are discovery topics after Alpha, not launch
requirements.

## 3. Non-negotiable product principles

These constraints do not weaken as the product becomes more agentic:

1. **Never write to Tally.** Tally access remains read-only.
2. **Never mix tenant data.** Every read, action, import, and agent run is authorized and scoped
   server-side.
3. **Never contact a debtor, prospect, customer, or supplier without authorized consent.**
4. **Never fabricate a company, contact, citation, transaction, amount, date, or financial fact.**
5. **Never place credentials, party data, amounts, or message content in application logs.**
6. **Never make AI prose the source of a financial number.** Numbers and ranking evidence are
   calculated deterministically; AI may explain or draft around them.
7. **Never call a capability autonomous until failure handling, auditability, kill switches,
   and human override have been proven.**
8. **Never treat a copied or opened message as delivered.**
9. **Never assume a bill that disappeared from Tally was paid.** It may have been paid,
   cancelled, adjusted, or otherwise cleared.

## 4. Current verified foundation

The following is **Implemented** as of this roadmap review:

- A Windows connector reads Sundry Debtor ledgers and current Bills Receivable from TallyPrime
  over its read-only XML gateway.
- One-time pairing, device-token authentication, permanent tenant-to-company-GUID binding, and
  Windows Credential Manager token storage protect connector access.
- Manual and scheduled sync send the current open-receivables snapshot to a FastAPI backend on
  Vercel with Neon Postgres.
- Connector v0.2.0 supports local reset and re-pairing. A signed Windows client package remains
  a distribution gate.
- The web dashboard provides outstanding and overdue totals, ageing, concentration, top
  debtors, bill lists, due timing, filters, and the latest sync status.
- Authenticated workbook import supports Sales, Purchase, Expense, P&L, and Smart Excel
  profiling. These sources provide analytics; they are not yet authoritative current
  receivables snapshots.
- **Ask ARQ — Copilot** answers questions over authorized company data. Its one-page report
  takes financial figures and charts from deterministic authorized metrics; it does not execute
  business actions.
- **Research Agent — review-first research** builds a deterministic business profile, performs
  bounded cited discovery when web research is available, scores candidates, and requires
  human review. Its delivery action produces copyable text; it does not send outreach.
- Dashboard access is tenant-scoped. Action-level Owner, Operator, and Viewer permissions are
  roadmap work, not a current claim.

Important limits of the current foundation:

- Receivables are a current exposure snapshot, not a daily historical balance series.
- The existing chase list is read-only; it is not yet a closed-loop Collections Agent.
- There is no debtor messaging transport, collection action history, promise tracking,
  dispute workflow, or verified recovery attribution.
- The scheduled connector provides the latest available sync; it is not real-time streaming.

## 5. Agent model

ARQ uses domain and authority labels that describe what the software actually does:

| Capability | Maturity | Authority |
|---|---|---|
| Ask ARQ | **Implemented** | Copilot: answers and drafts on request; no side effects. |
| Research Agent | **Implemented** | Review-first research: cited candidates and proposed actions; no outreach. |
| Collections action loop | **Alpha commitment** | Deterministic prioritization and human-recorded bill action. |
| Collections Agent | **Candidate** | Review-first contacts, consent, drafting, approval, and structured outcomes. |
| Finance Controller Agent | **Candidate** | Cash outlook, anomalies, and an owner brief after historical and receipt evidence exists. |
| Sales Growth Agent | **Candidate** | Extends cited customer research into an approved growth workflow. |
| Procurement Agent | **Candidate** | Supplier and cost decisions after reliable purchase, inventory, and payable data exists. |
| Autonomous execution | **Vision** | Opt-in, narrowly capped execution only after every autonomy gate passes. |

There is no generic “Workflow Agent” marketing layer. A domain agent must earn its name through
a useful closed loop. A passive list alone is not a Collections Agent.

## 6. Primary outcome and measurement

The initial north-star metric is **operator-recorded overdue value acted upon through ARQ each
week**.

An item counts only when a completed human action—such as a phone conversation, manually sent
message, or meeting—is recorded against an open overdue bill. Viewing or drafting does not
count. ARQ captures the outstanding amount at action time and counts each bill's value once per
Monday–Sunday week in Asia/Kolkata, even if several attempts occur.

Supporting Alpha measures are:

- overdue bills acted upon;
- distinct recorded bill parties acted upon, treated as approximate until stable customer
  identity exists;
- repeat attempts, reported separately rather than added to acted value;
- companies with at least one recorded action each week;
- time from the latest trusted sync to the first recorded action; and
- onboarding time from first setup to reconciled dashboard.

The later north star is **verified overdue cash recovered through ARQ**. It cannot replace the
Alpha metric until receipt evidence, historical state, and a disclosed attribution rule exist.
DSO improvement, time saved, and follow-up speed remain supporting measures.

## 7. Release ladder

| Phase | Target | Development focus | Exit signal |
|---|---:|---|---|
| Private Alpha | First month after Alpha kickoff | Data trust, signed distribution, privacy controls, two-role access, bill-level action logging | Two companies reconcile and use the workflow; a third is ready to test repeatability |
| Private Beta | Months 2–3 | Review-first Collections Agent, verified contact/consent foundations, drafts and structured outcomes | Repeat weekly usage with zero critical recipient, amount, or tenant incidents |
| v1 | Months 4–6 | Repeatable paid product, Viewer role, owner brief, audit and payment-evidence foundations | Ten paying companies and repeatable partner-assisted onboarding |
| v1.x | Months 7–12 | Finance Controller Agent, history, receipts, bank evidence, cash scenarios, controlled messaging infrastructure | Reliable financial evidence and useful owner decisions across several companies |
| v2 candidates | Months 12–18 | Sales Growth, Procurement, CRM/ERP connections, narrowly controlled execution | Each workflow independently satisfies its data, usage, and safety gates |

### 7.1 Private Alpha — development closure first

**Alpha commitments** are deliberately narrow:

- Ship an Authenticode-signed Windows connector package for supported Windows 10/11 x64.
- Reconcile the opening Tally snapshot against the source company by party, bill reference, due
  date, pending amount, total bill count, and total outstanding.
- Quarantine an unexpected empty or materially anomalous sync, preserve the last trusted
  snapshot, show **Data requires verification**, and block actions and agent recommendations.
- Require a successful trusted Tally sync no older than 24 hours before recording an action.
- Disclose external AI processors and record who granted revocable owner consent and when.
  Minimized/redacted AI use and identifiable-data AI use have separate explicit settings.
  External web research has its own disclosure. Deterministic analytics remain available when
  AI is disabled.
- Add server-enforced **Owner/Admin** and **Finance Operator** permissions. Every person uses a
  named login; frontend hiding alone is not authorization.
- Add a bill-level, append-only collection action log. The server derives tenant, actor,
  timestamps, amounts, and overdue days from authorized state. Corrections void an event rather
  than erasing its history.
- Turn the read-only chase list into **Today's collection queue** with a small Record follow-up
  flow. The UI states clearly that recording an action does not contact the customer.
- Make public Alpha signup lead/waitlist-only. Rishi manually approves and provisions active
  companies until email verification, abuse protection, and repeatable onboarding exist.
- Add customer-approved structural diagnostics for Tally parser support. Diagnostic captures
  remove credentials, company identity, party names, and amounts before leaving the customer's
  machine; customers and partners are never asked to email raw exports casually.
- Extend authorized company-data cleanup to derived research and future collection content,
  including actions, drafts, contacts, and outcomes. Retain only the minimum pseudonymized
  security/audit evidence for a fixed, disclosed period after appropriate legal/DPDP review.
  Append-only history governs ordinary correction; authorized full-company deletion still
  removes the customer's business content.

The Alpha queue is deterministic:

1. unverified data blocks action;
2. bills without an action this week come before bills already contacted;
3. bills are grouped into over 90, 61–90, 31–60, and 1–30 overdue-day bands; and
4. the highest outstanding amount appears first within each band.

Alpha remains bill-level. A debtor workspace is intentionally not part of the committed model.
Alpha also excludes contact storage, message bodies, promises, disputes, assignments, payment
attribution, messaging providers, and automatic sending.

Alpha does not exit until:

- two founder-assisted companies complete onboarding and exact opening reconciliation;
- the connector completes a seven-day sync soak for both;
- anomalous and genuine-zero states are distinguished safely;
- tenant isolation, wrong-company, revoked-device, role, action-idempotency, and cleanup tests
  pass;
- action and AI features refuse stale or untrusted data;
- logs contain no tokens, party names, amounts, or action payloads;
- both owner/operator pairs use ARQ weekly and want to continue; and
- a third qualified company is ready to test whether onboarding is repeatable.

Public marketing and partner conversations may begin earlier. Active Alpha onboarding remains
invite-only and founder-assisted until these gates pass.

### 7.2 Private Beta — review-first Collections Agent

The **Candidate** Beta loop is:

1. start from a trusted, explainable bill priority;
2. use a verified recipient and recorded consent;
3. prepare an editable English, Hinglish, or Gujarati-Roman draft;
4. require an authorized human checkpoint;
5. open a WhatsApp handoff or record a phone action; and
6. record the actual outcome without claiming transport events ARQ cannot observe.

Beta may add bill-level collection states such as needs follow-up, contacted, promise received,
disputed, and follow-up due. Message state remains separate: draft, approved, opened for
sending, and operator-reported sent are not interchangeable. Financial evidence also remains
separate: open in Tally, cleared in Tally with reason unknown, reported paid, and verified
received describe different levels of certainty.

Stable customer identity is a prerequisite for contact features. Party-name-only matching is
not sufficient, researched prospect/supplier contacts are never reused as collection
recipients, and this roadmap does not preselect a debtor-workspace architecture.

There is no direct WhatsApp, email, or SMS sending in Private Beta. Phone-call outcome logging
and human-controlled WhatsApp click-to-open are first; email follows after the same consent and
audit rules work.

### 7.3 v1 — repeatable paid operating product

The v1 target is a repeatable product, not a larger demo. **Candidate** scope includes:

- ten paying companies with measurable weekly use;
- a Viewer role and complete server-side guards for every existing mutation;
- an in-dashboard daily owner brief with three important actions and data-freshness status;
- structured, immutable approval and action history;
- payment-evidence foundations that distinguish reported, cleared, and verified states;
- a documented partner-assisted onboarding and support playbook; and
- self-service activation only after email verification, abuse protection, and onboarding
  reliability are proven.

Optional owner email or WhatsApp briefs come later and require preferences, delivery logs, and
unsubscribe controls. The dashboard remains the system of record.

### 7.4 v1.x — Finance Controller Agent

The Finance Controller Agent becomes credible only after ARQ stores history and evidence rather
than inferring a trend from today's open bills. **Candidate** work includes:

- historical receivables snapshots;
- read-only Tally receipt data;
- bank-statement import or an appropriately governed read-only bank feed;
- receipt matching and explainable payment evidence;
- cash-in scenarios with explicit assumptions and backtesting; and
- anomaly detection and an opt-in owner brief.

“Reported paid,” “cleared in Tally—reason unverified,” and “verified received” remain separate.
ARQ attributes recovery only when reliable receipt evidence follows a recorded ARQ action under
a disclosed attribution rule.

### 7.5 v2 candidates — broader agentic operating system

After the collections and finance loops demonstrate repeat use:

1. **Sales Growth Agent** extends the existing cited Research Agent into approved growth plans.
2. **Procurement Agent** uses reliable purchase, inventory, payable, supplier, and cost data.
3. CRM/customer-master and selected ERP integrations expand the source-neutral model.
4. Narrowly controlled execution may be enabled for workflows that independently pass every
   autonomy gate.

These are **Candidates** or **Vision**, not commitments to build several major workflows in
parallel.

## 8. Integration order

Tally remains first for go-to-market while the internal model stays source-neutral. The planned
order is:

1. richer read-only Tally identity and receipt data;
2. a verified debtor-contact import with source, verifier, language, consent, and opt-out state;
3. bank-statement import or a governed read-only bank feed for payment evidence;
4. WhatsApp Business integration after review-first use succeeds;
5. CRM/customer-master integrations; and
6. purchase, inventory, payable, and additional ERP data for procurement workflows.

Excel continues to support finance and Smart Excel analytics. It becomes a collections source
only after complete-snapshot semantics, reconciliation, closure/cancellation behavior, and
freshness are explicit.

## 9. Autonomous execution gate

Automatic sending is not unlocked by a date or an AI model upgrade. At minimum, ARQ requires:

- three companies using the review-first workflow for eight weeks;
- at least 100 human-reviewed collection actions;
- zero wrong-tenant, wrong-recipient, or wrong-amount incidents;
- stable customer identity, verified contacts, consent, and opt-out handling;
- server-enforced configure, approve, and send permissions;
- immutable policy, draft, approval, attempt, delivery, reply, promise, dispute, and evidence
  history;
- a durable outbox with idempotency, provider identifiers, bounded retries, dead-letter
  handling, quiet hours, and rate limits;
- tenant and global kill switches; and
- a successfully rehearsed provider-failure and kill-switch drill.

Passing the gate permits only an opt-in, capped rules mode. It does not create unrestricted
autonomy. Stale data, disputes, promises to pay, opt-outs, recipient mismatch, or repeated
provider failure pause execution immediately.

## 10. Pilot, partner, and support boundaries

The first cohort is founder-assisted and aims for three qualified Vapi chemical manufacturers,
with two completed onboardings as the minimum Alpha evidence. A qualified design partner has a
licensed TallyPrime installation, real open receivables, owner and operator participation, and
agrees to reconcile the opening position and review outcomes during the pilot.

Tally partners may introduce customers and assist with local Tally connectivity while the
customer is present. They do not receive customer passwords, device tokens, pairing-code
inventories, or financial exports. ARQ controls tenant creation and pairing during Alpha;
partner portals and reseller privileges are future design work.

Rishi owns onboarding and escalation, supported by a teammate where available. Alpha support is
offered during stated business hours with a one-business-day response target, not as a 24×7
service.

## 11. Stop and pivot rules

Pilot evidence determines what ARQ builds next:

- If Tally data does not reconcile, new agent work stops while extraction and identity are
  fixed.
- If data is correct but operators do not record weekly collection actions, the workflow and
  segment are re-examined.
- If companies use ARQ but do not value the offered package, packaging and demonstrated value
  are re-examined.
- If owners consume reports while operators ignore the collection loop, ARQ is behaving as an
  analytics product—not yet a collections operating system.
- Private Beta starts only when two companies reconcile correctly, use the workflow weekly,
  and want to continue.

## 12. Truthful public claims

ARQ may describe itself as Tally-first, agentic, multilingual, review-first, tenant-isolated,
and evidence-backed when the relevant shipped capability supports the statement. Before trust
gating ships, public copy says **latest successful sync** and displays its timestamp; **latest
verified sync** is reserved for data that has passed the planned trust checks.

Until evidence changes, ARQ does not claim:

- real-time Tally data—use **latest successful sync** today, and **latest verified sync** only
  after trust checks ship;
- automatic recovery messaging;
- proven DSO reduction or cash recovered;
- fully autonomous finance operations;
- complete Tally coverage;
- that an opened or copied message was delivered; or
- that a cleared bill was necessarily paid.

## 13. Explicitly deferred and prohibited work

The following stays outside committed releases until its prerequisites exist:

- any Tally write-back;
- unapproved debtor or prospect outreach;
- automatic matching of researched contacts to debtors;
- native mobile applications;
- payment gateways;
- broad OCR/GST automation;
- a generic agent marketplace or orchestration platform;
- numerous ERP/CRM integrations before the Tally workflow works; and
- parallel development of several major agent workflows by the initial small team.

## 14. Governance

Rishi owns and iterates this roadmap. It is reviewed monthly during Alpha and Beta and
quarterly thereafter. A capability changes maturity only when repository truth and pilot
evidence support the promotion. Competitor announcements, attractive demos, and model releases
do not bypass prerequisites.

Roadmap updates should preserve three separations:

1. shipped capability versus intent;
2. human-reported activity versus verified financial evidence; and
3. recommendation versus execution authority.

The repository's `AGENTS.md` remains the engineering source of truth for current architecture,
security constraints, commands, deployment, and known traps. This document owns public product
direction and phase gates.
