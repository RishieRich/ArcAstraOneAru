import assert from "node:assert/strict";
import test from "node:test";

import {
  formatReceivableExactMoney,
  formatReceivableShare,
  receivablesDateCoverage,
} from "./receivablesChartModel.js";
import { deriveReceivables, filterBills } from "./receivables.js";

test("receivables date coverage matches the chart month boundary and reconciles exclusions", () => {
  const bills = [
    { amount: -100.25, overdue_days: 3, due_date: "2026-02-10" },
    { amount: 40.5, overdue_days: 0, due_date: "" },
    { amount: 10, overdue_days: 0, due_date: "2026-04-01" },
    { amount: 9.75, overdue_days: 1, due_date: "not-a-date" },
  ];
  const coverage = receivablesDateCoverage(bills, "due_date");

  assert.deepEqual(coverage, {
    first: "2026-02",
    last: "2026-04",
    validCount: 2,
    missingCount: 2,
    missingAmount: 50.25,
    missingOverdue: 9.75,
    missingOnTrack: 40.5,
  });
});

test("receivables exact values retain paise while missing values stay missing", () => {
  assert.equal(formatReceivableExactMoney(-1250.5), "₹1,250.5");
  assert.equal(formatReceivableExactMoney(null), "—");
  assert.equal(formatReceivableShare(25, 200), "12.5%");
  assert.equal(formatReceivableShare(0, 0), null);
});

test("filtered chart values and disclosed missing dates reconcile to the same portfolio total", () => {
  const bills = [
    {
      party: "Alpha",
      bill_ref: "A-1",
      amount: 100.25,
      overdue_days: 5,
      bill_date: "2026-01-10",
      due_date: "2026-02-10",
    },
    {
      party: "Alpha",
      bill_ref: "A-2",
      amount: -50.5,
      overdue_days: 0,
      bill_date: null,
      due_date: null,
    },
    {
      party: "Beta",
      bill_ref: "B-1",
      amount: 900,
      overdue_days: 30,
      bill_date: "2026-03-10",
      due_date: "2026-04-10",
    },
  ];
  const filtered = filterBills(bills, {
    query: "alpha",
    party: "all",
    aging: "all",
    amount: "all",
    sort: "amount_desc",
  });
  const visible = deriveReceivables(filtered);
  const billDates = receivablesDateCoverage(filtered, "bill_date");
  const dueDates = receivablesDateCoverage(filtered, "due_date");
  const agingTotal = visible.aging.reduce((sum, bucket) => sum + bucket.amount, 0);
  const dueTotal = visible.dueTimeline.reduce(
    (sum, month) => sum + month.overdue + month.on_track,
    dueDates.missingAmount,
  );
  const billMonthTotal = visible.trajectory.reduce(
    (sum, month) => sum + month.amount,
    billDates.missingAmount,
  );

  assert.equal(visible.totals.outstanding, 150.75);
  assert.equal(agingTotal, visible.totals.outstanding);
  assert.equal(dueTotal, visible.totals.outstanding);
  assert.equal(billMonthTotal, visible.totals.outstanding);
  assert.equal(filtered.length, 2);
  assert.equal(bills.length, 3);
});
