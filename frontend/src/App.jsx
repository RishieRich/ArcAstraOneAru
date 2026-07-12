import { useEffect, useState } from "react";
import {
  AuthError, clearSession, fetchCompanies, fetchMetrics,
  formatMoney, formatWhen, loadSession,
} from "./api";
import { LANGS, T } from "./i18n";
import {
  IconAlarm, IconChart, IconFile, IconLogout, IconRupee, IconUsers,
} from "./icons";
import AgingChart from "./components/AgingChart";
import Alerts from "./components/Alerts";
import BillsTable from "./components/BillsTable";
import ChaseList from "./components/ChaseList";
import Copilot from "./components/Copilot";
import DataNotes from "./components/DataNotes";
import DueTimeline from "./components/DueTimeline";
import StatTile from "./components/StatTile";
import TopDebtors from "./components/TopDebtors";
import Login from "./pages/Login";

export default function App() {
  const [lang, setLang] = useState(() => localStorage.getItem("arq.lang") || "en");
  const [session, setSession] = useState(loadSession);
  const t = T[lang];

  useEffect(() => {
    localStorage.setItem("arq.lang", lang);
  }, [lang]);

  function logout() {
    clearSession();
    setSession(null);
  }

  if (!session) {
    return <Login t={t} lang={lang} setLang={setLang} onSuccess={setSession} />;
  }
  return (
    <Dashboard t={t} lang={lang} setLang={setLang} session={session} onLogout={logout} />
  );
}

function Dashboard({ t, lang, setLang, session, onLogout }) {
  const [companies, setCompanies] = useState([]);
  const [tenantId, setTenantId] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

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
        if (e instanceof AuthError) return onLogout();
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
      .catch((e) => {
        if (e instanceof AuthError) return onLogout();
        setError(e.message);
      })
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
            <button key={l.id} onClick={() => setLang(l.id)} aria-pressed={lang === l.id}>
              {l.label}
            </button>
          ))}
        </div>

        <div className="picker">
          <label htmlFor="company">{t.company}</label>
          <select id="company" value={tenantId} onChange={(e) => setTenantId(e.target.value)}>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <button className="icon-btn" onClick={onLogout} title={session.email}>
          <IconLogout width={15} height={15} />
          {t.logout}
        </button>
      </header>

      <div className="shell">
        <div className="content">
          {error && (
            <div className="card state">
              <h3>Could not reach the backend</h3>
              <p>{error}</p>
            </div>
          )}

          {!error && loading && <LoadingSkeleton t={t} />}

          {!error && !loading && data && (
            <>
              <div className="subhead">
                <h2>{data.tenant_name}</h2>
                <span className="meta">
                  <span className="dot-live" />
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
                      icon={<IconRupee />}
                      delay={0}
                    />
                    <StatTile
                      label={t.overdue}
                      value={formatMoney(totals.overdue, { compact: true })}
                      foot={
                        totals.outstanding > 0
                          ? t.ofTotal(Math.round((totals.overdue / totals.outstanding) * 100))
                          : "—"
                      }
                      footTone={totals.overdue > 0 ? "alert" : "ok"}
                      icon={<IconAlarm />}
                      tone={totals.overdue > 0 ? "bad" : "good"}
                      delay={40}
                    />
                    <StatTile
                      label={t.avgOverdue}
                      value={`${totals.avg_overdue_days} ${t.daysShort}`}
                      foot={`max ${totals.max_overdue_days} ${t.daysShort}`}
                      icon={<IconChart />}
                      tone={totals.avg_overdue_days > 45 ? "bad" : undefined}
                      delay={80}
                    />
                    <StatTile
                      label={t.bills}
                      value={totals.bill_count}
                      foot={`${totals.overdue_bill_count} ${t.overdue.toLowerCase()}`}
                      footTone={totals.overdue_bill_count > 0 ? "alert" : undefined}
                      icon={<IconFile />}
                      delay={120}
                    />
                    <StatTile
                      label={t.customers}
                      value={totals.party_count}
                      foot={
                        totals.top_party
                          ? `${totals.top_party} · ${totals.concentration_pct}%`
                          : undefined
                      }
                      icon={<IconUsers />}
                      delay={160}
                    />
                  </div>

                  <Alerts alerts={data.alerts} t={t} />

                  <div className="grid-2">
                    <AgingChart aging={data.aging} t={t} />
                    <DueTimeline timeline={data.due_timeline} t={t} />
                  </div>

                  <div className="grid-2">
                    <TopDebtors debtors={data.top_debtors} t={t} />
                    <ChaseList bills={data.oldest_bills} t={t} />
                  </div>

                  <BillsTable bills={data.bills} t={t} />

                  <DataNotes notes={data.notes} t={t} />

                  <div className="footer-note">
                    ARQ Tally Connector · {t.lastSync}: {formatWhen(data.last_sync_at)}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <Copilot tenantId={tenantId} t={t} onAuthError={onLogout} />
      </div>
    </div>
  );
}

function LoadingSkeleton({ t }) {
  return (
    <>
      <div className="subhead">
        <h2 style={{ color: "var(--text-muted)" }}>{t.loading}</h2>
      </div>
      <div className="tiles">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton" style={{ height: 118 }} />
        ))}
      </div>
      <div className="grid-2">
        <div className="skeleton" style={{ height: 300 }} />
        <div className="skeleton" style={{ height: 300 }} />
      </div>
    </>
  );
}
