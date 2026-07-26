"""Provider routing for /v1/ask — the Gemini → Groq fallback chain.

These are deliberately hermetic: no network, no DB. Every case here is a bug that
actually shipped and took the copilot down (see AGENTS.md trap 13), so the point is
to fail loudly if someone reintroduces one while refactoring the provider plumbing.
"""
import json
import urllib.error
from contextlib import contextmanager

import pytest
from fastapi import HTTPException

from app.routers import ask as ask_module
from app.schemas_ask import AskRequest


class _FakeResponse:
    def __init__(self, payload: dict):
        self._body = json.dumps(payload).encode()

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def read(self):
        return self._body


def _http_error(code: int, body: str) -> urllib.error.HTTPError:
    import io

    return urllib.error.HTTPError(
        "https://example.invalid", code, "err", {}, io.BytesIO(body.encode())
    )


def _completion(text: str, finish_reason: str = "stop") -> dict:
    return {
        "choices": [
            {"message": {"role": "assistant", "content": text}, "finish_reason": finish_reason}
        ],
        "usage": {"prompt_tokens": 10, "completion_tokens": 5, "total_tokens": 15},
    }


@pytest.fixture()
def calls(monkeypatch):
    """Capture every outbound request and script each provider's reply.

    Scripted replies are keyed by provider host and may be a dict (returned as a
    200 body) or an exception instance (raised, as urlopen would).
    """
    recorded = []
    script = {}

    def fake_urlopen(request, timeout=None):
        recorded.append(
            {
                "url": request.full_url,
                "headers": dict(request.header_items()),
                "body": json.loads(request.data.decode()),
                "timeout": timeout,
            }
        )
        provider = "gemini" if "googleapis.com" in request.full_url else "groq"
        reply = script.get(provider, _completion("default"))
        if isinstance(reply, Exception):
            raise reply
        return _FakeResponse(reply)

    monkeypatch.setattr(ask_module.urllib.request, "urlopen", fake_urlopen)
    return {"recorded": recorded, "script": script}


@pytest.fixture()
def both_keys(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "gemini-test-key")
    monkeypatch.setenv("GROQ_API_KEY", "groq-test-key")


@pytest.fixture()
def no_db(monkeypatch):
    """Neutralise the auth/ACL and context-building work; this module tests routing."""

    @contextmanager
    def fake_connection():
        class _Cur:
            def __enter__(self):
                return self

            def __exit__(self, *_args):
                return False

        class _Conn:
            def cursor(self):
                return _Cur()

        yield _Conn()

    monkeypatch.setattr(ask_module, "get_connection", fake_connection)
    monkeypatch.setattr(ask_module, "ensure_dashboard_tenant_access", lambda *a, **k: None)
    monkeypatch.setattr(ask_module, "build_context", lambda tenant_id: '{"company": "Test"}')


def _ask(question: str = "who owes me money?"):
    return ask_module.ask(
        AskRequest(tenant_id="11111111-1111-1111-1111-111111111111", question=question),
        dashboard_user="owner@example.com",
    )


# --- the Cloudflare trap -------------------------------------------------------


def test_every_provider_call_sends_a_real_user_agent(calls, both_keys, no_db):
    """api.groq.com's Cloudflare 403s a bare Python-urllib UA with error code 1010."""
    calls["script"]["gemini"] = _http_error(429, "quota exceeded")
    calls["script"]["groq"] = _completion("Alpha Customer owes Rs 5,08,989.")

    _ask()

    assert len(calls["recorded"]) == 2, "Gemini failure should have been retried on Groq"
    for call in calls["recorded"]:
        # header_items() title-cases keys, hence the normalisation.
        sent = {k.lower(): v for k, v in call["headers"].items()}
        ua = sent.get("User-agent".lower()) or sent.get("user-agent")
        assert ua, f"no User-Agent sent to {call['url']}"
        assert "python-urllib" not in ua.lower(), f"Cloudflare-banned UA sent: {ua!r}"
        assert ua == ask_module.USER_AGENT


# --- the fallback chain --------------------------------------------------------


def test_gemini_quota_exhausted_falls_back_to_groq(calls, both_keys, no_db):
    """The reported outage: Gemini 429s every request once its daily cap is spent."""
    calls["script"]["gemini"] = _http_error(429, "RESOURCE_EXHAUSTED")
    calls["script"]["groq"] = _completion("Groq answered.")

    assert _ask().answer == "Groq answered."


def test_empty_content_is_a_failure_not_an_answer(calls, both_keys, no_db):
    """A thinking model can burn max_tokens and return a message with no content."""
    calls["script"]["gemini"] = {
        "choices": [{"message": {"role": "assistant"}, "finish_reason": "length"}],
        "usage": {"prompt_tokens": 2000, "completion_tokens": 0, "total_tokens": 3200},
    }
    calls["script"]["groq"] = _completion("Groq picked up the slack.")

    assert _ask().answer == "Groq picked up the slack."


def test_groq_is_not_called_when_gemini_answers(calls, both_keys, no_db):
    calls["script"]["gemini"] = _completion("Gemini answered.")

    assert _ask().answer == "Gemini answered."
    assert len(calls["recorded"]) == 1
    assert "googleapis.com" in calls["recorded"][0]["url"]


def test_all_providers_failing_is_a_502_never_a_500(calls, both_keys, no_db):
    calls["script"]["gemini"] = _http_error(429, "quota exceeded")
    calls["script"]["groq"] = _http_error(401, "invalid api key")

    with pytest.raises(HTTPException) as excinfo:
        _ask()
    assert excinfo.value.status_code == 502


def test_unconfigured_ai_is_an_actionable_503(calls, no_db, monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("GROQ_API_KEY", raising=False)

    with pytest.raises(HTTPException) as excinfo:
        _ask()
    assert excinfo.value.status_code == 503
    assert "GEMINI_API_KEY" in excinfo.value.detail
    assert not calls["recorded"]


def test_malformed_provider_json_falls_through(calls, both_keys, no_db, monkeypatch):
    """A 200 that is not JSON must not escape as a 500."""
    calls["script"]["groq"] = _completion("Groq answered.")

    real_urlopen = ask_module.urllib.request.urlopen

    def broken_for_gemini(request, timeout=None):
        if "googleapis.com" in request.full_url:
            class _Bad(_FakeResponse):
                def __init__(self):
                    self._body = b"<html>gateway error</html>"

            return _Bad()
        return real_urlopen(request, timeout=timeout)

    monkeypatch.setattr(ask_module.urllib.request, "urlopen", broken_for_gemini)
    assert _ask().answer == "Groq answered."


# --- per-model request knobs ---------------------------------------------------


def test_reasoning_effort_is_off_by_default(calls, both_keys, no_db, monkeypatch):
    """The Flash-Lite default rejects the field with 400 INVALID_ARGUMENT."""
    monkeypatch.setattr(ask_module, "GEMINI_REASONING_EFFORT", "")
    calls["script"]["gemini"] = _completion("ok")

    _ask()
    assert "reasoning_effort" not in calls["recorded"][0]["body"]


def test_reasoning_effort_goes_to_gemini_only(calls, both_keys, no_db, monkeypatch):
    """Groq hard-400s reasoning_effort: llama-3.3-70b is not a reasoning model."""
    monkeypatch.setattr(ask_module, "GEMINI_REASONING_EFFORT", "none")
    calls["script"]["gemini"] = _http_error(500, "transient")
    calls["script"]["groq"] = _completion("ok")

    _ask()

    gemini_call, groq_call = calls["recorded"]
    assert gemini_call["body"]["reasoning_effort"] == "none"
    assert "reasoning_effort" not in groq_call["body"]


def test_provider_priority_and_models(both_keys, monkeypatch):
    monkeypatch.setattr(ask_module, "GEMINI_MODEL", "gemini-flash-lite-latest")
    monkeypatch.setattr(ask_module, "GROQ_MODEL", "llama-3.3-70b-versatile")

    providers = ask_module._providers()

    assert [p.name for p in providers] == ["gemini", "groq"]
    assert providers[0].model == "gemini-flash-lite-latest"
    assert providers[1].model == "llama-3.3-70b-versatile"


def test_groq_alone_still_serves_when_gemini_is_unset(calls, no_db, monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.setenv("GROQ_API_KEY", "groq-test-key")
    calls["script"]["groq"] = _completion("Groq only.")

    assert _ask().answer == "Groq only."
    assert len(calls["recorded"]) == 1
    assert "groq.com" in calls["recorded"][0]["url"]
