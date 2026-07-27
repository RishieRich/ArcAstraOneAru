from app.research import build_search_plan, candidates_from_results


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
                "content": "Verified business profile for Acme Engineering industrial pumps Pune.",
                "score": 0.7,
            },
        ],
        "customer",
        ["industrial pump"],
    )
    assert len(candidates) == 1
    assert candidates[0]["enrichment"]["source_count"] == 2
    assert candidates[0]["enrichment"]["score_components"]["corroboration"] == 7
