import { useEffect, useMemo, useRef, useState } from "react";
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
import ReceivablesFilters from "./components/ReceivablesFilters";
import ReceivablesOverview from "./components/ReceivablesOverview";
import SmartDataExplorer from "./components/SmartDataExplorer";
import StatTile from "./components/StatTile";
import ThemeToggle from "./components/ThemeToggle";
import TrialGuide, { TrialBanner } from "./components/TrialGuide";
import TopDebtors from "./components/TopDebtors";
import Login from "./pages/Login";
import ResearchAgent from "./components/ResearchAgent";
import {
  DEFAULT_RECEIVABLE_FILTERS,
  deriveReceivables,
  filterBills,
  hasScopedReceivableFilters,
} from "./receivables";
import {
  defaultHomeView,
  homeNavigationState,
  workspaceLocation,
} from "./navigation";

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
  const [researchSection, setResearchSection] = useState("home");
  const [chatOpen, setChatOpen] = useState(false);
  const [showCleanup, setShowCleanup] = useState(false);
  const toolsRef = useRef(null);
  const researchEnabled = import.meta.env.VITE_RESEARCH_ENABLED !== "false";

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
        setView(defaultHomeView(next));
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

  function closeTools() {
    toolsRef.current?.removeAttribute("open");
  }

  function handleHome() {
    const next = homeNavigationState({
      view,
      showUpload,
      chatOpen,
      showCleanup,
      toolsOpen: Boolean(toolsRef.current?.open),
    }, data);
    setView(next.view);
    setShowUpload(next.showUpload);
    setChatOpen(next.chatOpen);
    setShowCleanup(next.showCleanup);
    closeTools();
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  const totals = data?.totals;
  const isTrial = session.account_type === "free_trial";
  const location = workspaceLocation(view, t, researchSection);

  return (
    <div className="app">
      <header className="header">
        <div className="header-brand-home">
          <BrandLogo compact onHome={handleHome} homeLabel={t.goHome} />
          <div className="brand">
            <h1>ARQ Astra</h1>
            <p>{t.tagline}</p>
          </div>
        </div>

        <div className="spacer" />

        <div className="header-company-context">
          {isTrial && <span className="trial-header-badge">{t.freeTrial}</span>}
          <div className="picker">
            <label htmlFor="company">{t.company}</label>
            <select
              id="company"
              value={tenantId}
              onChange={(event) => {
                closeTools();
                setTenantId(event.target.value);
              }}
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          className="icon-btn ai-trigger"
          type="button"
          onClick={() => setChatOpen(true)}
        >
          <IconSpark width={15} height={15} />
          {t.askArq}
        </button>

        <details
          className="header-tools"
          ref={toolsRef}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              closeTools();
              toolsRef.current?.querySelector("summary")?.focus();
            }
          }}
        >
          <summary className="icon-btn">{t.toolsAndSettings}</summary>
          <div className="header-tools-panel" role="group" aria-label={t.secondaryActions}>
            <button
              className="header-tool-action upload-trigger"
              type="button"
              onClick={() => {
                setShowUpload((open) => !open);
                closeTools();
              }}
              aria-expanded={showUpload}
            >
              <IconUpload width={15} height={15} />
              {t.uploadExcel}
            </button>

            {data && (
              <button
                className="header-tool-action cleanup-menu-action"
                type="button"
                onClick={() => {
                  setShowCleanup(true);
                  closeTools();
                }}
              >
                <IconTrash width={14} height={14} />
                {t.cleanupData}
              </button>
            )}

            <div className="header-tool-setting">
              <span>{t.languagePicker}</span>
              <div className="lang-group" aria-label={t.languagePicker}>
                {LANGS.map((language) => (
                  <button
                    type="button"
                    key={language.id}
                    onClick={() => {
                      setLang(language.id);
                      closeTools();
                    }}
                    aria-pressed={lang === language.id}
                  >
                    {language.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="header-tool-row">
              <ThemeToggle
                theme={theme}
                setTheme={(next) => {
                  setTheme(next);
                  closeTools();
                }}
                t={t}
              />
              <button className="header-tool-action" type="button" onClick={onLogout} title={session.email}>
                <IconLogout width={15} height={15} />
                {t.logout}
              </button>
            </div>
          </div>
        </details>
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
                <div className="workspace-location" aria-label={t.currentLocation}>
                  <span className="workspace-location-label">{t.currentLocation}</span>
                  <div className="workspace-location-trail">
                    <strong>{data.tenant_name}</strong>
                    <span aria-hidden="true">›</span>
                    <span>{location.area}</span>
                  </div>
                  <p><strong>{t.currentSection}:</strong> {location.subsection}</p>
                </div>
                <span className="meta">
                  <span className="dot-live" />
                  {t.lastUpdated}: {formatWhen(data.last_activity_at || data.last_sync_at)}
                </span>
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

              <nav className="workspace-nav" aria-label={t.dashboardViews}>
                <button
                  type="button"
                  aria-pressed={view === "receivables"}
                  aria-current={view === "receivables" ? "page" : undefined}
                  onClick={() => setView("receivables")}
                >
                  <IconRupee width={16} height={16} />
                  <span>
                    <strong>{t.receivablesView}</strong>
                    <small>{t.receivablesViewSub}</small>
                    {view === "receivables" && <em className="current-workspace">{t.current}</em>}
                  </span>
                </button>
                {data.has_financial_data && (
                  <button
                    type="button"
                    aria-pressed={view === "financial"}
                    aria-current={view === "financial" ? "page" : undefined}
                    onClick={() => setView("financial")}
                  >
                    <IconChart width={16} height={16} />
                    <span>
                      <strong>{t.financialView}</strong>
                      <small>{t.financialViewSub}</small>
                      {view === "financial" && <em className="current-workspace">{t.current}</em>}
                    </span>
                  </button>
                )}
                {researchEnabled && (
                  <button className="agents-nav"
                    type="button"
                    aria-pressed={view === "research"}
                    aria-current={view === "research" ? "page" : undefined}
                    onClick={() => setView("research")}
                  >
                    <IconSpark width={16} height={16} />
                    <span>
                      <strong>{t.research.nav}</strong>
                      <small>{t.agentsViewSub}</small>
                      {view === "research" && <em className="current-workspace">{t.current}</em>}
                    </span>
                  </button>
                )}
              </nav>

              {view === "research" && researchEnabled ? (
                <ResearchAgent
                  tenantId={tenantId}
                  t={t}
                  currentLabel={t.current}
                  onSectionChange={setResearchSection}
                  onAuthError={onLogout}
                />
              ) : view === "financial" && data.has_financial_data ? (
                <>
                  {data.smart_data?.has_data && (
                    <SmartDataExplorer smartData={data.smart_data} t={t} />
                  )}
                  {data.financials?.has_data && (
                    <FinancialOverview financials={data.financials} t={t} />
                  )}
                </>
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
          ownerEmail={session.email}
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

function ReceivablesView({ data, t }) {
  const [filters, setFilters] = useState({ ...DEFAULT_RECEIVABLE_FILTERS });
  const parties = useMemo(
    () => [...new Set(data.bills.map((bill) => bill.party).filter(Boolean))]
      .sort((left, right) => left.localeCompare(right)),
    [data.bills],
  );
  const filteredBills = useMemo(
    () => filterBills(data.bills, filters),
    [data.bills, filters],
  );
  const visible = useMemo(() => deriveReceivables(filteredBills), [filteredBills]);
  const filtered = hasScopedReceivableFilters(filters);

  useEffect(() => {
    setFilters({ ...DEFAULT_RECEIVABLE_FILTERS });
  }, [data.tenant_id]);

  const totals = visible.totals;

  return (
    <>
      <ReceivablesFilters
        filters={filters}
        parties={parties}
        visibleCount={filteredBills.length}
        totalCount={data.bills.length}
        onChange={setFilters}
        onReset={() => setFilters({ ...DEFAULT_RECEIVABLE_FILTERS })}
        t={t}
      />

      <ReceivablesOverview
        summary={totals}
        trajectory={visible.trajectory}
        filtered={filtered}
        t={t}
      />

      <div className="tiles">
        <StatTile
          label={t.outstanding}
          value={formatMoney(totals.outstanding, { compact: true })}
          foot={t.billCountFoot(totals.bill_count)}
          help={t.outstandingHelp}
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
          help={t.overdueHelp}
          icon={<IconAlarm />}
          tone={totals.overdue > 0 ? "bad" : "good"}
          delay={40}
        />
        <StatTile
          label={t.avgOverdue}
          value={`${totals.avg_overdue_days} ${t.daysShort}`}
          foot={t.maxOverdue(totals.max_overdue_days)}
          help={t.avgOverdueHelp}
          icon={<IconChart />}
          tone={totals.avg_overdue_days > 45 ? "bad" : undefined}
          delay={80}
        />
        <StatTile
          label={t.bills}
          value={totals.bill_count}
          foot={`${totals.overdue_bill_count} ${t.overdue.toLowerCase()}`}
          footTone={totals.overdue_bill_count > 0 ? "alert" : undefined}
          help={t.billsHelp}
          icon={<IconFile />}
          delay={120}
        />
        <StatTile
          label={t.owingCustomers}
          value={totals.party_count}
          foot={
            totals.top_party
              ? `${totals.top_party} · ${totals.concentration_pct}%`
              : undefined
          }
          help={t.customersHelp}
          icon={<IconUsers />}
          delay={160}
        />
      </div>

      {!filtered && <Alerts alerts={data.alerts} t={t} />}

      <div className="grid-2">
        <AgingChart aging={visible.aging} t={t} />
        <DueTimeline timeline={visible.dueTimeline} t={t} />
      </div>

      <div className="grid-2">
        <TopDebtors debtors={visible.topDebtors} t={t} />
        <ChaseList bills={visible.oldestBills} t={t} />
      </div>

      <BillsTable bills={filteredBills} t={t} />
      {!filtered && <DataNotes notes={data.notes} t={t} />}

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
