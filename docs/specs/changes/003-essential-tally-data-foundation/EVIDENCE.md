# Evidence: inventory and collection protocol (SLICE-01)

| Field | Value |
|---|---|
| Change | 003 |
| Slice | SLICE-01 — Evidence inventory and collection protocol |
| Status | Ready for owner review (owner accepts or requests a bounded continuation) |
| Requirements | REQ-001, REQ-010, REQ-011, REQ-053, REQ-054 |
| Prerequisites | None |
| Author/session | Claude Code, 2026-09-06 |

This file is the SLICE-01 deliverable: an honest accounting of what Tally evidence actually
exists in this repository today, what is missing per mandatory domain (spec Section 5), and a
minimized read-only collection procedure for closing the gaps. It does not claim any evidence
beyond what is inspectable in the tree. **No new Tally capture happened in this session** — this
agent has no live TallyPrime connection; it can only inventory what a prior session already
captured and describe the procedure a human (or a future connector-side agent run) must follow.

## 1. What "evidence" means here

Per `PLAN.md` §2 and §11 (gate G01), a domain's contract may not be approved from an assumed
field list. It needs an actual captured request/response pair from a running TallyPrime instance
(or a consented/anonymized customer export), reconciled against a named Tally report. Candidate
collections in `PLAN.md`'s table are explicitly "investigation targets, not verified Tally method
or field guarantees" — they must not be read as evidence.

## 2. Fixture inventory — what is real today

All three files under `connector/tests/fixtures/` are real, live-captured TallyPrime responses
(confirmed by `connector/tests/fixtures/README.md`, captured 2026-07-11 against test companies
`ARQ AA` / `ARQ Code Test` / `ARQ Demo Traders`):

| File | Captured against | What it proves | Known gaps |
|---|---|---|---|
| `list_of_companies.xml` | Live Tally, `ARQ List of Companies` custom collection | Company `NAME`/`GUID`/`STARTINGFROM` shape; 3 real open companies | No group/voucher-type/stock/unit masters captured |
| `debtor_ledgers.xml` | Live Tally, `ARQ Debtor Ledgers` custom collection, company "ARQ Code Test" | Ledger `NAME`/`GUID`/`PARENT`/`CLOSINGBALANCE`/`ALTERID` shape, captured **before** any voucher existed (₹0 balance case) | Only Sundry Debtors group scoped; no other ledger groups; no Trial Balance cross-check captured |
| `bills_receivable.xml` | Live Tally, `Bills Receivable` report export, same company, **after** one real sales voucher | `BILLFIXED`/`BILLCL`/`BILLDUE`/`BILLOVERDUE` flat shape for exactly **one** outstanding bill | Multi-bill grouping is inferred, not confirmed (see `parsers.py` docstring); no party GUID in this report; no all-ages vs current-only confirmation; no positive completeness signal (row count/control total) in the response |

Corresponding parser code (`connector/src/arq_connector/tally/parsers.py`) and request builders
(`connector/src/arq_connector/tally/envelopes.py`) are live-verified only to the extent the
fixtures above cover them — the module docstring says so explicitly and this inventory does not
relax that.

No other XML capture exists anywhere in the repository (`connector/`, `backend/`, `magic_mds/`).

## 3. Per-domain evidence status (spec Section 5)

| Domain | Section | Real captured evidence | Status |
|---|---|---|---|
| Company & accounting structure | 5.1 | `list_of_companies.xml` only (name/GUID/starting-from). No group, voucher-type, stock-item or unit master ever captured. | **Partial** |
| Ledgers & Accounts | 5.2 | `debtor_ledgers.xml` — Sundry Debtors group only, one ledger, ₹0 balance. No non-debtor ledger, no Trial Balance/Ledger report export, no posting (Journal/Contra) ever captured. | **Minimal / blocked for general ledgers** |
| Money to Collect — Receivables | 5.3 | `bills_receivable.xml` — one real bill. See `contracts/open-bills.md` (SLICE-02) for the reviewed mapping. | **Evidenced, with named single-bill limitation** |
| Money to Pay — Payables | 5.4 | **None.** No Bills Payable export, no creditor ledger capture, no request envelope even drafted. | **Blocked — no evidence** |
| Sales & Customers | 5.5 | **None.** No Sales Register/voucher export captured. | **Blocked — no evidence** |
| Purchases & Suppliers | 5.6 | **None.** | **Blocked — no evidence** |
| Payments & Receipts | 5.7 | **None.** | **Blocked — no evidence** |
| Credit/Debit Notes | 5.8 | **None.** | **Blocked — no evidence** |
| Journal & Contra | 5.9 | **None.** | **Blocked — no evidence** |
| Inventory | 5.10 | **None.** No stock item/company inventory usage even confirmed for the captured test companies. | **Blocked — no evidence** |
| Cash and bank context | 5.11 | **None.** | **Blocked — no evidence** |

Nine of eleven domain areas (5.1 partially, 5.4–5.11 fully) have **zero** real Tally evidence.
Only 5.3 (receivables) has a reviewable, if limited, capture. This matches `AGENTS.md`'s existing
statement that "the current connector primarily covers debtor ledgers and receivable bills" and
`PLAN.md`'s observed-constraint note that `SyncPayload` contains only ledgers and bills — this
inventory confirms that observation is exhaustive, not just illustrative.

## 4. Consent status

- The three existing fixtures were captured against ARQ's own internal test companies
  (`ARQ AA`, `ARQ Code Test`, `ARQ Demo Traders`) — not a customer's live company. No customer
  consent question applies to them; they are ARQ's own data.
- **No consent has been sought or obtained from any customer** to capture, retain, or use their
  Tally XML for evidence purposes. `docs/specs/changes/003-.../PLAN.md` §2 and §25 both require
  explicit consent and anonymization before a customer fixture may be tracked — none exists.
- The one open item recorded in `AGENTS.md` §9 (colleague test tenant `quaidjohar` always syncs
  0 ledgers/0 bills) is a candidate for a **consented** real-company capture but that consent has
  not been requested in this session, and this agent has no channel to the colleague to request it.
- This session captured **no new data of any kind** — it only read what was already tracked in
  the repository. That preserves REQ-011 (raw-source minimization) and REQ-054 (diagnostics
  require explicit consent) by construction: nothing new was collected.

## 5. Minimized read-only collection procedure (for closing the 5.4–5.11 gaps)

To evidence any of the blocked domains above, a future session with **actual access to a running
TallyPrime instance** (this agent has none — it runs off-device from the client PC) must:

1. Pick the smallest test company that already exercises the target domain (e.g., a company with
   at least one posted Purchase voucher and one Payment voucher, for 5.6/5.7). Prefer ARQ's own
   test companies (`ARQ AA`/`ARQ Code Test`/`ARQ Demo Traders`) over any customer data. A customer
   capture requires the owner's explicit written consent and a documented anonymization pass on
   party names/amounts before it is committed — do not track a raw customer export.
2. Draft the request envelope (`TALLYREQUEST=Export`/`Type=Collection` for masters, or
   `TALLYREQUEST=Export Data`/`EXPORTDATA`/`REQUESTDESC`/`REPORTNAME` for report exports — the
   `bills_receivable` envelope shows the working report-export shape; `envelopes.py` documents
   that the more "standard" `TYPE=Data`/`ID=<ReportName>` skeleton silently returns an empty
   envelope for at least one report, so each new envelope must be tried and observed, never
   assumed from documentation).
3. Send it to Tally's local HTTP XML gateway (port 9000, per `AGENTS.md` §2) using the existing
   `connector/src/arq_connector/tally/client.py` transport or an equivalent manual `curl`/HTTP
   POST, read-only (`TALLYREQUEST=Export`/`Export Data` only — never `Import Data`, per DEC-003
   and the constitution's read-only rule).
4. Save the **raw response** to `connector/tests/fixtures/<domain>.xml` only after confirming it
   contains no unintended customer content beyond the deliberately captured test scenario, and
   note in `connector/tests/fixtures/README.md` (matching its existing style): what company, what
   date, what report/collection, and what the fixture is meant to prove (e.g. "zero case",
   "one row", "multi-row grouping").
5. Cross-check the captured values by hand against the equivalent Tally report/export screen
   (Trial Balance, Sales Register, Bills Payable, Stock Summary, etc. — per `PLAN.md`'s
   "Identity and named comparison boundary" column) for the *same* company and *as-of* date before
   treating the fixture as reviewed evidence.
6. Only then write or extend a parser/contract doc under `contracts/`, documenting field-by-field
   what was actually observed — never the candidate table's guesses.
7. Never let raw XML travel further than the local fixture file and this evidence trail. Ordinary
   sync traffic remains parsed facts only, per REQ-011; this collection procedure is the "explicit
   diagnostic contract" carve-out in spec Section 20, not a template for production ingestion.

This procedure needs a human with TallyPrime access (owner, or an owner-directed connector-side
agent session actually running on a Windows PC next to Tally) to execute steps 1–5. No coding
agent working from this repository checkout can perform them.

## 6. Gate status

Per `PLAN.md` §11, **G01 (source feasibility)** blocks domain contract approval and all dependent
code. This inventory shows G01 is:

- **Partially open** for 5.1 (company identity only) and 5.3 (receivables, single-bill limits).
- **Fully closed/blocked** for 5.2 (beyond the one debtor ledger), 5.4, 5.5, 5.6, 5.7, 5.8, 5.9,
  5.10, 5.11.

No slice that depends on a blocked domain (SLICE-03, SLICE-04, SLICE-05, and everything
downstream of them per the requirement-coverage table in `TASKS.md`) can be completed honestly
until new evidence is captured under §5 above.

## 7. Stop

This slice's own checks are satisfied: synthetic/consented/unverified evidence is separated
above, and every Section 5.1–5.11 domain has a named source-report target (from `PLAN.md`'s
table) and an explicit owner (ARQ, no external owner assigned yet). The evidence matrix in
§3 is the requested review artifact.

**Recording per the task list's own rule: this agent does not mark SLICE-01 accepted.** It is
"Ready for owner review." SLICE-02 (§ below, `contracts/open-bills.md`) proceeded on the same
session's authorization using only the receivables evidence already available; SLICE-03/04/05
are recorded as blocked in `TASKS.md`/`VERIFICATION.md` rather than silently produced from the
candidate table.
