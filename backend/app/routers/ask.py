"""Natural-language Q&A over one company's receivables.

The whole snapshot for a tenant is small (a few hundred bills at most), so it is
serialised into the prompt rather than given to Claude as a query tool. If a
tenant ever outgrows that, swap this for tool-use against the DB.

Answers mirror the language the user wrote in: English, Hinglish, or
Gujarati-English. No key configured -> 503 with a fixable message, never a 500.
"""
import json
import os

from fastapi import APIRouter, HTTPException

from app.db import get_connection
from app.routers.dashboard import metrics
from app.schemas_ask import AskRequest, AskResponse

router = APIRouter(prefix="/v1/ask", tags=["ask"])

MODEL = "claude-opus-4-8"

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


def _api_key() -> str:
    key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if not key:
        raise HTTPException(
            status_code=503,
            detail="AI is not configured on the server. Set ANTHROPIC_API_KEY and restart.",
        )
    return key


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
    import anthropic

    key = _api_key()
    context = build_context(payload.tenant_id)

    client = anthropic.Anthropic(api_key=key)
    try:
        response = client.messages.create(
            model=MODEL,
            max_tokens=1200,
            thinking={"type": "adaptive"},
            output_config={"effort": "medium"},
            system=[
                {"type": "text", "text": SYSTEM},
                {
                    "type": "text",
                    "text": f"<receivables_data>\n{context}\n</receivables_data>",
                    "cache_control": {"type": "ephemeral"},
                },
            ],
            messages=[
                *[{"role": m.role, "content": m.content} for m in payload.history],
                {"role": "user", "content": payload.question},
            ],
        )
    except anthropic.AuthenticationError:
        raise HTTPException(status_code=503, detail="ANTHROPIC_API_KEY is invalid.")
    except anthropic.RateLimitError:
        raise HTTPException(status_code=429, detail="AI is busy right now. Try again in a moment.")
    except anthropic.APIError as e:
        raise HTTPException(status_code=502, detail=f"AI request failed: {e}")

    if response.stop_reason == "refusal":
        raise HTTPException(status_code=422, detail="The assistant declined to answer that.")

    answer = "".join(b.text for b in response.content if b.type == "text").strip()
    return AskResponse(answer=answer or "I could not answer that from the synced data.")
