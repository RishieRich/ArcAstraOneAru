"""Admin utility for tenant/device management.

Usage (from backend/, with venv active):
  python -m app.admin create-tenant --name "Foo Corp"
  python -m app.admin issue-pairing-code --tenant-id <uuid> [--expires-hours 72]
  python -m app.admin revoke-device --device-id <uuid>
  python -m app.admin list-tenants
  python -m app.admin create-dashboard-user --email a@b.com --password "..." [--name "A B"]
  python -m app.admin grant-dashboard-access --email a@b.com --tenant-id <uuid>
  python -m app.admin list-dashboard-users
  python -m app.admin list-trial-waitlist
  python -m app.admin delete-dashboard-user --email a@b.com
"""
import argparse
import re
import secrets
from datetime import datetime, timedelta, timezone

from app.dashauth import hash_password
from app.db import get_connection
from app.routers.auth_dashboard import FREE_TRIAL_CAPACITY
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


def create_dashboard_user(email: str, password: str, name: str | None) -> None:
    email = email.strip().lower()
    if len(password) < 8 and not re.fullmatch(r"\d{4}", password):
        raise SystemExit("Password must be at least 8 characters (legacy PINs are 4 digits)")
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(
            """
            insert into dashboard_users (email, pin_hash, display_name)
            values (%s, %s, %s)
            on conflict (email) do update
              set pin_hash = excluded.pin_hash,
                  display_name = coalesce(excluded.display_name, dashboard_users.display_name)
            """,
            (email, hash_password(password), name),
        )
        conn.commit()
    print(
        f"dashboard user ready: {email} (password set; "
        "new accounts need a company access grant)"
    )


def grant_dashboard_access(email: str, tenant_id: str) -> None:
    email = email.strip().lower()
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(
            """
            insert into dashboard_user_tenants (user_email, tenant_id)
            values (%s, %s)
            on conflict do nothing
            """,
            (email, tenant_id),
        )
        granted = cur.rowcount
        conn.commit()
    print(f"dashboard access ready: email={email} tenant_id={tenant_id} added={granted}")


def list_dashboard_users() -> None:
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(
            """
            select du.email, du.display_name, du.account_type, du.all_tenants,
                   count(dut.tenant_id), du.created_at, du.last_login_at
            from dashboard_users du
            left join dashboard_user_tenants dut on dut.user_email = du.email
            group by du.email, du.display_name, du.account_type, du.all_tenants,
                     du.created_at, du.last_login_at
            order by du.created_at
            """
        )
        for (
            email,
            name,
            account_type,
            all_tenants,
            grants,
            created_at,
            last_login,
        ) in cur.fetchall():
            scope = "all" if all_tenants else f"{grants} grant(s)"
            print(
                f"{email}  {name or '-':24s}  type={account_type:10s}  "
                f"scope={scope:12s}  "
                f"created={created_at}  last_login={last_login}"
            )


def list_trial_waitlist() -> None:
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(
            "select count(*) from dashboard_users where account_type = 'free_trial'"
        )
        (active_trials,) = cur.fetchone()
        cur.execute("select count(*) from trial_waitlist where status = 'waiting'")
        (waiting_leads,) = cur.fetchone()
        cur.execute(
            """
            select full_name, company_name, email, status, created_at, updated_at
            from trial_waitlist
            order by created_at
            """
        )
        rows = cur.fetchall()
    print(
        f"private trial stats: active={active_trials}/{FREE_TRIAL_CAPACITY} "
        f"waiting={waiting_leads}"
    )
    if not rows:
        print("trial waitlist is empty")
        return
    for position, (name, company, email, status, created_at, updated_at) in enumerate(
        rows,
        start=1,
    ):
        print(
            f"{position:3d}  {email:34s}  {name:24s}  {company:28s}  "
            f"status={status:9s}  joined={created_at}  updated={updated_at}"
        )


def delete_dashboard_user(email: str) -> None:
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute("delete from dashboard_users where email = %s", (email.strip().lower(),))
        deleted = cur.rowcount
        conn.commit()
    print(f"deleted {deleted} user(s)")


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

    p = sub.add_parser("create-dashboard-user")
    p.add_argument("--email", required=True)
    credentials = p.add_mutually_exclusive_group(required=True)
    credentials.add_argument("--password")
    credentials.add_argument("--pin")
    p.add_argument("--name", default=None)

    p = sub.add_parser("grant-dashboard-access")
    p.add_argument("--email", required=True)
    p.add_argument("--tenant-id", required=True)

    sub.add_parser("list-dashboard-users")
    sub.add_parser("list-trial-waitlist")

    p = sub.add_parser("delete-dashboard-user")
    p.add_argument("--email", required=True)

    args = parser.parse_args()

    if args.command == "create-tenant":
        create_tenant(args.name)
    elif args.command == "issue-pairing-code":
        issue_pairing_code(args.tenant_id, args.expires_hours)
    elif args.command == "revoke-device":
        revoke_device(args.device_id)
    elif args.command == "list-tenants":
        list_tenants()
    elif args.command == "create-dashboard-user":
        create_dashboard_user(args.email, args.password or args.pin, args.name)
    elif args.command == "grant-dashboard-access":
        grant_dashboard_access(args.email, args.tenant_id)
    elif args.command == "list-dashboard-users":
        list_dashboard_users()
    elif args.command == "list-trial-waitlist":
        list_trial_waitlist()
    elif args.command == "delete-dashboard-user":
        delete_dashboard_user(args.email)


if __name__ == "__main__":
    main()
