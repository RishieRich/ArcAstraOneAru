import { chartPeriod, finiteChartValue } from "./chartModel.js";
import { receivablesDateCoverage } from "./receivablesChartModel.js";

function safe(value, fallback = 0) {
  const parsed = finiteChartValue(value);
  return parsed === null ? fallback : parsed;
}

export function buildReceivablesAnswer(totals = {}, context = {}) {
  const hasBillScope = Array.isArray(context.bills);
  const bills = hasBillScope ? context.bills : [];
  const billCount = safe(totals.bill_count);
  const visibleCount = hasBillScope ? bills.length : billCount;
  const totalCount = safe(context.totalBillCount, visibleCount);
  const overdueBillCount = safe(totals.overdue_bill_count);
  const hasOverdue = overdueBillCount > 0 || safe(totals.overdue) > 0;
  const hasMatches = visibleCount > 0;
  return {
    outstanding: safe(totals.outstanding),
    overdue: safe(totals.overdue),
    overduePct: safe(totals.overdue_pct),
    notDue: safe(totals.not_due),
    ninetyPlus: safe(totals.ninety_plus_amount),
    ninetyPlusCount: safe(totals.ninety_plus_count),
    billCount,
    partyCount: safe(totals.party_count),
    overdueBillCount,
    averageBill: safe(totals.average_bill),
    averageOverdueDays: safe(totals.avg_overdue_days),
    maxOverdueDays: safe(totals.max_overdue_days),
    topParty: totals.top_party || null,
    concentrationPct: safe(totals.concentration_pct),
    hasOverdue,
    hasMatches,
    filtered: Boolean(context.filtered),
    visibleCount,
    totalCount,
    billDateCoverage: receivablesDateCoverage(bills, "bill_date"),
    dueDateCoverage: receivablesDateCoverage(bills, "due_date"),
    lastSyncAt: context.lastSyncAt || null,
    nextTarget: !hasMatches && context.filtered
      ? "filters"
      : hasOverdue ? "oldest" : "due",
  };
}

export function buildFinanceAnswer(financials = {}) {
  const totals = financials.totals || {};
  const orderedKinds = ["sales", "purchase", "expense"];
  const connectedKinds = orderedKinds.filter((kind) =>
    (financials.kinds || []).includes(kind),
  );
  const missingKinds = orderedKinds.filter((kind) => !connectedKinds.includes(kind));
  const facts = [];
  connectedKinds.forEach((kind) => {
    const value = finiteChartValue(totals[kind]);
    if (value !== null) facts.push({ key: kind, value });
  });
  const result = finiteChartValue(totals.operating_result);
  if (result !== null) {
    facts.push({
      key: financials.pnl_complete
        ? result >= 0 ? "profit" : "loss"
        : result >= 0 ? "partialPositive" : "partialNegative",
      value: result,
      signed: true,
    });
  }
  const hasWeakMonth = (financials.monthly || []).some(
    (row) => (finiteChartValue(row?.net_result) ?? 0) < 0,
  );
  const next = missingKinds.length
    ? "missing"
    : hasWeakMonth
      ? "weak"
      : financials.products?.has_data
        ? "product"
        : "trend";
  return {
    facts: facts.slice(0, 5),
    pnlComplete: Boolean(financials.pnl_complete),
    connectedKinds,
    missingKinds,
    from: financials.date_range?.from || null,
    to: financials.date_range?.to || financials.date_range?.from || null,
    activeMonths: safe(financials.period?.active_months),
    totalMonths: safe(financials.period?.months),
    lastImportAt: financials.last_import_at || null,
    next,
  };
}

export function buildSmartMeaning(smartData = {}, dataset = {}) {
  const charts = dataset.charts || [];
  const primary = charts.find((chart) => chart.id === "trend")
    || charts.find((chart) => chart.metric_label)
    || charts[0]
    || null;
  const trend = charts.find((chart) => chart.id === "trend");
  const period = chartPeriod(trend?.points || []);
  const metric = primary?.metric_label || dataset.metric_columns?.[0]?.label || null;
  const dimension = primary?.dimension_label
    || dataset.dimension_columns?.[0]?.label
    || dataset.date_columns?.[0]?.label
    || null;
  const aggregation = primary?.id === "ranking" && !primary.metric_label ? "count" : "sum";
  return {
    sheet: dataset.sheet_name || null,
    metric,
    dimension,
    aggregation,
    format: primary?.format || dataset.metric_columns?.[0]?.format || null,
    trendPeriod: period,
    rowScope: "all_analyzed_rows",
    fullDateRangeAvailable: false,
    rows: safe(dataset.rows),
    lastImportAt: smartData.last_import_at || null,
    hasMetric: Boolean(metric),
    hasDimension: Boolean(dimension),
    isGeneric: true,
  };
}
