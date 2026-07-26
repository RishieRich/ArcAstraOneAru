import hashlib
import json

from fastapi import APIRouter, HTTPException

from app.auth import DeviceAuth, DeviceContext
from app.db import get_connection
from app.schemas import SyncPayload, SyncResponse

router = APIRouter(prefix="/v1/sync", tags=["sync"])


def _normalized_identity(value: str | None) -> str:
    return (value or "").strip().casefold()


def bill_source_key(bill) -> str:
    """Return a stable identity for one bill across connector refreshes."""
    party = _normalized_identity(bill.party_guid) or _normalized_identity(bill.party_name)
    reference = _normalized_identity(bill.bill_ref)
    if reference:
        # Migration 0005 uses the same readable identity for existing rows.
        return f"ref:{party}\x1f{reference}"

    # A reference-less bill has no perfect Tally identity. Dates and amount are
    # the least surprising fallback: distinct same-party bills stay distinct,
    # while an identical refresh still upserts instead of stacking.
    fallback = json.dumps(
        [
            party,
            bill.bill_date.isoformat() if bill.bill_date else "",
            bill.due_date.isoformat() if bill.due_date else "",
            format(bill.pending_amount.normalize(), "f"),
        ],
        separators=(",", ":"),
    )
    return "fallback:" + hashlib.sha256(fallback.encode("utf-8")).hexdigest()


@router.post("", response_model=SyncResponse)
def sync(payload: SyncPayload, device: DeviceContext = DeviceAuth) -> SyncResponse:
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(
            "select tally_company_guid from tenants where id = %s",
            (device.tenant_id,),
        )
        (bound_guid,) = cur.fetchone()
        if bound_guid != payload.company_guid:
            raise HTTPException(
                status_code=403,
                detail="company_guid does not match this tenant's bound Tally company",
            )

        # Sync, upload and cleanup all take this tenant-scoped lock. It prevents
        # a connector push racing with a user-requested reset and resurrecting
        # only half a snapshot.
        cur.execute(
            "select pg_advisory_xact_lock(hashtextextended(cast(%s as text), 0))",
            (device.tenant_id,),
        )

        counts = {"ledgers": len(payload.ledgers), "bills": len(payload.bills)}

        # Race-safe idempotency: the connector retries a failed push with the
        # SAME sync_run_id, and a retry can arrive while the first attempt is
        # still mid-transaction. `on conflict do nothing` waits for that
        # transaction instead of raising a unique-violation, then rowcount==0
        # tells us this run was already recorded — return the prior result.
        cur.execute(
            """
            insert into sync_runs (id, tenant_id, device_id, started_at, status, counts)
            values (%s, %s, %s, now(), 'success', %s)
            on conflict (id) do nothing
            """,
            (str(payload.sync_run_id), device.tenant_id, device.device_id, json.dumps(counts)),
        )
        if cur.rowcount == 0:
            cur.execute(
                "select tenant_id, status, counts from sync_runs where id = %s",
                (str(payload.sync_run_id),),
            )
            existing_tenant_id, status, existing_counts = cur.fetchone()
            if existing_tenant_id != device.tenant_id:
                raise HTTPException(
                    status_code=409, detail="sync_run_id already used by another tenant"
                )
            return SyncResponse(
                sync_run_id=payload.sync_run_id, status=status, counts=existing_counts or {}
            )

        # executemany pipelines the statements — one round trip per batch, not
        # per row, which matters for real companies with thousands of entries.
        cur.executemany(
            """
            insert into ledgers (tenant_id, tally_guid, name, parent_group, closing_balance, alter_id, updated_at)
            values (%s, %s, %s, %s, %s, %s, now())
            on conflict (tenant_id, tally_guid) do update set
                name = excluded.name,
                parent_group = excluded.parent_group,
                closing_balance = excluded.closing_balance,
                alter_id = excluded.alter_id,
                updated_at = now()
            """,
            [
                (
                    device.tenant_id,
                    ledger.tally_guid,
                    ledger.name,
                    ledger.parent_group,
                    ledger.closing_balance,
                    ledger.alter_id,
                )
                for ledger in payload.ledgers
            ],
        )

        bills_by_key = {bill_source_key(bill): bill for bill in payload.bills}
        cur.executemany(
            """
            insert into bills
                (tenant_id, sync_run_id, source_key, party_guid, party_name,
                 bill_ref, bill_date, due_date, pending_amount, overdue_days,
                 first_sync_run_id, last_sync_run_id, updated_at, closed_at)
            values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, now(), null)
            on conflict (tenant_id, source_key) do update set
                sync_run_id = excluded.sync_run_id,
                party_guid = excluded.party_guid,
                party_name = excluded.party_name,
                bill_ref = excluded.bill_ref,
                bill_date = excluded.bill_date,
                due_date = excluded.due_date,
                pending_amount = excluded.pending_amount,
                overdue_days = excluded.overdue_days,
                last_sync_run_id = excluded.last_sync_run_id,
                updated_at = now(),
                closed_at = null
            """,
            [
                (
                    device.tenant_id,
                    str(payload.sync_run_id),
                    source_key,
                    bill.party_guid,
                    bill.party_name,
                    bill.bill_ref,
                    bill.bill_date,
                    bill.due_date,
                    bill.pending_amount,
                    bill.overdue_days,
                    str(payload.sync_run_id),
                    str(payload.sync_run_id),
                )
                for source_key, bill in bills_by_key.items()
            ],
        )

        # A successful Tally Bills Receivable export is a complete snapshot.
        # Anything previously open but absent now has been paid, cancelled or
        # otherwise cleared in Tally, so retain it as history but hide it from
        # current receivables.
        cur.execute(
            """
            update bills
            set closed_at = now(), updated_at = now()
            where tenant_id = %s
              and closed_at is null
              and not (source_key = any(%s::text[]))
            """,
            (device.tenant_id, list(bills_by_key)),
        )

        cur.execute(
            "update sync_runs set finished_at = now() where id = %s",
            (str(payload.sync_run_id),),
        )
        conn.commit()

    return SyncResponse(sync_run_id=payload.sync_run_id, status="success", counts=counts)
