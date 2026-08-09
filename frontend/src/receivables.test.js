import test from "node:test";
import assert from "node:assert/strict";

import { T } from "./i18n.js";
import {
  agingKey,
  buildDueTimeline,
  buildExposureTrajectory,
  filterBills,
  summarizeBills,
} from "./receivables.js";

const bills = [
  {
    party: "Alpha Tools",
    bill_ref: "A-1",
    bill_date: "2026-01-10",
    due_date: "2026-02-10",
    amount: 75000,
    overdue_days: 12,
  },
  {
    party: "Beta Works",
    bill_ref: "B-9",
    bill_date: "2026-02-10",
    due_date: "2026-03-10",
    amount: 650000,
    overdue_days: 92,
  },
  {
    party: "Alpha Tools",
    bill_ref: "A-2",
    bill_date: "2026-03-10",
    due_date: "2026-04-10",
    amount: 120000,
    overdue_days: 0,
  },
];

test("aging boundaries stay stable", () => {
  assert.deepEqual(
    [0, 1, 30, 31, 60, 61, 90, 91].map(agingKey),
    ["not_due", "1_30", "1_30", "31_60", "31_60", "61_90", "61_90", "90_plus"],
  );
});

test("filters combine search, aging and amount without mutating source order", () => {
  const original = bills.map((bill) => bill.bill_ref);
  const result = filterBills(bills, {
    query: "beta",
    party: "all",
    aging: "90_plus",
    amount: "5l_10l",
    sort: "overdue_desc",
  });
  assert.deepEqual(result.map((bill) => bill.bill_ref), ["B-9"]);
  assert.deepEqual(bills.map((bill) => bill.bill_ref), original);
});

test("summary recalculates visible portfolio KPIs", () => {
  assert.deepEqual(summarizeBills(bills), {
    outstanding: 845000,
    overdue: 725000,
    not_due: 120000,
    bill_count: 3,
    party_count: 2,
    overdue_bill_count: 2,
    avg_overdue_days: 52,
    max_overdue_days: 92,
    top_party: "Beta Works",
    concentration_pct: 76.9,
    overdue_pct: 85.8,
    average_bill: 281666.67,
    ninety_plus_amount: 650000,
    ninety_plus_count: 1,
    ninety_plus_pct: 76.9,
  });
});

test("long date series collapse older values while preserving totals", () => {
  const dated = Array.from({ length: 6 }, (_, index) => ({
    ...bills[0],
    bill_ref: `M-${index}`,
    bill_date: `2025-0${index + 1}-10`,
    due_date: `2025-0${index + 1}-20`,
    amount: 100 + index,
  }));
  const trajectory = buildExposureTrajectory(dated, 4);
  const timeline = buildDueTimeline(dated, 4);
  assert.equal(trajectory.length, 4);
  assert.equal(trajectory[0].earlier, true);
  assert.equal(timeline.length, 4);
  assert.equal(timeline[0].earlier, true);
  assert.equal(
    trajectory.reduce((sum, month) => sum + month.amount, 0),
    dated.reduce((sum, bill) => sum + bill.amount, 0),
  );
});

test("new receivables controls are translated in every supported language", () => {
  const keys = [
    "receivableFilters", "matchingBills", "portfolioPulse", "overdueShare",
    "openExposureTrajectory", "cleanupEmail", "resetFilters",
  ];
  for (const language of ["en", "hi", "gu", "mr"]) {
    for (const key of keys) assert.ok(T[language][key], `${language}.${key} is missing`);
  }
});
