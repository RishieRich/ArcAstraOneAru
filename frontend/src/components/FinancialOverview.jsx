import { useEffect, useState } from "react";
import { formatMoney, formatMonth, formatWhen } from "../api";
import { buildFinanceAnswer } from "../businessSummary";
import {
  chartExtent,
  comparisonFromPrevious,
  directLabelIndexes,
  finiteChartValue,
  formatChartValue,
} from "../chartModel";
import {
  buildBookMix,
  buildBookTrend,
  buildFinanceTrend,
} from "../financePresentation";
import {
  IconBox,
  IconChart,
  IconFile,
  IconRupee,
  IconTrendDown,
  IconTrendUp,
  IconWallet,
} from "../icons";
import StatTile from "./StatTile";
import ProductAnalytics from "./ProductAnalytics";
import BusinessSummary from "./BusinessSummary";
import BusinessChart, { ChartTooltip, useChartSelection } from "./BusinessChart";

const KINDS = ["sales", "purchase", "expense"];
const SERIES = {
  sales: "var(--sales)",
  purchase: "var(--purchase)",
  expense: "var(--expense)",
};

export default function FinancialOverview({ financials, t }) {
  const totals = financials.totals;
  const answer = buildFinanceAnswer(financials);
  const resultPositive = totals.operating_result >= 0;
  const resultLabel = financials.pnl_complete
    ? resultPositive
      ? t.estimatedProfit
      : t.estimatedLoss
    : t.partialResult;

  const connectedNames = answer.connectedKinds.map((kind) => t.kindLabels[kind]).join(", ");
  const missingNames = answer.missingKinds.map((kind) => t.kindLabels[kind]).join(", ");
  const period = answer.from
    ? t.ux.financialPeriod(answer.from, answer.to)
    : t.allAvailableDates;
  const source = t.ux.financeSource(connectedNames);
  const freshness = formatWhen(answer.lastImportAt);
  const nextText = {
    missing: t.ux.financeNextMissing,
    weak: t.ux.financeNextWeak,
    product: t.ux.financeNextProduct,
    trend: t.ux.financeNext,
  }[answer.next];
  const factLabels = {
    sales: t.salesTotal,
    purchase: t.purchaseTotal,
    expense: t.expenseTotal,
    profit: t.estimatedProfit,
    loss: t.estimatedLoss,
    partialPositive: t.ux.partialPositiveResult,
    partialNegative: t.ux.partialNegativeResult,
  };
  const facts = answer.facts.map((fact) => ({
    key: fact.key,
    label: factLabels[fact.key],
    value: formatChartValue(fact.value, "currency"),
    help: fact.key.startsWith("partial") ? t.partialResultSub : undefined,
    tone: fact.value < 0 ? "bad" : fact.key === "profit" ? "good" : "",
  }));

  return (
    <section className="financial-overview">
      <BusinessSummary
        eyebrow={t.ux.financeEyebrow}
        title={t.ux.financeTitle}
        body={financials.pnl_complete ? t.ux.financeCompleteBody : t.ux.financePartialBody}
        facts={facts}
        source={source}
        period={`${period} · ${t.ux.importedMonths(answer.activeMonths, answer.totalMonths)}`}
        freshness={freshness}
        nextLabel={t.ux.nextCheck}
        nextText={nextText}
        notice={answer.missingKinds.length ? t.ux.financeMissingBooks(missingNames) : undefined}
        copy={t.ux}
        className="financial-hero"
      />

      <FinancialTrend financials={financials} source={source} period={period} freshness={freshness} t={t} />

      <details className="secondary-detail financial-supporting-details">
        <summary>{t.ux.moreFinanceFacts}</summary>
        <dl className="chart-context">
          <div><dt>{t.ux.source}</dt><dd>{source}</dd></div>
          <div><dt>{t.ux.period}</dt><dd>{period}</dd></div>
          <div><dt>{t.ux.freshness}</dt><dd>{freshness}</dd></div>
        </dl>

        <div className="tiles financial-tiles">
        {financials.kinds.includes("sales") && <StatTile
          label={t.salesTotal}
          value={formatChartValue(totals.sales, "currency", { compact: true })}
          foot={t.monthlyAverage(formatChartValue(totals.average_monthly_sales, "currency"))}
          icon={<IconChart />}
          tone="good"
        />}
        {financials.kinds.includes("purchase") && <StatTile
          label={t.purchaseTotal}
          value={formatChartValue(totals.purchase, "currency", { compact: true })}
          foot={t.monthlyAverage(formatChartValue(totals.average_monthly_purchase, "currency"))}
          icon={<IconBox />}
        />}
        {financials.kinds.includes("expense") && <StatTile
          label={t.expenseTotal}
          value={formatChartValue(totals.expense, "currency", { compact: true })}
          foot={t.monthlyAverage(formatChartValue(totals.average_monthly_expense, "currency"))}
          icon={<IconWallet />}
        />}
        <StatTile
          label={resultLabel}
          value={formatChartValue(totals.operating_result, "currency", { compact: true })}
          foot={
            financials.pnl_complete
              ? t.operatingResultFormula
              : t.partialResultSub
          }
          footTone={resultPositive ? "ok" : "alert"}
          icon={resultPositive ? <IconTrendUp /> : <IconTrendDown />}
          tone={resultPositive ? "good" : "bad"}
        />
        <StatTile
          label={
            financials.pnl_complete
              ? t.profitableMonths
              : t.positiveResultMonths
          }
          value={formatChartValue(totals.profit, "currency", { compact: true })}
          foot={t.profitableMonthsSub}
          icon={<IconTrendUp />}
          tone="good"
        />
        <StatTile
          label={
            financials.pnl_complete
              ? t.lossMonths
              : t.negativeResultMonths
          }
          value={formatChartValue(totals.loss, "currency", { compact: true })}
          foot={t.lossMonthsSub}
          icon={<IconTrendDown />}
          tone={totals.loss > 0 ? "bad" : "good"}
        />
        <StatTile
          label={
            financials.pnl_complete ? t.estimatedMargin : t.uploadCoverage
          }
          value={
            financials.pnl_complete
              ? `${totals.margin_pct.toFixed(1)}%`
              : `${financials.kinds.length}/3`
          }
          foot={
            financials.pnl_complete
              ? t.costRatio(totals.cost_ratio_pct)
              : t.bookTypesConnected
          }
          icon={<IconRupee />}
          tone={totals.margin_pct >= 0 ? "good" : "bad"}
        />
        <StatTile
          label={t.taxTracked}
          value={formatChartValue(totals.tax, "currency", { compact: true })}
          foot={t.transactionCount(totals.transactions)}
          icon={<IconFile />}
        />
        </div>

      {!financials.pnl_complete && (
        <div className="pnl-notice">
          <IconFile width={18} height={18} />
          <div>
            <strong>{t.pnlPartialTitle}</strong>
            <span>{t.pnlPartialBody}</span>
          </div>
        </div>
      )}

      <BookExplorer financials={financials} period={period} freshness={freshness} t={t} />
      {financials.products?.has_data && (
        <ProductAnalytics
          products={financials.products}
          source={t.ux.normalizedItemSource}
          period={period}
          freshness={freshness}
          t={t}
        />
      )}
      <PeakHighlights
        highlights={financials.highlights}
        pnlComplete={financials.pnl_complete}
        t={t}
      />
      <BusinessInsights financials={financials} t={t} />

      <div className="grid-2">
        <Breakdown financials={financials} period={period} freshness={freshness} t={t} />
        <Counterparties financials={financials} period={period} freshness={freshness} t={t} />
      </div>

      <PeriodTable
        monthly={financials.monthly}
        pnlComplete={financials.pnl_complete}
        connectedKinds={financials.kinds}
        t={t}
      />
      <ImportHistory imports={financials.imports} t={t} />
      </details>
    </section>
  );
}

function comparisonText(comparison, t) {
  if (!comparison || comparison.percent === null) return null;
  const percent = Math.abs(comparison.percent).toFixed(1);
  if (comparison.direction === "up") return t.ux.markComparedUp(percent);
  if (comparison.direction === "down") return t.ux.markComparedDown(percent);
  return t.ux.markComparedSame;
}

function interpretationFor(points, index, t, temporal = true) {
  const valid = points
    .map((point, pointIndex) => ({ pointIndex, value: finiteChartValue(point.value) }))
    .filter((point) => point.value !== null);
  if (!valid.length) return null;
  const current = valid.find((point) => point.pointIndex === index);
  if (!current) return null;
  const labels = [];
  if (temporal && current.pointIndex === valid.at(-1).pointIndex) labels.push(t.ux.latest);
  if (current.value === Math.max(...valid.map((point) => point.value))) labels.push(t.ux.highest);
  if (current.value === Math.min(...valid.map((point) => point.value))) labels.push(t.ux.lowest);
  return [...new Set(labels)].join(" · ") || null;
}

function chartFact(points, index, metric, label, t, share = null, temporal = true) {
  const value = finiteChartValue(points[index]?.value);
  const formatted = formatChartValue(value, "currency");
  return {
    label,
    metric,
    value: formatted,
    comparison: temporal ? comparisonText(comparisonFromPrevious(points, index), t) : null,
    share: share === null ? null : formatChartValue(share, "percent", { maximumFractionDigits: 1 }),
    interpretation: interpretationFor(points, index, t, temporal),
    ariaLabel: `${label}. ${metric}. ${formatted}`,
  };
}

function FinancialTrend({ financials, source, period, freshness, t }) {
  const model = buildFinanceTrend(financials);
  const monthly = model.rows;
  const selection = useChartSelection();
  if (!monthly.length) {
    return (
      <section className="card trend-card">
        <div className="empty-mini">{t.empty}</div>
      </section>
    );
  }

  const pnlComplete = financials.pnl_complete;
  const width = Math.max(840, monthly.length * 62);
  const height = 370;
  const left = 76;
  const right = 72;
  const top = 26;
  const bottom = 312;
  const plotWidth = width - left - right;
  const values = model.series.flatMap((series) =>
    monthly.map((point) => point[series.valueKey]),
  );
  const extent = chartExtent(values);
  const range = extent.maximum - extent.minimum || 1;
  const x = (index) =>
    monthly.length === 1
      ? left + plotWidth / 2
      : left + (index / (monthly.length - 1)) * plotWidth;
  const y = (value) => top + ((extent.maximum - value) / range) * (bottom - top);
  const zeroY = y(0);
  const lineSegments = (valueKey) => {
    const segments = [];
    let current = [];
    monthly.forEach((point, index) => {
      const value = finiteChartValue(point[valueKey]);
      if (value === null) {
        if (current.length) segments.push(current);
        current = [];
      } else {
        current.push(`${x(index).toFixed(1)},${y(value).toFixed(1)}`);
      }
    });
    if (current.length) segments.push(current);
    return segments;
  };
  const labelStep = Math.max(1, Math.ceil(monthly.length / 9));
  const barWidth = Math.max(3, Math.min(22, (plotWidth / monthly.length) * 0.55));
  const seriesMeta = model.series.map((series) => ({
    ...series,
    label: series.key === "result"
      ? pnlComplete ? t.monthlyResult : t.partialMonthlyResult
      : t.kindLabels[series.key],
    color: series.key === "result" ? "var(--accent-dark)" : SERIES[series.key],
    shape: series.key === "result" ? "square" : series.key === "expense" ? "dash" : "line",
  }));
  const tableRows = monthly.map((row) => ({ ...row, label: formatMonth(row.month) }));
  const columns = [
    { key: "label", label: t.month },
    ...seriesMeta.map((series) => ({
      key: series.valueKey,
      label: series.label,
      numeric: true,
      render: (row) => formatChartValue(row[series.valueKey], "currency"),
    })),
  ];
  const axisValues = [...new Set([extent.minimum, 0, extent.maximum])].sort((a, b) => a - b);
  const resultPoints = monthly.map((row) => ({ value: row.result }));
  const directResult = new Set(directLabelIndexes(resultPoints, { denseAfter: 8 }));

  return (
    <BusinessChart
      title={t.financialTrend}
      subtitle={pnlComplete ? t.financialTrendSub : t.partialTrendSub}
      metric={t.ux.monthlyBusinessValue}
      unit={t.ux.currencyUnit}
      period={period}
      source={source}
      freshness={freshness}
      axes={{ x: t.ux.monthAxis, y: t.ux.amountAxis }}
      legend={seriesMeta.map((series) => ({
        key: series.key,
        label: series.label,
        color: series.color,
        shape: series.shape,
      }))}
      summary={t.ux.financialTrendSummary}
      rows={tableRows}
      columns={columns}
      copy={t.ux}
      icon={<IconChart />}
      className="trend-card"
    >
      <div className="financial-chart-scroll">
        <svg
          className="financial-chart"
          viewBox={`0 0 ${width} ${height}`}
          style={{ minWidth: `${Math.max(720, monthly.length * 52)}px` }}
          role="img"
          aria-label={t.financialTrend}
        >
          {axisValues.map((value) => {
            const gridY = y(value);
            return (
              <g key={value}>
                <line
                  x1={left}
                  x2={width - right}
                  y1={gridY}
                  y2={gridY}
                  className="chart-grid"
                />
                <text x={left - 12} y={gridY + 4} className="chart-axis-label">
                  {formatChartValue(value, "currency", { compact: true })}
                </text>
              </g>
            );
          })}
          <line
            x1={left}
            x2={width - right}
            y1={zeroY}
            y2={zeroY}
            className="chart-zero-line"
          />
          {seriesMeta.filter((series) => series.key !== "result").map((series) => (
            <g key={series.key}>
              {lineSegments(series.valueKey).map((points, segmentIndex) => (
                <polyline
                  key={segmentIndex}
                  points={points.join(" ")}
                  fill="none"
                  stroke={series.color}
                  strokeWidth={series.key === "sales" ? 3.5 : 2.5}
                  strokeDasharray={series.key === "expense" ? "5 4" : undefined}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
            </g>
          ))}
          {monthly.map((point, index) => {
            const value = finiteChartValue(point.result);
            if (value === null) return null;
            const positive = value >= 0;
            const valueY = y(value);
            const fact = chartFact(
              resultPoints,
              index,
              pnlComplete ? t.monthlyResult : t.partialMonthlyResult,
              formatMonth(point.month),
              t,
            );
            return (
              <g
                key={`${point.month}-result`}
                className="chart-mark"
                {...selection.bind(fact)}
              >
                <rect
                  x={x(index) - barWidth / 2}
                  y={Math.min(valueY, zeroY)}
                  width={barWidth}
                  height={Math.max(Math.abs(zeroY - valueY), 1)}
                  rx="3"
                  className={positive ? "result-profit" : "result-loss"}
                />
                {directResult.has(index) && (
                  <text
                    x={x(index)}
                    y={positive ? Math.max(12, valueY - 7) : Math.min(bottom + 16, valueY + 14)}
                    className="chart-direct-label"
                    textAnchor="middle"
                  >
                    {formatChartValue(value, "currency", { compact: true })}
                  </text>
                )}
              </g>
            );
          })}
          {seriesMeta.filter((series) => series.key !== "result").flatMap((series, seriesIndex) => {
            const points = monthly.map((point) => ({ value: point[series.valueKey] }));
            const direct = new Set(directLabelIndexes(points, { denseAfter: 8 }));
            return monthly.map((point, index) => {
              const value = finiteChartValue(point[series.valueKey]);
              if (value === null) return null;
              const fact = chartFact(points, index, series.label, formatMonth(point.month), t);
              return (
                <g
                  key={`${series.key}-${point.month}`}
                  className="chart-mark"
                  {...selection.bind(fact)}
                >
                  <circle
                    cx={x(index)}
                    cy={y(value)}
                    r={monthly.length <= 18 ? 4 : 3}
                    fill={series.color}
                    stroke="var(--surface-1)"
                    strokeWidth="1.5"
                  />
                  {direct.has(index) && (
                    <text
                      x={x(index)}
                      y={Math.max(12, y(value) - 8 - seriesIndex * 2)}
                      className="chart-direct-label"
                      textAnchor="middle"
                    >
                      {formatChartValue(value, "currency", { compact: true })}
                    </text>
                  )}
                </g>
              );
            });
          })}
          {monthly.map((point, index) => (
            (index % labelStep === 0 || index === monthly.length - 1) && (
              <text
                key={`${point.month}-label`}
                x={x(index)}
                y={height - 18}
                className="chart-month-label"
                textAnchor="middle"
              >
                {formatMonth(point.month)}
              </text>
            )
          ))}
        </svg>
      </div>
      <ChartTooltip fact={selection.active} copy={t.ux} id={selection.tooltipId} />
    </BusinessChart>
  );
}

const MIX_COLORS = {
  sales: ["#147b5a", "#2d9a73", "#55b28e", "#83c7aa", "#b6dfce", "#d8eee5"],
  purchase: ["#246ebf", "#4388d3", "#67a1df", "#8bb9e8", "#b5d3f0", "#d9e8f7"],
  expense: ["#c65f24", "#dc783a", "#e79863", "#efb48b", "#f5d0b5", "#fae7d9"],
};

function BookExplorer({ financials, period, freshness, t }) {
  const [kind, setKind] = useState(financials.kinds[0] || "sales");
  useEffect(() => {
    if (!financials.kinds.includes(kind)) {
      setKind(financials.kinds[0] || "sales");
    }
  }, [financials, kind]);

  const model = buildBookTrend(financials, kind);
  const bookSource = t.ux.financeSource(t.kindLabels[kind]);

  return (
    <section className={`card book-explorer ${kind}`}>
      <div className="chart-heading">
        <div>
          <span className="eyebrow">{t.bookExplorerEyebrow}</span>
          <h3><IconChart /> {t.bookExplorerTitle}</h3>
          <p className="sub">{t.bookExplorerSub}</p>
        </div>
        <div className="book-tabs" aria-label={t.bookExplorerTitle}>
          {financials.kinds.map((candidate) => (
            <button
              type="button"
              key={candidate}
              className={candidate}
              aria-pressed={candidate === kind}
              onClick={() => setKind(candidate)}
            >
              {t.kindLabels[candidate]}
            </button>
          ))}
        </div>
      </div>

      <div className="book-kpis">
        <div>
          <span>{t.bookTotal}</span>
          <strong>{formatChartValue(model.total, "currency")}</strong>
        </div>
        <div>
          <span>{t.activeMonthAverage}</span>
          <strong>{formatChartValue(model.average, "currency")}</strong>
          <small>{t.activeMonths(model.activeMonths)}</small>
        </div>
        <div>
          <span>{t.bestMonthLabel}</span>
          <strong>{model.best ? formatChartValue(model.best.value, "currency") : "—"}</strong>
          <small>{model.best ? formatMonth(model.best.month) : t.notAvailable}</small>
        </div>
        <div>
          <span>{t.firstToLatest}</span>
          <strong className={model.change == null ? "" : model.change >= 0 ? "up" : "down"}>
            {model.change == null ? "—" : `${model.change >= 0 ? "+" : "−"}${Math.abs(model.change).toFixed(1)}%`}
          </strong>
          <small>
            {model.first && model.latest && model.first !== model.latest
              ? `${formatMonth(model.first.month)} → ${formatMonth(model.latest.month)}`
              : t.needsTwoActiveMonths}
          </small>
        </div>
      </div>

      <div className="book-visual-grid">
        <MonthlyBookBars
          model={model}
          kind={kind}
          source={bookSource}
          period={period}
          freshness={freshness}
          t={t}
        />
        <BookMix
          rows={financials.breakdown[kind] || []}
          kind={kind}
          source={bookSource}
          period={period}
          freshness={freshness}
          t={t}
        />
      </div>
    </section>
  );
}

function MonthlyBookBars({ model, kind, source, period, freshness, t }) {
  const monthly = model.points;
  const selection = useChartSelection();
  if (!monthly.length) {
    return (
      <div className="book-chart-panel">
        <div className="book-panel-head">
          <div>
            <strong>{t.monthlyBookTrend(t.kindLabels[kind])}</strong>
            <span>{t.monthlyBookTrendSub}</span>
          </div>
        </div>
        <div className="empty-mini">{t.empty}</div>
      </div>
    );
  }

  const width = Math.max(720, monthly.length * 48);
  const height = 300;
  const left = 62;
  const right = 20;
  const top = 22;
  const bottom = 252;
  const plotWidth = width - left - right;
  const extent = chartExtent([...monthly.map((point) => point.value), model.average]);
  const range = extent.maximum - extent.minimum || 1;
  const x = (index) => left + ((index + 0.5) / monthly.length) * plotWidth;
  const y = (value) => top + ((extent.maximum - value) / range) * (bottom - top);
  const zeroY = y(0);
  const barWidth = Math.max(8, Math.min(28, (plotWidth / monthly.length) * 0.62));
  const labelStep = Math.max(1, Math.ceil(monthly.length / 8));
  const direct = new Set(directLabelIndexes(monthly, { denseAfter: 10 }));
  const axisValues = [...new Set([extent.minimum, 0, extent.maximum])].sort((a, b) => a - b);
  const tableRows = monthly.map((point) => ({ ...point, label: formatMonth(point.month) }));
  const summary = monthly.some((point) => point.value === null)
    ? `${t.ux.bookTrendSummary(t.kindLabels[kind])} ${t.ux.missingValue}`
    : t.ux.bookTrendSummary(t.kindLabels[kind]);

  return (
    <BusinessChart
      title={t.monthlyBookTrend(t.kindLabels[kind])}
      subtitle={t.monthlyBookTrendSub}
      metric={t.kindLabels[kind]}
      unit={t.ux.currencyUnit}
      period={period}
      source={source}
      freshness={freshness}
      axes={{ x: t.ux.monthAxis, y: t.ux.amountAxis }}
      legend={[
        { key: kind, label: t.kindLabels[kind], color: SERIES[kind], shape: "square" },
        { key: "average", label: t.averageLine, color: "var(--text-muted)", shape: "dash" },
      ]}
      summary={summary}
      rows={tableRows}
      columns={[
        { key: "label", label: t.month },
        {
          key: "value",
          label: t.kindLabels[kind],
          numeric: true,
          render: (row) => formatChartValue(row.value, "currency"),
        },
      ]}
      copy={t.ux}
      className="book-chart-panel"
    >
      <div className="book-chart-scroll">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ minWidth: `${width}px` }}
          role="img"
          aria-label={t.monthlyBookTrend(t.kindLabels[kind])}
        >
          {axisValues.map((value) => {
            const gridY = y(value);
            return (
              <g key={value}>
                <line x1={left} x2={width - right} y1={gridY} y2={gridY} className="chart-grid" />
                <text x={left - 10} y={gridY + 4} className="chart-axis-label">
                  {formatChartValue(value, "currency", { compact: true })}
                </text>
              </g>
            );
          })}
          <line x1={left} x2={width - right} y1={zeroY} y2={zeroY} className="chart-zero-line" />
          <line
            x1={left}
            x2={width - right}
            y1={y(model.average)}
            y2={y(model.average)}
            className="book-average-line"
          />
          {monthly.map((point, index) => {
            const value = point.value;
            if (value === null) {
              return (
                <text
                  key={point.month}
                  x={x(index)}
                  y={bottom - 5}
                  className="chart-month-label"
                  textAnchor="middle"
                >
                  —
                </text>
              );
            }
            const valueY = y(value);
            const fact = chartFact(monthly, index, t.kindLabels[kind], formatMonth(point.month), t);
            return (
              <g key={point.month} className="chart-mark" {...selection.bind(fact)}>
                <rect
                  x={x(index) - barWidth / 2}
                  y={Math.min(valueY, zeroY)}
                  width={barWidth}
                  height={Math.max(Math.abs(zeroY - valueY), 1)}
                  rx="5"
                  className={`book-bar ${kind}${value === 0 ? " empty" : ""}`}
                />
                {direct.has(index) && (
                  <text
                    x={x(index)}
                    y={Math.max(12, Math.min(valueY, zeroY) - 7)}
                    className="chart-direct-label"
                    textAnchor="middle"
                  >
                    {formatChartValue(value, "currency", { compact: true })}
                  </text>
                )}
                {(index % labelStep === 0 || index === monthly.length - 1) && (
                  <text x={x(index)} y={height - 20} className="chart-month-label" textAnchor="middle">
                    {formatMonth(point.month)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <ChartTooltip fact={selection.active} copy={t.ux} id={selection.tooltipId} />
    </BusinessChart>
  );
}

function BookMix({ rows, kind, source, period, freshness, t }) {
  const selection = useChartSelection();
  const model = buildBookMix(rows);
  if (!rows.length) {
    return (
      <BusinessChart
        title={t.bookMixTitle}
        subtitle={t.bookMixSub}
        metric={t.kindLabels[kind]}
        unit={t.ux.currencyUnit}
        period={period}
        source={source}
        freshness={freshness}
        summary={t.ux.categoryShareSummary}
        copy={t.ux}
        className="book-mix-panel"
      >
        <div className="empty-mini">{t.noBreakdown}</div>
      </BusinessChart>
    );
  }

  const shown = model.rows;
  let cursor = 0;
  const stops = model.eligible ? shown.map((row, index) => {
    const start = cursor;
    cursor += row.share;
    return `${MIX_COLORS[kind][index]} ${start.toFixed(1)}% ${cursor.toFixed(1)}%`;
  }) : [];
  const points = shown.map((row) => ({ value: row.value }));
  const unavailable = model.reason === "negative"
    ? t.ux.shareUnavailableNegative
    : t.ux.donutUnavailable;

  return (
    <BusinessChart
      title={t.bookMixTitle}
      subtitle={t.bookMixSub}
      metric={t.kindLabels[kind]}
      unit={t.ux.currencyUnit}
      period={period}
      source={source}
      freshness={freshness}
      legend={shown.map((row, index) => ({
        key: row.key,
        label: row.name,
        color: MIX_COLORS[kind][index],
        shape: index % 2 ? "circle" : "square",
      }))}
      summary={model.eligible ? t.ux.categoryShareSummary : unavailable}
      rows={shown}
      columns={[
        { key: "name", label: t.ux.category },
        {
          key: "value",
          label: t.value,
          numeric: true,
          render: (row) => formatChartValue(row.value, "currency"),
        },
        {
          key: "share",
          label: t.ux.share,
          numeric: true,
          render: (row) => row.share === null
            ? t.notAvailable
            : formatChartValue(row.share, "percent", { maximumFractionDigits: 1 }),
        },
      ]}
      copy={t.ux}
      className="book-mix-panel"
    >
      <div className="book-mix-content">
        {model.eligible ? (
          <div
            className="mix-donut"
            style={{ background: `conic-gradient(${stops.join(",")})` }}
            aria-hidden="true"
          >
            <div>
              <strong>{formatChartValue(shown[0].share, "percent", { maximumFractionDigits: 1 })}</strong>
              <span>{t.largestDriver}</span>
            </div>
          </div>
        ) : <div className="empty-mini">{unavailable}</div>}
        <div className="mix-legend">
          {shown.map((row, index) => (
            <div
              className="chart-mark-button"
              key={row.key}
              {...selection.bind(chartFact(
                points,
                index,
                t.kindLabels[kind],
                row.name,
                t,
                row.share,
                false,
              ))}
            >
              <i style={{ background: MIX_COLORS[kind][index] }} />
              <span>{row.name}</span>
              <strong>
                {formatChartValue(row.value, "currency")}
                {row.share === null ? "" : ` · ${formatChartValue(row.share, "percent", { maximumFractionDigits: 1 })}`}
              </strong>
            </div>
          ))}
        </div>
      </div>
      <ChartTooltip fact={selection.active} copy={t.ux} id={selection.tooltipId} />
    </BusinessChart>
  );
}

function PeakHighlights({ highlights, pnlComplete, t }) {
  const rows = [
    ["highest_sales", t.highestSales, "sales", <IconTrendUp />],
    ["lowest_sales", t.lowestSales, "sales muted", <IconTrendDown />],
    ["highest_purchase", t.highestPurchase, "purchase", <IconBox />],
    ["highest_expense", t.highestExpense, "expense", <IconWallet />],
    ["highest_profit", t.highestProfit, "profit", <IconTrendUp />],
    ["highest_loss", t.highestLoss, "loss", <IconTrendDown />],
  ];

  return (
    <section className="peak-section">
      <div className="section-title-row">
        <div>
          <h3>{t.performanceHighlights}</h3>
          <p>{t.performanceHighlightsSub}</p>
        </div>
      </div>
      <div className="peak-grid">
        {rows.map(([key, label, tone, icon]) => {
          const item =
            !pnlComplete && (key === "highest_profit" || key === "highest_loss")
              ? null
              : highlights[key];
          return (
            <article className={`peak-card ${tone}`} key={key}>
              <span className="peak-icon">{icon}</span>
              <span className="peak-label">{label}</span>
              <strong>{item ? formatMoney(item.amount) : "—"}</strong>
              <small>{item ? formatMonth(item.month) : t.notAvailable}</small>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function BusinessInsights({ financials, t }) {
  const { highlights, totals } = financials;
  const insights = [];
  if (highlights.highest_sales) {
    insights.push(
      t.insightHighestSales(
        formatMonth(highlights.highest_sales.month),
        formatMoney(highlights.highest_sales.amount),
      ),
    );
  }
  if (highlights.highest_expense) {
    insights.push(
      t.insightHighestExpense(
        formatMonth(highlights.highest_expense.month),
        formatMoney(highlights.highest_expense.amount),
      ),
    );
  }
  if (financials.pnl_complete && highlights.highest_profit) {
    insights.push(
      t.insightHighestProfit(
        formatMonth(highlights.highest_profit.month),
        formatMoney(highlights.highest_profit.amount),
      ),
    );
  }
  if (financials.pnl_complete && highlights.highest_loss) {
    insights.push(
      t.insightHighestLoss(
        formatMonth(highlights.highest_loss.month),
        formatMoney(highlights.highest_loss.amount),
      ),
    );
  }

  return (
    <section className="card insight-card">
      <div className="insight-summary">
        <span className={totals.operating_result >= 0 ? "positive" : "negative"}>
          {totals.operating_result >= 0 ? <IconTrendUp /> : <IconTrendDown />}
        </span>
        <div>
          <span className="eyebrow">{t.decisionView}</span>
          <h3>{t.businessInsights}</h3>
          <p>{t.businessInsightsSub}</p>
        </div>
      </div>
      <div className="insight-list">
        {insights.map((insight, index) => (
          <div key={index}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <p>{insight}</p>
          </div>
        ))}
      </div>
      <p className="pnl-caveat">
        {financials.pnl_complete ? t.pnlCaveat : t.partialPnlCaveat}
      </p>
    </section>
  );
}

function Breakdown({ financials, period, freshness, t }) {
  const available = KINDS.filter((kind) => financials.breakdown[kind]?.length);
  const [kind, setKind] = useState(
    available[0] || financials.kinds[0] || "sales",
  );
  const selection = useChartSelection();
  useEffect(() => {
    if (!available.includes(kind)) {
      setKind(available[0] || financials.kinds[0] || "sales");
    }
  }, [financials]);

  const rows = (financials.breakdown[kind] || []).map((row, index) => ({
    key: row.name || `category-${index}`,
    name: row.name,
    amount: finiteChartValue(row.amount),
  }));
  const points = rows.map((row) => ({ value: row.amount }));
  const extent = chartExtent(points.map((point) => point.value));
  const range = extent.maximum - extent.minimum || 1;
  const position = (value) => ((value - extent.minimum) / range) * 100;
  const zeroPosition = position(0);
  return (
    <BusinessChart
      title={t.breakdownTitle}
      subtitle={t.breakdownSub}
      metric={t.kindLabels[kind]}
      unit={t.ux.currencyUnit}
      period={period}
      source={t.ux.financeSource(t.kindLabels[kind])}
      freshness={freshness}
      axes={{ x: t.ux.amountAxis, y: t.ux.category }}
      summary={t.breakdownSub}
      rows={rows}
      columns={[
        { key: "name", label: t.ux.category },
        {
          key: "amount",
          label: t.value,
          numeric: true,
          render: (row) => formatChartValue(row.amount, "currency"),
        },
      ]}
      copy={t.ux}
    >
      <div className="card-title-row">
        <span />
        <div className="mini-tabs" aria-label={t.breakdownTitle}>
          {financials.kinds.map((candidate) => (
            <button
              type="button"
              key={candidate}
              aria-pressed={candidate === kind}
              onClick={() => setKind(candidate)}
            >
              {t.kindLabels[candidate]}
            </button>
          ))}
        </div>
      </div>
      {!rows.length ? (
        <div className="empty-mini">{t.noBreakdown}</div>
      ) : (
        <div className="finance-rank">
          {rows.map((row, index) => {
            const valuePosition = row.amount === null ? zeroPosition : position(row.amount);
            const left = Math.min(zeroPosition, valuePosition);
            const width = Math.abs(valuePosition - zeroPosition);
            const fact = chartFact(points, index, t.kindLabels[kind], row.name, t, null, false);
            return (
            <div
              className="finance-rank-row chart-mark-button"
              key={row.key}
              {...selection.bind(fact)}
            >
              <div className="finance-rank-label">
                <span>{row.name}</span>
                <strong>{formatChartValue(row.amount, "currency")}</strong>
              </div>
              <div className="finance-rank-track" style={{ position: "relative" }}>
                <span
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    insetBlock: 0,
                    left: `${zeroPosition}%`,
                    borderLeft: "1px dashed var(--text-muted)",
                  }}
                />
                <i
                  className={kind}
                  style={{ position: "absolute", left: `${left}%`, width: `${Math.max(width, row.amount === 0 ? 0.5 : 0)}%` }}
                />
              </div>
            </div>
            );
          })}
        </div>
      )}
      <ChartTooltip fact={selection.active} copy={t.ux} id={selection.tooltipId} />
    </BusinessChart>
  );
}

function Counterparties({ financials, period, freshness, t }) {
  const kindsWithRows = KINDS.filter(
    (kind) => financials.counterparties[kind]?.length,
  );
  const [kind, setKind] = useState(
    kindsWithRows[0] || financials.kinds[0] || "sales",
  );
  const selection = useChartSelection();
  useEffect(() => {
    if (!kindsWithRows.includes(kind)) {
      setKind(kindsWithRows[0] || financials.kinds[0] || "sales");
    }
  }, [financials]);
  const rows = (financials.counterparties[kind] || []).map((row, index) => ({
    key: row.party || `party-${index}`,
    party: row.party,
    amount: finiteChartValue(row.amount),
    transactions: finiteChartValue(row.transactions),
  }));
  const points = rows.map((row) => ({ value: row.amount }));

  return (
    <BusinessChart
      title={t.counterpartyTitle}
      subtitle={t.counterpartySub}
      metric={t.kindLabels[kind]}
      unit={t.ux.currencyUnit}
      period={period}
      source={t.ux.financeSource(t.kindLabels[kind])}
      freshness={freshness}
      axes={{ x: t.ux.amountAxis, y: t.ux.category }}
      summary={t.counterpartySub}
      rows={rows}
      columns={[
        { key: "party", label: t.counterpartyTitle },
        {
          key: "amount",
          label: t.value,
          numeric: true,
          render: (row) => formatChartValue(row.amount, "currency"),
        },
        {
          key: "transactions",
          label: t.transactions,
          numeric: true,
          render: (row) => formatChartValue(row.transactions),
        },
      ]}
      copy={t.ux}
    >
      <div className="card-title-row">
        <span />
        <select
          className="light-select"
          value={kind}
          onChange={(event) => setKind(event.target.value)}
          aria-label={t.counterpartyTitle}
        >
          {financials.kinds.map((candidate) => (
            <option key={candidate} value={candidate}>
              {t.kindLabels[candidate]}
            </option>
          ))}
        </select>
      </div>
      {!rows.length ? (
        <div className="empty-mini">{t.empty}</div>
      ) : (
        <div className="counterparty-list">
          {rows.map((row, index) => (
            <div
              className="counterparty-row chart-mark-button"
              key={row.key}
              {...selection.bind(chartFact(
                points,
                index,
                t.kindLabels[kind],
                row.party,
                t,
                null,
                false,
              ))}
            >
              <span className="counterparty-number">{index + 1}</span>
              <span className="counterparty-name">
                {row.party}
                <small>{t.transactionCount(row.transactions)}</small>
              </span>
              <strong>{formatChartValue(row.amount, "currency")}</strong>
            </div>
          ))}
        </div>
      )}
      <ChartTooltip fact={selection.active} copy={t.ux} id={selection.tooltipId} />
    </BusinessChart>
  );
}

function PeriodTable({ monthly, pnlComplete, connectedKinds, t }) {
  const connected = new Set(connectedKinds || []);
  return (
    <section className="card period-table-card">
      <div className="card-title-row">
        <div>
          <h3>{t.periodTable}</h3>
          <p className="sub">{t.periodTableSub}</p>
        </div>
        <span className="record-count">{t.monthCount(monthly.length)}</span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{t.month}</th>
              <th className="num">{t.kindLabels.sales}</th>
              <th className="num">{t.kindLabels.purchase}</th>
              <th className="num">{t.kindLabels.expense}</th>
              <th className="num">
                {pnlComplete ? t.profit : t.positiveResult}
              </th>
              <th className="num">
                {pnlComplete ? t.loss : t.negativeResult}
              </th>
              <th className="num">{t.netResult}</th>
            </tr>
          </thead>
          <tbody>
            {monthly.map((point) => (
              <tr key={point.month}>
                <td>{formatMonth(point.month)}</td>
                <td className="num">
                  {connected.has("sales") ? formatChartValue(point.sales, "currency") : t.ux.notConnected}
                </td>
                <td className="num">
                  {connected.has("purchase") ? formatChartValue(point.purchase, "currency") : t.ux.notConnected}
                </td>
                <td className="num">
                  {connected.has("expense") ? formatChartValue(point.expense, "currency") : t.ux.notConnected}
                </td>
                <td className="num positive-number">
                  {point.profit ? formatChartValue(point.profit, "currency") : "—"}
                </td>
                <td className="num negative-number">
                  {point.loss ? formatChartValue(point.loss, "currency") : "—"}
                </td>
                <td
                  className={`num ${
                    point.net_result >= 0 ? "positive-number" : "negative-number"
                  }`}
                >
                  {formatChartValue(point.net_result, "currency")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ImportHistory({ imports, t }) {
  return (
    <section className="card import-history">
      <h3>
        <IconFile /> {t.importHistory}
      </h3>
      <p className="sub">{t.importHistorySub}</p>
      <div className="import-list">
        {imports.map((item) => (
          <div className="import-row" key={item.id}>
            <span className={`import-kind ${item.kind}`}>
              {t.kindLabels[item.kind]}
            </span>
            <span className="import-file">
              {item.filename}
              <small>
                {item.date_from || t.noDate} —{" "}
                {item.date_to || item.date_from || t.noDate}
              </small>
            </span>
            <span className="import-count">
              {t.transactionCount(item.transactions)}
            </span>
            <time dateTime={item.created_at}>
              {formatWhen(item.created_at)}
            </time>
          </div>
        ))}
      </div>
    </section>
  );
}
