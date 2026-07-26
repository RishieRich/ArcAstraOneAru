"""Natural-language Q&A over one company's receivables and optional uploads.

The normalized snapshot for a tenant is small, so it is serialised into the
prompt rather than giving the model direct database access. If a tenant ever
outgrows that, swap this for tool-use against the DB.

LLM routing: Google Gemini is primary, Groq is the fallback. Both speak the
OpenAI chat-completions dialect, so one request/response shape serves both — only
the base URL, key, model name and a few per-provider knobs differ. If the primary
errors (or is unconfigured) we transparently try the fallback; if neither is
configured the endpoint returns a fixable 503, never a 500.

The fallback is the whole point of this module — Gemini's free tier is a few
dozen requests per day per model, so a working day routinely ends up on Groq.
Anything that silently breaks the second provider breaks the feature, which is
why the two traps below (Cloudflare's User-Agent filter and Gemini's reasoning
tokens) are commented where they bite rather than in a doc nobody re-reads.

Answers mirror the language the user wrote in: English, Hinglish,
Gujarati-English, or Marathi-English.
"""
import json
import os
import urllib.error
import urllib.request
from typing import NamedTuple

from fastapi import APIRouter, Depends, HTTPException

from app.dashauth import ensure_dashboard_tenant_access, require_dashboard_user
from app.db import get_connection
from app.routers.dashboard import metrics_snapshot
from app.schemas_ask import AskRequest, AskResponse

router = APIRouter(
    prefix="/v1/ask",
    tags=["ask"],
)

# Primary provider. Gemini exposes an OpenAI-compatible surface at this path.
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
# Flash-Lite, not Flash: the free tier meters requests per day per model, and the
# plain "gemini-flash-latest" alias drifted onto a model capped at 20 requests a
# day — enough for one demo, then 429 for everyone. Lite is the tier Google gives
# real free-tier headroom. Still an alias so it cannot 404 the way a pinned
# version does once Google retires it ("no longer available to new users").
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-flash-lite-latest")
# Only set this if you pin GEMINI_MODEL to a thinking model (the 3.x Flash line).
# Those spend hidden reasoning tokens out of max_tokens and can return
# finish_reason="length" with no content at all on a prompt as large as
# <business_data>; "none" buys the whole budget back for the actual answer.
# Left unset by default because support is per-model, not per-provider — the
# Flash-Lite default rejects the field outright with 400 INVALID_ARGUMENT, and it
# needs no help anyway (it spends zero reasoning tokens on these prompts).
GEMINI_REASONING_EFFORT = os.environ.get("GEMINI_REASONING_EFFORT", "").strip()

# Fallback provider.
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")

# api.groq.com sits behind Cloudflare, which rejects a bare "Python-urllib/3.x"
# User-Agent with HTTP 403 "error code: 1010" (banned browser signature) before
# the request ever reaches Groq. urllib sends that UA unless told otherwise, so
# the fallback 403'd on every single call and the copilot went dark the moment
# Gemini hit its daily quota. Send a real product UA on every call.
USER_AGENT = "arq-astra-backend/1.0 (+https://arcastraone.vercel.app)"

# Per-request wall-clock budget. Comfortably under Vercel's 300s function limit
# while still letting a slow first token through.
REQUEST_TIMEOUT = 45
MAX_TOKENS = 1200

SYSTEM = """You are the ARQ business-books assistant. You help Indian small-business \
owners understand receivables and any sales, purchase, expense or Profit & Loss workbooks \
they uploaded, plus unfamiliar business tables that Smart Excel typed without forcing an \
accounting classification.

LANGUAGE — this matters most:
Reply in the SAME language and script the user wrote in. Four cases:
- English -> plain English.
- Hinglish (Hindi in Roman script, e.g. "kitna paisa fansa hai") -> reply in Hinglish, \
Roman script. Never Devanagari.
- Gujarati-English mix (e.g. "ketla rupiya baki che") -> reply in the same Gujarati-English \
mix, Roman script. Never Gujarati script.
- Marathi-English mix (e.g. "majha business kasa chaltoy") -> reply in friendly Marathi-English, \
Roman script. Never Devanagari unless the user explicitly uses it.
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
- Receivables come from the latest Tally connector snapshot. Sales, purchases and \
expenses come only from normalized uploaded rows listed in financials.kinds. A Profit & Loss \
summary may contribute several of those kinds from one workbook.
- smart_data contains the latest unfamiliar multi-sheet workbook. Its domains, columns, KPIs \
and charts are deterministic inferences. Use the supplied labels and rows, but never call a \
generic metric statutory Sales, Profit, GST payable or Expense unless its label says so.
- If a requested data kind was not uploaded, say it is not available.
- financials.pnl_complete is true only when Sales, Purchases and Expenses are all uploaded.
- When pnl_complete is true, operating_result means Sales minus Purchases minus Expenses. \
Call a positive value "estimated operating profit" and a negative value "estimated operating \
loss". Always make clear it is based on uploaded workbooks, not a statutory P&L.
- financials.totals.profit is the sum of positive monthly results; totals.loss is the sum of \
negative monthly results. totals.operating_result is the net result across the full period.
- financials.highlights and financials.monthly cover the complete uploaded date range, including \
calendar months with no activity. Use those fields for highest/lowest and trend questions.
- financials.products contains normalized product-level sales/purchase value, quantity coverage, \
weighted average rate, transaction/customer counts and each product's top customer. Use it for \
product, item, quantity, rate, mix and SKU questions; do not infer units when unit is null.
- Profit & Loss summary uploads contain ledger categories, not voucher, customer or product detail. \
Do not claim that missing granularity exists.
- For "why" questions, describe the observable sales, purchase, expense and category changes. \
Do not claim a cause that the uploaded data cannot prove."""

LANGUAGE_NAMES = {
    "en": "English",
    "hi": "Hinglish in Roman script",
    "gu": "Gujarati-English in Roman script",
    "mr": "friendly Marathi-English in Roman script",
}


class _ProviderError(Exception):
    """A single provider failed; carries enough context to log and fall back."""

    def __init__(self, provider: str, message: str):
        super().__init__(f"{provider}: {message}")
        self.provider = provider
        self.message = message


class _Provider(NamedTuple):
    name: str
    url: str
    key: str
    model: str
    # Extra top-level request fields this provider needs. Per-provider because
    # the two do not accept the same knobs — see _providers().
    extra: dict


def _providers() -> list[_Provider]:
    """Configured providers in priority order."""
    out: list[_Provider] = []
    gemini = os.environ.get("GEMINI_API_KEY", "").strip()
    if gemini:
        extra = (
            {"reasoning_effort": GEMINI_REASONING_EFFORT}
            if GEMINI_REASONING_EFFORT
            else {}
        )
        out.append(_Provider("gemini", GEMINI_URL, gemini, GEMINI_MODEL, extra))
    groq = os.environ.get("GROQ_API_KEY", "").strip()
    if groq:
        # Never forward GEMINI_REASONING_EFFORT here: llama-3.3-70b is not a
        # reasoning model and Groq hard-400s the field instead of ignoring it.
        # That is why extras are per-provider rather than one shared dict.
        out.append(_Provider("groq", GROQ_URL, groq, GROQ_MODEL, {}))
    return out


def _call(provider: _Provider, messages: list[dict]) -> str:
    """POST one OpenAI-style chat completion, return non-empty assistant text.

    Raises _ProviderError for anything the caller should fall back from,
    including a well-formed response that carries no usable answer.
    """
    body = json.dumps(
        {
            "model": provider.model,
            "messages": messages,
            "max_tokens": MAX_TOKENS,
            "temperature": 0.3,
            **provider.extra,
        }
    ).encode()
    req = urllib.request.Request(
        provider.url,
        data=body,
        headers={
            "Authorization": f"Bearer {provider.key}",
            "Content-Type": "application/json",
            "User-Agent": USER_AGENT,
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT) as resp:
            data = json.loads(resp.read())
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "replace")[:300]
        raise _ProviderError(provider.name, f"HTTP {e.code}: {detail}")
    except (urllib.error.URLError, TimeoutError, OSError) as e:
        raise _ProviderError(provider.name, f"network error: {e}")
    except ValueError as e:  # JSONDecodeError — a 200 that is not JSON
        raise _ProviderError(provider.name, f"unreadable response: {e}")

    try:
        choice = data["choices"][0]
        text = ((choice.get("message") or {}).get("content") or "").strip()
    except (KeyError, IndexError, TypeError):
        raise _ProviderError(provider.name, f"unexpected response shape: {str(data)[:200]}")
    if not text:
        # Empty content is a provider failure, not an answer. Report the reason
        # so the log says why: "length" means the token budget ran out mid-think.
        raise _ProviderError(
            provider.name,
            f"empty answer (finish_reason={choice.get('finish_reason')!r}, "
            f"usage={data.get('usage')})",
        )
    return text


def build_context(tenant_id: str) -> str:
    """The company's normalized books snapshot, as JSON, for the prompt."""
    data = metrics_snapshot(tenant_id)
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
        cur.execute(
            """
            select kind, txn_date, voucher_number, voucher_type, party_name,
                   category, gross_amount, net_amount, tax_amount
            from financial_transactions
            where tenant_id = %s
            order by txn_date desc nulls last, id desc
            limit 300
            """,
            (tenant_id,),
        )
        uploaded_transactions = [
            {
                "kind": kind,
                "date": txn_date.isoformat() if txn_date else None,
                "voucher_number": voucher_number,
                "voucher_type": voucher_type,
                "party": party,
                "category": category,
                "gross_amount": float(gross),
                "net_amount": float(net),
                "tax_amount": float(tax),
            }
            for (
                kind,
                txn_date,
                voucher_number,
                voucher_type,
                party,
                category,
                gross,
                net,
                tax,
            ) in cur.fetchall()
        ]
        cur.execute(
            """
            select to_char(date_trunc('month', txn_date), 'YYYY-MM'), kind,
                   coalesce(nullif(category, ''), 'Uncategorized'),
                   coalesce(sum(gross_amount), 0)
            from financial_transactions
            where tenant_id = %s and txn_date is not null
            group by 1, kind, 3
            order by 1, kind, 4 desc
            """,
            (tenant_id,),
        )
        driver_groups: dict[tuple[str, str], list[dict]] = {}
        for month, kind, category, amount in cur.fetchall():
            rows = driver_groups.setdefault((month, kind), [])
            if len(rows) < 5:
                rows.append({"category": category, "amount": float(amount)})
        monthly_drivers = [
            {"month": month, "kind": kind, "drivers": drivers}
            for (month, kind), drivers in driver_groups.items()
        ]
        cur.execute(
            """
            select sd.sheet_name, sr.values_json
            from smart_imports si
            join smart_datasets sd on sd.import_id = si.id
            join smart_rows sr on sr.dataset_id = sd.id
            where si.id = (
              select id from smart_imports
              where tenant_id = %s
              order by created_at desc
              limit 1
            )
            order by sd.sheet_index, sr.source_row
            limit 600
            """,
            (tenant_id,),
        )
        smart_samples: dict[str, list[dict]] = {}
        for sheet_name, values in cur.fetchall():
            smart_samples.setdefault(sheet_name, []).append(values)

    return json.dumps(
        {
            "company": data["tenant_name"],
            "last_sync_at": data["last_sync_at"],
            "receivables_totals": data["totals"],
            "aging_buckets": data["aging"],
            "outstanding_bills": data["bills"],
            "customer_ledgers": ledgers,
            "financials": data["financials"],
            "monthly_drivers": monthly_drivers,
            "uploaded_transactions": uploaded_transactions,
            "smart_data": data.get("smart_data", {}),
            "smart_data_rows": smart_samples,
        },
        indent=2,
        default=str,
    )


@router.post("", response_model=AskResponse)
def ask(
    payload: AskRequest,
    dashboard_user: str = Depends(require_dashboard_user),
) -> AskResponse:
    with get_connection() as conn, conn.cursor() as cur:
        ensure_dashboard_tenant_access(cur, dashboard_user, payload.tenant_id)

    providers = _providers()
    if not providers:
        raise HTTPException(
            status_code=503,
            detail="AI is not configured on the server. Set GEMINI_API_KEY and "
            "GROQ_API_KEY, then redeploy.",
        )

    context = build_context(payload.tenant_id)
    messages = [
        {
            "role": "system",
            "content": (
                f"{SYSTEM}\n\nThe selected dashboard language is "
                f"{LANGUAGE_NAMES[payload.language]}. Reply in that language unless the "
                "user clearly asks for another language."
                f"\n\n<business_data>\n{context}\n</business_data>"
            ),
        },
        *[{"role": m.role, "content": m.content} for m in payload.history],
        {"role": "user", "content": payload.question},
    ]

    failures: list[str] = []
    for provider in providers:
        try:
            return AskResponse(answer=_call(provider, messages))
        except _ProviderError as e:
            print(f"[ask] provider failed, falling back if possible -> {e}")
            failures.append(str(e))

    # Every configured provider failed.
    print(f"[ask] all providers failed: {failures}")
    raise HTTPException(
        status_code=502,
        detail="AI is temporarily unavailable. Please try again in a moment.",
    )
