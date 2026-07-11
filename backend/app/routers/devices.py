from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from app.db import get_connection
from app.schemas import RegisterRequest, RegisterResponse
from app.security import hash_token, new_token

router = APIRouter(prefix="/v1/devices", tags=["devices"])


@router.post("/register", response_model=RegisterResponse)
def register(payload: RegisterRequest) -> RegisterResponse:
    code_hash = hash_token(payload.pairing_code)

    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(
            """
            select tenant_id, expires_at, used_at
            from pairing_codes
            where code_hash = %s
            for update
            """,
            (code_hash,),
        )
        row = cur.fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Invalid pairing code")
        tenant_id, expires_at, used_at = row
        if used_at is not None:
            raise HTTPException(status_code=400, detail="Pairing code already used")
        if expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="Pairing code expired")

        cur.execute("select tally_company_guid from tenants where id = %s", (tenant_id,))
        (bound_guid,) = cur.fetchone()
        if bound_guid is None:
            cur.execute(
                "update tenants set tally_company_guid = %s where id = %s",
                (payload.company_guid, tenant_id),
            )
        elif bound_guid != payload.company_guid:
            raise HTTPException(
                status_code=403,
                detail="This tenant is already bound to a different Tally company GUID",
            )

        raw_token = new_token()
        cur.execute(
            """
            insert into devices (tenant_id, token_hash, machine_label)
            values (%s, %s, %s)
            """,
            (tenant_id, hash_token(raw_token), payload.machine_label),
        )
        cur.execute(
            "update pairing_codes set used_at = now() where code_hash = %s",
            (code_hash,),
        )
        conn.commit()

    return RegisterResponse(device_token=raw_token)
