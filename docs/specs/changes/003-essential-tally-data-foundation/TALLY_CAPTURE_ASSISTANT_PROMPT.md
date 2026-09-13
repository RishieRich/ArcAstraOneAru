# Local Tally evidence assistant prompt

Use this prompt only with an agent running on the same Windows PC as TallyPrime. Work one phase
at a time and return to the repository agent for the next phase.

## Phase 1 prompt — safe test-company and connectivity setup

```text
You are helping me prepare a synthetic ARQ Astra evidence company in TallyPrime. Work slowly,
one confirmed step at a time. If you can control the desktop, use visible TallyPrime UI actions
only; otherwise tell me exactly what to click. Stop after Phase 1 and report the requested facts.

Hard safety rules:
1. Never open, alter, export, or enter a voucher in any real/customer company.
2. The only company you may create or modify is exactly: ARQ Astra Evidence Test
3. Before every write, visibly confirm the selected company is ARQ Astra Evidence Test. If it is
   not exact or you are uncertain, stop immediately and ask me.
4. Use synthetic names and amounts only. Do not copy any customer, supplier, GST, bank, address,
   phone, email, credential, or transaction data.
5. Never send XML Import Data, never bulk-import vouchers, and never change an existing ARQ
   connector to write to Tally. Future evidence collection may use read-only Export/Export Data.
6. Do not delete or rewrite any existing company or voucher.
7. Do not upload raw XML or credentials to chat/cloud services.

Phase 1 tasks:
A. Ask me to open TallyPrime and show the company-selection screen.
B. Check whether ARQ Astra Evidence Test already exists. If absent, guide me to create it with:
   - Country: India
   - State: the owner's normal test state, or Not Applicable if this is only a local fixture
   - Maintain: Accounts with Inventory
   - Financial year beginning: 1 April 2026
   - Books beginning: 1 April 2026
   - Security/TallyVault: leave disabled for this synthetic local test company
   Do not invent GST registration, PAN, bank details, address, phone, or email.
C. Confirm the company is selected and its exact name is ARQ Astra Evidence Test.
D. Enable/confirm TallyPrime's local HTTP/XML access on port 9000 without enabling any remote or
   Internet-facing access. Do not change Windows firewall exposure beyond localhost.
E. From the ARQ repository's connector directory, run the existing read-only health check:
   .venv\Scripts\python.exe -m arq_connector.cli doctor
F. Do not create ledgers, stock items, or vouchers yet. Stop after the doctor check.

Report only:
- exact selected company name;
- financial-year and books-beginning dates;
- whether Accounts with Inventory is enabled;
- whether local port 9000 is enabled;
- the doctor exit code and sanitized message (no secrets or business data);
- any step that could not be completed.
```

## Why the prompt stops here

The next phase creates a deliberately small synthetic ledger and inventory master set. Keeping
company setup, masters, vouchers, and evidence export in separate confirmed phases prevents an
agent from entering data into the wrong company and makes every captured boundary reviewable.
