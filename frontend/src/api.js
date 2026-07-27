const BASE = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8010").replace(/\/$/, "");

const TOKEN_KEY = "arq.session";

export function loadSession() {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s.token || (s.expires_at && s.expires_at * 1000 < Date.now())) return null;
    return s;
  } catch {
    return null;
  }
}

export function saveSession(session) {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
}

export class AuthError extends Error {}

async function detail(res) {
  try {
    const body = await res.json();
    return body.detail || `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
}

async function request(path, options = {}) {
  const session = loadSession();
  const headers = { ...(options.headers || {}) };
  if (session) headers.Authorization = `Bearer ${session.token}`;
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (res.status === 401 && !path.startsWith("/v1/auth/")) {
    clearSession();
    throw new AuthError(await detail(res));
  }
  if (!res.ok) throw new Error(await detail(res));
  return res.json();
}

export async function login(email, password) {
  const res = await fetch(`${BASE}/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(await detail(res));
  const session = await res.json();
  saveSession(session);
  return session;
}

export async function signup({ fullName, companyName, email, password }) {
  const res = await fetch(`${BASE}/v1/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      full_name: fullName,
      company_name: companyName,
      email,
      password,
    }),
  });
  if (!res.ok) throw new Error(await detail(res));
  const result = await res.json();
  if (result.status === "active") saveSession(result);
  return result;
}

export const fetchCompanies = () => request("/v1/dashboard/companies");
export const fetchMetrics = (tenantId) => request(`/v1/dashboard/metrics/${tenantId}`);

export const getResearchIcp = (tenantId) => request(`/research/icp?tenant_id=${tenantId}`);
export const generateResearchIcp = (tenantId) => request(`/research/icp/generate?tenant_id=${tenantId}`, { method: "POST" });
export const runCustomerResearch = (tenantId) => request(`/research/customers/run?tenant_id=${tenantId}`, { method: "POST" });
export const runMaterialResearch = (tenantId, body) => request(`/research/materials/run?tenant_id=${tenantId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
export const fetchResearchCandidates = (tenantId, runId) => request(`/research/runs/${runId}/candidates?tenant_id=${tenantId}`);
export const updateResearchCandidate = (tenantId, id, status) => request(`/research/candidates/${id}?tenant_id=${tenantId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
export const deliverResearchCandidates = (tenantId, candidateIds) => request(`/research/candidates/deliver?tenant_id=${tenantId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ candidate_ids: candidateIds, limit: 5 }) });

export function cleanupCompanyData({ tenantId, companyName, password }) {
  return request(`/v1/dashboard/data/${tenantId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ company_name: companyName, password }),
  });
}

export function uploadFinancialFile({ tenantId, kind, file }) {
  const params = new URLSearchParams({ tenant_id: tenantId, declared_kind: kind });
  return request(`/v1/imports/financials?${params}`, {
    method: "POST",
    headers: {
      "Content-Type": file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "X-File-Name": encodeURIComponent(file.name),
    },
    body: file,
  });
}

export function askAI({ tenantId, question, history, language }) {
  return request("/v1/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tenant_id: tenantId, question, history, language }),
  }).then((body) => body.answer);
}

/** Indian grouping: 5,08,989 — not 508,989. */
export function formatMoney(value, { compact = false } = {}) {
  const n = Math.round(Math.abs(value || 0));
  if (compact) {
    if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
    if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
    if (n >= 1e3) return `₹${(n / 1e3).toFixed(1)} K`;
  }
  return `₹${n.toLocaleString("en-IN")}`;
}

export function formatWhen(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
  });
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatMonth(ym) {
  if (!/^\d{4}-\d{2}$/.test(String(ym || ""))) return ym || "—";
  const [y, m] = ym.split("-").map(Number);
  return `${MONTHS[m - 1]} ${String(y).slice(2)}`;
}
