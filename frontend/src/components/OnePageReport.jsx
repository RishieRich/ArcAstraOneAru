import { formatMoney, formatMonth } from "../api";
import { IconClose, IconFile } from "../icons";
import BrandLogo from "./BrandLogo";

const FOCUS_PATTERNS = {
  product: /\b(product|products|item|items|sku|stock|quantity|qty|rate|maal)\b/i,
  receivables: /\b(receivable|receivables|overdue|outstanding|collection|collections|baki|udhar)\b/i,
  profitability: /\b(profit|loss|margin|expense|expenses|purchase|purchases|cost|kharcha)\b/i,
  sales: /\b(sales|sale|revenue|customer|customers|buyer|vechan|bikri)\b/i,
};

function reportFocus(question) {
  return (
    Object.entries(FOCUS_PATTERNS).find(([, pattern]) => pattern.test(question))?.[0] ||
    "overview"
  );
}

function firstAvailable(...values) {
  return values.find((value) => value?.length) || [];
}

function availableProductSummary(finance) {
  const byKind = finance.products?.by_kind || {};
  return byKind.sales?.details?.length ? byKind.sales : byKind.purchase || byKind.sales;
}

function buildKpis(data, focus, t) {
  const finance = data.financials;
  const products = availableProductSummary(finance);
  const topProduct = products?.details?.[0];
  const topCustomer = finance.counterparties?.sales?.[0];
  const result = finance.totals.operating_result;

  if (focus === "product") {
    return [
      [t.productValue, formatMoney(products?.value || 0)],
      [t.productsTracked, products?.product_count || 0],
      [t.topProduct, topProduct?.name || "—"],
      [t.topProductValue, formatMoney(topProduct?.amount || 0)],
    ];
  }
  if (focus === "receivables") {
    return [
      [t.outstanding, formatMoney(data.totals.outstanding)],
      [t.overdue, formatMoney(data.totals.overdue)],
      [t.bills, data.totals.bill_count],
      [t.customerConcentration, `${data.totals.concentration_pct || 0}%`],
    ];
  }
  if (focus === "profitability") {
    return [
      [t.salesTotal, formatMoney(finance.totals.sales)],
      [t.purchaseTotal, formatMoney(finance.totals.purchase)],
      [t.expenseTotal, formatMoney(finance.totals.expense)],
      [
        finance.pnl_complete ? t.estimatedResult : t.partialResult,
        `${result < 0 ? "−" : ""}${formatMoney(result)}`,
      ],
    ];
  }
  if (focus === "sales") {
    return [
      [t.salesTotal, formatMoney(finance.totals.sales)],
      [t.monthlyAverageLabel, formatMoney(finance.totals.average_monthly_sales)],
      [t.transactions, finance.totals.transactions],
      [t.topCustomer, topCustomer?.party || "—"],
    ];
  }
  return [
    [t.salesTotal, formatMoney(finance.totals.sales)],
    [t.outstanding, formatMoney(data.totals.outstanding)],
    [t.productsTracked, products?.product_count || 0],
    [
      finance.pnl_complete ? t.estimatedResult : t.uploadCoverage,
      finance.pnl_complete
        ? `${result < 0 ? "−" : ""}${formatMoney(result)}`
        : `${finance.kinds.length}/3`,
    ],
  ];
}

function rankingRows(data, focus) {
  const finance = data.financials;
  if (focus === "product") {
    return (availableProductSummary(finance)?.details || [])
      .slice(0, 6)
      .map((row) => ({ label: row.name, amount: row.amount }));
  }
  if (focus === "receivables") {
    return (data.top_debtors || [])
      .slice(0, 6)
      .map((row) => ({ label: row.party, amount: row.amount }));
  }
  if (focus === "profitability") {
    return firstAvailable(
      finance.breakdown?.expense,
      finance.breakdown?.purchase,
      finance.breakdown?.sales,
    )
      .slice(0, 6)
      .map((row) => ({ label: row.name, amount: row.amount }));
  }
  return firstAvailable(
    finance.counterparties?.sales,
    finance.products?.by_kind?.sales?.details,
    data.top_debtors,
  )
    .slice(0, 6)
    .map((row) => ({
      label: row.party || row.name,
      amount: row.amount,
    }));
}

function MonthlyReportChart({ monthly, focus, trendLabel, t }) {
  const key = focus === "profitability" ? "net_result" : "sales";
  const values = monthly.map((point) => point[key] || 0);
  const signed = key === "net_result";
  const maximum = Math.max(1, ...values.map((value) => Math.abs(value)));
  const width = 620;
  const height = 188;
  const left = 18;
  const right = 12;
  const baseline = signed ? 92 : 150;
  const available = signed ? 68 : 118;
  const slot = (width - left - right) / Math.max(monthly.length, 1);
  const barWidth = Math.max(5, Math.min(22, slot * 0.58));
  const labelEvery = Math.max(1, Math.ceil(monthly.length / 8));

  if (!monthly.length) return <div className="report-empty">{t.notAvailable}</div>;

  return (
    <svg
      className="report-monthly-chart"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={trendLabel}
    >
      <line x1={left} x2={width - right} y1={baseline} y2={baseline} />
      {monthly.map((point, index) => {
        const value = values[index];
        const barHeight = (Math.abs(value) / maximum) * available;
        const x = left + slot * index + (slot - barWidth) / 2;
        const y = value >= 0 ? baseline - barHeight : baseline;
        const showLabel = index % labelEvery === 0 || index === monthly.length - 1;
        return (
          <g key={point.month}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={Math.max(barHeight, value ? 2 : 0)}
              rx="3"
              className={value < 0 ? "negative" : "positive"}
            >
              <title>{`${formatMonth(point.month)}: ${formatMoney(value)}`}</title>
            </rect>
            {showLabel && (
              <text x={x + barWidth / 2} y={height - 9} textAnchor="middle">
                {formatMonth(point.month)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function RankingChart({ rows }) {
  const maximum = Math.max(1, ...rows.map((row) => row.amount));
  return (
    <div className="report-ranking">
      {rows.map((row) => (
        <div key={row.label}>
          <span title={row.label}>{row.label}</span>
          <i><b style={{ width: `${(row.amount / maximum) * 100}%` }} /></i>
          <strong>{formatMoney(row.amount, { compact: true })}</strong>
        </div>
      ))}
    </div>
  );
}

export default function OnePageReport({
  data,
  question,
  answer,
  t,
  onClose,
}) {
  const focus = reportFocus(question);
  const kpis = buildKpis(data, focus, t);
  const ranking = rankingRows(data, focus);
  const dateRange = data.financials.date_range;
  const period = dateRange.from
    ? `${dateRange.from} — ${dateRange.to || dateRange.from}`
    : t.allAvailableDates;
  const dueMonthly = (data.due_timeline || []).map((point) => ({
    month: point.month,
    sales: (point.overdue || 0) + (point.on_track || 0),
    net_result: (point.overdue || 0) + (point.on_track || 0),
  }));
  const useDueTrend =
    focus === "receivables" ||
    (!(data.financials.monthly || []).length && dueMonthly.length > 0);
  const trend = useDueTrend ? dueMonthly : data.financials.monthly || [];
  const trendLabel = useDueTrend
    ? t.reportDueTrend
    : focus === "profitability"
      ? t.reportResultTrend
      : t.reportSalesTrend;

  return (
    <div className="report-overlay" role="dialog" aria-modal="true" aria-label={t.onePageReport}>
      <div className="report-actions">
        <button type="button" onClick={() => window.print()}>
          <IconFile width={16} height={16} /> {t.printSavePdf}
        </button>
        <button type="button" onClick={onClose} aria-label={t.close}>
          <IconClose width={17} height={17} /> {t.close}
        </button>
      </div>

      <article className="report-sheet">
        <header>
          <div className="report-brand">
            <BrandLogo compact />
            <div>
              <span>ARQ Astra</span>
              <small>{t.customBusinessReport}</small>
            </div>
          </div>
          <div className="report-meta">
            <strong>{data.tenant_name}</strong>
            <span>{period}</span>
            <small>{t.generatedOn(new Date().toLocaleString("en-IN"))}</small>
          </div>
        </header>

        <section className="report-title">
          <div>
            <span>{t.reportFocus[focus]}</span>
            <h1>{t.onePageReport}</h1>
          </div>
          <p><strong>{t.reportQuestion}:</strong> {question}</p>
        </section>

        <section className="report-kpis">
          {kpis.map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </section>

        <section className="report-summary">
          <span>{t.executiveSummary}</span>
          <p>{answer}</p>
        </section>

        <div className="report-charts">
          <section>
            <div className="report-section-head">
              <span>{t.monthlyTrend}</span>
              <small>{trendLabel}</small>
            </div>
            <MonthlyReportChart
              monthly={trend}
              focus={focus}
              trendLabel={trendLabel}
              t={t}
            />
          </section>
          <section>
            <div className="report-section-head">
              <span>{focus === "product" ? t.topProducts : t.reportTopDrivers}</span>
              <small>{t.reportRankedByValue}</small>
            </div>
            {ranking.length ? (
              <RankingChart rows={ranking} />
            ) : (
              <div className="report-empty">{t.notAvailable}</div>
            )}
          </section>
        </div>

        <footer>
          <span>
            {t.reportDataScope}: {data.financials.kinds.map((kind) => t.kindLabels[kind]).join(", ") || t.receivablesView}
          </span>
          <p>{t.reportDisclaimer}</p>
          <strong>ARQ Astra · {t.aiPowered}</strong>
        </footer>
      </article>
    </div>
  );
}
