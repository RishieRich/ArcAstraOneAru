# Putting test data into Tally (10 minutes)

The connector syncs exactly two things:

1. **Customers** — ledgers filed under the group *Sundry Debtors*.
2. **Unpaid sales bills** owed by those customers — Tally's *Bills Receivable*.

So an empty sync usually means: no customer ledger, or no **unpaid** sales bill against one. Purchases, stock items, cash sales and already-paid invoices are all invisible to it — that's by design.

Below: turn on one setting, make two ledgers, enter one bill. Keys are TallyPrime; ERP 9 differences are noted.

---

## Step 1 — Turn on bill-by-bill (one time)

Without this, Tally tracks only a customer's total balance, and Bills Receivable stays **empty** no matter how many invoices you enter. This is the #1 cause of "my company has data but the sync is blank".

1. From the Gateway of Tally press **F11** (Company Features).
2. Set **Maintain Accounts** → `Yes`.
3. Set **Enable Bill-wise entry** → `Yes`.
   *(ERP 9: it reads "Maintain bill-wise details".)*
4. **Ctrl+A** to accept.

---

## Step 2 — Create a customer ledger

Gateway of Tally → **Create** → **Ledger**. *(ERP 9: Accounts Info → Ledgers → Create)*

| Field | Enter |
|---|---|
| Name | `Sharma Traders` |
| Under | `Sundry Debtors` ← **must be exactly this group** |
| Maintain balances bill-by-bill | `Yes` |
| Opening balance | leave `0` |

**Ctrl+A** to save.

> If "Maintain balances bill-by-bill" doesn't appear, Step 1 wasn't saved. Go back and do it.

---

## Step 3 — Create a sales ledger

Most companies already have one called `Sales`. Check under **Chart of Accounts → Ledgers**. If it's there, skip this step.

If not — Gateway of Tally → **Create** → **Ledger**:

| Field | Enter |
|---|---|
| Name | `Sales` |
| Under | `Sales Accounts` |

**Ctrl+A** to save.

---

## Step 4 — Enter an unpaid sales bill

This is the entry that actually shows up.

1. Gateway of Tally → **Vouchers** → press **F8** (Sales).
2. Press **Ctrl+H** → choose **Accounting Invoice**.
   *(This avoids stock items entirely. If the screen is asking you for item names and quantities, you're in the wrong mode — press Ctrl+H again.)*
3. Fill in:

| Field | Enter |
|---|---|
| Date | today (press **F2** to change it if needed) |
| Party A/c name | `Sharma Traders` |
| Reference no. | `INV-001` |
| Particulars (the ledger line) | `Sales` |
| Amount | `50000` |

4. Press **Enter** past the amount. A **Bill-wise Details** panel opens. This panel is the whole point — fill it carefully:

| Field | Enter |
|---|---|
| Type of Ref | **`New Ref`** ← not *Advance*, not *On Account* |
| Name | `INV-001` |
| Due Date / Credit Days | `30 Days` |
| Amount | `50000` |

5. **Ctrl+A** to save the voucher.

> **Do not record a receipt or payment against this bill.** A paid bill drops off Bills Receivable and the connector will see nothing.

---

## Step 5 — Make one bill overdue (optional, 30 seconds)

Nice for testing, because it makes the overdue-days column non-zero.

Repeat Step 4 with:

- **F2** → set the date to **60 days ago**
- Reference no. and bill name: `INV-002`
- Amount: `25000`
- Due date: `30 Days`

That bill is now ~30 days overdue.

---

## Step 6 — Confirm Tally itself can see it

Don't touch the connector until this shows something.

Gateway of Tally → **Display More Reports** → **Statements of Accounts** → **Outstandings** → **Receivables**.
*(ERP 9: Display → Statements of Accounts → Outstandings → Receivables)*

You should see your bills:

```
Date        Ref.No.   Party             Pending Amount   Due on      Overdue days
1-Apr-26    INV-001   Sharma Traders          50,000     1-May-26         0
...         INV-002   Sharma Traders          25,000     ...             30
```

**If this report is empty, the connector will sync empty too** — the problem is in the Tally entry, not in the app. Go back to Step 1 (bill-by-bill off) or Step 4 (Type of Ref wasn't `New Ref`).

---

## Step 7 — Sync

Keep Tally **open** with this company **loaded**. In the ARQ connector: **Refresh** → pick this company → **Push Now**.

Green ✓ means the ledger and the bills reached the cloud.

---

## Quick reference — why a sync comes back empty

| Symptom | Cause |
|---|---|
| No customers synced | Ledger isn't under **Sundry Debtors** (e.g. filed under *Suspense* or a custom group). |
| Customers sync, but no bills | Bill-wise entry off (Step 1), or **Type of Ref** was *On Account* instead of **New Ref**. |
| Bills vanish after payment | Correct behaviour — only **outstanding** bills are synced. |
| Nothing at all | Wrong company selected in the connector, or the company isn't open in Tally. |
