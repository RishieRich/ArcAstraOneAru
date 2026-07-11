"""Admin utility for tenant/device management.

Usage (from backend/, with venv active):
  python -m app.admin create-tenant --name "Foo Corp"
  python -m app.admin issue-pairing-code --tenant-id <uuid> [--expires-hours 72]
  python -m app.admin revoke-device --device-id <uuid>
  python -m app.admin list-tenants
"""
import argparse
import secrets
from datetime import datetime, timedelta, timezone

from app.db import get_connection
from app.security import hash_token


def create_tenant(name: str) -> None:
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(
            "insert into tenants (name) values (%s) returning id", (name,)
        )
        (tenant_id,) = cur.fetchone()
        conn.commit()
    print(f"tenant created: id={tenant_id} name={name!r}")


def issue_pairing_code(tenant_id: str, expires_hours: int) -> None:
    raw_code = secrets.token_urlsafe(9)  # short-ish, still high entropy
    expires_at = datetime.now(timezone.utc) + timedelta(hours=expires_hours)
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(
            "insert into pairing_codes (code_hash, tenant_id, expires_at) values (%s, %s, %s)",
            (hash_token(raw_code), tenant_id, expires_at),
        )
        conn.commit()
    print(f"pairing code (shown once): {raw_code}")
    print(f"expires_at: {expires_at.isoformat()}")


def revoke_device(device_id: str) -> None:
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(
            "update devices set revoked_at = now() where id = %s and revoked_at is null",
            (device_id,),
        )
        updated = cur.rowcount
        conn.commit()
    if updated:
        print(f"device {device_id} revoked")
    else:
        print(f"device {device_id} not found or already revoked")


def list_tenants() -> None:
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(
            "select id, name, tally_company_guid, created_at from tenants order by created_at"
        )
        for tenant_id, name, guid, created_at in cur.fetchall():
            print(f"{tenant_id}  {name!r:30s}  guid={guid}  created={created_at}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)

    p = sub.add_parser("create-tenant")
    p.add_argument("--name", required=True)

    p = sub.add_parser("issue-pairing-code")
    p.add_argument("--tenant-id", required=True)
    p.add_argument("--expires-hours", type=int, default=72)

    p = sub.add_parser("revoke-device")
    p.add_argument("--device-id", required=True)

    sub.add_parser("list-tenants")

    args = parser.parse_args()

    if args.command == "create-tenant":
        create_tenant(args.name)
    elif args.command == "issue-pairing-code":
        issue_pairing_code(args.tenant_id, args.expires_hours)
    elif args.command == "revoke-device":
        revoke_device(args.device_id)
    elif args.command == "list-tenants":
        list_tenants()


if __name__ == "__main__":
    main()
