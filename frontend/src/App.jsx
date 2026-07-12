import { useEffect, useState } from "react";
import { fetchCompanies, fetchMetrics, formatMoney, formatWhen } from "./api";
import { LANGS, T } from "./i18n";
import AgingChart from "./components/AgingChart";
import AskPanel from "./components/AskPanel";
import BillsTable from "./components/BillsTable";
import StatTile from "./components/StatTile";
import TopDebtors from "./components/TopDebtors";

export default function App() {
  const [lang, setLang] = useState("en");
  const [companies, setCompanies] = useState([]);
  const [tenantId, setTenantId] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const t = T[lang];

  useEffect(() => {
    fetchCompanies()
      .then((list) => {
        setCompanies(list);
        // Land on a company that actually has bills, so the first screen isn't empty.
        const best =
          [...list].reverse().find((c) => c.has_bills) ||
          [...list].reverse().find((c) => c.last_sync_at) ||
          list[0];
        setTenantId(best?.id || "");
        if (!best) setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!tenantId) return;
    setLoading(true);
    setError("");
    fetchMetrics(tenantId)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [tenantId]);

  const totals = data?.totals;

  return (
    <div className="app">
      <header className="header">
        <div className="logo">ARQ</div>
        <div className="brand">
          <h1>ARQ Receivables</h1>
          <p>{t.tagline}</p>
        </div>

        <div className="spacer" />

        <div className="lang-group">
          {LANGS.map((l) => (
            <button
              key={l.id}
              onClick={() => setLang(l.id)}
              aria-pressed={lang === l.id}
            >
              {l.label}
            </button>
          ))}
        </div>

        <div className="picker">
          <label htmlFor="company">{t.company}</label>
          <select
            id="company"
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
          >
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </header>

      <main className="main">
        {error && (
          <div className="card state">
            <h3>Could not reach the backend</h3>
            <p>{error}</p>
          </div>
        )}

        {!error && loading && (
          <div className="card state">
            <p>Loading…</p>
          </div>
        )}

        {!error && !loading && data && (
          <>
            <div className="subhead">
              <h2>{data.tenant_name}</h2>
              <span className="meta">
                {t.lastSync}: {formatWhen(data.last_sync_at)}
              </span>
            </div>

            {!data.has_data ? (
              <div className="card state">
                <h3>{t.noData}</h3>
                <p>{t.noDataBody}</p>
              </div>
            ) : (
              <>
                <div className="tiles">
                  <StatTile
                    label={t.outstanding}
                    value={formatMoney(totals.outstanding, { compact: true })}
                    foot={formatMoney(totals.outstanding)}
                  />
                  <StatTile
                    label={t.overdue}
                    value={formatMoney(totals.overdue, { compact: true })}
                    foot={
                      totals.outstanding > 0
                        ? t.ofTotal(Math.round((totals.overdue / totals.outstanding) * 100))
                        : "—"
                    }
                    alert={totals.overdue > 0}
                  />
                  <StatTile label={t.bills} value={totals.bill_count} />
                  <StatTile label={t.customers} value={totals.party_count} />
                </div>

                <div className="grid-2">
                  <AgingChart aging={data.aging} t={t} />
                  <TopDebtors debtors={data.top_debtors} t={t} />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <AskPanel tenantId={tenantId} t={t} />
                </div>

                <BillsTable bills={data.bills} t={t} />
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
