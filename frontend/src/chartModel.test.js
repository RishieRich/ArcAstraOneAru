import assert from "node:assert/strict";
import test from "node:test";
import {
  chartExtent,
  chartPeriod,
  comparisonFromPrevious,
  directLabelIndexes,
  donutEligibility,
  finiteChartValue,
  formatChartValue,
  shareOfPositiveTotal,
  smartWarningKey,
} from "./chartModel.js";

test("chart values preserve missing, negative, zero, and Indian formatting", () => {
  assert.equal(finiteChartValue(null), null);
  assert.equal(finiteChartValue(""), null);
  assert.equal(finiteChartValue(0), 0);
  assert.equal(formatChartValue(-125000, "currency"), "−₹1,25,000");
  assert.equal(formatChartValue(125000.5, "currency"), "₹1,25,000.5");
  assert.equal(formatChartValue(12500000, "currency", { compact: true }), "₹1.25 Cr");
  assert.equal(formatChartValue(null, "number"), "—");
});

test("chart extent remains truthful for negative, zero, and single-point inputs", () => {
  assert.deepEqual(chartExtent([null, undefined]), { minimum: 0, maximum: 1, hasValues: false });
  assert.deepEqual(chartExtent([-20, 0, 10]), { minimum: -20, maximum: 10, hasValues: true });
  assert.deepEqual(chartExtent([5]), { minimum: 0, maximum: 5, hasValues: true });
  assert.deepEqual(chartExtent([0]), { minimum: 0, maximum: 1, hasValues: true });
});

test("direct labels use low, high, and latest, then reduce dense charts to latest", () => {
  const points = [{ value: 5 }, { value: 2 }, { value: 9 }, { value: 7 }];
  assert.deepEqual(directLabelIndexes(points), [1, 2, 3]);
  assert.deepEqual(directLabelIndexes([{ value: 4 }]), [0]);
  assert.deepEqual(directLabelIndexes([{ value: 9 }, { value: 2 }, { value: 9 }]), [1, 2]);
  assert.deepEqual(
    directLabelIndexes(Array.from({ length: 36 }, (_, index) => ({ value: index }))),
    [35],
  );
});

test("period, comparison, and share facts are emitted only when mathematically valid", () => {
  const points = [
    { label: "2026-01", value: 0 },
    { label: "2026-02", value: null },
    { label: "2026-03", value: 10 },
  ];
  assert.deepEqual(chartPeriod(points), { first: "2026-01", last: "2026-03", count: 2 });
  assert.equal(comparisonFromPrevious(points, 2).percent, null);
  assert.equal(comparisonFromPrevious(points, 2).delta, 10);
  assert.equal(shareOfPositiveTotal(3, [{ value: 3 }, { value: 7 }]), 30);
  assert.equal(shareOfPositiveTotal(-3, [{ value: -3 }, { value: 7 }]), null);
});

test("Smart warning classification never requires a raw warning fallback", () => {
  assert.deepEqual(smartWarningKey("2 printed total rows"), { key: "totalRows", count: 2 });
  assert.equal(smartWarningKey("Unexpected parser wording").key, "generic");
});

test("donuts require a non-negative set with at least two positive values", () => {
  assert.deepEqual(
    donutEligibility([{ value: -1 }, { value: 2 }]),
    { eligible: false, reason: "invalid_values" },
  );
  assert.deepEqual(
    donutEligibility([{ value: 0 }, { value: 2 }]),
    { eligible: false, reason: "not_enough_positive_values" },
  );
  assert.deepEqual(
    donutEligibility([{ value: 2 }, { value: 3 }]),
    { eligible: true, reason: null, total: 5 },
  );
});
