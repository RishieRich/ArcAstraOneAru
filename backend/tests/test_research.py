from app.research import build_icp, build_search_plan, candidates_from_results, research_web


def test_search_plan_uses_multiple_bounded_angles(monkeypatch):
    monkeypatch.setenv("RESEARCH_MAX_QUERIES", "4")
    queries = build_search_plan(
        "customer",
        ["industrial valve", "pump housing"],
        {"geography": "Gujarat", "industry": "chemicals"},
    )
    assert len(queries) == 4
    assert all("industrial valve" in query for query in queries)
    assert any("association" in query for query in queries)
    assert any("Gujarat" in query for query in queries)


def test_candidates_require_citations_and_preserve_score_evidence():
    candidates = candidates_from_results(
        [
            {
                "title": "Ankleshwar Valve Manufacturing Pvt Ltd | Home",
                "url": "https://ankleshwarvalve.example/valves",
                "content": (
                    "Industrial valve manufacturer and operating plant in Ankleshwar. "
                    "Contact our procurement and products team for valve assemblies."
                ),
                "score": 0.82,
                "research_query": "industrial valve buyer Gujarat",
            },
            {"title": "Uncited result", "content": "must not pass because it has no URL"},
        ],
        "customer",
        ["valve", "Ankleshwar"],
        params={"geography": "Ankleshwar"},
    )
    assert len(candidates) == 1
    candidate = candidates[0]
    assert candidate["source_url"] == "https://ankleshwarvalve.example/valves"
    assert candidate["fit_score"] >= 75
    assert candidate["enrichment"]["verification"] in {"medium", "high"}
    assert candidate["enrichment"]["score_components"]["product_fit"] == 30
    assert candidate["enrichment"]["evidence"][0]["query"]


def test_duplicate_company_results_become_corroborating_evidence():
    candidates = candidates_from_results(
        [
            {
                "title": "Acme Engineering Pvt Ltd | Industrial Pumps",
                "url": "https://acme.example/pumps",
                "content": "Acme Engineering manufactures industrial pump systems in Pune.",
                "score": 0.8,
            },
            {
                "title": "Acme Engineering Private Limited - Company Profile",
                "url": "https://directory.example/acme",
                "content": "Verified supplier profile for Acme Engineering industrial pumps Pune.",
                "score": 0.7,
            },
        ],
        "material",
        ["industrial pump"],
    )
    assert len(candidates) == 1
    assert candidates[0]["enrichment"]["source_count"] == 2
    assert candidates[0]["enrichment"]["score_components"]["corroboration"] == 7


def test_unconfigured_web_search_returns_honest_guidance(monkeypatch):
    monkeypatch.delenv("TAVILY_API_KEY", raising=False)
    candidates, summary = research_web("customer", ["industrial valve"], {"geography": "Gujarat"})
    assert candidates == []
    assert summary["web_search_ready"] is False
    assert summary["queries"]


def test_receivables_only_profile_still_returns_collection_actions():
    class Cursor:
        rows = []

        def execute(self, query, _params):
            if "from bills" in query:
                self.rows = [("Acme Traders", 125000, 90000, 48, 3, 125000, 90000)]
            else:
                self.rows = []

        def fetchall(self):
            return self.rows

    profile, _narrative, completeness = build_icp(Cursor(), "tenant-id")
    assert profile["profile_version"] == 2
    assert profile["snapshot"]["outstanding_analyzed"] == 125000
    assert profile["action_plan"][0]["type"] == "collect"
    assert completeness["receivables"] is True


def test_supplier_search_plan_uses_current_price_context():
    queries = build_search_plan(
        "material",
        ["EN8 steel bar"],
        {"geography": "Gujarat", "baseline": 72},
    )
    assert any("INR 72" in query for query in queries)
