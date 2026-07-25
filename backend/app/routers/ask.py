"""Natural-language Q&A over one company's receivables.

The whole snapshot for a tenant is small (a few hundred bills at most), so it is
serialised into the prompt rather than given to the model as a query tool. If a
tenant ever outgrows that, swap this for tool-use against the DB.

LLM routing: Google Gemini is primary, Groq is the fallback. Both speak the
OpenAI chat-completions dialect, so one request/response shape serves both — only
the base URL, key, and model name differ. If the primary errors (or is
unconfigured) we transparently try the fallback; if neither is configured the
endpoint returns a fixable 503, never a 500.

Answers mirror the language the user wrote in: English, Hinglish, or
Gujarati-English.
"""
import json
import os
import urllib.error
import urllib.request

from fastapi import APIRouter, Depends, HTTPException

from app.dashauth import require_dashboard_user
from app.db import get_connection
from app.routers.dashboard import metrics
from app.schemas_ask import AskRequest, AskResponse

router = APIRouter(
    prefix="/v1/ask",
    tags=["ask"],
    dependencies=[Depends(require_dashboard_user)],
)

# Primary provider. Gemini exposes an OpenAI-compatible surface at this path.
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
# "gemini-flash-latest" is an alias that always resolves to the current stable
# Flash model, so it never goes stale the way a pinned version can.
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-flash-latest")

# Fallback provider.
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")

# Per-request wall-clock budget. Comfortably under Vercel's 300s function limit
# while still letting a slow first token through.
REQUEST_TIMEOUT = 45
MAX_TOKENS = 1200

SYSTEM = """You are the ARQ receivables assistant. You help Indian small-business \
owners understand who owes them money, according to their Tally data.

LANGUAGE — this matters most:
Reply in the SAME language and script the user wrote in. Three cases:
- English -> plain English.
- Hinglish (Hindi in Roman script, e.g. "kitna paisa fansa hai") -> reply in Hinglish, \
Roman script. Never Devanagari.
- Gujarati-English mix (e.g. "ketla rupiya baki che") -> reply in the same Gujarati-English \
mix, Roman script. Never Gujarati script.
Mixed input -> mirror the mix. Keep business words (invoice, overdue, ledger) in English \
in every case; that is how the user's accountant talks.

STYLE:
- Short. Two to four sentences for most questions. No headers, no bullet dumps unless \
the user asks for a list.
- Money in Indian format with the rupee symbol: Rs 1,25,000 (lakh-crore grouping, not \
1,250,00). Round to whole rupees.
- Name specific parties and bills when they answer the question.
- Plain words. The user is a business owner, not an accountant.

TRUTHFULNESS:
- Answer ONLY from the data given below. Never invent a party, bill or number.
- If the data cannot answer the question, say so plainly and say what IS available.
- The data is a snapshot from the last Tally sync; if the user asks about anything \
outside receivables (purchases, stock, profit, GST), tell them this tool only sees \
Sundry Debtors and unpaid sales bills."""


class _ProviderError(Exception):
    """A single provider failed; carries enough context to log and fall back."""

    def __init__(self, provider: str, message: str):
        super().__init__(f"{provider}: {message}")
        self.provider = provider
        self.message = message


def _providers() -> list[tuple[str, str, str, str]]:
    """Configured providers in priority order: (name, url, key, model)."""
    out: list[tuple[str, str, str, str]] = []
    gemini = os.environ.get("GEMINI_API_KEY", "").strip()
    if gemini:
        out.append(("gemini", GEMINI_URL, gemini, GEMINI_MODEL))
    groq = os.environ.get("GROQ_API_KEY", "").strip()
    if groq:
        out.append(("groq", GROQ_URL, groq, GROQ_MODEL))
    return out


def _call(provider: str, url: str, key: str, model: str, messages: list[dict]) -> str:
    """POST one OpenAI-style chat completion, return the assistant text."""
    body = json.dumps(
        {
            "model": model,
            "messages": messages,
            "max_tokens": MAX_TOKENS,
            "temperature": 0.3,
        }
    ).encode()
    req = urllib.request.Request(
        url,
        data=body,
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT) as resp:
            data = json.loads(resp.read())
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "replace")[:300]
        raise _ProviderError(provider, f"HTTP {e.code}: {detail}")
    except (urllib.error.URLError, TimeoutError, OSError) as e:
        raise _ProviderError(provider, f"network error: {e}")

    try:
        return (data["choices"][0]["message"]["content"] or "").strip()
    except (KeyError, IndexError, TypeError):
        raise _ProviderError(provider, f"unexpected response shape: {str(data)[:200]}")


def build_context(tenant_id: str) -> str:
    """The company's whole receivables snapshot, as JSON, for the prompt."""
    data = metrics(tenant_id)
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(
            """
            select name, parent_group, abs(closing_balance)
            from ledgers where tenant_id = %s order by abs(closing_balance) desc nulls last
            """,
            (tenant_id,),
        )
        ledgers = [
            {"name": n, "group": g, "closing_balance": float(b) if b is not None else None}
            for n, g, b in cur.fetchall()
        ]

    return json.dumps(
        {
            "company": data["tenant_name"],
            "last_sync_at": data["last_sync_at"],
            "totals": data["totals"],
            "aging_buckets": data["aging"],
            "outstanding_bills": data["bills"],
            "customer_ledgers": ledgers,
        },
        indent=2,
        default=str,
    )


@router.post("", response_model=AskResponse)
def ask(payload: AskRequest) -> AskResponse:
    providers = _providers()
    if not providers:
        raise HTTPException(
            status_code=503,
            detail="AI is not configured on the server. Set GEMINI_API_KEY "
            "(and optionally GROQ_API_KEY) and redeploy.",
        )

    context = build_context(payload.tenant_id)
    messages = [
        {
            "role": "system",
            "content": f"{SYSTEM}\n\n<receivables_data>\n{context}\n</receivables_data>",
        },
        *[{"role": m.role, "content": m.content} for m in payload.history],
        {"role": "user", "content": payload.question},
    ]

    failures: list[str] = []
    for provider, url, key, model in providers:
        try:
            answer = _call(provider, url, key, model, messages)
        except _ProviderError as e:
            print(f"[ask] provider failed, falling back if possible -> {e}")
            failures.append(str(e))
            continue
        if answer:
            return AskResponse(answer=answer)
        failures.append(f"{provider}: empty answer")

    # Every configured provider failed.
    print(f"[ask] all providers failed: {failures}")
    raise HTTPException(
        status_code=502,
        detail="AI is temporarily unavailable. Please try again in a moment.",
    )
