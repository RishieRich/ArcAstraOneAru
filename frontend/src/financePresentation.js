import {
  comparisonFromPrevious,
  donutEligibility,
  finiteChartValue,
} from "./chartModel.js";

export const FINANCE_KINDS = ["sales", "purchase", "expense"];

function orderedConnectedKinds(financials = {}) {
  const connected = new Set(financials.kinds || []);
  return FINANCE_KINDS.filter((kind) => connected.has(kind));
}

export function buildFinanceTrend(financials = {}) {
  const connectedKinds = orderedConnectedKinds(financials);
  const rows = (financials.monthly || []).map((row) => {
    const values = Object.fromEntries(
      connectedKinds.map((kind) => [kind, finiteChartValue(row?.[kind])]),
    );
    return {
      key: row?.month,
      month: row?.month || null,
      ...values,
      result: finiteChartValue(row?.net_result),
    };
  });
  const series = [
    ...connectedKinds.map((kind) => ({ key: kind, valueKey: kind })),
    {
      key: "result",
      valueKey: "result",
      partial: !financials.pnl_complete,
    },
  ];
  return { connectedKinds, rows, series };
}

export function buildBookTrend(financials = {}, kind) {
  const connected = orderedConnectedKinds(financials).includes(kind);
  const points = (financials.monthly || []).map((row) => ({
    key: row?.month,
    month: row?.month || null,
    value: finiteChartValue(row?.[kind]),
  }));

  // These KPIs deliberately preserve the existing Book Explorer contract: its
  // average and first-to-latest comparison use months with a positive value.
  const active = points.filter((point) => point.value !== null && point.value > 0);
  const total = finiteChartValue(financials.totals?.[kind]) ?? 0;
  const average = active.length ? total / active.length : 0;
  const best = active.reduce(
    (winner, point) => (!winner || point.value > winner.value ? point : winner),
    null,
  );
  const first = active[0] || null;
  const latest = active[active.length - 1] || null;
  const change = first && latest && first !== latest && first.value
    ? ((latest.value - first.value) / first.value) * 100
    : null;

  return {
    connected,
    points,
    total,
    average,
    activeMonths: active.length,
    best,
    first,
    latest,
    change,
  };
}

export function buildBookMix(rows = [], limit = 6) {
  const shown = rows.slice(0, limit).map((row, index) => ({
    key: row?.name || `row-${index}`,
    name: row?.name || "",
    value: finiteChartValue(row?.amount),
  }));
  const eligibility = donutEligibility(shown);
  const hasNegative = shown.some((row) => row.value !== null && row.value < 0);
  const total = eligibility.eligible ? eligibility.total : null;
  return {
    rows: shown.map((row) => ({
      ...row,
      share: total ? (row.value / total) * 100 : null,
    })),
    eligible: eligibility.eligible,
    reason: hasNegative ? "negative" : eligibility.reason,
    total,
  };
}

export function buildProductPresentation(products = {}, kind = "sales") {
  const raw = products.by_kind?.[kind] || {};
  const rows = (raw.details || []).map((row, index) => ({
    key: row?.name || `product-${index}`,
    name: row?.name || "",
    amount: finiteChartValue(row?.amount),
    quantity: finiteChartValue(row?.quantity),
    unit: String(row?.unit || "").trim() || null,
    averageRate: finiteChartValue(row?.average_rate),
    transactions: finiteChartValue(row?.transactions),
    parties: finiteChartValue(row?.customers),
    share: finiteChartValue(row?.share_pct),
    topParty: String(row?.top_customer || "").trim() || null,
    topPartyAmount: finiteChartValue(row?.top_customer_amount),
  }));
  return {
    kind,
    productCount: finiteChartValue(raw.product_count),
    value: finiteChartValue(raw.value),
    quantity: finiteChartValue(raw.quantity),
    quantityCoverage: finiteChartValue(raw.quantity_coverage_pct),
    rows,
  };
}

export const SAMPLE_MONTHLY_SALES = [
  310000, 370000, 420000, 400000, 510000, 550000, 640000, 720000,
];
export const SAMPLE_COST_SHARES = [54.6, 21.8, 14.1, 9.5];
export const SAMPLE_PRODUCT_VALUES = [1240000, 980000, 710000, 450000];

export function buildSamplePreview(monthLabels = [], costLabels = [], productLabels = []) {
  const monthly = SAMPLE_MONTHLY_SALES.map((value, index) => ({
    key: monthLabels[index] || `month-${index + 1}`,
    label: monthLabels[index] || `month-${index + 1}`,
    value,
  }));
  const change = comparisonFromPrevious(
    [monthly[0], monthly[monthly.length - 1]],
    1,
  );
  return {
    monthly,
    firstToLatestPercent: change?.percent ?? null,
    costs: SAMPLE_COST_SHARES.map((value, index) => ({
      key: costLabels[index] || `cost-${index + 1}`,
      label: costLabels[index] || `cost-${index + 1}`,
      value,
    })),
    products: SAMPLE_PRODUCT_VALUES.map((value, index) => ({
      key: productLabels[index] || `product-${index + 1}`,
      label: productLabels[index] || `product-${index + 1}`,
      value,
    })),
  };
}

