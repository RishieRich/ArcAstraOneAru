import assert from "node:assert/strict";
import test from "node:test";
import {
  buildBookMix,
  buildBookTrend,
  buildFinanceTrend,
  buildProductPresentation,
  buildSamplePreview,
} from "./financePresentation.js";

test("finance trend includes connected books only and preserves signed, zero, and missing values", () => {
  const model = buildFinanceTrend({
    kinds: ["sales", "expense"],
    pnl_complete: false,
    monthly: [
      { month: "2026-01", sales: 100.25, purchase: 80, expense: 0, net_result: -20.5 },
      { month: "2026-02", sales: null, purchase: 40, expense: -5, net_result: null },
    ],
  });
  assert.deepEqual(model.connectedKinds, ["sales", "expense"]);
  assert.deepEqual(model.series.map((series) => series.key), ["sales", "expense", "result"]);
  assert.equal(model.series.at(-1).partial, true);
  assert.deepEqual(model.rows[0], {
    key: "2026-01",
    month: "2026-01",
    sales: 100.25,
    expense: 0,
    result: -20.5,
  });
  assert.equal(model.rows[1].sales, null);
  assert.equal(model.rows[1].expense, -5);
  assert.equal("purchase" in model.rows[0], false);
});

test("book trend preserves the established positive-active-month KPI calculation", () => {
  const model = buildBookTrend({
    kinds: ["sales"],
    totals: { sales: 150 },
    monthly: [
      { month: "2026-01", sales: 100 },
      { month: "2026-02", sales: -20 },
      { month: "2026-03", sales: 0 },
      { month: "2026-04", sales: 50 },
    ],
  }, "sales");
  assert.equal(model.activeMonths, 2);
  assert.equal(model.average, 75);
  assert.equal(model.best.month, "2026-01");
  assert.equal(model.change, -50);
  assert.deepEqual(model.points.map((point) => point.value), [100, -20, 0, 50]);
});

test("book mix uses the shown-six denominator and refuses a misleading negative donut", () => {
  const positive = buildBookMix([
    { name: "A", amount: 60 },
    { name: "B", amount: 40 },
    { name: "Outside shown six", amount: 900 },
  ], 2);
  assert.equal(positive.total, 100);
  assert.deepEqual(positive.rows.map((row) => row.share), [60, 40]);

  const signed = buildBookMix([
    { name: "Adjustment", amount: -10 },
    { name: "Recorded", amount: 30 },
  ]);
  assert.equal(signed.eligible, false);
  assert.equal(signed.reason, "negative");
  assert.deepEqual(signed.rows.map((row) => row.value), [-10, 30]);
  assert.deepEqual(signed.rows.map((row) => row.share), [null, null]);
});

test("product presentation only relabels the supplied item-line facts and preserves uncertainty", () => {
  const products = {
    by_kind: {
      purchase: {
        product_count: 2,
        value: -250.5,
        quantity: 0,
        quantity_coverage_pct: 50,
        details: [{
          name: "Long material grade",
          amount: -250.5,
          quantity: 0,
          unit: null,
          average_rate: null,
          transactions: 3,
          customers: 2,
          share_pct: -25.05,
          top_customer: "Supplier A",
          top_customer_amount: -125.25,
        }],
      },
    },
  };
  const model = buildProductPresentation(products, "purchase");
  assert.equal(model.kind, "purchase");
  assert.equal(model.value, -250.5);
  assert.equal(model.rows[0].quantity, 0);
  assert.equal(model.rows[0].unit, null);
  assert.equal(model.rows[0].topParty, "Supplier A");
  assert.equal(model.rows[0].parties, 2);
  assert.equal("ledger" in model.rows[0], false);
});

test("sample preview derives every displayed fact from the labelled sample arrays", () => {
  const model = buildSamplePreview(
    ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov"],
    ["Materials", "Payroll", "Logistics", "Other"],
    ["A", "B", "C", "D"],
  );
  assert.equal(model.monthly.length, 8);
  assert.equal(model.monthly.at(-1).value, 720000);
  assert.ok(Math.abs(model.firstToLatestPercent - 132.25806451612902) < 1e-10);
  assert.equal(model.costs.reduce((sum, row) => sum + row.value, 0), 100);
  assert.deepEqual(model.products.map((row) => row.value), [1240000, 980000, 710000, 450000]);
});
