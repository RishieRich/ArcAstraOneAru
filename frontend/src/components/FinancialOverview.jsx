import { useEffect, useState } from "react";
import { formatMoney, formatMonth, formatWhen } from "../api";
import { IconBox, IconChart, IconFile, IconRupee, IconWallet } from "../icons";
import StatTile from "./StatTile";

const KINDS = ["sales", "purchase", "expense"];

export default function FinancialOverview({ financials, t }) {
  const totals = financials.totals;
  const netPrefix = totals.net_flow < 0 ? "−" : "";

  return (
    <section className="financial-overview">
      <div className="section-intro">
        <div>
          <span className="eyebrow">{t.financialEyebrow}</span>
          <h2>{t.financialTitle}</h2>
          <p>{t.financialSub}</p>
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
          foot={formatMoney(totals.sales)}
          icon={<IconChart />}
          tone="good"
        />
        <StatTile
          label={t.purchaseTotal}
          value={formatMoney(totals.purchase, { compact: true })}
          foot={formatMoney(totals.purchase)}
          icon={<IconBox />}
        />
        <StatTile
          label={t.expenseTotal}
          value={formatMoney(totals.expense, { compact: true })}
          foot={formatMoney(totals.expense)}
          icon={<IconWallet />}
        />
        <StatTile
          label={t.netFlow}
          value={`${netPrefix}${formatMoney(totals.net_flow, { compact: true })}`}
          foot={t.netFlowFormula}
          footTone={totals.net_flow < 0 ? "alert" : "ok"}
          icon={<IconRupee />}
          tone={totals.net_flow < 0 ? "bad" : "good"}
        />
        <StatTile
          label={t.taxTracked}
          value={formatMoney(totals.tax, { compact: true })}
          foot={t.transactionCount(totals.transactions)}
          icon={<IconFile />}
        />
      </div>

      <FinancialTrend monthly={financials.monthly} t={t} />

      <div className="grid-2">
        <Breakdown financials={financials} t={t} />
        <Counterparties financials={financials} t={t} />
      </div>

      <ImportHistory imports={financials.imports} t={t} />
    </section>
  );
}

function FinancialTrend({ monthly, t }) {
  const points = monthly.slice(-12);
  const maximum = Math.max(
    1,
    ...points.flatMap((point) => [point.sales, point.purchase, point.expense]),
  );

  return (
    <section className="card">
      <h3><IconChart /> {t.financialTrend}</h3>
      <p className="sub">{t.financialTrendSub}</p>
      {!points.length ? (
        <div className="empty-mini">{t.empty}</div>
      ) : (
        <>
          <div className="column-chart" role="img" aria-label={t.financialTrend}>
            {points.map((point) => (
              <div className="column-group" key={point.month}>
                <div className="column-bars">
                  {KINDS.map((kind) => (
                    <i
                      className={`column-bar ${kind}`}
                      key={kind}
                      style={{ height: `${point[kind] ? Math.max(5, point[kind] / maximum * 100) : 0}%` }}
                      title={`${t.kindLabels[kind]}: ${formatMoney(point[kind])}`}
                    />
                  ))}
                </div>
                <span>{formatMonth(point.month)}</span>
              </div>
            ))}
          </div>
          <div className="legend financial-legend">
            {KINDS.map((kind) => (
              <span key={kind}>
                <i className={`swatch ${kind}`} />
                {t.kindLabels[kind]}
              </span>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function Breakdown({ financials, t }) {
  const available = KINDS.filter((kind) => financials.breakdown[kind]?.length);
  const [kind, setKind] = useState(available[0] || financials.kinds[0] || "sales");
  useEffect(() => {
    if (!available.includes(kind)) setKind(available[0] || financials.kinds[0] || "sales");
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
                <i className={kind} style={{ width: `${row.amount / maximum * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Counterparties({ financials, t }) {
  const kindsWithRows = KINDS.filter((kind) => financials.counterparties[kind]?.length);
  const [kind, setKind] = useState(kindsWithRows[0] || financials.kinds[0] || "sales");
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
            <option key={candidate} value={candidate}>{t.kindLabels[candidate]}</option>
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

function ImportHistory({ imports, t }) {
  return (
    <section className="card import-history">
      <h3><IconFile /> {t.importHistory}</h3>
      <p className="sub">{t.importHistorySub}</p>
      <div className="import-list">
        {imports.map((item) => (
          <div className="import-row" key={item.id}>
            <span className={`import-kind ${item.kind}`}>{t.kindLabels[item.kind]}</span>
            <span className="import-file">
              {item.filename}
              <small>{item.date_from || t.noDate} — {item.date_to || item.date_from || t.noDate}</small>
            </span>
            <span className="import-count">{t.transactionCount(item.transactions)}</span>
            <time dateTime={item.created_at}>{formatWhen(item.created_at)}</time>
          </div>
        ))}
      </div>
    </section>
  );
}
