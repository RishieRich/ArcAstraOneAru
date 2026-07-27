import { useEffect, useState } from "react";
import {
  deliverResearchCandidates, fetchResearchCandidates, generateResearchIcp,
  getResearchIcp, runCustomerResearch, runMaterialResearch, updateResearchCandidate,
} from "../api";

const box = { border: "1px solid var(--border)", borderRadius: 12, padding: 20, background: "var(--card)" };
const button = { marginRight: 8, marginBottom: 8 };

export default function ResearchAgent({ tenantId, onAuthError }) {
  const [view, setView] = useState("home"); const [icp, setIcp] = useState(null);
  const [candidates, setCandidates] = useState([]); const [busy, setBusy] = useState(false);
  const [error, setError] = useState(""); const [delivery, setDelivery] = useState("");
  const [product, setProduct] = useState(""); const [baseline, setBaseline] = useState("");
  const call = async (work) => { setBusy(true); setError(""); try { return await work(); } catch (e) { if (e.constructor.name === "AuthError") onAuthError(); else setError(e.message); return null; } finally { setBusy(false); } };
  useEffect(() => { if (tenantId) call(() => getResearchIcp(tenantId)).then(setIcp); }, [tenantId]);
  const loadRun = async (run) => { if (!run) return; const list = await call(() => fetchResearchCandidates(tenantId, run.run_id)); if (list) setCandidates(list); };
  const refreshIcp = () => call(() => generateResearchIcp(tenantId)).then((x) => x && setIcp(x));
  const runCustomers = () => call(() => runCustomerResearch(tenantId)).then(loadRun);
  const runMaterials = () => call(() => runMaterialResearch(tenantId, { product, baseline: Number(baseline) })).then(loadRun);
  const decide = (id, status) => call(() => updateResearchCandidate(tenantId, id, status)).then(() => setCandidates((rows) => rows.map((r) => r.id === id ? { ...r, status } : r)));
  const deliver = () => call(() => deliverResearchCandidates(tenantId, candidates.filter((x) => x.status === "approved").map((x) => x.id))).then((x) => x && setDelivery(x.message));
  return <section style={{ marginTop: 18 }}>
    <div className="subhead"><div><span className="eyebrow">Optional agent · review-first</span><h2>Research Agent</h2><p className="meta">Cited prospects stay in draft until you approve them.</p></div><button type="button" onClick={() => setView("home")}>Research home</button></div>
    {error && <div className="card state"><h3>Research needs attention</h3><p>{error}</p></div>}
    {view === "home" && <div className="grid-2">
      <Card title="Understand my business" body="Build a deterministic Ideal Customer Profile from connected sales data." action={() => setView("icp")} label="Open ICP" />
      <Card title="Find new customers" body="Use your ICP to find cited, reviewable lookalike businesses." action={() => setView("customers")} label="Find customers" />
      <Card title="Find alternative suppliers" body="Secondary, triggered research for a product and its current cost baseline." action={() => setView("materials")} label="Research suppliers" />
    </div>}
    {view === "icp" && <div style={box}><h3>Ideal Customer Profile</h3><button type="button" disabled={busy} onClick={refreshIcp}>Generate / refresh</button>{icp ? <><p>{icp.narrative}</p><h4>What they buy</h4><ul>{icp.profile.top_products.map((p) => <li key={p.name}>{p.name} · ₹{Math.round(p.revenue).toLocaleString("en-IN")} · {p.orders} orders</li>)}</ul><h4>Best customers</h4><ul>{icp.profile.best_customers.map((c) => <li key={c.name}>{c.name} · ₹{Math.round(c.revenue).toLocaleString("en-IN")} · {c.orders} orders</li>)}</ul>{icp.data_completeness.needs_more_data.length > 0 && <p className="meta">Needs more data: {icp.data_completeness.needs_more_data.join(", ")}.</p>}</> : <p>Generate an ICP to start.</p>}</div>}
    {view === "customers" && <div style={box}><h3>New-customer research</h3><p>Only verified, cited results enter the draft queue. Nothing is sent automatically.</p><button type="button" disabled={busy} onClick={runCustomers}>Run customer research</button><Candidates rows={candidates} decide={decide} deliver={deliver} delivery={delivery} busy={busy} /></div>}
    {view === "materials" && <div style={box}><h3>Supplier research <span className="meta">secondary / triggered</span></h3><p>Use after a cost signal or a deliberate sourcing request.</p><label>Product <input value={product} onChange={(e) => setProduct(e.target.value)} /></label>{" "}<label>Current cost baseline <input type="number" value={baseline} onChange={(e) => setBaseline(e.target.value)} /></label><br /><button type="button" disabled={busy || !product || !baseline} onClick={runMaterials}>Find supplier evidence</button><Candidates rows={candidates} decide={decide} deliver={deliver} delivery={delivery} busy={busy} /></div>}
  </section>;
}
function Card({ title, body, action, label }) { return <div style={box}><h3>{title}</h3><p>{body}</p><button type="button" onClick={action}>{label}</button></div>; }
function Candidates({ rows, decide, deliver, delivery, busy }) { return <>{rows.length > 0 && <><h4>Curation queue</h4><div style={{ overflowX: "auto" }}><table><thead><tr><th>Candidate</th><th>Fit</th><th>Reason & source</th><th>Review</th></tr></thead><tbody>{rows.map((r) => <tr key={r.id}><td>{r.name}<br /><small>{r.location || "Location not verified"}</small></td><td>{r.fit_score}/100</td><td>{r.fit_reason}<br /><a href={r.source_url} target="_blank" rel="noreferrer">Source · {new Date(r.retrieved_at).toLocaleDateString("en-IN")}</a></td><td>{r.status === "draft" ? <><button style={button} type="button" onClick={() => decide(r.id, "approved")}>Approve</button><button style={button} type="button" onClick={() => decide(r.id, "rejected")}>Reject</button></> : r.status}</td></tr>)}</tbody></table></div><button type="button" disabled={busy || !rows.some((r) => r.status === "approved")} onClick={deliver}>Deliver approved (top 5)</button>{delivery && <textarea readOnly value={delivery} rows="8" style={{ width: "100%", marginTop: 12 }} aria-label="WhatsApp-ready delivery message" />}</>}</>; }
