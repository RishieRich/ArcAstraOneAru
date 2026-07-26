"""Destructive dashboard actions, deliberately isolated from read endpoints."""
import time

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.dashauth import (
    ensure_dashboard_tenant_access,
    require_dashboard_user,
    verify_password,
)
from app.db import get_connection

router = APIRouter(prefix="/v1/dashboard/data", tags=["dashboard-data"])


class CleanupRequest(BaseModel):
    company_name: str = Field(min_length=1, max_length=200)
    password: str = Field(min_length=4, max_length=128)


@router.delete("/{tenant_id}")
def cleanup_company_data(
    tenant_id: str,
    payload: CleanupRequest,
    dashboard_user: str = Depends(require_dashboard_user),
) -> dict:
    """Delete imported/synced facts while preserving account and device setup."""
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(
            """
            select t.name, du.pin_hash
            from tenants t
            join dashboard_users du on du.email = %s
            where t.id = %s
            """,
            (dashboard_user, tenant_id),
        )
        row = cur.fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="No such company")
        company_name, password_hash = row
        ensure_dashboard_tenant_access(cur, dashboard_user, tenant_id)

        if payload.company_name != company_name:
            raise HTTPException(
                status_code=400,
                detail="Company name confirmation does not match",
            )
        if not verify_password(payload.password, password_hash):
            time.sleep(0.8)
            raise HTTPException(status_code=403, detail="Wrong password")

        # All tenant data writers take this same lock, so cleanup cannot
        # interleave with a Tally refresh or workbook upload.
        cur.execute(
            "select pg_advisory_xact_lock(hashtextextended(cast(%s as text), 0))",
            (tenant_id,),
        )

        deleted = {}
        for label, statement in (
            (
                "smart_rows",
                "delete from smart_rows where tenant_id = %s",
            ),
            (
                "smart_datasets",
                "delete from smart_datasets where tenant_id = %s",
            ),
            (
                "smart_imports",
                "delete from smart_imports where tenant_id = %s",
            ),
            (
                "financial_transaction_lines",
                "delete from financial_transaction_lines where tenant_id = %s",
            ),
            (
                "financial_transactions",
                "delete from financial_transactions where tenant_id = %s",
            ),
            (
                "financial_imports",
                "delete from financial_imports where tenant_id = %s",
            ),
            ("bills", "delete from bills where tenant_id = %s"),
            ("ledgers", "delete from ledgers where tenant_id = %s"),
            ("sync_runs", "delete from sync_runs where tenant_id = %s"),
        ):
            cur.execute(statement, (tenant_id,))
            deleted[label] = cur.rowcount
        conn.commit()

    return {
        "status": "cleared",
        "tenant_id": tenant_id,
        "company_name": company_name,
        "deleted": deleted,
        "preserved": ["tenant", "dashboard_access", "devices"],
    }
