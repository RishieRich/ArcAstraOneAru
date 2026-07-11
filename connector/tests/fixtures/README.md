# Fixtures

All files here are **real, live-captured** responses from a running TallyPrime
instance (not hand-written samples), captured while validating M1/M2 against
`ARQ AA` / `ARQ Code Test` / `ARQ Demo Traders` on 2026-07-11.

- `list_of_companies.xml` — response to the `ARQ List of Companies` collection
  request (see `envelopes.py`). Shows 3 open companies with real GUIDs.
- `debtor_ledgers.xml` — response to the `ARQ Debtor Ledgers` collection
  request for company "ARQ Code Test". Captured **before** any test voucher
  existed, so it shows one Sundry Debtor ledger ("Alpha Customer") at ₹0
  balance — a legitimate "ledger exists, nothing owed yet" case.
- `bills_receivable.xml` — response to the `Bills Receivable` report export
  (see `envelopes.py` — note the working request shape is `TALLYREQUEST=
  "Export Data"` + `EXPORTDATA`/`REQUESTDESC`/`REPORTNAME`, not the plan
  doc's original `TYPE=Data`/`ID=Bills Receivable` skeleton, which returns an
  empty envelope). Captured **after** one real test sales voucher was created
  against Alpha Customer — one real outstanding bill (₹508,989 pending).

**Known limitation:** the bills-receivable parser's multi-bill grouping logic
(how multiple `<BILLFIXED>...</BILLFIXED>` + sibling groups repeat) is
inferred from this single-bill fixture, not independently confirmed. Verify
against a company with 2+ outstanding bills before fully trusting it at
scale.
