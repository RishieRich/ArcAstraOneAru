import { useEffect, useState } from "react";
import {
  AuthError, clearSession, fetchCompanies, fetchMetrics,
  formatMoney, formatWhen, loadSession,
} from "./api";
import { LANGS, T } from "./i18n";
import {
  IconAlarm, IconChart, IconFile, IconLogout, IconRupee, IconUsers,
  IconMessage, IconSpark, IconTrash, IconUpload,
} from "./icons";
import AgingChart from "./components/AgingChart";
import Alerts from "./components/Alerts";
import BillsTable from "./components/BillsTable";
import BrandLogo from "./components/BrandLogo";
import ChaseList from "./components/ChaseList";
import Copilot from "./components/Copilot";
import DataCleanup from "./components/DataCleanup";
import DataNotes from "./components/DataNotes";
import DueTimeline from "./components/DueTimeline";
import FinancialOverview from "./components/FinancialOverview";
import FinancialUpload from "./components/FinancialUpload";
import StatTile from "./components/StatTile";
import ThemeToggle from "./components/ThemeToggle";
import TrialGuide, { TrialBanner } from "./components/TrialGuide";
import TopDebtors from "./components/TopDebtors";
import Login from "./pages/Login";

export default function App() {
  const [lang, setLang] = useState(() => {
    const saved = localStorage.getItem("arq.lang");
    return saved && T[saved] ? saved : "en";
  });
  const [theme, setTheme] = useState(() =>
    localStorage.getItem("arq.theme") === "dark" ? "dark" : "light",
  );
  const [session, setSession] = useState(loadSession);
  const t = T[lang];

  useEffect(() => {
    localStorage.setItem("arq.lang", lang);
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    localStorage.setItem("arq.theme", theme);
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? "#0d0d0d" : "#f7f7f4");
  }, [theme]);

  function logout() {
    clearSession();
    setSession(null);
  }

  if (!session) {
    return (
      <Login
        t={t}
        lang={lang}
        setLang={setLang}
        theme={theme}
        setTheme={setTheme}
        onSuccess={setSession}
      />
    );
  }
  return (
    <Dashboard
      t={t}
      lang={lang}
      setLang={setLang}
      theme={theme}
      setTheme={setTheme}
      session={session}
      onLogout={logout}
    />
  );
}

function Dashboard({ t, lang, setLang, theme, setTheme, session, onLogout }) {
  const [companies, setCompanies] = useState([]);
  const [tenantId, setTenantId] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [view, setView] = useState("receivables");
  const [chatOpen, setChatOpen] = useState(false);
  const [showCleanup, setShowCleanup] = useState(false);

  useEffect(() => {
    fetchCompanies()
      .then((list) => {
        setCompanies(list);
        // Prefer a company with useful data so the first screen is not empty.
        const best =
          [...list].reverse().find((c) => c.has_bills) ||
          [...list].reverse().find((c) => c.has_financials) ||
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
      .then((next) => {
        setData(next);
        if (!next.has_receivables_data && next.has_financial_data) setView("financial");
      })
      .catch((e) => {
        if (e instanceof AuthError) return onLogout();
        setError(e.message);
      })
      .finally(() => setLoading(false));
  }, [tenantId]);

  async function handleImported() {
    try {
      const [next, companyList] = await Promise.all([
        fetchMetrics(tenantId),
        fetchCompanies(),
      ]);
      setData(next);
      setCompanies(companyList);
      setView("financial");
    } catch (refreshError) {
      if (refreshError instanceof AuthError) return onLogout();
      setError(refreshError.message);
    }
  }

  async function handleCleared() {
    try {
      const [next, companyList] = await Promise.all([
        fetchMetrics(tenantId),
        fetchCompanies(),
      ]);
      setData(next);
      setCompanies(companyList);
      setShowUpload(false);
      setView("receivables");
    } catch (refreshError) {
      if (refreshError instanceof AuthError) return onLogout();
      setError(refreshError.message);
    }
  }

  const totals = data?.totals;
  const isTrial = session.account_type === "free_trial";

  return (
    <div className="app">
      <header className="header">
        <BrandLogo compact />
        <div className="brand">
          <h1>ARQ Astra</h1>
          <p>{t.tagline}</p>
        </div>

        <div className="spacer" />

        {isTrial && <span className="trial-header-badge">{t.freeTrial}</span>}

        <div className="lang-group">
          {LANGS.map((l) => (
            <button key={l.id} onClick={() => setLang(l.id)} aria-pressed={lang === l.id}>
              {l.label}
            </button>
          ))}
        </div>

        <div className="picker">
          <label htmlFor="company">{t.company}</label>
          <select
            id="company"
            value={tenantId}
            onChange={(event) => {
              setView("receivables");
              setTenantId(event.target.value);
            }}
          >
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <ThemeToggle theme={theme} setTheme={setTheme} t={t} compact />

        <button
          className="icon-btn ai-trigger"
          type="button"
          onClick={() => setChatOpen(true)}
        >
          <IconSpark width={15} height={15} />
          {t.askArq}
        </button>

        <button
          className="icon-btn upload-trigger"
          type="button"
          onClick={() => setShowUpload((open) => !open)}
          aria-expanded={showUpload}
        >
          <IconUpload width={15} height={15} />
          {t.uploadExcel}
        </button>

        <button className="icon-btn" onClick={onLogout} title={session.email}>
          <IconLogout width={15} height={15} />
          {t.logout}
        </button>
      </header>

      <div className="shell">
        <div className="content">
          {error && (
            <div className="card state">
              <h3>{t.backendError}</h3>
              <p>{error}</p>
            </div>
          )}

          {!error && loading && <LoadingSkeleton t={t} />}

          {!error && !loading && !tenantId && (
            <div className="card state">
              <h3>{t.noCompanyAccess}</h3>
              <p>{t.noCompanyAccessBody}</p>
            </div>
          )}

          {!error && !loading && data && (
            <>
              <div className="subhead">
                <h2>{data.tenant_name}</h2>
                <span className="meta">
                  <span className="dot-live" />
                  {t.lastUpdated}: {formatWhen(data.last_activity_at || data.last_sync_at)}
                </span>
                <button
                  className="cleanup-trigger"
                  type="button"
                  onClick={() => setShowCleanup(true)}
                >
                  <IconTrash width={14} height={14} />
                  {t.cleanupData}
                </button>
              </div>

              {showUpload && (
                <FinancialUpload
                  tenantId={tenantId}
                  t={t}
                  onImported={handleImported}
                  onClose={() => setShowUpload(false)}
                />
              )}

              {isTrial && (
                <TrialBanner
                  t={t}
                  hasData={data.has_data}
                  onUpload={() => setShowUpload(true)}
                />
              )}

              {data.has_financial_data && (
                <nav className="view-tabs" aria-label={t.dashboardViews}>
                  <button
                    type="button"
                    aria-pressed={view === "receivables"}
                    onClick={() => setView("receivables")}
                  >
                    {t.receivablesView}
                  </button>
                  <button
                    type="button"
                    aria-pressed={view === "financial"}
                    onClick={() => setView("financial")}
                  >
                    {t.financialView}
                  </button>
                </nav>
              )}

              {view === "financial" && data.has_financial_data ? (
                <FinancialOverview financials={data.financials} t={t} />
              ) : !data.has_receivables_data ? (
                isTrial && !data.has_financial_data ? (
                  <TrialGuide
                    t={t}
                    onUpload={() => setShowUpload(true)}
                    onAsk={() => setChatOpen(true)}
                  />
                ) : (
                  <div className="card state">
                    <h3>{t.noData}</h3>
                    <p>{t.noDataBody}</p>
                  </div>
                )
              ) : (
                <ReceivablesView data={data} totals={totals} t={t} />
              )}
            </>
          )}
        </div>

      </div>

      <Copilot
        tenantId={tenantId}
        t={t}
        lang={lang}
        open={chatOpen}
        hasFinancialData={Boolean(data?.has_financial_data)}
        data={data}
        onClose={() => setChatOpen(false)}
        onAuthError={onLogout}
      />

      {showCleanup && data && (
        <DataCleanup
          tenantId={tenantId}
          companyName={data.tenant_name}
          t={t}
          onCleared={handleCleared}
          onClose={() => setShowCleanup(false)}
        />
      )}

      {!chatOpen && (
        <button
          className="chat-launcher"
          type="button"
          onClick={() => setChatOpen(true)}
          aria-label={t.openChat}
        >
          <IconMessage />
          <span>{t.askArq}</span>
        </button>
      )}
    </div>
  );
}

function ReceivablesView({ data, totals, t }) {
  return (
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
          foot={t.maxOverdue(totals.max_overdue_days)}
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
