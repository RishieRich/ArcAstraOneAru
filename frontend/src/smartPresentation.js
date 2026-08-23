import { buildSmartMeaning } from "./businessSummary.js";
import {
  chartPeriod,
  finiteChartValue,
  formatChartValue,
  smartWarningKey,
} from "./chartModel.js";

const SMART_DOMAINS = new Set([
  "gst",
  "sales",
  "purchase",
  "expense",
  "inventory",
  "payroll",
  "receivables",
  "general",
]);

export function smartDomainKey(domain) {
  return SMART_DOMAINS.has(domain) ? domain : "general";
}

export function smartAggregation(chart = {}) {
  if (chart.id === "ranking" && !chart.metric_label) return "count";
  return "sum";
}

export function smartUnitKey(format, aggregation) {
  if (aggregation === "count" || aggregation === "distinct" || format === "integer") {
    return "countUnit";
  }
  if (format === "currency") return "currencyUnit";
  if (format === "percent") return "percentUnit";
  return "unknownUnit";
}

export function formatSmartValue(value, format, { compact = false } = {}) {
  const parsed = finiteChartValue(value);
  if (parsed === null) return "\u2014";
  return formatChartValue(parsed, format, {
    compact,
    maximumFractionDigits: 4,
  });
}

export function normalizeSmartPoints(chart = {}) {
  return (chart.points || []).map((point, index) => ({
    key: `${chart.id || chart.type || "chart"}-${index}`,
    label: String(point?.label ?? ""),
    rawValue: point?.value,
    value: finiteChartValue(point?.value),
  }));
}

export function buildSmartChartPresentation(chart = {}) {
  const points = normalizeSmartPoints(chart);
  const aggregation = smartAggregation(chart);
  return {
    id: ["trend", "ranking", "mix"].includes(chart.id) ? chart.id : "unknown",
    type: ["line", "bar", "donut"].includes(chart.type) ? chart.type : "unknown",
    metric: chart.metric_label || null,
    dimension: chart.dimension_label || null,
    format: chart.format || "number",
    aggregation,
    unitKey: smartUnitKey(chart.format, aggregation),
    period: chart.id === "trend" ? chartPeriod(points) : null,
    points,
  };
}

function classifyWarning(warning) {
  const classified = smartWarningKey(warning);
  if (
    classified.key === "generic"
    && String(warning || "").includes("row workbook limit")
  ) {
    return { key: "rowLimit", count: classified.count };
  }
  return classified;
}

function warningFacts(smartData, dataset) {
  const facts = [
    ...(smartData.warnings || []).map((warning, index) => ({
      ...classifyWarning(warning),
      id: `workbook-${index}`,
      source: "workbook",
    })),
    ...(dataset.warnings || []).map((warning, index) => ({
      ...classifyWarning(warning),
      id: `dataset-${index}`,
      source: "dataset",
    })),
  ];
  const duplicateCount = finiteChartValue(
    dataset.duplicate_rows ?? smartData.duplicate_rows,
  );
  if (
    duplicateCount > 0
    && !facts.some((warning) => warning.key === "duplicates")
  ) {
    facts.push({
      id: "dataset-duplicate-summary",
      source: "dataset",
      key: "duplicates",
      count: duplicateCount,
    });
  }
  const sheetNames = (smartData.skipped_sheets || []).map(String).filter(Boolean);
  if (sheetNames.length) {
    const skipped = facts.find((warning) => warning.key === "skippedSheets");
    if (skipped) skipped.sheetNames = sheetNames;
    else {
      facts.push({
        id: "workbook-skipped-sheets",
        source: "workbook",
        key: "skippedSheets",
        count: sheetNames.length,
        sheetNames,
      });
    }
  }
  return facts;
}

export function buildSmartPresentation(smartData = {}, dataset = {}) {
  const meaning = buildSmartMeaning(smartData, dataset);
  return {
    ...meaning,
    filename: smartData.filename || null,
    domainKey: smartDomainKey(dataset.domain),
    warnings: warningFacts(smartData, dataset),
    summaryKpis: (dataset.kpis || []).slice(0, 3),
    supportingKpis: (dataset.kpis || []).slice(3),
    charts: (dataset.charts || []).map(buildSmartChartPresentation),
  };
}
