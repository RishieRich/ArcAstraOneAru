from dataclasses import dataclass
from uuid import UUID

from fastapi import Depends, HTTPException, Request

from app.db import get_connection
from app.security import hash_token


@dataclass(frozen=True)
class DeviceContext:
    device_id: UUID
    tenant_id: UUID


def require_device(request: Request) -> DeviceContext:
    header = request.headers.get("authorization", "")
    if not header.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = header[len("bearer ") :].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Missing bearer token")

    token_hash = hash_token(token)
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(
            """
            select id, tenant_id
            from devices
            where token_hash = %s and revoked_at is null
            """,
            (token_hash,),
        )
        row = cur.fetchone()
        if row is None:
            raise HTTPException(status_code=401, detail="Invalid or revoked device token")
        device_id, tenant_id = row
        cur.execute(
            "update devices set last_seen_at = now() where id = %s",
            (device_id,),
        )
        conn.commit()

    return DeviceContext(device_id=device_id, tenant_id=tenant_id)


DeviceAuth = Depends(require_device)
