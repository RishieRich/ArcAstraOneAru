# Fixtures

Both files here are **real, live-captured** responses from a running TallyPrime
instance (not hand-written samples), captured while validating M1/M2 against
`ARQ AA` / `ARQ Code Test` / `ARQ Demo Traders` on 2026-07-11.

- `list_of_companies.xml` — response to the `ARQ List of Companies` collection
  request (see `envelopes.py`). Shows 3 open companies with real GUIDs.
- `debtor_ledgers.xml` — response to the `ARQ Debtor Ledgers` collection
  request for company "ARQ Code Test", which has one real Sundry Debtor
  ledger ("Alpha Customer", ₹0 balance).

**Not covered:** a Bills Receivable fixture. None of the 3 companies open
during testing had any vouchers/outstanding bills, and the envelope shape in
the plan doc (`TYPE=Data`, `ID=Bills Receivable`) turned out to be wrong —
Tally returned `Unknown Request, cannot be processed`. This needs a company
with real bill data before it can be fixed and verified; see the connector's
output README for details.
