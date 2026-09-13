# Contract: Receivable and payable source mapping (SLICE-02)

| Field | Value |
|---|---|
| Change | 003 |
| Slice | SLICE-02 — Receivable and payable source contracts |
| Status | Receivables half: Ready for owner review. Payables half: **blocked, not started — no evidence.** |
| Requirements | REQ-001, REQ-005, REQ-006, REQ-007, REQ-010, REQ-016, REQ-017, REQ-018, REQ-020 |
| Prerequisites | SLICE-01 (`EVIDENCE.md`) |
| Evidence used | `connector/tests/fixtures/bills_receivable.xml`, `connector/tests/fixtures/debtor_ledgers.xml`, `connector/src/arq_connector/tally/{parsers,envelopes}.py` |

Per `TASKS.md`, this slice's prerequisite is "consented source access for actual captures." Only
the receivables side of that evidence exists (see `EVIDENCE.md` §2–3). The payables side has
zero captured evidence anywhere in the repository. Per the task list's own rule ("incomplete
mappings remain explicitly blocked"), this document maps receivables and stops explicitly at
payables rather than inventing a mapping from `PLAN.md`'s unverified candidate table.

## 1. Receivables (`Bills Receivable` report) — reviewed mapping

### 1.1 Request

`connector/src/arq_connector/tally/envelopes.py::bills_receivable(company_name)` — confirmed
working shape: `TALLYREQUEST` must be the literal two-word string `"Export Data"`, using
`EXPORTDATA`/`REQUESTDESC`/`REPORTNAME=Bills Receivable`. Two alternative shapes were tried and
failed (documented in the function's own docstring): the plan's original `TYPE=Data`/
`ID="Bills Receivable"` skeleton returns an empty envelope; a `TALLYREQUEST=EXPORT` variant
errors `"Unknown Request, cannot be processed"`. No date-range static variable was needed to
retrieve the one captured outstanding bill.

### 1.2 Response shape (from the real fixture)

Flat, no per-bill wrapper element. One `<BILLFIXED>` (containing `BILLDATE`, `BILLREF`,
`BILLPARTY`) is followed by sibling `<BILLCL>` (pending amount), `<BILLDUE>` (due date), and
`<BILLOVERDUE>` (overdue day count) directly under `<ENVELOPE>`:

```xml
<ENVELOPE>
 <BILLFIXED>
  <BILLDATE>1-Apr-26</BILLDATE>
  <BILLREF>2</BILLREF>
  <BILLPARTY>Alpha Customer</BILLPARTY>
 </BILLFIXED>
 <BILLCL>-508989.00</BILLCL>
 <BILLDUE>1-Apr-26</BILLDUE>
 <BILLOVERDUE>62</BILLOVERDUE>
</ENVELOPE>
```

### 1.3 Identity — REQ-001, REQ-010

- **No party GUID is present in this report.** `parsers.py::parse_bills_receivable` always
  returns `party_guid=None`; the only party identity is the free-text `BILLPARTY` name.
- `BILLREF` is present (here, `"2"`) but its uniqueness scope is **not established** — one bill,
  one party, one company. It could be a per-party sequence, a per-company sequence, or a
  voucher-derived string; nothing in the single captured row distinguishes these.
- **Current fallback identity is therefore party-name + bill-ref**, which is weak per REQ-010:
  it does not survive a party rename and has an unconfirmed collision boundary. This must be
  logged as a documented, tested fallback (not assumed trustworthy) before SLICE-22 accepts it
  as canonical identity, and any bill lacking a usable `BILLPARTY`/`BILLREF` pair is excluded
  from canonical accumulation and counted, per REQ-010 — not silently dropped.
- Cross-referencing `debtor_ledgers.xml`, the matching debtor ledger **does** carry a real GUID
  (`da7e7890-ba54-455d-9dc6-93fc3f0ca2d8-000000d0` for "Alpha Customer"). A join from
  `Bills Receivable`'s `BILLPARTY` name to the `ARQ Debtor Ledgers` collection's `NAME`/`GUID` is
  the only path to a trustworthy party identity, and that join is itself name-based (weak) unless
  a case-sensitivity/whitespace/rename collision test is added. This is a real open design
  question for SLICE-21/22, not yet resolved by this mapping.

### 1.4 All-age open scope — REQ-007

**Not confirmed.** The one captured bill (`BILLOVERDUE=62`) is recent; the request has no
date-range restriction, and the docstring in `envelopes.py` states "no date-range variables were
needed to get the current outstanding bill" — but nothing in the fixture proves the report
returns *every* currently open bill regardless of age, as REQ-007's "all-age open scope"
requires. This needs a second capture against a company with at least one old (>1 year) and one
recent open bill before SLICE-21/22 can rely on it.

### 1.5 Due dates — satisfied

`BILLDUE` and `BILLOVERDUE` are both present and map directly to due-date and ageing fields.

### 1.6 Positive completeness signals — REQ-016, REQ-017, REQ-018, REQ-020

**None available.** The `Bills Receivable` export carries no row count, control total, or
"as-of" header comparable to `list_of_companies.xml`'s `<CMPINFO>` summary block. There is
currently no way to distinguish "genuinely zero open bills" from "export failed and returned an
empty envelope" from this report alone. This is exactly the gap Change 001 / REQ-016–020 exist
to guard: any zero-bills result from this report must be treated as suspicious pending
verification (quarantined, not trusted) until a companion completeness signal is designed —
candidates to evaluate in a later slice: comparing against the debtor-ledger closing-balance
count, or a separate lightweight row-count collection request. Not resolved here.

### 1.7 Weak-reference handling — REQ-010

A bill missing `party_name` or `pending_amount` is already excluded by
`parsers.py::parse_bills_receivable`'s final filter (`if b["party_name"] and
b["pending_amount"] is not None`). That exclusion is currently **silent** at the parser layer —
it does not yet produce a visible excluded-count/reason the customer can see, which REQ-010
requires. This is a real, named implementation gap for SLICE-21/22, not a solved case.

### 1.8 Multi-bill behavior — unverified

Confirmed only for exactly one bill. The repeating-group assumption (another `BILLFIXED` +
trailing siblings repeating in document order for bill #2, #3, ...) is inferred from the parser
author's own docstring, not observed. **A second capture against a company with 2+ outstanding
bills for the same or different parties is required before this shape is trusted at scale.**

### 1.9 Sign convention — unresolved

`BILLCL` is negative (`-508989.00`) in the captured fixture. `parsers.py` deliberately does not
flip the sign ("no sign flip is applied since the correct convention wasn't independently
confirmed... check this against the Bills Receivable screen in Tally directly"). `AGENTS.md`
trap 2 documents that the existing v1 path stores the raw sign and reports `abs()` at the
dashboard layer — this mapping does not change that, but it is not independently re-confirmed
against the Tally UI screen in this session either (no live Tally access). Carry the same
raw-sign-in, `abs()`-at-presentation convention forward into the v2 contract unless a future
capture disproves it.

### 1.10 Named comparison boundary — REQ (Definition of Done, spec §25)

Named source report: **Bills Receivable**, same company, same as-of date. Only one row exists to
compare — count and value trivially match. This does **not** satisfy spec §25's reconciliation
requirement, which needs a comparison with more than one row and, per §25's broader real-world
requirement, "consented, structurally different companies." That remains open.

## 2. Payables (`Bills Payable` report) — blocked, no evidence

No fixture, no request envelope, no parser, and no captured field list exists anywhere in the
repository for creditor ledgers or the `Bills Payable` report. `PLAN.md`'s row for 5.4 ("Investigate
Bills Payable export and creditor relationships") is explicitly a candidate to investigate, not a
confirmed mapping — and no investigation has happened. This half of SLICE-02 **cannot be
completed** without a live-Tally capture following the procedure in `EVIDENCE.md` §5, run by
someone with actual TallyPrime access. Recorded here rather than silently dropped, per the task
list's own rule that missing evidence blocks dependent work rather than authorizing invention.

## 3. Checks performed vs. not performed

| Check (from `TASKS.md` SLICE-02) | Result |
|---|---|
| Compare identical company/as-of report counts and values | **Not possible** — only one bill captured; nothing to compare against a second independent count |
| Examine genuine zero | **Not evidenced** — no completeness signal exists in this report; see §1.6 |
| Examine failed export | **Not evidenced** — no failure-mode capture exists |
| Examine duplicate references | **Not evidenced** — only one `BILLREF` value observed |
| Examine changed amounts | **Not evidenced** — no second capture of the same bill after a value edit exists |

None of the five adversarial checks this slice calls for can be run from the available evidence.
Only the identity/due-date/weak-reference *mapping* work in §1 could honestly proceed.

## 4. Review

Reviewed: the receivables (`Bills Receivable`) G01 mapping, with every open question named rather
than assumed. Not reviewed, and explicitly blocked: the payables (`Bills Payable`) mapping in its
entirety, and every adversarial check for receivables that needs more than one captured bill.

## 5. Stop

Per the task list's own instruction, this agent records the above and **does not mark SLICE-02
accepted**. Recommended owner decision: either (a) authorize a live-Tally evidence-capture pass
(a human, or a connector-side session run next to real TallyPrime, following `EVIDENCE.md` §5)
before SLICE-22 builds canonical persistence on top of this mapping, or (b) accept the receivables
mapping as a documented-but-limited starting point and explicitly re-scope SLICE-21/22's checks
to what is actually provable today, deferring the multi-bill/all-age/completeness/payables gaps to
a named follow-up. This document does not choose between those for the owner.
