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

export async function login(email, pin) {
  const res = await fetch(`${BASE}/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, pin }),
  });
  if (!res.ok) throw new Error(await detail(res));
  const session = await res.json();
  saveSession(session);
  return session;
}

export const fetchCompanies = () => request("/v1/dashboard/companies");
export const fetchMetrics = (tenantId) => request(`/v1/dashboard/metrics/${tenantId}`);

export function askAI({ tenantId, question, history }) {
  return request("/v1/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tenant_id: tenantId, question, history }),
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
  const [y, m] = ym.split("-").map(Number);
  return `${MONTHS[m - 1]} ${String(y).slice(2)}`;
}
