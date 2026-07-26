"""Dashboard login plus the capacity-gated public trial signup."""
import re
import time
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, field_validator

from app.dashauth import hash_password, issue_token, verify_password
from app.db import get_connection

router = APIRouter(prefix="/v1/auth", tags=["auth"])

FREE_TRIAL_CAPACITY = 10
CONTACT_EMAIL = "contact@arqoneailabs.space"
CONTACT_PHONE = "+91 9727067044"
_EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str | None = Field(default=None, min_length=4, max_length=128)
    pin: str | None = Field(default=None, min_length=4, max_length=4)


class LoginResponse(BaseModel):
    token: str
    email: str
    display_name: str | None
    account_type: Literal["managed", "free_trial"] = "managed"
    company_name: str | None = None
    expires_at: int


class SignupStatusResponse(BaseModel):
    accepting_trials: bool
    contact_email: str
    contact_phone: str


class SignupRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    company_name: str = Field(min_length=2, max_length=160)
    email: str = Field(min_length=5, max_length=254)
    password: str = Field(min_length=8, max_length=128)

    @field_validator("full_name", "company_name")
    @classmethod
    def clean_required_text(cls, value: str) -> str:
        cleaned = " ".join(value.split()).strip()
        if len(cleaned) < 2:
            raise ValueError("This field is required")
        return cleaned

    @field_validator("email")
    @classmethod
    def clean_email(cls, value: str) -> str:
        cleaned = value.strip().lower()
        if not _EMAIL.fullmatch(cleaned):
            raise ValueError("Enter a valid email address")
        return cleaned

    @field_validator("password")
    @classmethod
    def strong_password(cls, value: str) -> str:
        if not re.search(r"[A-Za-z]", value) or not re.search(r"\d", value):
            raise ValueError("Password must contain at least one letter and one number")
        return value


class SignupResponse(BaseModel):
    status: Literal["active", "waitlisted"]
    email: str
    display_name: str
    company_name: str
    account_type: Literal["free_trial"] | None = None
    token: str | None = None
    expires_at: int | None = None
    contact_email: str
    contact_phone: str


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest) -> LoginResponse:
    email = payload.email.strip().lower()
    credential = payload.password if payload.password is not None else payload.pin
    if not credential:
        raise HTTPException(status_code=400, detail="Password is required")

    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(
            """
            select du.pin_hash, du.display_name, du.account_type,
                   (
                     select t.name
                     from dashboard_user_tenants dut
                     join tenants t on t.id = dut.tenant_id
                     where dut.user_email = du.email
                     order by dut.created_at
                     limit 1
                   )
            from dashboard_users du
            where du.email = %s
            """,
            (email,),
        )
        row = cur.fetchone()
        # Same delay and same error whether the email exists or the credential
        # is wrong, so the endpoint does not become an account oracle.
        if row is None or not verify_password(credential, row[0]):
            time.sleep(0.8)
            raise HTTPException(status_code=401, detail="Wrong email or password")
        _, display_name, account_type, company_name = row

        cur.execute(
            "update dashboard_users set last_login_at = now() where email = %s",
            (email,),
        )
        conn.commit()

    token, expires_at = issue_token(email)
    return LoginResponse(
        token=token,
        email=email,
        display_name=display_name,
        account_type=account_type,
        company_name=company_name,
        expires_at=expires_at,
    )


@router.get("/signup/status", response_model=SignupStatusResponse)
def signup_status() -> SignupStatusResponse:
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(
            "select count(*) from dashboard_users where account_type = 'free_trial'"
        )
        (active_trials,) = cur.fetchone()
    remaining = max(FREE_TRIAL_CAPACITY - active_trials, 0)
    return SignupStatusResponse(
        accepting_trials=remaining > 0,
        contact_email=CONTACT_EMAIL,
        contact_phone=CONTACT_PHONE,
    )


@router.post("/signup", response_model=SignupResponse)
def signup(payload: SignupRequest) -> SignupResponse:
    """Create an isolated free tenant for the first ten; waitlist everyone else."""
    with get_connection() as conn, conn.cursor() as cur:
        # The capacity decision and account creation are one serialized
        # transaction, so concurrent requests cannot create an eleventh trial.
        cur.execute(
            "select pg_advisory_xact_lock(hashtext('arq-public-free-trial-capacity'))"
        )
        cur.execute(
            "select 1 from dashboard_users where email = %s",
            (payload.email,),
        )
        if cur.fetchone() is not None:
            raise HTTPException(
                status_code=409,
                detail="An account with this email already exists. Please log in.",
            )

        cur.execute(
            "select count(*) from dashboard_users where account_type = 'free_trial'"
        )
        (active_trials,) = cur.fetchone()
        if active_trials >= FREE_TRIAL_CAPACITY:
            # Passwords have no purpose until an account is activated. Deliberately
            # do not persist even a hash for waitlisted leads.
            cur.execute(
                """
                insert into trial_waitlist (full_name, company_name, email)
                values (%s, %s, %s)
                on conflict (email) do update set
                    full_name = excluded.full_name,
                    company_name = excluded.company_name,
                    updated_at = now()
                """,
                (payload.full_name, payload.company_name, payload.email),
            )
            conn.commit()
            return SignupResponse(
                status="waitlisted",
                email=payload.email,
                display_name=payload.full_name,
                company_name=payload.company_name,
                contact_email=CONTACT_EMAIL,
                contact_phone=CONTACT_PHONE,
            )

        cur.execute(
            "insert into tenants (name) values (%s) returning id",
            (payload.company_name,),
        )
        (tenant_id,) = cur.fetchone()
        cur.execute(
            """
            insert into dashboard_users
                (email, pin_hash, display_name, all_tenants, account_type)
            values (%s, %s, %s, false, 'free_trial')
            """,
            (payload.email, hash_password(payload.password), payload.full_name),
        )
        cur.execute(
            """
            insert into dashboard_user_tenants (user_email, tenant_id)
            values (%s, %s)
            """,
            (payload.email, tenant_id),
        )
        cur.execute("delete from trial_waitlist where email = %s", (payload.email,))
        conn.commit()

    token, expires_at = issue_token(payload.email)
    return SignupResponse(
        status="active",
        email=payload.email,
        display_name=payload.full_name,
        company_name=payload.company_name,
        account_type="free_trial",
        token=token,
        expires_at=expires_at,
        contact_email=CONTACT_EMAIL,
        contact_phone=CONTACT_PHONE,
    )
