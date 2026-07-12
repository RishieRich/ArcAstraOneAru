"""Login for the dashboard: email + 4-digit PIN -> bearer token."""
import re
import time

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.dashauth import issue_token, verify_pin
from app.db import get_connection

router = APIRouter(prefix="/v1/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    pin: str = Field(min_length=4, max_length=4)


class LoginResponse(BaseModel):
    token: str
    email: str
    display_name: str | None
    expires_at: int


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest) -> LoginResponse:
    email = payload.email.strip().lower()
    if not re.fullmatch(r"\d{4}", payload.pin):
        raise HTTPException(status_code=400, detail="PIN must be exactly 4 digits")

    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(
            "select pin_hash, display_name from dashboard_users where email = %s",
            (email,),
        )
        row = cur.fetchone()
        # Same delay and same error whether the email exists or the PIN is
        # wrong — a 4-digit PIN cannot survive a fast oracle.
        if row is None or not verify_pin(payload.pin, row[0]):
            time.sleep(0.8)
            raise HTTPException(status_code=401, detail="Wrong email or PIN")
        (_, display_name) = row

        cur.execute(
            "update dashboard_users set last_login_at = now() where email = %s",
            (email,),
        )
        conn.commit()

    token, expires_at = issue_token(email)
    return LoginResponse(
        token=token, email=email, display_name=display_name, expires_at=expires_at
    )
