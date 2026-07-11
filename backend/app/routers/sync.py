import json

from fastapi import APIRouter, HTTPException

from app.auth import DeviceAuth, DeviceContext
from app.db import get_connection
from app.schemas import SyncPayload, SyncResponse

router = APIRouter(prefix="/v1/sync", tags=["sync"])


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

        cur.execute(
            "select tenant_id, status, counts from sync_runs where id = %s",
            (str(payload.sync_run_id),),
        )
        existing = cur.fetchone()
        if existing is not None:
            existing_tenant_id, status, counts = existing
            if existing_tenant_id != device.tenant_id:
                raise HTTPException(
                    status_code=409, detail="sync_run_id already used by another tenant"
                )
            return SyncResponse(sync_run_id=payload.sync_run_id, status=status, counts=counts or {})

        counts = {"ledgers": len(payload.ledgers), "bills": len(payload.bills)}

        cur.execute(
            """
            insert into sync_runs (id, tenant_id, device_id, started_at, status, counts)
            values (%s, %s, %s, now(), 'success', %s)
            """,
            (str(payload.sync_run_id), device.tenant_id, device.device_id, json.dumps(counts)),
        )

        for ledger in payload.ledgers:
            cur.execute(
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
                (
                    device.tenant_id,
                    ledger.tally_guid,
                    ledger.name,
                    ledger.parent_group,
                    ledger.closing_balance,
                    ledger.alter_id,
                ),
            )

        for bill in payload.bills:
            cur.execute(
                """
                insert into bills
                    (tenant_id, sync_run_id, party_guid, party_name, bill_ref, bill_date, due_date, pending_amount, overdue_days)
                values (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    device.tenant_id,
                    str(payload.sync_run_id),
                    bill.party_guid,
                    bill.party_name,
                    bill.bill_ref,
                    bill.bill_date,
                    bill.due_date,
                    bill.pending_amount,
                    bill.overdue_days,
                ),
            )

        cur.execute(
            "update sync_runs set finished_at = now() where id = %s",
            (str(payload.sync_run_id),),
        )
        conn.commit()

    return SyncResponse(sync_run_id=payload.sync_run_id, status="success", counts=counts)
