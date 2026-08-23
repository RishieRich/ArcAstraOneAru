import { useEffect, useMemo, useState } from "react";
import { chartExtent, formatChartValue } from "../chartModel";
import { buildProductPresentation } from "../financePresentation";
import { IconBox, IconChart, IconUsers } from "../icons";
import BusinessChart, { ChartTooltip, useChartSelection } from "./BusinessChart";

const KINDS = ["sales", "purchase"];

function formatNumber(value, maximumFractionDigits = 2) {
  if (value === null || value === undefined) return "—";
  return Number(value).toLocaleString("en-IN", { maximumFractionDigits });
}

function formatQuantity(row, t) {
  if (row.quantity === null) return "—";
  const quantity = formatNumber(row.quantity, 4);
  return row.unit ? `${quantity} ${row.unit}` : `${quantity} · ${t.ux.unknownUnit}`;
}

function formatRate(value) {
  if (value === null || value === undefined) return "—";
  const number = Number(value);
  const sign = number < 0 ? "−" : "";
  return `${sign}₹${Math.abs(number).toLocaleString("en-IN", {
    minimumFractionDigits: Math.abs(number) < 1 ? 2 : 0,
    maximumFractionDigits: 4,
  })}`;
}

function productFact(row, metric, partyLabel, t) {
  const value = formatChartValue(row.amount, "currency");
  const share = row.share === null
    ? null
    : formatChartValue(row.share, "percent", { maximumFractionDigits: 1 });
  const partyCount = row.parties === null ? t.notAvailable : formatChartValue(row.parties);
  return {
    label: row.name,
    metric,
    value,
    share,
    interpretation: `${t.transactionCount(row.transactions || 0)} · ${partyLabel}: ${partyCount}`,
    ariaLabel: `${row.name}. ${metric}. ${value}`,
  };
}

export default function ProductAnalytics({ products, source, period, freshness, t }) {
  const availableKinds = KINDS.filter(
    (kind) => products?.by_kind?.[kind]?.details?.length,
  );
  const [kind, setKind] = useState(availableKinds[0] || "sales");
  const [search, setSearch] = useState("");
  const selection = useChartSelection();

  useEffect(() => {
    if (!availableKinds.includes(kind)) {
      setKind(availableKinds[0] || "sales");
    }
  }, [products, kind]);

  const summary = buildProductPresentation(products, kind);
  const details = summary.rows;
  const filtered = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();
    if (!needle) return details;
    return details.filter(
      (row) =>
        row.name.toLocaleLowerCase().includes(needle) ||
        (row.topParty || "").toLocaleLowerCase().includes(needle),
    );
  }, [details, search]);
  const topRows = details.slice(0, 8);
  const extent = chartExtent(topRows.map((row) => row.amount));
  const range = extent.maximum - extent.minimum || 1;
  const position = (value) => ((value - extent.minimum) / range) * 100;
  const zeroPosition = position(0);
  const partyLabel = kind === "sales" ? t.ux.salesCustomers : t.ux.purchaseSuppliers;
  const topPartyLabel = kind === "sales" ? t.topCustomer : t.ux.topSupplier;

  if (!availableKinds.length) return null;

  return (
    <section className="product-analytics">
      <div className="section-intro product-heading">
        <div>
          <span className="eyebrow">{t.productEyebrow}</span>
          <h2>{t.productAnalytics}</h2>
          <p>{t.ux.productValueSummary}</p>
        </div>
        <div className="mini-tabs" aria-label={t.productAnalytics}>
          {availableKinds.map((candidate) => (
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

      <dl className="chart-context">
        <div><dt>{t.ux.source}</dt><dd>{source}</dd></div>
        <div><dt>{t.ux.period}</dt><dd>{period}</dd></div>
        <div><dt>{t.ux.freshness}</dt><dd>{freshness}</dd></div>
      </dl>

      <div className="product-summary-grid">
        <article>
          <IconBox />
          <span>{t.productsTracked}</span>
          <strong>{formatNumber(summary.productCount, 0)}</strong>
        </article>
        <article>
          <IconChart />
          <span>{t.productValue}</span>
          <strong>{formatChartValue(summary.value, "currency", { compact: true })}</strong>
        </article>
        <article>
          <IconUsers />
          <span>{t.quantityCoverage}</span>
          <strong>{formatChartValue(summary.quantityCoverage, "percent", { maximumFractionDigits: 1 })}</strong>
        </article>
      </div>

      <div className="product-grid">
        <BusinessChart
          title={t.topProducts}
          subtitle={t.topProductsSub}
          metric={t.productValue}
          unit={t.ux.currencyUnit}
          period={period}
          source={source}
          freshness={freshness}
          axes={{ x: t.ux.amountAxis, y: t.productName }}
          summary={t.ux.productValueSummary}
          rows={topRows}
          columns={[
            { key: "name", label: t.productName },
            {
              key: "amount",
              label: t.value,
              numeric: true,
              render: (row) => formatChartValue(row.amount, "currency"),
            },
            {
              key: "share",
              label: t.ux.share,
              numeric: true,
              render: (row) => row.share === null
                ? t.notAvailable
                : formatChartValue(row.share, "percent", { maximumFractionDigits: 1 }),
            },
            {
              key: "transactions",
              label: t.transactions,
              numeric: true,
              render: (row) => formatChartValue(row.transactions),
            },
            {
              key: "parties",
              label: partyLabel,
              numeric: true,
              render: (row) => formatChartValue(row.parties),
            },
          ]}
          copy={t.ux}
          className="product-rank-card"
        >
          <div className="product-rank-list">
            {topRows.map((row) => {
              const valuePosition = row.amount === null ? zeroPosition : position(row.amount);
              const left = Math.min(zeroPosition, valuePosition);
              const width = Math.abs(valuePosition - zeroPosition);
              return (
                <div
                  className="product-rank-row chart-mark-button"
                  key={row.key}
                  {...selection.bind(productFact(row, t.productValue, partyLabel, t))}
                >
                  <div>
                    <span>{row.name}</span>
                    <strong>{formatChartValue(row.amount, "currency")}</strong>
                  </div>
                  <div className="product-rank-track" style={{ position: "relative" }}>
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
                      style={{
                        position: "absolute",
                        left: `${left}%`,
                        width: `${Math.max(width, row.amount === 0 ? 0.5 : 0)}%`,
                      }}
                    />
                  </div>
                  <small>
                    {row.share === null
                      ? t.notAvailable
                      : formatChartValue(row.share, "percent", { maximumFractionDigits: 1 })}
                  </small>
                </div>
              );
            })}
          </div>
          <ChartTooltip fact={selection.active} copy={t.ux} id={selection.tooltipId} />
        </BusinessChart>

        <section className="card product-detail-card">
          <div className="card-title-row">
            <div>
              <h3>{t.productDetails}</h3>
              <p className="sub">{t.ux.productValueSummary}</p>
            </div>
            <input
              className="product-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={kind === "sales" ? t.searchProducts : t.ux.purchaseSuppliers}
              aria-label={kind === "sales" ? t.searchProducts : t.ux.purchaseSuppliers}
            />
          </div>
          <div className="table-wrap product-table-wrap">
            <table className="product-table">
              <thead>
                <tr>
                  <th>{t.productName}</th>
                  <th className="num">{t.value}</th>
                  <th className="num">{t.quantity}</th>
                  <th className="num">{t.averageRate}</th>
                  <th className="num">{t.transactions}</th>
                  <th className="num">{partyLabel}</th>
                  <th>{topPartyLabel}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.key}>
                    <td>
                      <strong>{row.name}</strong>
                      <small>
                        {row.share === null
                          ? t.notAvailable
                          : `${formatChartValue(row.share, "percent", { maximumFractionDigits: 1 })} ${t.ofProductValue}`}
                      </small>
                    </td>
                    <td className="num">{formatChartValue(row.amount, "currency")}</td>
                    <td className="num">{formatQuantity(row, t)}</td>
                    <td className="num">
                      {formatRate(row.averageRate)}
                      {row.averageRate !== null && !row.unit && <small>{t.ux.rateUnitUnknown}</small>}
                    </td>
                    <td className="num">{formatNumber(row.transactions, 0)}</td>
                    <td className="num">{formatNumber(row.parties, 0)}</td>
                    <td>
                      {row.topParty || "—"}
                      {row.topParty && (
                        <small>{formatChartValue(row.topPartyAmount, "currency")}</small>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!filtered.length && <div className="empty-mini">{t.noProductMatches}</div>}
        </section>
      </div>
      {summary.quantityCoverage !== null && summary.quantityCoverage < 100 && (
        <p className="product-data-note">
          {t.quantityCoverageNote(summary.quantityCoverage)}
        </p>
      )}
    </section>
  );
}
