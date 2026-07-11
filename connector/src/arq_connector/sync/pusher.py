"""Push a pulled snapshot to the backend (/v1/devices/register, /v1/sync).

Payload shape mirrors backend/app/schemas.py (SyncPayload). The sync-run UUID
is generated client-side so retries of the same run are idempotent — the
backend returns the prior result for a duplicate UUID instead of
double-inserting.
"""
import time
import uuid
from datetime import date, datetime

import httpx

REQUEST_TIMEOUT_SECONDS = 15.0
MAX_ATTEMPTS = 3

# Formats seen from live Tally: "1-Apr-26" (Bills Receivable report),
# "20260401" (STARTINGFROM). "%d-%b-%Y" included defensively for full-year
# variants of the report format.
_TALLY_DATE_FORMATS = ("%d-%b-%y", "%d-%b-%Y", "%Y%m%d")


class PushError(Exception):
    """Raised when the backend can't be reached or rejects the request."""


def parse_tally_date(value: str | None) -> str | None:
    """Tally date string -> ISO date string, or None if blank/unparseable."""
    if not value:
        return None
    value = value.strip()
    for fmt in _TALLY_DATE_FORMATS:
        try:
            return datetime.strptime(value, fmt).date().isoformat()
        except ValueError:
            continue
    return None


def build_payload(snapshot: dict, sync_run_id: str | None = None) -> dict:
    """Snapshot dict (from pull_snapshot) -> JSON-ready /v1/sync payload."""
    return {
        "sync_run_id": sync_run_id or str(uuid.uuid4()),
        "company_guid": snapshot["company"]["guid"],
        "ledgers": [
            {
                "tally_guid": l["tally_guid"],
                "name": l["name"],
                "parent_group": l.get("parent_group"),
                "closing_balance": str(l["closing_balance"]) if l.get("closing_balance") is not None else None,
                "alter_id": l.get("alter_id"),
            }
            for l in snapshot["ledgers"]
        ],
        "bills": [
            {
                "party_guid": b.get("party_guid"),
                "party_name": b["party_name"],
                "bill_ref": b.get("bill_ref"),
                "bill_date": parse_tally_date(b.get("bill_date")),
                "due_date": parse_tally_date(b.get("due_date")),
                "pending_amount": str(b["pending_amount"]),
                "overdue_days": b.get("overdue_days"),
            }
            for b in snapshot["bills"]
        ],
    }


def _post_with_retries(url: str, json_body: dict, headers: dict, transport=None) -> httpx.Response:
    last_error: Exception | None = None
    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            with httpx.Client(timeout=REQUEST_TIMEOUT_SECONDS, transport=transport) as client:
                return client.post(url, json=json_body, headers=headers)
        except httpx.RequestError as e:
            last_error = e
            if attempt < MAX_ATTEMPTS:
                time.sleep(2 ** (attempt - 1))  # 1s, 2s backoff
    raise PushError(f"Could not reach the backend at {url}: {last_error}")


def _error_detail(resp: httpx.Response) -> str:
    try:
        return resp.json().get("detail", resp.text[:200])
    except ValueError:
        return resp.text[:200]


def register_device(api_base_url: str, pairing_code: str, company_guid: str,
                    machine_label: str, transport=None) -> str:
    """One-time device registration. Returns the raw device token."""
    resp = _post_with_retries(
        f"{api_base_url.rstrip('/')}/v1/devices/register",
        {"pairing_code": pairing_code, "company_guid": company_guid, "machine_label": machine_label},
        headers={},
        transport=transport,
    )
    if resp.status_code != 200:
        raise PushError(f"Registration failed ({resp.status_code}): {_error_detail(resp)}")
    return resp.json()["device_token"]


def push_snapshot(api_base_url: str, token: str, snapshot: dict, transport=None) -> dict:
    """Push a snapshot to /v1/sync. Returns the backend's response dict."""
    payload = build_payload(snapshot)
    resp = _post_with_retries(
        f"{api_base_url.rstrip('/')}/v1/sync",
        payload,
        headers={"Authorization": f"Bearer {token}"},
        transport=transport,
    )
    if resp.status_code != 200:
        raise PushError(f"Sync rejected ({resp.status_code}): {_error_detail(resp)}")
    return resp.json()
