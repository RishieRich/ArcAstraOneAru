import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSmartChartPresentation,
  buildSmartPresentation,
  formatSmartValue,
  normalizeSmartPoints,
  smartDomainKey,
  smartUnitKey,
} from "./smartPresentation.js";

test("Smart presentation keeps all-row scope separate from the displayed trend range", () => {
  const smartData = {
    filename: "operations.xlsx",
    last_import_at: "2026-08-23T10:00:00Z",
    warnings: [],
  };
  const dataset = {
    sheet_name: "Orders",
    domain: "sales",
    rows: 250,
    kpis: [],
    charts: [{
      id: "trend",
      type: "line",
      metric_label: "Net Amount",
      dimension_label: "Invoice Date",
      format: "currency",
      points: [
        { label: "2026-01", value: 10 },
        { label: "2026-02", value: 20 },
      ],
    }],
  };

  const result = buildSmartPresentation(smartData, dataset);
  assert.equal(result.filename, "operations.xlsx");
  assert.equal(result.sheet, "Orders");
  assert.equal(result.rows, 250);
  assert.equal(result.rowScope, "all_analyzed_rows");
  assert.equal(result.fullDateRangeAvailable, false);
  assert.deepEqual(result.trendPeriod, { first: "2026-01", last: "2026-02", count: 2 });
  assert.deepEqual(result.charts[0].period, { first: "2026-01", last: "2026-02", count: 2 });
});

test("warnings are classified without carrying unknown backend prose into the view model", () => {
  const result = buildSmartPresentation(
    {
      warnings: [
        "Only the first 12 sheets were inspected.",
        "Unexpected parser wording with private detail",
      ],
      skipped_sheets: ["Hidden Helper"],
    },
    {
      warnings: ["2 repeated row(s) were kept and marked as possible duplicates."],
      kpis: [],
      charts: [],
    },
  );

  assert.deepEqual(
    result.warnings.map(({ key, count, source }) => ({ key, count, source })),
    [
      { key: "sheetLimit", count: 12, source: "workbook" },
      { key: "generic", count: 0, source: "workbook" },
      { key: "duplicates", count: 2, source: "dataset" },
      { key: "skippedSheets", count: 1, source: "workbook" },
    ],
  );
  assert.equal(JSON.stringify(result.warnings).includes("private detail"), false);
  assert.deepEqual(result.warnings.at(-1).sheetNames, ["Hidden Helper"]);
});

test("unknown domains and physical number units use safe generic keys", () => {
  assert.equal(smartDomainKey("future-backend-domain"), "general");
  assert.equal(smartUnitKey("number", "sum"), "unknownUnit");
  assert.equal(smartUnitKey("currency", "sum"), "currencyUnit");
  assert.equal(smartUnitKey("integer", "count"), "countUnit");
});

test("chart normalization preserves signed, zero, and missing API values without mutation", () => {
  const chart = {
    id: "ranking",
    type: "bar",
    format: "currency",
    metric_label: "Amount",
    dimension_label: "Region",
    points: [
      { label: "West", value: -125000.25 },
      { label: "East", value: 0 },
      { label: "North", value: null },
    ],
  };
  const before = structuredClone(chart);
  const points = normalizeSmartPoints(chart);
  const presentation = buildSmartChartPresentation(chart);

  assert.deepEqual(chart, before);
  assert.deepEqual(points.map((point) => point.value), [-125000.25, 0, null]);
  assert.equal(presentation.aggregation, "sum");
  assert.equal(formatSmartValue(-125000.25, "currency"), "\u2212\u20b91,25,000.25");
  assert.equal(formatSmartValue(125000.2575, "currency"), "\u20b91,25,000.2575");
  assert.equal(formatSmartValue(null, "number"), "\u2014");
});
