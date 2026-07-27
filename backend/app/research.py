"""Deterministic ICP facts and the single-provider research boundary."""
import json
import os
import urllib.request
from datetime import datetime, timezone


def feature_enabled() -> bool:
    return os.environ.get("ARQ_RESEARCH_ENABLED", "true").strip().lower() not in {"0", "false", "no"}


def build_icp(cur, tenant_id: str) -> tuple[dict, str, dict]:
    """Use only normalized financial facts; missing fields stay explicitly unknown."""
    cur.execute(
        """
        select fl.name, coalesce(sum(fl.amount), 0), count(distinct ft.id)
        from financial_transaction_lines fl join financial_transactions ft on ft.id = fl.transaction_id
        where ft.tenant_id = %s and ft.kind = 'sales' and fl.line_type = 'item'
        group by fl.name order by sum(fl.amount) desc, fl.name limit 5
        """, (tenant_id,))
    products = [{"name": n, "revenue": float(v), "orders": c} for n, v, c in cur.fetchall()]
    cur.execute(
        """
        select coalesce(ft.party_name, 'Unknown'), coalesce(sum(ft.net_amount), 0),
               count(distinct ft.id), max(ft.txn_date)
        from financial_transactions ft where ft.tenant_id = %s and ft.kind = 'sales'
        group by ft.party_name order by sum(ft.net_amount) desc, max(ft.txn_date) desc nulls last limit 10
        """, (tenant_id,))
    customers = [
        {"name": n, "revenue": float(v), "orders": c, "last_order": d.isoformat() if d else None,
         "industry": "unknown", "geography": "unknown", "size": "unknown"}
        for n, v, c, d in cur.fetchall()
    ]
    needs = []
    if not products: needs.append("sales item lines")
    if not customers: needs.append("sales customer history")
    needs.extend(["customer industry", "customer geography", "customer size"])
    completeness = {"products": bool(products), "customers": bool(customers), "margin": False,
                    "industry": False, "geography": False, "size": False, "needs_more_data": needs}
    profile = {"top_products": products, "best_customers": customers,
               "customer_attributes": {"industry": "unknown", "geography": "unknown", "size": "unknown"}}
    if products and customers:
        narrative = f"Your strongest recorded sales are led by {products[0]['name']}; the top customer cohort contains {len(customers)} customers ranked by recorded revenue, order frequency and recency. Industry, geography and size are not present in the connected books."
    else:
        narrative = "The ICP is ready to improve, but the connected data is thin. Upload sales lines with products and customer names to identify a reliable top cohort."
    return profile, narrative, completeness


def tavily_search(query: str, limit: int = 8) -> list[dict]:
    key = os.environ.get("TAVILY_API_KEY")
    if not key:
        raise RuntimeError("Research is configured, but TAVILY_API_KEY is not set")
    payload = json.dumps({"api_key": key, "query": query, "max_results": limit, "search_depth": "basic"}).encode()
    request = urllib.request.Request("https://api.tavily.com/search", data=payload,
        headers={"Content-Type": "application/json", "User-Agent": "ARQ-Astra-Research/1.0"})
    with urllib.request.urlopen(request, timeout=20) as response:
        return json.loads(response.read()) .get("results", [])


def candidates_from_results(results: list[dict], kind: str, terms: list[str]) -> list[dict]:
    """A transparent heuristic: citations and the source excerpt remain attached."""
    now = datetime.now(timezone.utc).isoformat()
    candidates = []
    seen = set()
    for result in results:
        name = str(result.get("title") or "").strip()
        url = str(result.get("url") or "").strip()
        excerpt = str(result.get("content") or "").strip()
        if not name or not url or name.casefold() in seen:
            continue
        seen.add(name.casefold())
        matched = [term for term in terms if term and term.casefold() in (name + " " + excerpt).casefold()]
        score = min(95, 55 + 10 * len(matched))
        reason = f"Verified web result relevant to {', '.join(matched[:3]) or 'the requested market'}; review the cited source before approving."
        candidates.append({"name": name[:250], "location": None, "contact": url, "source_url": url,
            "retrieved_at": now, "fit_score": score, "fit_reason": reason,
            "enrichment": {"source_excerpt": excerpt[:1000], "matched_terms": matched}})
    return candidates
