import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFinanceAnswer,
  buildReceivablesAnswer,
  buildSmartMeaning,
} from "./businessSummary.js";

test("receivables answer selects existing deterministic totals without changing them", () => {
  const answer = buildReceivablesAnswer({
    outstanding: 400000,
    overdue: 125000,
    overdue_pct: 31.25,
    ninety_plus_amount: 50000,
    bill_count: 7,
    party_count: 3,
  });
  assert.deepEqual(answer, {
    outstanding: 400000,
    overdue: 125000,
    overduePct: 31.25,
    notDue: 0,
    ninetyPlus: 50000,
    ninetyPlusCount: 0,
    billCount: 7,
    partyCount: 3,
    overdueBillCount: 0,
    averageBill: 0,
    averageOverdueDays: 0,
    maxOverdueDays: 0,
    topParty: null,
    concentrationPct: 0,
    hasOverdue: true,
    hasMatches: true,
    filtered: false,
    visibleCount: 7,
    totalCount: 7,
    billDateCoverage: {
      first: null,
      last: null,
      validCount: 0,
      missingCount: 0,
      missingAmount: 0,
      missingOverdue: 0,
      missingOnTrack: 0,
    },
    dueDateCoverage: {
      first: null,
      last: null,
      validCount: 0,
      missingCount: 0,
      missingAmount: 0,
      missingOverdue: 0,
      missingOnTrack: 0,
    },
    lastSyncAt: null,
    nextTarget: "oldest",
  });
});

test("receivables answer keeps the filtered scope, date exclusions, and next action together", () => {
  const answer = buildReceivablesAnswer(
    {
      outstanding: 175.75,
      overdue: 75.25,
      bill_count: 2,
      overdue_bill_count: 1,
    },
    {
      bills: [
        { amount: 75.25, overdue_days: 5, bill_date: "2026-01-10", due_date: null },
        { amount: 100.5, overdue_days: 0, bill_date: null, due_date: "2026-03-20" },
      ],
      totalBillCount: 9,
      filtered: true,
      lastSyncAt: "2026-08-23T10:00:00Z",
    },
  );

  assert.equal(answer.visibleCount, 2);
  assert.equal(answer.totalCount, 9);
  assert.equal(answer.billDateCoverage.missingAmount, 100.5);
  assert.equal(answer.dueDateCoverage.missingOverdue, 75.25);
  assert.equal(answer.nextTarget, "oldest");
});

test("an empty filtered receivables answer points back to the filters", () => {
  const answer = buildReceivablesAnswer(
    { bill_count: 0 },
    { bills: [], totalBillCount: 4, filtered: true },
  );
  assert.equal(answer.hasMatches, false);
  assert.equal(answer.nextTarget, "filters");
});

test("finance answer includes only connected book totals and preserves signed result", () => {
  const answer = buildFinanceAnswer({
    kinds: ["sales", "expense"],
    pnl_complete: false,
    totals: { sales: 500000, purchase: 900000, expense: 125000, operating_result: -25000 },
    date_range: { from: "2026-01-01", to: "2026-03-31" },
    period: { months: 3, active_months: 2 },
    last_import_at: "2026-03-31T12:00:00Z",
  });
  assert.deepEqual(answer.facts.map((fact) => fact.key), ["sales", "expense", "partialNegative"]);
  assert.equal(answer.facts.at(-1).value, -25000);
  assert.deepEqual(answer.connectedKinds, ["sales", "expense"]);
  assert.deepEqual(answer.missingKinds, ["purchase"]);
  assert.equal(answer.to, "2026-03-31");
  assert.equal(answer.lastImportAt, "2026-03-31T12:00:00Z");
  assert.equal(answer.next, "missing");
});

test("finance answer never headlines unconnected or missing totals and chooses a supported next check", () => {
  const answer = buildFinanceAnswer({
    kinds: ["sales", "purchase", "expense"],
    pnl_complete: true,
    totals: { sales: 500000, purchase: 300000, expense: 100000, operating_result: 100000 },
    monthly: [
      { month: "2026-01", net_result: 120000 },
      { month: "2026-02", net_result: -20000 },
    ],
    products: { has_data: true },
  });
  assert.deepEqual(answer.facts.map((fact) => fact.key), [
    "sales", "purchase", "expense", "profit",
  ]);
  assert.ok(answer.facts.length <= 5);
  assert.deepEqual(answer.missingKinds, []);
  assert.equal(answer.next, "weak");

  const unsupported = buildFinanceAnswer({
    kinds: ["sales"],
    totals: { purchase: 999, operating_result: null },
  });
  assert.deepEqual(unsupported.facts, []);
});

test("Smart meaning states source, grouping, aggregation, unit, and covered period", () => {
  const meaning = buildSmartMeaning(
    { last_import_at: "2026-08-23T10:00:00Z" },
    {
      sheet_name: "Orders",
      rows: 12,
      charts: [{
        id: "trend",
        format: "currency",
        metric_label: "Net Amount",
        dimension_label: "Invoice Date",
        points: [
          { label: "2026-01", value: 10 },
          { label: "2026-02", value: 20 },
        ],
      }],
    },
  );
  assert.equal(meaning.sheet, "Orders");
  assert.equal(meaning.metric, "Net Amount");
  assert.equal(meaning.dimension, "Invoice Date");
  assert.equal(meaning.aggregation, "sum");
  assert.deepEqual(meaning.trendPeriod, { first: "2026-01", last: "2026-02", count: 2 });
  assert.equal(meaning.rowScope, "all_analyzed_rows");
  assert.equal(meaning.fullDateRangeAvailable, false);
  assert.equal(meaning.isGeneric, true);
});
