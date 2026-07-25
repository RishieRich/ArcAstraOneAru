"""Auth for the metrics dashboard (email + password; legacy PINs supported).

Deliberately separate from the connector's device-token auth (app/auth.py):
devices and dashboard viewers are different populations with different
lifetimes, and neither should be able to impersonate the other.

Sessions are stateless HMAC tokens — nothing to store, which matters on
serverless where every invocation is a fresh process. The signing secret is
DASHBOARD_SECRET if set, else derived from DATABASE_URL so all Vercel
instances (which share that env var) agree without extra configuration.

Credentials are salted PBKDF2 hashes and failed logins are slowed server-side.
This is a viewing dashboard for people you personally hand accounts to, not a
public signup surface.
"""
import base64
import hashlib
import hmac
import os
import secrets
import time

from fastapi import Header, HTTPException

TOKEN_TTL_SECONDS = 7 * 24 * 3600
_PBKDF2_ITERATIONS = 200_000


def _secret() -> bytes:
    configured = os.environ.get("DASHBOARD_SECRET")
    if configured:
        return configured.encode("utf-8")
    from app.db import get_database_url

    return hashlib.sha256(("arq-dashboard::" + get_database_url()).encode("utf-8")).digest()


# ── password hashing ────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, _PBKDF2_ITERATIONS
    )
    return f"{salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        salt_hex, digest_hex = stored.split("$", 1)
    except ValueError:
        return False
    candidate = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        bytes.fromhex(salt_hex),
        _PBKDF2_ITERATIONS,
    )
    return hmac.compare_digest(candidate.hex(), digest_hex)


# Compatibility aliases keep older admin scripts and four-digit accounts valid.
hash_pin = hash_password
verify_pin = verify_password


def dashboard_user_has_tenant_access(cur, email: str, tenant_id: str) -> bool:
    """Owners see all tenants; client users need an explicit matching grant."""
    cur.execute(
        """
        select coalesce(
                 (select all_tenants from dashboard_users where email = %s),
                 false
               ),
               exists(
                 select 1 from dashboard_user_tenants
                 where user_email = %s and tenant_id = %s
               )
        """,
        (email, email, tenant_id),
    )
    all_tenants, has_this_grant = cur.fetchone()
    return all_tenants or has_this_grant


def ensure_dashboard_tenant_access(cur, email: str, tenant_id: str) -> None:
    if not dashboard_user_has_tenant_access(cur, email, tenant_id):
        raise HTTPException(status_code=403, detail="You do not have access to this company")


# ── session tokens ──────────────────────────────────────────────────────

def _sign(payload: bytes) -> str:
    return hmac.new(_secret(), payload, hashlib.sha256).hexdigest()


def issue_token(email: str) -> tuple[str, int]:
    expires_at = int(time.time()) + TOKEN_TTL_SECONDS
    payload = f"{email}|{expires_at}".encode("utf-8")
    body = base64.urlsafe_b64encode(payload).decode("ascii").rstrip("=")
    return f"{body}.{_sign(payload)}", expires_at


def verify_token(token: str) -> str:
    """Returns the email inside a valid token; raises 401 otherwise."""
    try:
        body, signature = token.split(".", 1)
        payload = base64.urlsafe_b64decode(body + "=" * (-len(body) % 4))
        if not hmac.compare_digest(_sign(payload), signature):
            raise ValueError
        email, expires_at = payload.decode("utf-8").rsplit("|", 1)
        if int(expires_at) < time.time():
            raise HTTPException(status_code=401, detail="Session expired — log in again")
        return email
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Not logged in")


def require_dashboard_user(authorization: str = Header(default="")) -> str:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not logged in")
    return verify_token(authorization.removeprefix("Bearer ").strip())
