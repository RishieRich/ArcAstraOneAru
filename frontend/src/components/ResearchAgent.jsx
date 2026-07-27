import { useEffect, useMemo, useState } from "react";
import {
  deliverResearchCandidates, fetchResearchCandidates, formatMoney,
  generateResearchIcp, getResearchIcp, runCustomerResearch,
  runMaterialResearch, updateResearchCandidate,
} from "../api";
import {
  IconBox, IconChart, IconCheck, IconEye, IconNote, IconRefresh,
  IconSend, IconShield, IconSpark, IconUsers,
} from "../icons";
import "./ResearchAgent.css";

const VIEWS = ["home", "icp", "customers", "suppliers"];
const FILTERS = ["all", "draft", "approved", "rejected", "delivered"];

function ArrowIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
}

function LinkIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3h7v7M10 14 21 3M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" /></svg>;
}

export default function ResearchAgent({ tenantId, t, onAuthError }) {
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
    getResearchIcp(tenantId)
      .then(setIcp)
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
  const readiness = icp
    ? Math.round(
      (icp.data_completeness.available_count /
        icp.data_completeness.total_count) * 100,
    )
    : 0;

  return (
    <section className="research-agent">
      <header className="research-hero">
        <div className="research-orbit" aria-hidden="true">
          <span /><span /><span />
        </div>
        <div className="research-hero-copy">
          <span className="research-eyebrow"><IconSpark />{copy.eyebrow}</span>
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
            onClick={() => setView(item)}
          >
            {item === "home" && <IconSpark />}
            {item === "icp" && <IconChart />}
            {item === "customers" && <IconUsers />}
            {item === "suppliers" && <IconBox />}
            {copy[item]}
          </button>
        ))}
      </nav>

      {error && (
        <div className="research-error" role="alert">
          <IconNote /><div><strong>Research needs attention</strong><p>{error}</p></div>
        </div>
      )}

      {view === "home" && (
        <ResearchHome copy={copy} setView={setView} icp={icp} />
      )}
      {view === "icp" && (
        <IcpView
          copy={copy}
          icp={icp}
          readiness={readiness}
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
              value={customerBrief.geography}
              placeholder="e.g. Gujarat, West India"
              onChange={(value) =>
                setCustomerBrief((current) => ({ ...current, geography: value }))}
            />
            <ResearchField
              label={copy.industry}
              hint={copy.optional}
              value={customerBrief.industry}
              placeholder="e.g. chemicals, pumps"
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
          runDisabled={!supplierBrief.product || !supplierBrief.baseline}
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
              value={supplierBrief.product}
              placeholder="e.g. EN8 steel bar"
              onChange={(value) =>
                setSupplierBrief((current) => ({ ...current, product: value }))}
            />
            <ResearchField
              label={copy.specification}
              hint={copy.optional}
              value={supplierBrief.specification}
              placeholder="e.g. 40 mm, annealed"
              onChange={(value) =>
                setSupplierBrief((current) => ({ ...current, specification: value }))}
            />
            <ResearchField
              label={copy.baseline}
              value={supplierBrief.baseline}
              type="number"
              placeholder="₹ / unit"
              onChange={(value) =>
                setSupplierBrief((current) => ({ ...current, baseline: value }))}
            />
          </div>
        </ResearchWorkspace>
      )}
    </section>
  );
}

function ResearchHome({ copy, setView, icp }) {
  const cards = [
    { id: "icp", icon: <IconChart />, number: "01", title: copy.understandTitle, body: copy.understandBody, meta: icp ? "Profile available" : "Start here" },
    { id: "customers", icon: <IconUsers />, number: "02", title: copy.customerTitle, body: copy.customerBody, meta: "Primary workflow" },
    { id: "suppliers", icon: <IconBox />, number: "03", title: copy.supplierTitle, body: copy.supplierBody, meta: "Triggered only" },
  ];
  return (
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
  );
}

function IcpView({ copy, icp, readiness, busy, refresh }) {
  return (
    <div className="research-panel research-icp-view">
      <div className="research-panel-heading">
        <div>
          <span className="panel-kicker">{copy.icp}</span>
          <h3>{copy.understandTitle}</h3>
        </div>
        <button className="research-primary" type="button" disabled={busy} onClick={refresh}>
          <IconRefresh className={busy ? "spin" : ""} />
          {busy ? copy.searching : copy.refresh}
        </button>
      </div>
      {!icp ? (
        <EmptyState icon={<IconChart />} title={copy.emptyTitle} body={copy.understandBody} />
      ) : (
        <>
          <div className="icp-summary-grid">
            <div className="icp-readiness">
              <div
                className="readiness-ring"
                style={{ "--progress": `${readiness * 3.6}deg` }}
                aria-label={`${copy.readiness}: ${readiness}%`}
              >
                <span><strong>{readiness}%</strong><small>{copy.readiness}</small></span>
              </div>
            </div>
            <div className="icp-narrative">
              <span className="panel-kicker">Deterministic snapshot</span>
              <p>{icp.narrative}</p>
              <div className="icp-stat-row">
                <span><strong>{icp.profile.snapshot.products_analyzed}</strong> products</span>
                <span><strong>{icp.profile.snapshot.customers_analyzed}</strong> customers</span>
                <span><strong>{formatMoney(icp.profile.snapshot.sales_value_analyzed, { compact: true })}</strong> analyzed</span>
              </div>
            </div>
          </div>
          <div className="icp-columns">
            <RankedList
              title={copy.topProducts}
              rows={icp.profile.top_products}
              render={(row) => `${formatMoney(row.revenue, { compact: true })} · ${row.revenue_share_pct}%`}
            />
            <RankedList
              title={copy.bestCustomers}
              rows={icp.profile.best_customers}
              render={(row) => `${row.icp_score}/100 · ${row.orders} orders`}
            />
          </div>
          <div className="icp-method">
            <IconShield />
            <div><strong>{copy.method}</strong><p>{icp.profile.ranking_method}</p></div>
          </div>
          {icp.data_completeness.needs_more_data.length > 0 && (
            <div className="needs-data">
              <span>{copy.needsData}</span>
              {icp.data_completeness.needs_more_data.map((item) =>
                <small key={item}>{item}</small>)}
            </div>
          )}
        </>
      )}
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
          <span className="micro-bar"><i style={{ width: `${Math.max(12, row.revenue_share_pct || row.icp_score)}%` }} /></span>
        </div>
      ))}
    </div>
  );
}

function ResearchField({ label, hint, value, onChange, placeholder, type = "text" }) {
  return (
    <label className="research-field">
      <span>{label}{hint && <small>{hint}</small>}</span>
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
  deliver, delivery, copyDelivery, copied, children,
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
      {children}
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
      {isSearching && <ResearchProgress />}
      {summary && <ResearchSummary copy={copy} summary={summary} />}
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
    </div>
  );
}

function ResearchProgress() {
  return (
    <div className="research-progress" aria-live="polite">
      <div className="progress-track"><span /></div>
      <div className="progress-steps">
        <span className="active">Plan</span><span>Discover</span>
        <span>Verify</span><span>Score</span><span>Curate</span>
      </div>
    </div>
  );
}

function ResearchSummary({ copy, summary }) {
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
        <ul>{summary.key_insights.map((insight) => <li key={insight}>{insight}</li>)}</ul>
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
        <div><IconCheck /><span><strong>{approvedCount}</strong> approved</span></div>
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
            <i />{enrichment.verification || "emerging"} {copy.confidence}
          </span>
        </div>
        <p className="fit-reason">{candidate.fit_reason}</p>
        <div className="candidate-tags">
          {(enrichment.matched_terms || []).map((term) => <span key={term}>{term}</span>)}
          <span>{enrichment.source_count || 1} source{enrichment.source_count === 1 ? "" : "s"}</span>
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
                  <span key={name}><small>{name.replaceAll("_", " ")}</small><strong>+{value}</strong></span>
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
