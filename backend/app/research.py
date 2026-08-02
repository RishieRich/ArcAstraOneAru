"""Deterministic ICP analysis and evidence-first web research.

The provider retrieves evidence; this module owns planning, validation, scoring,
deduplication and synthesis. Financial facts always come from SQL. Web claims
remain attached to their source snippets and URLs.
"""
from __future__ import annotations

import json
import os
import re
import urllib.request
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date, datetime, timezone
from urllib.parse import urlparse


INDIAN_LOCATIONS = (
    "Ahmedabad", "Ankleshwar", "Bengaluru", "Bharuch", "Chennai", "Coimbatore",
    "Dahej", "Delhi", "Faridabad", "Gandhinagar", "Gurugram", "Halol", "Hyderabad",
    "Indore", "Jaipur", "Jamnagar", "Kolkata", "Mumbai", "Nashik", "Noida", "Pune",
    "Rajkot", "Sanand", "Surat", "Thane", "Vadodara", "Vapi",
)
DIRECTORY_DOMAINS = {
    "indiamart.com", "tradeindia.com", "justdial.com", "exportersindia.com",
    "sulekha.com", "yellowpages.in",
}
SOCIAL_DOMAINS = {"linkedin.com", "facebook.com", "instagram.com", "x.com"}
GENERIC_TITLE = re.compile(
    r"\b(top \d+|best \d+|list of|directory|market report|industry report|"
    r"manufacturers? and suppliers?|suppliers? directory|pdf)\b",
    re.IGNORECASE,
)
COMPANY_SUFFIX = re.compile(
    r"\b(private limited|pvt\.?\s*ltd\.?|limited|ltd\.?|llp|industries|"
    r"engineering|enterprises|corporation|company|co\.)\b",
    re.IGNORECASE,
)
EMAIL_RE = re.compile(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}")
PHONE_RE = re.compile(r"(?<!\d)(?:\+91[\s-]?)?[6-9]\d{9}(?!\d)")


def feature_enabled() -> bool:
    return os.environ.get("ARQ_RESEARCH_ENABLED", "true").strip().lower() not in {
        "0", "false", "no",
    }


def _bounded_env(name: str, default: int, minimum: int, maximum: int) -> int:
    try:
        value = int(os.environ.get(name, default))
    except (TypeError, ValueError):
        value = default
    return min(max(value, minimum), maximum)


def _normalise(value: float, maximum: float) -> float:
    return value / maximum if maximum > 0 else 0.0


def build_icp(cur, tenant_id: str) -> tuple[dict, str, dict]:
    """Build a useful profile from the tenant's trusted sales and collection facts."""
    cur.execute(
        """
        select fl.name, coalesce(sum(fl.amount), 0), count(distinct ft.id),
               count(distinct nullif(ft.party_name, '')), max(ft.txn_date)
        from financial_transaction_lines fl
        join financial_transactions ft on ft.id = fl.transaction_id
        where ft.tenant_id = %s and ft.kind = 'sales' and fl.line_type = 'item'
        group by fl.name
        order by sum(fl.amount) desc, fl.name
        limit 12
        """,
        (tenant_id,),
    )
    product_rows = cur.fetchall()
    product_total = sum(float(row[1]) for row in product_rows)
    products = [
        {
            "name": name,
            "revenue": float(revenue),
            "revenue_share_pct": round(float(revenue) / product_total * 100, 1)
            if product_total else 0.0,
            "orders": orders,
            "customers": customers,
            "last_sale": latest.isoformat() if latest else None,
            "margin": "unknown",
        }
        for name, revenue, orders, customers, latest in product_rows
    ]

    cur.execute(
        """
        select coalesce(nullif(ft.party_name, ''), 'Unknown'),
               coalesce(sum(ft.net_amount), 0), count(distinct ft.id),
               min(ft.txn_date), max(ft.txn_date)
        from financial_transactions ft
        where ft.tenant_id = %s and ft.kind = 'sales'
        group by ft.party_name
        order by sum(ft.net_amount) desc
        limit 100
        """,
        (tenant_id,),
    )
    customer_rows = cur.fetchall()
    max_revenue = max((float(row[1]) for row in customer_rows), default=0.0)
    max_orders = max((row[2] for row in customer_rows), default=0)
    today = date.today()
    customers = []
    for name, revenue, orders, first_order, last_order in customer_rows:
        days_since = (today - last_order).days if last_order else 365
        recency = max(0.0, 1 - min(days_since, 365) / 365)
        score = round(
            45 * _normalise(float(revenue), max_revenue)
            + 30 * _normalise(orders, max_orders)
            + 25 * recency
        )
        customers.append(
            {
                "name": name,
                "revenue": float(revenue),
                "orders": orders,
                "first_order": first_order.isoformat() if first_order else None,
                "last_order": last_order.isoformat() if last_order else None,
                "recency_days": days_since if last_order else None,
                "icp_score": score,
                "score_basis": {
                    "revenue_weight": 45,
                    "repeat_weight": 30,
                    "recency_weight": 25,
                    "margin_weight": 0,
                },
                "industry": "unknown",
                "geography": "unknown",
                "size": "unknown",
            }
        )
    customers.sort(key=lambda row: (-row["icp_score"], -row["revenue"], row["name"]))
    customers = customers[:10]

    # Receivables-only Tally users still deserve an Agent output. Collection
    # priorities remain separate from sales-derived growth signals so a debtor
    # name is never misrepresented as product or industry evidence.
    cur.execute(
        """
        select party_name,
               coalesce(sum(abs(pending_amount)), 0),
               coalesce(sum(abs(pending_amount))
                 filter (where coalesce(overdue_days, 0) > 0), 0),
               coalesce(max(overdue_days), 0),
               count(*),
               sum(sum(abs(pending_amount))) over (),
               sum(
                 coalesce(sum(abs(pending_amount))
                   filter (where coalesce(overdue_days, 0) > 0), 0)
               ) over ()
        from bills
        where tenant_id = %s and closed_at is null
        group by party_name
        order by sum(abs(pending_amount)) desc, party_name
        limit 10
        """,
        (tenant_id,),
    )
    collection_rows = cur.fetchall()
    collections = [
        {
            "name": name,
            "outstanding": float(outstanding),
            "overdue": float(overdue),
            "max_overdue_days": max_overdue_days,
            "bill_count": bill_count,
        }
        for name, outstanding, overdue, max_overdue_days, bill_count, _, _
        in collection_rows
    ]
    total_outstanding = float(collection_rows[0][5]) if collection_rows else 0.0
    total_overdue = float(collection_rows[0][6]) if collection_rows else 0.0

    needs = []
    if not products:
        needs.append("sales item lines")
    if not customers and not collections:
        needs.append("sales customer history")
    needs.extend(["customer industry", "customer geography", "customer size", "product margin"])
    completeness = {
        "products": bool(products),
        "customers": bool(customers),
        "receivables": bool(collections),
        "margin": False,
        "industry": False,
        "geography": False,
        "size": False,
        "available_count": sum((bool(products), bool(customers), bool(collections))),
        "total_count": 7,
        "needs_more_data": needs,
    }
    action_plan = []
    for row in sorted(
        collections,
        key=lambda item: (-item["overdue"], -item["max_overdue_days"]),
    )[:3]:
        if row["overdue"] <= 0:
            continue
        action_plan.append(
            {
                "type": "collect",
                "party": row["name"],
                "amount": row["overdue"],
                "overdue_days": row["max_overdue_days"],
                "bill_count": row["bill_count"],
            }
        )
    if products:
        action_plan.append(
            {
                "type": "protect_product",
                "product": products[0]["name"],
                "share_pct": products[0]["revenue_share_pct"],
                "revenue": products[0]["revenue"],
            }
        )
    if customers:
        action_plan.append(
            {
                "type": "grow_customer",
                "customer": customers[0]["name"],
                "revenue": customers[0]["revenue"],
                "orders": customers[0]["orders"],
            }
        )
    profile = {
        "profile_version": 2,
        "top_products": products,
        "best_customers": customers,
        "collection_priorities": collections,
        "action_plan": action_plan[:5],
        "customer_attributes": {
            "industry": "unknown",
            "geography": "unknown",
            "size": "unknown",
        },
        "ranking_method": (
            "Customer fit = 45% revenue + 30% repeat orders + 25% recency. "
            "Margin contributes 0% until reliable product-level cost data exists."
        ),
        "snapshot": {
            "products_analyzed": len(products),
            "customers_analyzed": max(len(customer_rows), len(collection_rows)),
            "sales_value_analyzed": round(sum(float(row[1]) for row in customer_rows), 2),
            "outstanding_analyzed": round(total_outstanding, 2),
            "overdue_analyzed": round(total_overdue, 2),
            "open_bills_analyzed": sum(row["bill_count"] for row in collections),
        },
    }
    if products and customers:
        narrative = (
            f"{products[0]['name']} leads recorded product sales at "
            f"{products[0]['revenue_share_pct']}% of the analyzed top-product value. "
            f"{customers[0]['name']} currently leads the customer cohort with a deterministic "
            f"ICP score of {customers[0]['icp_score']}/100. Industry, geography, size and "
            "product margin remain unknown because the connected data does not establish them."
        )
    elif collections:
        narrative = (
            f"{collections[0]['name']} has the largest current open balance at "
            f"{collections[0]['outstanding']:.2f}. The Agent found "
            f"{len(collections)} customer collection priorities from current Tally bills. "
            "Upload item-level sales when you also want product-led customer discovery."
        )
    else:
        narrative = (
            "The Agent is ready, but this company does not yet have current receivables or "
            "item-level sales to analyse. Sync Tally or upload a sales book to create the "
            "first action plan."
        )
    return profile, narrative, completeness


def tavily_search(query: str, limit: int = 6) -> dict:
    """Call the sole research provider with an explicit per-query cost boundary."""
    key = os.environ.get("TAVILY_API_KEY")
    if not key:
        raise RuntimeError("Research is configured, but TAVILY_API_KEY is not set")
    depth = os.environ.get("RESEARCH_SEARCH_DEPTH", "advanced").strip().lower()
    if depth not in {"basic", "advanced", "fast", "ultra-fast"}:
        depth = "advanced"
    payload = {
        "query": query,
        "max_results": min(max(limit, 1), 8),
        "search_depth": depth,
        "topic": "general",
        "include_answer": False,
        "include_raw_content": False,
        "include_favicon": True,
        "include_usage": True,
    }
    # Tavily rejects country boosts for the latency-optimised depths.
    if depth in {"basic", "advanced"}:
        payload["country"] = "india"
    if depth == "advanced":
        payload["chunks_per_source"] = 3
    request = urllib.request.Request(
        "https://api.tavily.com/search",
        data=json.dumps(payload).encode(),
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "User-Agent": "ARQ-Astra-Research/2.0",
        },
    )
    with urllib.request.urlopen(request, timeout=28) as response:
        return json.loads(response.read())


def build_search_plan(kind: str, terms: list[str], params: dict) -> list[str]:
    """Create diverse discovery angles without letting one run fan out indefinitely."""
    clean_terms = [str(term).strip() for term in terms if str(term).strip()][:3]
    phrase = " OR ".join(f'"{term}"' for term in clean_terms)
    geography = str(params.get("geography") or "India").strip()
    industry = str(params.get("industry") or "").strip()
    if kind == "customer":
        queries = [
            f"Indian industrial companies that buy or use {phrase} {industry} {geography}",
            f"{phrase} procurement buyer manufacturer company {geography}",
            f"{phrase} end user plant factory contact {industry} India",
            f"{phrase} industrial association members buyers {geography}",
            f"{phrase} company annual report expansion plant India",
            f"{phrase} importer distributor industrial India",
        ]
    else:
        product = clean_terms[0]
        specification = str(params.get("specification") or "").strip()
        baseline = params.get("baseline")
        price_context = (
            f"quotation price below INR {baseline}"
            if baseline not in (None, "")
            else "quotation price"
        )
        queries = [
            f'"{product}" {specification} manufacturer supplier {geography} contact',
            f'"{product}" authorized distributor industrial India',
            f'"{product}" factory manufacturer Gujarat Maharashtra',
            f'"{product}" supplier certification capacity India {price_context}',
            f'"{product}" alternative supplier India contact',
            f'"{product}" trade association manufacturer India',
        ]
    maximum = _bounded_env("RESEARCH_MAX_QUERIES", 4, 2, 6)
    return [" ".join(query.split()) for query in queries[:maximum]]


def research_web(kind: str, terms: list[str], params: dict) -> tuple[list[dict], dict]:
    """Run a bounded multi-angle search and return evidence plus deterministic insights."""
    queries = build_search_plan(kind, terms, params)
    # A missing provider key must never turn a useful workspace into a broken one.
    # We deliberately return no leads here: showing invented companies would be worse
    # than clearly saying that external verification has not been connected yet.
    if not os.environ.get("TAVILY_API_KEY"):
        return [], {
            "queries_run": 0,
            "queries": queries,
            "sources_reviewed": 0,
            "candidates_verified": 0,
            "high_fit_candidates": 0,
            "provider_credits_reported": 0,
            "partial_failures": [],
            "web_search_ready": False,
            "key_insights": [
                "Your business pattern has been prepared from the data already connected to ARQ.",
                "External company leads are not shown until web search is connected, so no unverified names are presented as recommendations.",
                "Use the suggested search angles below when web research is enabled.",
            ],
            "method": "Business-data preparation only. Web search has not been connected for this workspace.",
        }
    per_query = _bounded_env("RESEARCH_RESULTS_PER_QUERY", 6, 3, 8)
    results = []
    credits = 0
    failures = []
    with ThreadPoolExecutor(max_workers=min(4, len(queries))) as pool:
        pending = {pool.submit(tavily_search, query, per_query): query for query in queries}
        for future in as_completed(pending):
            query = pending[future]
            try:
                response = future.result()
                credits += int((response.get("usage") or {}).get("credits") or 0)
                for result in response.get("results", []):
                    results.append({**result, "research_query": query})
            except Exception as exc:  # keep useful partial results from other angles
                failures.append(f"{query}: {type(exc).__name__}")
    if not results and failures:
        raise RuntimeError("All research queries failed")
    candidates = candidates_from_results(results, kind, terms, params=params)
    maximum = _bounded_env("RESEARCH_MAX_CANDIDATES", 20, 5, 30)
    candidates = candidates[:maximum]
    locations = Counter(row["location"] for row in candidates if row["location"])
    matched_terms = Counter(
        term
        for row in candidates
        for term in row["enrichment"].get("matched_terms", [])
    )
    high_fit = sum(row["fit_score"] >= 75 for row in candidates)
    insights = [
        f"{len(results)} cited web results were reviewed across {len(queries)} distinct search angles.",
        f"{high_fit} candidates cleared the high-fit threshold of 75/100.",
    ]
    if locations:
        place, count = locations.most_common(1)[0]
        insights.append(f"{place} is the strongest visible location cluster ({count} candidates).")
    if matched_terms:
        term, count = matched_terms.most_common(1)[0]
        insights.append(f"{term} appears most often in candidate evidence ({count} matches).")
    summary = {
        "queries_run": len(queries),
        "queries": queries,
        "sources_reviewed": len(results),
        "candidates_verified": len(candidates),
        "high_fit_candidates": high_fit,
        "provider_credits_reported": credits,
        "partial_failures": failures,
        "web_search_ready": True,
        "key_insights": insights,
        "method": (
            "Multi-angle Tavily search; deterministic business-result filtering, "
            "source-quality scoring, corroboration and evidence-preserving deduplication."
        ),
    }
    return candidates, summary


def _domain(url: str) -> str:
    host = urlparse(url).netloc.casefold().removeprefix("www.")
    return host.split(":")[0]


def _safe_url(url: str) -> bool:
    parsed = urlparse(url)
    return parsed.scheme in {"http", "https"} and bool(parsed.netloc)


def _candidate_name(title: str) -> str:
    parts = [part.strip() for part in re.split(r"\s+[|–—]\s+|\s+-\s+", title) if part.strip()]
    for part in parts:
        if COMPANY_SUFFIX.search(part):
            return part[:180]
    return (parts[0] if parts else title)[:180]


def _name_key(name: str) -> str:
    cleaned = COMPANY_SUFFIX.sub("", name.casefold())
    return re.sub(r"[^a-z0-9]+", "", cleaned)


def _source_tier(domain: str, name: str) -> tuple[str, int]:
    root = ".".join(domain.split(".")[-2:])
    if domain.endswith(".gov.in") or domain.endswith(".org.in"):
        return "institutional", 18
    if root in DIRECTORY_DOMAINS:
        return "business_directory", 8
    if root in SOCIAL_DOMAINS:
        return "social_profile", 5
    name_tokens = [token for token in re.findall(r"[a-z0-9]+", name.casefold()) if len(token) > 3]
    if any(token in domain for token in name_tokens):
        return "likely_official", 20
    return "independent_web", 12


def _location(text: str) -> str | None:
    for place in INDIAN_LOCATIONS:
        if re.search(rf"\b{re.escape(place)}\b", text, re.IGNORECASE):
            return place
    return None


def _contact(text: str, url: str) -> tuple[str, str]:
    email = EMAIL_RE.search(text)
    if email:
        return email.group(0), "email"
    phone = PHONE_RE.search(re.sub(r"[\s()-]", "", text))
    if phone:
        return phone.group(0), "phone"
    parsed = urlparse(url)
    return f"{parsed.scheme}://{parsed.netloc}", "website"


def candidates_from_results(
    results: list[dict],
    kind: str,
    terms: list[str],
    *,
    params: dict | None = None,
) -> list[dict]:
    """Validate, score and merge evidence without inventing missing attributes."""
    params = params or {}
    now = datetime.now(timezone.utc).isoformat()
    grouped: dict[str, dict] = {}
    geography = str(params.get("geography") or "").strip()
    for result in results:
        title = str(result.get("title") or "").strip()
        url = str(result.get("url") or "").strip()
        excerpt = str(result.get("content") or "").strip()
        if not title or not _safe_url(url) or len(excerpt) < 35 or GENERIC_TITLE.search(title):
            continue
        name = _candidate_name(title)
        if len(name) < 3:
            continue
        domain = _domain(url)
        text = f"{title} {excerpt}"
        matched = [
            term for term in terms
            if term and term.casefold() in text.casefold()
        ]
        provider_relevance = float(result.get("score") or 0)
        seller_signal = bool(
            re.search(
                r"\b(manufacturer|supplier|distributor|exporter|dealer|stockist)\b",
                text,
                re.IGNORECASE,
            )
        )
        buyer_signal = bool(
            re.search(
                r"\b(procurement|buyer|buys|uses|end user|consumer|plant|factory|"
                r"project|tender|expansion|operations)\b",
                text,
                re.IGNORECASE,
            )
        )
        kind_signal = seller_signal if kind == "material" else buyer_signal
        business_signal = bool(COMPANY_SUFFIX.search(text) or kind_signal)
        if (
            not matched
            or (not business_signal and provider_relevance < 0.55)
            or (not kind_signal and provider_relevance < 0.72)
        ):
            continue
        location = _location(text)
        contact, contact_type = _contact(text, url)
        tier, source_points = _source_tier(domain, name)
        key = _name_key(name) or domain
        evidence = {
            "url": url,
            "domain": domain,
            "title": title[:250],
            "excerpt": excerpt[:900],
            "query": str(result.get("research_query") or ""),
            "source_tier": tier,
            "provider_relevance": round(provider_relevance, 3),
        }
        if key in grouped:
            current = grouped[key]
            if url not in {item["url"] for item in current["evidence"]}:
                current["evidence"].append(evidence)
            current["matched_terms"].update(matched)
            if not current["location"] and location:
                current["location"] = location
            if current["contact_type"] == "website" and contact_type != "website":
                current["contact"], current["contact_type"] = contact, contact_type
            current["source_points"] = max(current["source_points"], source_points)
            current["provider_relevance"] = max(current["provider_relevance"], provider_relevance)
            continue
        grouped[key] = {
            "name": name,
            "location": location,
            "contact": contact,
            "contact_type": contact_type,
            "source_url": url,
            "source_points": source_points,
            "provider_relevance": provider_relevance,
            "matched_terms": set(matched),
            "evidence": [evidence],
        }

    candidates = []
    for row in grouped.values():
        evidence_count = len(row["evidence"])
        matched = sorted(row["matched_terms"])
        product_points = min(30, 12 + 9 * len(matched))
        geography_points = 10 if (
            row["location"] and (
                not geography or geography.casefold() in row["location"].casefold()
            )
        ) else (4 if row["location"] else 0)
        verification_points = 15 if row["contact_type"] != "website" else 9
        corroboration_points = min(15, max(0, evidence_count - 1) * 7)
        relevance_points = min(10, round(row["provider_relevance"] * 10))
        score = min(
            97,
            product_points + geography_points + verification_points
            + row["source_points"] + corroboration_points + relevance_points,
        )
        confidence = (
            "high" if evidence_count >= 2 and score >= 78
            else "medium" if score >= 62
            else "emerging"
        )
        location_phrase = (
            f"Evidence mentions {row['location']};" if row["location"]
            else "India-focused evidence;"
        )
        reason = (
            f"{location_phrase} the business evidence matches "
            f"{', '.join(matched[:3])}. "
            f"{evidence_count} source{'s' if evidence_count != 1 else ''} support this "
            f"{confidence}-confidence lead; operator review is still required."
        )
        candidates.append(
            {
                "name": row["name"],
                "location": row["location"],
                "contact": row["contact"],
                "source_url": row["source_url"],
                "retrieved_at": now,
                "fit_score": score,
                "fit_reason": reason,
                "enrichment": {
                    "matched_terms": matched,
                    "verification": confidence,
                    "contact_type": row["contact_type"],
                    "source_count": evidence_count,
                    "source_domains": sorted({item["domain"] for item in row["evidence"]}),
                    "evidence": row["evidence"],
                    "score_components": {
                        "product_fit": product_points,
                        "geography": geography_points,
                        "contact_verification": verification_points,
                        "source_quality": row["source_points"],
                        "corroboration": corroboration_points,
                        "search_relevance": relevance_points,
                    },
                },
            }
        )
    return sorted(
        candidates,
        key=lambda row: (
            -row["fit_score"],
            -row["enrichment"]["source_count"],
            row["name"].casefold(),
        ),
    )
