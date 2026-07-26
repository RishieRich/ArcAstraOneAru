import { useEffect, useState } from "react";
import { formatMoney, formatMonth, formatWhen } from "../api";
import {
  IconBox,
  IconCalendar,
  IconChart,
  IconFile,
  IconRupee,
  IconTrendDown,
  IconTrendUp,
  IconWallet,
} from "../icons";
import StatTile from "./StatTile";
import ProductAnalytics from "./ProductAnalytics";

const KINDS = ["sales", "purchase", "expense"];
const SERIES = {
  sales: "var(--sales)",
  purchase: "var(--purchase)",
  expense: "var(--expense)",
};

export default function FinancialOverview({ financials, t }) {
  const totals = financials.totals;
  const resultPositive = totals.operating_result >= 0;
  const resultLabel = financials.pnl_complete
    ? resultPositive
      ? t.estimatedProfit
      : t.estimatedLoss
    : t.partialResult;

  return (
    <section className="financial-overview">
      <div className="section-intro financial-hero">
        <div>
          <span className="eyebrow">{t.financialEyebrow}</span>
          <h2>{t.financialTitle}</h2>
          <p>{t.financialSub}</p>
          <div className="coverage-row">
            <span>
              <IconCalendar width={14} height={14} />
              {t.periodSummary(
                financials.period.months,
                financials.period.active_months,
              )}
            </span>
            <span className={financials.pnl_complete ? "complete" : "partial"}>
              {financials.pnl_complete ? t.pnlReady : t.pnlPartial}
            </span>
          </div>
        </div>
        <div className="period-chip">
          {financials.date_range.from
            ? `${financials.date_range.from} — ${financials.date_range.to}`
            : t.allAvailableDates}
        </div>
      </div>

      <div className="tiles financial-tiles">
        <StatTile
          label={t.salesTotal}
          value={formatMoney(totals.sales, { compact: true })}
          foot={t.monthlyAverage(formatMoney(totals.average_monthly_sales))}
          icon={<IconChart />}
          tone="good"
        />
        <StatTile
          label={t.purchaseTotal}
          value={formatMoney(totals.purchase, { compact: true })}
          foot={t.monthlyAverage(formatMoney(totals.average_monthly_purchase))}
          icon={<IconBox />}
        />
        <StatTile
          label={t.expenseTotal}
          value={formatMoney(totals.expense, { compact: true })}
          foot={t.monthlyAverage(formatMoney(totals.average_monthly_expense))}
          icon={<IconWallet />}
        />
        <StatTile
          label={resultLabel}
          value={formatSignedMoney(totals.operating_result, true)}
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
          value={formatMoney(totals.profit, { compact: true })}
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
          value={formatMoney(totals.loss, { compact: true })}
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
          value={formatMoney(totals.tax, { compact: true })}
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

      <FinancialTrend
        monthly={financials.monthly}
        pnlComplete={financials.pnl_complete}
        t={t}
      />
      <BookExplorer financials={financials} t={t} />
      {financials.products?.has_data && (
        <ProductAnalytics products={financials.products} t={t} />
      )}
      <PeakHighlights
        highlights={financials.highlights}
        pnlComplete={financials.pnl_complete}
        t={t}
      />
      <BusinessInsights financials={financials} t={t} />

      <div className="grid-2">
        <Breakdown financials={financials} t={t} />
        <Counterparties financials={financials} t={t} />
      </div>

      <PeriodTable
        monthly={financials.monthly}
        pnlComplete={financials.pnl_complete}
        t={t}
      />
      <ImportHistory imports={financials.imports} t={t} />
    </section>
  );
}

function formatSignedMoney(value, compact = false) {
  const prefix = value < 0 ? "−" : "";
  return `${prefix}${formatMoney(value, { compact })}`;
}

function FinancialTrend({ monthly, pnlComplete, t }) {
  if (!monthly.length) {
    return (
      <section className="card trend-card">
        <div className="empty-mini">{t.empty}</div>
      </section>
    );
  }

  const width = Math.max(1040, monthly.length * 52);
  const height = 460;
  const left = 72;
  const right = 28;
  const lineTop = 28;
  const lineBottom = 250;
  const resultTop = 310;
  const resultBottom = 402;
  const resultBaseline = (resultTop + resultBottom) / 2;
  const plotWidth = width - left - right;
  const maximum = Math.max(
    1,
    ...monthly.flatMap((point) => [point.sales, point.purchase, point.expense]),
  );
  const maxResult = Math.max(
    1,
    ...monthly.map((point) => Math.abs(point.net_result)),
  );
  const x = (index) =>
    monthly.length === 1
      ? left + plotWidth / 2
      : left + (index / (monthly.length - 1)) * plotWidth;
  const y = (value) =>
    lineBottom - (value / maximum) * (lineBottom - lineTop);
  const linePath = (kind) =>
    monthly
      .map(
        (point, index) =>
          `${index === 0 ? "M" : "L"} ${x(index).toFixed(1)} ${y(point[kind]).toFixed(1)}`,
      )
      .join(" ");
  const labelStep = Math.max(1, Math.ceil(monthly.length / 9));
  const barWidth = Math.max(3, Math.min(22, (plotWidth / monthly.length) * 0.55));

  return (
    <section className="card trend-card">
      <div className="chart-heading">
        <div>
          <span className="eyebrow">{t.completePeriod}</span>
          <h3>
            <IconChart /> {t.financialTrend}
          </h3>
          <p className="sub">
            {pnlComplete ? t.financialTrendSub : t.partialTrendSub}
          </p>
        </div>
        <div className="trend-legend">
          {KINDS.map((kind) => (
            <span key={kind}>
              <i className={kind} />
              {t.kindLabels[kind]}
            </span>
          ))}
          <span>
            <i className="profit" />
            {pnlComplete ? t.profit : t.positiveResult}
          </span>
          <span>
            <i className="loss" />
            {pnlComplete ? t.loss : t.negativeResult}
          </span>
        </div>
      </div>

      <div className="financial-chart-scroll">
        <svg
          className="financial-chart"
          viewBox={`0 0 ${width} ${height}`}
          style={{ minWidth: `${Math.max(720, monthly.length * 52)}px` }}
          role="img"
          aria-label={t.financialTrend}
        >
          <defs>
            <linearGradient id="salesArea" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--sales)" stopOpacity="0.15" />
              <stop offset="100%" stopColor="var(--sales)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const gridY = lineBottom - ratio * (lineBottom - lineTop);
            return (
              <g key={ratio}>
                <line
                  x1={left}
                  x2={width - right}
                  y1={gridY}
                  y2={gridY}
                  className="chart-grid"
                />
                <text x={left - 12} y={gridY + 4} className="chart-axis-label">
                  {formatMoney(maximum * ratio, { compact: true })}
                </text>
              </g>
            );
          })}

          <path
            d={`${linePath("sales")} L ${x(monthly.length - 1)} ${lineBottom} L ${x(0)} ${lineBottom} Z`}
            fill="url(#salesArea)"
          />
          {KINDS.map((kind) => (
            <path
              key={kind}
              d={linePath(kind)}
              fill="none"
              stroke={SERIES[kind]}
              strokeWidth={kind === "sales" ? 3.5 : 2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {monthly.map((point, index) => (
            <g key={point.month}>
              {KINDS.map((kind) => (
                <circle
                  key={kind}
                  cx={x(index)}
                  cy={y(point[kind])}
                  r={monthly.length <= 18 ? 3.5 : 2}
                  fill={SERIES[kind]}
                  stroke="var(--surface-1)"
                  strokeWidth="1.5"
                >
                  <title>
                    {`${formatMonth(point.month)} · ${t.kindLabels[kind]} ${formatMoney(point[kind])}`}
                  </title>
                </circle>
              ))}
            </g>
          ))}

          <text x={left} y={resultTop - 15} className="chart-section-label">
            {pnlComplete ? t.monthlyResult : t.partialMonthlyResult}
          </text>
          <line
            x1={left}
            x2={width - right}
            y1={resultBaseline}
            y2={resultBaseline}
            className="result-baseline"
          />

          {monthly.map((point, index) => {
            const positive = point.net_result >= 0;
            const magnitude =
              (Math.abs(point.net_result) / maxResult) *
              ((resultBottom - resultTop) / 2 - 4);
            const barY = positive ? resultBaseline - magnitude : resultBaseline;
            return (
              <g key={`${point.month}-result`}>
                <rect
                  x={x(index) - barWidth / 2}
                  y={barY}
                  width={barWidth}
                  height={Math.max(point.net_result === 0 ? 1 : magnitude, 1)}
                  rx="3"
                  className={positive ? "result-profit" : "result-loss"}
                >
                  <title>
                    {`${formatMonth(point.month)} · ${positive ? t.profit : t.loss} ${formatMoney(point.net_result)}`}
                  </title>
                </rect>
                {(index % labelStep === 0 || index === monthly.length - 1) && (
                  <text
                    x={x(index)}
                    y={height - 18}
                    className="chart-month-label"
                    textAnchor="middle"
                  >
                    {formatMonth(point.month)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <p className="chart-note">{t.chartHoverNote}</p>
    </section>
  );
}

const MIX_COLORS = {
  sales: ["#147b5a", "#2d9a73", "#55b28e", "#83c7aa", "#b6dfce", "#d8eee5"],
  purchase: ["#246ebf", "#4388d3", "#67a1df", "#8bb9e8", "#b5d3f0", "#d9e8f7"],
  expense: ["#c65f24", "#dc783a", "#e79863", "#efb48b", "#f5d0b5", "#fae7d9"],
};

function BookExplorer({ financials, t }) {
  const [kind, setKind] = useState(financials.kinds[0] || "sales");
  useEffect(() => {
    if (!financials.kinds.includes(kind)) {
      setKind(financials.kinds[0] || "sales");
    }
  }, [financials, kind]);

  const points = financials.monthly;
  const active = points.filter((point) => point[kind] > 0);
  const total = financials.totals[kind] || 0;
  const average = active.length ? total / active.length : 0;
  const best = active.reduce(
    (winner, point) => (!winner || point[kind] > winner[kind] ? point : winner),
    null,
  );
  const first = active[0];
  const latest = active[active.length - 1];
  const change =
    first && latest && first !== latest && first[kind]
      ? ((latest[kind] - first[kind]) / first[kind]) * 100
      : null;

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
          <strong>{formatMoney(total)}</strong>
        </div>
        <div>
          <span>{t.activeMonthAverage}</span>
          <strong>{formatMoney(average)}</strong>
          <small>{t.activeMonths(active.length)}</small>
        </div>
        <div>
          <span>{t.bestMonthLabel}</span>
          <strong>{best ? formatMoney(best[kind]) : "—"}</strong>
          <small>{best ? formatMonth(best.month) : t.notAvailable}</small>
        </div>
        <div>
          <span>{t.firstToLatest}</span>
          <strong className={change == null ? "" : change >= 0 ? "up" : "down"}>
            {change == null ? "—" : `${change >= 0 ? "+" : "−"}${Math.abs(change).toFixed(1)}%`}
          </strong>
          <small>
            {first && latest && first !== latest
              ? `${formatMonth(first.month)} → ${formatMonth(latest.month)}`
              : t.needsTwoActiveMonths}
          </small>
        </div>
      </div>

      <div className="book-visual-grid">
        <MonthlyBookBars monthly={points} kind={kind} average={average} t={t} />
        <BookMix rows={financials.breakdown[kind] || []} kind={kind} t={t} />
      </div>
    </section>
  );
}

function MonthlyBookBars({ monthly, kind, average, t }) {
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
  const maximum = Math.max(1, ...monthly.map((point) => point[kind]), average);
  const x = (index) => left + ((index + 0.5) / monthly.length) * plotWidth;
  const y = (value) => bottom - (value / maximum) * (bottom - top);
  const barWidth = Math.max(8, Math.min(28, (plotWidth / monthly.length) * 0.62));
  const labelStep = Math.max(1, Math.ceil(monthly.length / 8));

  return (
    <div className="book-chart-panel">
      <div className="book-panel-head">
        <div>
          <strong>{t.monthlyBookTrend(t.kindLabels[kind])}</strong>
          <span>{t.monthlyBookTrendSub}</span>
        </div>
        <span className="average-key">{t.averageLine}</span>
      </div>
      <div className="book-chart-scroll">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ minWidth: `${width}px` }}
          role="img"
          aria-label={t.monthlyBookTrend(t.kindLabels[kind])}
        >
          {[0, 0.5, 1].map((ratio) => {
            const gridY = y(maximum * ratio);
            return (
              <g key={ratio}>
                <line x1={left} x2={width - right} y1={gridY} y2={gridY} className="chart-grid" />
                <text x={left - 10} y={gridY + 4} className="chart-axis-label">
                  {formatMoney(maximum * ratio, { compact: true })}
                </text>
              </g>
            );
          })}
          <line
            x1={left}
            x2={width - right}
            y1={y(average)}
            y2={y(average)}
            className="book-average-line"
          />
          {monthly.map((point, index) => {
            const value = point[kind];
            return (
              <g key={point.month}>
                <rect
                  x={x(index) - barWidth / 2}
                  y={y(value)}
                  width={barWidth}
                  height={Math.max(bottom - y(value), 1)}
                  rx="5"
                  className={`book-bar ${kind}${value === 0 ? " empty" : ""}`}
                >
                  <title>{`${formatMonth(point.month)} · ${formatMoney(value)}`}</title>
                </rect>
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
    </div>
  );
}

function BookMix({ rows, kind, t }) {
  if (!rows.length) {
    return (
      <div className="book-mix-panel">
        <div className="book-panel-head">
          <div>
            <strong>{t.bookMixTitle}</strong>
            <span>{t.bookMixSub}</span>
          </div>
        </div>
        <div className="empty-mini">{t.noBreakdown}</div>
      </div>
    );
  }

  const shown = rows.slice(0, 6);
  const total = shown.reduce((sum, row) => sum + row.amount, 0) || 1;
  let cursor = 0;
  const stops = shown.map((row, index) => {
    const start = cursor;
    cursor += (row.amount / total) * 100;
    return `${MIX_COLORS[kind][index]} ${start.toFixed(1)}% ${cursor.toFixed(1)}%`;
  });
  const largestShare = (shown[0].amount / total) * 100;

  return (
    <div className="book-mix-panel">
      <div className="book-panel-head">
        <div>
          <strong>{t.bookMixTitle}</strong>
          <span>{t.bookMixSub}</span>
        </div>
      </div>
      <div className="book-mix-content">
        <div
          className="mix-donut"
          style={{ background: `conic-gradient(${stops.join(",")})` }}
          role="img"
          aria-label={t.bookMixAria(t.kindLabels[kind])}
        >
          <div>
            <strong>{largestShare.toFixed(1)}%</strong>
            <span>{t.largestDriver}</span>
          </div>
        </div>
        <div className="mix-legend">
          {shown.map((row, index) => (
            <div key={row.name}>
              <i style={{ background: MIX_COLORS[kind][index] }} />
              <span title={row.name}>{row.name}</span>
              <strong>{((row.amount / total) * 100).toFixed(1)}%</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
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

function Breakdown({ financials, t }) {
  const available = KINDS.filter((kind) => financials.breakdown[kind]?.length);
  const [kind, setKind] = useState(
    available[0] || financials.kinds[0] || "sales",
  );
  useEffect(() => {
    if (!available.includes(kind)) {
      setKind(available[0] || financials.kinds[0] || "sales");
    }
  }, [financials]);

  const rows = financials.breakdown[kind] || [];
  const maximum = Math.max(1, ...rows.map((row) => row.amount));
  return (
    <section className="card">
      <div className="card-title-row">
        <div>
          <h3>{t.breakdownTitle}</h3>
          <p className="sub">{t.breakdownSub}</p>
        </div>
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
          {rows.map((row) => (
            <div className="finance-rank-row" key={row.name}>
              <div className="finance-rank-label">
                <span>{row.name}</span>
                <strong>{formatMoney(row.amount)}</strong>
              </div>
              <div className="finance-rank-track">
                <i
                  className={kind}
                  style={{ width: `${(row.amount / maximum) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Counterparties({ financials, t }) {
  const kindsWithRows = KINDS.filter(
    (kind) => financials.counterparties[kind]?.length,
  );
  const [kind, setKind] = useState(
    kindsWithRows[0] || financials.kinds[0] || "sales",
  );
  useEffect(() => {
    if (!kindsWithRows.includes(kind)) {
      setKind(kindsWithRows[0] || financials.kinds[0] || "sales");
    }
  }, [financials]);
  const rows = financials.counterparties[kind] || [];

  return (
    <section className="card">
      <div className="card-title-row">
        <div>
          <h3>{t.counterpartyTitle}</h3>
          <p className="sub">{t.counterpartySub}</p>
        </div>
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
            <div className="counterparty-row" key={row.party}>
              <span className="counterparty-number">{index + 1}</span>
              <span className="counterparty-name">
                {row.party}
                <small>{t.transactionCount(row.transactions)}</small>
              </span>
              <strong>{formatMoney(row.amount)}</strong>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function PeriodTable({ monthly, pnlComplete, t }) {
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
                <td className="num">{formatMoney(point.sales)}</td>
                <td className="num">{formatMoney(point.purchase)}</td>
                <td className="num">{formatMoney(point.expense)}</td>
                <td className="num positive-number">
                  {point.profit ? formatMoney(point.profit) : "—"}
                </td>
                <td className="num negative-number">
                  {point.loss ? formatMoney(point.loss) : "—"}
                </td>
                <td
                  className={`num ${
                    point.net_result >= 0 ? "positive-number" : "negative-number"
                  }`}
                >
                  {formatSignedMoney(point.net_result)}
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
