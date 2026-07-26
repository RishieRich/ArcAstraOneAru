import { useEffect, useMemo, useState } from "react";
import { formatMoney } from "../api";
import { IconBox, IconChart, IconUsers } from "../icons";

const KINDS = ["sales", "purchase"];

function formatNumber(value, maximumFractionDigits = 2) {
  if (value === null || value === undefined) return "—";
  return Number(value).toLocaleString("en-IN", { maximumFractionDigits });
}

function formatQuantity(row) {
  if (!row.quantity) return "—";
  return `${formatNumber(row.quantity, 4)}${row.unit ? ` ${row.unit}` : ""}`;
}

function formatRate(value) {
  if (value === null || value === undefined) return "—";
  return `₹${Number(value).toLocaleString("en-IN", {
    minimumFractionDigits: value < 1 ? 2 : 0,
    maximumFractionDigits: 4,
  })}`;
}

export default function ProductAnalytics({ products, t }) {
  const availableKinds = KINDS.filter(
    (kind) => products?.by_kind?.[kind]?.details?.length,
  );
  const [kind, setKind] = useState(availableKinds[0] || "sales");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!availableKinds.includes(kind)) {
      setKind(availableKinds[0] || "sales");
    }
  }, [products, kind]);

  const summary = products?.by_kind?.[kind] || {};
  const details = summary.details || [];
  const filtered = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();
    if (!needle) return details;
    return details.filter(
      (row) =>
        row.name.toLocaleLowerCase().includes(needle) ||
        (row.top_customer || "").toLocaleLowerCase().includes(needle),
    );
  }, [details, search]);
  const topRows = details.slice(0, 8);
  const maximum = Math.max(1, ...topRows.map((row) => row.amount));

  if (!availableKinds.length) return null;

  return (
    <section className="product-analytics">
      <div className="section-intro product-heading">
        <div>
          <span className="eyebrow">{t.productEyebrow}</span>
          <h2>{t.productAnalytics}</h2>
          <p>{t.productAnalyticsSub}</p>
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

      <div className="product-summary-grid">
        <article>
          <IconBox />
          <span>{t.productsTracked}</span>
          <strong>{formatNumber(summary.product_count, 0)}</strong>
        </article>
        <article>
          <IconChart />
          <span>{t.productValue}</span>
          <strong>{formatMoney(summary.value, { compact: true })}</strong>
        </article>
        <article>
          <IconUsers />
          <span>{t.quantityCoverage}</span>
          <strong>{formatNumber(summary.quantity_coverage_pct, 1)}%</strong>
        </article>
      </div>

      <div className="product-grid">
        <section className="card product-rank-card">
          <div className="card-title-row">
            <div>
              <h3>{t.topProducts}</h3>
              <p className="sub">{t.topProductsSub}</p>
            </div>
          </div>
          <div className="product-rank-list">
            {topRows.map((row) => (
              <div className="product-rank-row" key={row.name}>
                <div>
                  <span title={row.name}>{row.name}</span>
                  <strong>{formatMoney(row.amount)}</strong>
                </div>
                <div className="product-rank-track">
                  <i style={{ width: `${(row.amount / maximum) * 100}%` }} />
                </div>
                <small>{row.share_pct.toFixed(1)}%</small>
              </div>
            ))}
          </div>
        </section>

        <section className="card product-detail-card">
          <div className="card-title-row">
            <div>
              <h3>{t.productDetails}</h3>
              <p className="sub">{t.productDetailsSub}</p>
            </div>
            <input
              className="product-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t.searchProducts}
              aria-label={t.searchProducts}
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
                  <th className="num">{t.customers}</th>
                  <th>{t.topCustomer}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.name}>
                    <td>
                      <strong>{row.name}</strong>
                      <small>{row.share_pct.toFixed(1)}% {t.ofProductValue}</small>
                    </td>
                    <td className="num">{formatMoney(row.amount)}</td>
                    <td className="num">{formatQuantity(row)}</td>
                    <td className="num">{formatRate(row.average_rate)}</td>
                    <td className="num">{formatNumber(row.transactions, 0)}</td>
                    <td className="num">{formatNumber(row.customers, 0)}</td>
                    <td>
                      {row.top_customer || "—"}
                      {row.top_customer && (
                        <small>{formatMoney(row.top_customer_amount)}</small>
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
      {summary.quantity_coverage_pct < 100 && (
        <p className="product-data-note">
          {t.quantityCoverageNote(summary.quantity_coverage_pct)}
        </p>
      )}
    </section>
  );
}
