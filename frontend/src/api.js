const BASE = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

async function get(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(await detail(res));
  return res.json();
}

async function detail(res) {
  try {
    const body = await res.json();
    return body.detail || `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
}

export const fetchCompanies = () => get("/v1/dashboard/companies");
export const fetchMetrics = (tenantId) => get(`/v1/dashboard/metrics/${tenantId}`);

export async function askAI({ tenantId, question, history }) {
  const res = await fetch(`${BASE}/v1/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tenant_id: tenantId, question, history }),
  });
  if (!res.ok) throw new Error(await detail(res));
  const body = await res.json();
  return body.answer;
}

/** Indian grouping: 5,08,989 — not 508,989. */
export function formatMoney(value, { compact = false } = {}) {
  const n = Math.round(Math.abs(value || 0));
  if (compact) {
    if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
    if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  }
  return `₹${n.toLocaleString("en-IN")}`;
}

export function formatWhen(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("en-IN", {
    day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
  });
}
