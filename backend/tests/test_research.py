import json
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.db import get_connection
from app.research import (
    build_icp,
    build_search_plan,
    candidates_from_results,
    research_web,
    tavily_search,
)
from app.routers.research import _candidate_rows


def test_tavily_search_uses_standard_plan_compatible_payload(monkeypatch):
    captured = {}

    class Response:
        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return False

        def read(self):
            return b'{"results": []}'

    def fake_urlopen(request, timeout):
        captured["payload"] = json.loads(request.data)
        captured["authorization"] = request.get_header("Authorization")
        captured["timeout"] = timeout
        return Response()

    monkeypatch.setenv("TAVILY_API_KEY", "test-key")
    monkeypatch.setenv("RESEARCH_SEARCH_DEPTH", "fast")
    monkeypatch.setattr("app.research.urllib.request.urlopen", fake_urlopen)

    assert tavily_search("industrial valve buyers", limit=4) == {"results": []}
    assert captured["payload"]["max_results"] == 4
    assert captured["payload"]["search_depth"] == "fast"
    assert "country" not in captured["payload"]
    assert "safe_search" not in captured["payload"]
    assert "chunks_per_source" not in captured["payload"]
    assert captured["authorization"] == "Bearer test-key"
    assert captured["timeout"] == 28

    monkeypatch.setenv("RESEARCH_SEARCH_DEPTH", "advanced")
    tavily_search("industrial valve buyers", limit=4)
    assert captured["payload"]["country"] == "india"
    assert captured["payload"]["chunks_per_source"] == 3


def test_search_plan_uses_multiple_bounded_angles(monkeypatch):
    monkeypatch.setenv("RESEARCH_MAX_QUERIES", "4")
    queries = build_search_plan(
        "customer",
        ["industrial valve", "pump housing"],
        {"geography": "Gujarat"},
    )
    assert len(queries) == 4
    assert all("industrial valve" in query for query in queries)
    assert any("association" in query for query in queries)
    assert any("Gujarat" in query for query in queries)


def test_target_industry_drives_customer_discovery(monkeypatch):
    monkeypatch.setenv("RESEARCH_MAX_QUERIES", "4")
    queries = build_search_plan(
        "customer",
        ["Chemicals Pumps", "Seal - Spring - HIFI CROC"],
        {"geography": "Vapi", "industry": "Chemicals Pumps"},
    )
    assert len(queries) == 4
    assert all("Chemicals Pumps" in query for query in queries)
    assert all("Vapi" in query for query in queries)
    assert all("HIFI CROC" not in query for query in queries)


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


def test_human_wildcard_product_matches_real_supplier_wording():
    candidates = candidates_from_results(
        [
            {
                "title": "Annealed Steel Bars Manufacturer in India",
                "url": "https://urjasteels.example/annealed-steel-bars",
                "content": (
                    "Precision annealed steel bars manufacturer and supplier for "
                    "machining, forging and engineering applications."
                ),
                "score": 0.78,
            }
        ],
        "material",
        ["EN* steel bar"],
    )
    assert len(candidates) == 1
    assert candidates[0]["enrichment"]["matched_terms"] == ["EN* steel bar"]


def test_target_industry_can_establish_potential_customer_fit():
    candidates = candidates_from_results(
        [
            {
                "title": "VND Plastico Pumps Pvt. Ltd.",
                "url": "https://vndpumps.example/chemical-pumps-vapi",
                "content": (
                    "Chemical pump company and industrial manufacturer serving plants "
                    "from Vapi, Gujarat."
                ),
                "score": 0.64,
            }
        ],
        "customer",
        ["Chemicals Pumps", "Hi-Tech Seal Lock"],
        params={"industry": "Chemicals Pumps", "geography": "Vapi"},
    )
    assert len(candidates) == 1
    assert candidates[0]["location"] == "Vapi"
    assert candidates[0]["enrichment"]["matched_terms"] == ["Chemicals Pumps"]


def test_candidate_name_prefers_company_identity_from_result_excerpt():
    candidates = candidates_from_results(
        [
            {
                "title": "SS Chemical Pump In Vapi",
                "url": "https://vndpumps.example/chemical-pump-vapi",
                "content": (
                    "VND Plastico Pumps Pvt. Ltd.\n"
                    "Chemical pump manufacturer and supplier operating in Vapi."
                ),
                "score": 0.81,
            }
        ],
        "customer",
        ["Chemicals Pumps"],
        params={"industry": "Chemicals Pumps", "geography": "Vapi"},
    )
    assert candidates[0]["name"] == "VND Plastico Pumps Pvt. Ltd."


def test_candidate_status_queries_are_postgres_type_safe():
    tenant_id = str(uuid4())
    run_id = str(uuid4())
    with get_connection() as conn, conn.cursor() as cur:
        assert _candidate_rows(cur, tenant_id, run_id, "all") == []
        assert _candidate_rows(cur, tenant_id, run_id, "draft") == []
        with pytest.raises(HTTPException) as exc_info:
            _candidate_rows(cur, tenant_id, run_id, "unknown")
    assert exc_info.value.status_code == 422


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
