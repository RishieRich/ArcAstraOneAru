from app.research import candidates_from_results


def test_research_candidates_require_citations_and_start_as_drafts():
    candidates = candidates_from_results(
        [
            {"title": "Ankleshwar Valve Manufacturing", "url": "https://example.test/valves",
             "content": "Industrial valve buyer in Ankleshwar"},
            {"title": "Uncited result", "content": "must not pass"},
        ],
        "customer",
        ["valve", "Ankleshwar"],
    )
    assert len(candidates) == 1
    assert candidates[0]["source_url"] == "https://example.test/valves"
    assert candidates[0]["fit_score"] == 75
    assert "Verified web result" in candidates[0]["fit_reason"]
