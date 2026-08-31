import { useEffect, useMemo, useState } from "react";
import {
  deliverResearchCandidates, fetchResearchCandidates, formatMoney, formatWhen,
  fetchLatestResearch, generateResearchIcp, getResearchIcp, runCustomerResearch,
  runMaterialResearch, updateResearchCandidate,
} from "../api";
import {
  IconBox, IconChart, IconCheck, IconEye, IconNote, IconRefresh,
  IconSend, IconShield, IconSpark, IconUsers,
} from "../icons";
import { buildBusinessSnapshot } from "../snapshotPresentation";
import { customerBriefState, supplierBriefState } from "../researchPresentation";
import "./ResearchAgent.css";

const VIEWS = ["home", "icp", "customers", "suppliers"];
const FILTERS = ["all", "draft", "approved", "rejected", "delivered"];

function ArrowIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
}

function LinkIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3h7v7M10 14 21 3M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" /></svg>;
}

export default function ResearchAgent({
  tenantId,
  t,
  currentLabel,
  onSectionChange,
  onAuthError,
}) {
  const copy = t.research;
  const [view, setView] = useState("home");
  const [icp, setIcp] = useState(null);
  const [workspaces, setWorkspaces] = useState({
    customers: { candidates: [], summary: null, delivery: "" },
    suppliers: { candidates: [], summary: null, delivery: "" },
  });
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [filter, setFilter] = useState("all");
  const [expanded, setExpanded] = useState("");
  const [customerBrief, setCustomerBrief] = useState({ geography: "", industry: "" });
  const [supplierBrief, setSupplierBrief] = useState({
    product: "", specification: "", baseline: "",
  });

  useEffect(() => {
    setIcp(null);
    setWorkspaces({
      customers: { candidates: [], summary: null, delivery: "" },
      suppliers: { candidates: [], summary: null, delivery: "" },
    });
    if (!tenantId) return;
    setBusy("profile");
    setError("");
    getResearchIcp(tenantId)
      .then(async (result) => {
        if (result.profile?.profile_version === 2) return result;
        return generateResearchIcp(tenantId);
      })
      .then(setIcp)
      .catch(async (requestError) => {
        if (requestError.constructor.name === "AuthError") return onAuthError();
        try {
          setIcp(await generateResearchIcp(tenantId));
        } catch (generationError) {
          if (generationError.constructor.name === "AuthError") onAuthError();
          else setError(generationError.message);
        }
      })
      .finally(() => setBusy(""));
    fetchLatestResearch(tenantId)
      .then((result) => {
        const restored = result.runs || {};
        setWorkspaces((current) => ({
          customers: restored.customers
            ? {
              candidates: restored.customers.candidates || [],
              summary: restored.customers.summary,
              delivery: "",
            }
            : current.customers,
          suppliers: restored.suppliers
            ? {
              candidates: restored.suppliers.candidates || [],
              summary: restored.suppliers.summary,
              delivery: "",
            }
            : current.suppliers,
        }));
      })
      .catch((requestError) => {
        if (requestError.constructor.name === "AuthError") onAuthError();
      });
  }, [tenantId]);

  async function call(label, work) {
    setBusy(label);
    setError("");
    try {
      return await work();
    } catch (requestError) {
      if (requestError.constructor.name === "AuthError") onAuthError();
      else setError(requestError.message);
      return null;
    } finally {
      setBusy("");
    }
  }

  async function refreshIcp() {
    const result = await call("icp", () => generateResearchIcp(tenantId));
    if (result) setIcp(result);
  }

  async function loadRun(kind, run) {
    if (!run) return;
    setWorkspaces((current) => ({
      ...current,
      [kind]: {
        candidates: [],
        summary: run.research_summary,
        delivery: "",
      },
    }));
    const rows = await call("loading-results", () =>
      fetchResearchCandidates(tenantId, run.run_id));
    if (rows) {
      setWorkspaces((current) => ({
        ...current,
        [kind]: {
          candidates: rows,
          summary: run.research_summary,
          delivery: "",
        },
      }));
      setFilter("all");
    }
  }

  async function runCustomers() {
    const run = await call("customers", () =>
      runCustomerResearch(tenantId, customerBrief));
    await loadRun("customers", run);
  }

  async function runSuppliers() {
    const run = await call("suppliers", () =>
      runMaterialResearch(tenantId, {
        ...supplierBrief,
        baseline: Number(supplierBrief.baseline),
      }));
    await loadRun("suppliers", run);
  }

  async function decide(id, status) {
    const result = await call(`candidate-${id}`, () =>
      updateResearchCandidate(tenantId, id, status));
    if (result) {
      setWorkspaces((current) => ({
        ...current,
        [view]: {
          ...current[view],
          candidates: current[view].candidates.map((row) =>
            row.id === id ? { ...row, status } : row),
        },
      }));
    }
  }

  async function deliver() {
    const approvedIds = workspaces[view].candidates
      .filter((candidate) => candidate.status === "approved")
      .map((candidate) => candidate.id);
    const result = await call("delivery", () =>
      deliverResearchCandidates(tenantId, approvedIds));
    if (result) {
      setWorkspaces((current) => ({
        ...current,
        [view]: {
          ...current[view],
          delivery: result.message,
          candidates: current[view].candidates.map((row) =>
            approvedIds.includes(row.id) ? { ...row, status: "delivered" } : row),
        },
      }));
    }
  }

  async function copyDelivery() {
    await navigator.clipboard.writeText(workspaces[view].delivery);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  const activeWorkspace = workspaces[view] || {
    candidates: [], summary: null, delivery: "",
  };
  const candidates = activeWorkspace.candidates;
  const visibleCandidates = useMemo(
    () => filter === "all"
      ? candidates
      : candidates.filter((candidate) => candidate.status === filter),
    [candidates, filter],
  );
  const approvedCount = candidates.filter((row) => row.status === "approved").length;
  const customerState = customerBriefState(icp?.profile, customerBrief);
  const supplierState = supplierBriefState(supplierBrief);
  function selectView(nextView) {
    setView(nextView);
    onSectionChange?.(nextView);
  }

  return (
    <section className="research-agent">
      <header className="research-hero">
        <div className="research-orbit" aria-hidden="true">
          <span /><span /><span />
        </div>
        <div className="research-hero-copy">
          <span className="research-eyebrow"><IconSpark />{copy.nav}</span>
          <h2>{copy.title}</h2>
          <p>{copy.subtitle}</p>
        </div>
        <div className="research-trust">
          <IconShield />
          <span>{copy.safety}</span>
        </div>
      </header>

      <nav className="research-tabs" aria-label={copy.nav}>
        {VIEWS.map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={view === item}
            aria-current={view === item ? "page" : undefined}
            onClick={() => selectView(item)}
          >
            {item === "home" && <IconSpark />}
            {item === "icp" && <IconChart />}
            {item === "customers" && <IconUsers />}
            {item === "suppliers" && <IconBox />}
            {copy[item]}
            {view === item && <span className="research-current-section">{currentLabel}</span>}
          </button>
        ))}
      </nav>

      {error && (
        <div className="research-error" role="alert">
          <IconNote /><div><strong>{copy.errorTitle}</strong><p>{error}</p></div>
        </div>
      )}

      {view === "home" && (
        <ResearchHome
          copy={copy}
          setView={selectView}
          icp={icp}
          busy={busy === "profile"}
        />
      )}
      {view === "icp" && (
        <BusinessSnapshotView
          copy={copy}
          icp={icp}
          busy={busy === "icp"}
          refresh={refreshIcp}
        />
      )}
      {view === "customers" && (
        <ResearchWorkspace
          kind="customers"
          copy={copy}
          busy={busy}
          onRun={runCustomers}
          runDisabled={!customerState.canRun}
          disabledReason={customerState.reason && copy.researchDisabled[customerState.reason]}
          intro={copy.customerBriefIntro}
          summary={activeWorkspace.summary}
          candidates={visibleCandidates}
          allCandidates={candidates}
          filter={filter}
          setFilter={setFilter}
          expanded={expanded}
          setExpanded={setExpanded}
          decide={decide}
          approvedCount={approvedCount}
          deliver={deliver}
          delivery={activeWorkspace.delivery}
          copyDelivery={copyDelivery}
          copied={copied}
        >
          <div className="research-form-grid">
            <ResearchField
              label={copy.geography}
              hint={copy.optional}
              purpose={copy.geographyPurpose}
              value={customerBrief.geography}
              placeholder={copy.placeholders.geography}
              onChange={(value) =>
                setCustomerBrief((current) => ({ ...current, geography: value }))}
            />
            <ResearchField
              label={copy.industry}
              hint={copy.optional}
              purpose={copy.industryPurpose}
              value={customerBrief.industry}
              placeholder={copy.placeholders.industry}
              onChange={(value) =>
                setCustomerBrief((current) => ({ ...current, industry: value }))}
            />
          </div>
        </ResearchWorkspace>
      )}
      {view === "suppliers" && (
        <ResearchWorkspace
          kind="suppliers"
          copy={copy}
          busy={busy}
          onRun={runSuppliers}
          runDisabled={!supplierState.canRun}
          disabledReason={supplierState.reason && copy.researchDisabled[supplierState.reason]}
          intro={copy.supplierBriefIntro}
          summary={activeWorkspace.summary}
          candidates={visibleCandidates}
          allCandidates={candidates}
          filter={filter}
          setFilter={setFilter}
          expanded={expanded}
          setExpanded={setExpanded}
          decide={decide}
          approvedCount={approvedCount}
          deliver={deliver}
          delivery={activeWorkspace.delivery}
          copyDelivery={copyDelivery}
          copied={copied}
        >
          <div className="research-form-grid three">
            <ResearchField
              label={copy.product}
              hint={copy.required}
              purpose={copy.productPurpose}
              value={supplierBrief.product}
              placeholder={copy.placeholders.product}
              onChange={(value) =>
                setSupplierBrief((current) => ({ ...current, product: value }))}
            />
            <ResearchField
              label={copy.specification}
              hint={copy.optional}
              purpose={copy.specificationPurpose}
              value={supplierBrief.specification}
              placeholder={copy.placeholders.specification}
              onChange={(value) =>
                setSupplierBrief((current) => ({ ...current, specification: value }))}
            />
            <ResearchField
              label={copy.baseline}
              hint={copy.required}
              purpose={copy.baselinePurpose}
              value={supplierBrief.baseline}
              type="number"
              placeholder={copy.placeholders.baseline}
              onChange={(value) =>
                setSupplierBrief((current) => ({ ...current, baseline: value }))}
            />
          </div>
        </ResearchWorkspace>
      )}
    </section>
  );
}

function actionDetails(action, copy) {
  if (action.type === "collect") {
    return {
      icon: <IconUsers />,
      text: copy.actionCollect(
        action.party,
        formatMoney(action.amount, { compact: true }),
        action.overdue_days,
      ),
    };
  }
  if (action.type === "protect_product") {
    return {
      icon: <IconBox />,
      text: copy.actionProtectProduct(action.product, action.share_pct),
    };
  }
  return {
    icon: <IconChart />,
    text: copy.actionGrowCustomer(action.customer, action.orders),
  };
}

function AgentActionPlan({ copy, icp, busy }) {
  if (busy) {
    return (
      <div className="agent-plan agent-plan-loading">
        <IconRefresh className="spin" />
        <span>{copy.profileBuilding}</span>
      </div>
    );
  }
  const actions = icp?.profile?.action_plan || [];
  return (
    <section className="agent-plan">
      <div className="agent-plan-heading">
        <div>
          <span className="panel-kicker">{copy.worksNow}</span>
          <h3>{copy.actionPlan}</h3>
          <p>{copy.actionPlanSub}</p>
        </div>
        <span className="agent-plan-count">{actions.length}</span>
      </div>
      {actions.length ? (
        <div className="agent-actions">
          {actions.map((action, index) => {
            const details = actionDetails(action, copy);
            return (
              <article key={`${action.type}-${index}`} style={{ "--delay": `${index * 70}ms` }}>
                <span className="agent-action-number">{String(index + 1).padStart(2, "0")}</span>
                <i>{details.icon}</i>
                <p>{details.text}</p>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="agent-plan-empty">
          <IconChart />
          <div><strong>{copy.noActionsTitle}</strong><p>{copy.noActionsBody}</p></div>
        </div>
      )}
    </section>
  );
}

function ResearchHome({ copy, setView, icp, busy }) {
  const cards = [
    { id: "icp", icon: <IconChart />, number: "01", title: copy.businessSnapshotTitle, body: copy.businessSnapshotBody, meta: icp ? copy.profileAvailable : copy.startHere },
    { id: "customers", icon: <IconUsers />, number: "02", title: copy.customerTitle, body: copy.customerBody, meta: copy.searchNeeded },
    { id: "suppliers", icon: <IconBox />, number: "03", title: copy.supplierTitle, body: copy.supplierBody, meta: copy.searchNeeded },
  ];
  return (
    <>
      <AgentActionPlan copy={copy} icp={icp} busy={busy} />
      <div className="research-capability-grid">
        {cards.map((card, index) => (
          <button
            className={`research-capability capability-${index + 1}`}
            key={card.id}
            type="button"
            onClick={() => setView(card.id)}
            style={{ "--delay": `${index * 70}ms` }}
          >
            <span className="capability-number">{card.number}</span>
            <span className="capability-icon">{card.icon}</span>
            <span className="capability-meta">{card.meta}</span>
            <strong>{card.title}</strong>
            <span className="capability-body">{card.body}</span>
            <span className="capability-link">{copy.open}<ArrowIcon /></span>
          </button>
        ))}
      </div>
    </>
  );
}

function BusinessSnapshotView({ copy, icp, busy, refresh }) {
  const snapshot = buildBusinessSnapshot(icp || {});
  const attention = snapshot.attention;
  const factCards = [
    snapshot.topProduct && { label: copy.strongestProduct, body: copy.productFact(snapshot.topProduct.name, formatMoney(snapshot.topProduct.revenue), snapshot.topProduct.revenue_share_pct) },
    snapshot.topCustomer && { label: copy.strongestCustomer, body: copy.customerFact(snapshot.topCustomer.name, formatMoney(snapshot.topCustomer.revenue), snapshot.topCustomer.orders) },
    snapshot.topCollection && { label: copy.collectionPriority, body: copy.collectionFact(snapshot.topCollection.name, formatMoney(snapshot.topCollection.overdue || snapshot.topCollection.outstanding), snapshot.topCollection.max_overdue_days) },
    attention && { label: copy.attention, body: attention.type === "urgentCollection"
      ? copy.urgentCollectionFact(attention.row.party, formatMoney(attention.row.amount), attention.row.overdue_days)
      : attention.type === "productConcentration"
        ? copy.productConcentrationFact(attention.row.product, attention.row.share_pct)
        : copy.customerFollowUpFact(attention.row.customer, attention.row.orders) },
  ].filter(Boolean);

  return (
    <div className="research-panel research-icp-view">
      <div className="research-panel-heading">
        <div>
          <span className="panel-kicker">{copy.snapshot}</span>
          <h3>{copy.businessSnapshotTitle}</h3>
        </div>
        <button className="research-primary" type="button" disabled={busy} onClick={refresh}>
          <IconRefresh className={busy ? "spin" : ""} />
          {busy ? copy.searching : copy.refresh}
        </button>
      </div>
      {!icp ? (
        <EmptyState icon={<IconChart />} title={copy.emptyTitle} body={copy.businessSnapshotBody} />
      ) : (
        <>
          <div className="snapshot-context" aria-label={copy.snapshotContext}>
            <span><strong>{copy.source}</strong>{copy.snapshotSource(snapshot.hasSales, snapshot.hasReceivables)}</span>
            <span><strong>{copy.period}</strong>{snapshot.salesPeriod ? copy.snapshotSalesPeriod(snapshot.salesPeriod.from, snapshot.salesPeriod.to) : copy.snapshotSalesPeriodUnavailable}</span>
            <span><strong>{copy.freshness}</strong>{snapshot.generatedAt ? copy.snapshotFreshness(formatWhen(snapshot.generatedAt)) : copy.snapshotFreshnessUnavailable}</span>
          </div>
          {factCards.length ? (
            <div className="snapshot-facts">
              {factCards.map((fact) => <article key={fact.label}><span>{fact.label}</span><p>{fact.body}</p></article>)}
            </div>
          ) : <EmptyState icon={<IconChart />} title={copy.emptySnapshotTitle} body={copy.emptySnapshot} />}
          {snapshot.missingEvidence.length > 0 && (
            <section className="snapshot-evidence">
              <div><span className="panel-kicker">{copy.missingEvidence}</span><p>{copy.missingEvidenceBody}</p></div>
              <ul>{snapshot.missingEvidence.map((item) => <li key={item.id}><IconNote /><span><strong>{copy.evidenceItems[item.id]}</strong>{copy.evidencePrevents[item.prevents]}</span></li>)}</ul>
            </section>
          )}
          {(snapshot.products.length > 0 || snapshot.customers.length > 0 || snapshot.collections.length > 0) && (
            <section className="snapshot-rankings">
              <div className="snapshot-rankings-heading"><span className="panel-kicker">{copy.rankingEvidence}</span><p>{copy.rankingEvidenceBody}</p></div>
              <div className="icp-columns">
                <RankedList title={copy.recordedSalesProducts} rows={snapshot.products} render={(row) => copy.productEvidence(formatMoney(row.revenue), row.revenue_share_pct, row.orders, row.customers, row.last_sale || copy.noRecordedDate)} />
                <RankedList title={copy.recordedSalesCustomers} rows={snapshot.customers} render={(row) => copy.customerEvidence(formatMoney(row.revenue), row.orders, row.recency_days, row.last_order || copy.noRecordedDate)} />
              </div>
              {snapshot.collections.length > 0 && <CollectionPriorities rows={snapshot.collections} copy={copy} />}
            </section>
          )}
          <div className="icp-method">
            <IconShield />
            <div><strong>{copy.method}</strong><p>{copy.rankingMethodBody}</p></div>
          </div>
        </>
      )}
    </div>
  );
}

function CollectionPriorities({ rows, copy }) {
  return (
    <div className="collection-priorities">
      <div className="queue-heading">
        <div><span className="panel-kicker">{copy.currentReceivables}</span><p>{copy.collectionEvidenceHeading}</p></div>
        <span className="queue-count">{rows.length}</span>
      </div>
      <div className="collection-priority-grid">
        {rows.slice(0, 6).map((row, index) => (
          <article key={row.name}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <div>
              <strong>{row.name}</strong>
              <small>{copy.collectionEvidence(row.bill_count, row.max_overdue_days, formatMoney(row.outstanding))}</small>
            </div>
            <b>{formatMoney(row.overdue || row.outstanding, { compact: true })}</b>
          </article>
        ))}
      </div>
    </div>
  );
}

function RankedList({ title, rows, render }) {
  return (
    <div className="icp-list">
      <h4>{title}</h4>
      {rows.slice(0, 5).map((row, index) => (
        <div className="icp-list-row" key={row.name}>
          <span className="rank">{String(index + 1).padStart(2, "0")}</span>
          <span><strong>{row.name}</strong><small>{render(row)}</small></span>
          <span className="micro-bar"><i style={{ width: `${Math.max(12, row.revenue_share_pct || 12)}%` }} /></span>
        </div>
      ))}
    </div>
  );
}

function ResearchField({ label, hint, purpose, value, onChange, placeholder, type = "text" }) {
  return (
    <label className="research-field">
      <span>{label}{hint && <small>{hint}</small>}{purpose && <em>{purpose}</em>}</span>
      <input
        type={type}
        min={type === "number" ? "0" : undefined}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function ResearchWorkspace({
  kind, copy, busy, onRun, runDisabled, summary, candidates, allCandidates,
  filter, setFilter, expanded, setExpanded, decide, approvedCount,
  deliver, delivery, copyDelivery, copied, disabledReason, intro, children,
}) {
  const isSearching = busy === kind || busy === "loading-results";
  return (
    <div className="research-panel research-workspace">
      <div className="research-panel-heading">
        <div>
          <span className="panel-kicker">{copy.researchBrief}</span>
          <h3>{kind === "customers" ? copy.customerTitle : copy.supplierTitle}</h3>
        </div>
      </div>
      <p className="research-brief-intro">{intro}</p>
      {children}
      {runDisabled && (
        <div className="research-helper"><IconNote />{disabledReason}</div>
      )}
      <button
        className="research-primary research-run"
        type="button"
        disabled={Boolean(busy) || runDisabled}
        onClick={onRun}
      >
        {isSearching ? <IconRefresh className="spin" /> : <IconSpark />}
        {isSearching
          ? copy.searching
          : kind === "customers" ? copy.runCustomers : copy.runSuppliers}
      </button>
      {isSearching && <ResearchProgress copy={copy} />}
      {summary && <ResearchSummary copy={copy} summary={summary} />}
      {summary?.web_search_ready !== false && (
        <CandidateQueue
          copy={copy}
          candidates={candidates}
          allCandidates={allCandidates}
          filter={filter}
          setFilter={setFilter}
          expanded={expanded}
          setExpanded={setExpanded}
          decide={decide}
          busy={busy}
          approvedCount={approvedCount}
          deliver={deliver}
          delivery={delivery}
          copyDelivery={copyDelivery}
          copied={copied}
        />
      )}
    </div>
  );
}

function ResearchProgress({ copy }) {
  return (
    <div className="research-progress" aria-live="polite">
      <div className="progress-track"><span /></div>
      <div className="progress-steps">
        <span className="active">{copy.progressPlan}</span><span>{copy.progressDiscover}</span>
        <span>{copy.progressVerify}</span><span>{copy.progressScore}</span><span>{copy.progressReview}</span>
      </div>
    </div>
  );
}

function ResearchSummary({ copy, summary }) {
  if (summary.web_search_ready === false) {
    return (
      <section className="research-plan-result">
        <span className="research-plan-icon"><IconCheck /></span>
        <div className="research-plan-copy">
          <span className="panel-kicker">{copy.searchPlanTitle}</span>
          <h4>{copy.webNotConnectedTitle}</h4>
          <p>{copy.webNotConnectedBody}</p>
          <small>{copy.searchPlanBody}</small>
        </div>
        <div className="planned-searches">
          <strong>{copy.plannedSearches}</strong>
          <ol>{(summary.queries || []).map((query) => <li key={query}>{query}</li>)}</ol>
        </div>
      </section>
    );
  }
  const metrics = [
    [copy.sourcesReviewed, summary.sources_reviewed, <IconEye />],
    [copy.verifiedLeads, summary.candidates_verified, <IconShield />],
    [copy.highFit, summary.high_fit_candidates, <IconSpark />],
  ];
  return (
    <div className="research-summary">
      <div className="summary-metrics">
        {metrics.map(([label, value, icon]) => (
          <div key={label}>{icon}<span><strong>{value}</strong><small>{label}</small></span></div>
        ))}
      </div>
      <div className="summary-insights">
        <span className="panel-kicker">{copy.keyInsights}</span>
        <ul>
          <li>{copy.insightSources(summary.sources_reviewed, summary.queries_run)}</li>
          <li>{copy.insightMatches(summary.candidates_verified)}</li>
          <li>{copy.insightStrong(summary.high_fit_candidates)}</li>
        </ul>
      </div>
    </div>
  );
}

function CandidateQueue({
  copy, candidates, allCandidates, filter, setFilter, expanded, setExpanded,
  decide, busy, approvedCount, deliver, delivery, copyDelivery, copied,
}) {
  if (!allCandidates.length) {
    return <EmptyState icon={<IconUsers />} title={copy.emptyTitle} body={copy.emptyBody} />;
  }
  return (
    <div className="candidate-queue">
      <div className="queue-heading">
        <div><span className="panel-kicker">{copy.queue}</span><p>{copy.queueSub}</p></div>
        <span className="queue-count">{allCandidates.length}</span>
      </div>
      <div className="queue-filters">
        {FILTERS.map((item) => {
          const count = item === "all"
            ? allCandidates.length
            : allCandidates.filter((row) => row.status === item).length;
          return (
            <button key={item} type="button" aria-pressed={filter === item} onClick={() => setFilter(item)}>
              {copy[item]} <span>{count}</span>
            </button>
          );
        })}
      </div>
      <div className="candidate-list">
        {candidates.map((candidate, index) => (
          <CandidateCard
            key={candidate.id}
            copy={copy}
            candidate={candidate}
            expanded={expanded === candidate.id}
            onExpand={() => setExpanded(expanded === candidate.id ? "" : candidate.id)}
            decide={decide}
            busy={busy === `candidate-${candidate.id}`}
            index={index}
          />
        ))}
      </div>
      <div className="delivery-dock">
        <div><IconCheck /><span><strong>{copy.approvedCount(approvedCount)}</strong></span></div>
        <button type="button" disabled={!approvedCount || Boolean(busy)} onClick={deliver}>
          <IconSend />{copy.deliver}
        </button>
      </div>
      {delivery && (
        <div className="delivery-result">
          <div><span className="panel-kicker">{copy.deliveryTitle}</span>
            <button type="button" onClick={copyDelivery}><IconNote />{copied ? copy.copied : copy.copy}</button>
          </div>
          <pre>{delivery}</pre>
        </div>
      )}
    </div>
  );
}

function CandidateCard({ copy, candidate, expanded, onExpand, decide, busy, index }) {
  const enrichment = candidate.enrichment || {};
  const evidence = enrichment.evidence || [];
  const scoreTone = candidate.fit_score >= 78 ? "high" : candidate.fit_score >= 62 ? "medium" : "emerging";
  const matchedTerms = (enrichment.matched_terms || []).join(", ");
  const sourceLabel = copy.sourceCount(enrichment.source_count || 1);
  const confidenceLabel = copy.confidenceLevels[enrichment.verification] || copy.confidenceLevels.emerging;
  return (
    <article className={`candidate-card status-${candidate.status}`} style={{ "--delay": `${index * 45}ms` }}>
      <div className="candidate-score">
        <span className={`score-ring ${scoreTone}`} style={{ "--score": `${candidate.fit_score * 3.6}deg` }}>
          <strong>{candidate.fit_score}</strong><small>{copy.fit}</small>
        </span>
      </div>
      <div className="candidate-main">
        <div className="candidate-title-row">
          <div>
            <span className={`status-pill ${candidate.status}`}>{copy[candidate.status]}</span>
            <h4>{candidate.name}</h4>
            <p className="candidate-location">{candidate.location || copy.noLocation}</p>
          </div>
          <span className={`confidence ${enrichment.verification || "emerging"}`}>
            <i />{confidenceLabel} {copy.confidence}
          </span>
        </div>
        <p className="fit-reason">{copy.matchReason(matchedTerms, candidate.location, sourceLabel)}</p>
        <div className="candidate-tags">
          {(enrichment.matched_terms || []).map((term) => <span key={term}>{term}</span>)}
          <span>{sourceLabel}</span>
        </div>
        <div className="candidate-actions">
          {candidate.status === "draft" && (
            <>
              <button className="approve" type="button" disabled={busy} onClick={() => decide(candidate.id, "approved")}><IconCheck />{copy.approve}</button>
              <button className="reject" type="button" disabled={busy} onClick={() => decide(candidate.id, "rejected")}>{copy.reject}</button>
            </>
          )}
          <button className="evidence-toggle" type="button" aria-expanded={expanded} onClick={onExpand}>
            <IconEye />{expanded ? copy.hideEvidence : copy.evidence}
          </button>
          <a href={candidate.source_url} target="_blank" rel="noreferrer"><LinkIcon />{copy.source}</a>
        </div>
        {expanded && (
          <div className="evidence-drawer">
            {evidence.map((item) => (
              <a key={item.url} href={item.url} target="_blank" rel="noreferrer">
                <span className="evidence-domain">{item.domain}<small>{item.source_tier?.replace("_", " ")}</small></span>
                <strong>{item.title}</strong>
                <p>{item.excerpt}</p>
              </a>
            ))}
            {enrichment.score_components && (
              <div className="score-breakdown">
                {Object.entries(enrichment.score_components).map(([name, value]) => (
                  <span key={name}><small>{copy.scoreLabels[name] || name.replaceAll("_", " ")}</small><strong>+{value}</strong></span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

function EmptyState({ icon, title, body }) {
  return (
    <div className="research-empty">
      <span>{icon}</span><strong>{title}</strong><p>{body}</p>
    </div>
  );
}
