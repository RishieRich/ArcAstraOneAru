"""Read-only endpoints for the metrics dashboard.

Bills are stored per sync run (append-only), so "current" means the bills from
the most recent run that pushed any — hence the latest_sync_run_id() lookup
rather than a plain select over the whole table.

Amounts are abs()'d here, not in the DB. Tally sends debit balances signed
negative, so a receivable of 5,08,989 lands in bills.pending_amount as
-508989. The tables keep Tally's raw sign; the dashboard reports magnitude,
which is what "outstanding" means to the reader.
"""
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException

from app.dashauth import require_dashboard_user
from app.db import get_connection

router = APIRouter(
    prefix="/v1/dashboard",
    tags=["dashboard"],
    dependencies=[Depends(require_dashboard_user)],
)


def _num(value) -> float:
    return float(value) if isinstance(value, Decimal) else (value or 0)


def _latest_iso(*values: str | None) -> str | None:
    present = [value for value in values if value]
    return max(present) if present else None


def latest_sync_run_id(cur, tenant_id: str) -> str | None:
    cur.execute(
        "select sync_run_id from bills where tenant_id = %s order by id desc limit 1",
        (tenant_id,),
    )
    row = cur.fetchone()
    return row[0] if row else None


def _empty_financials() -> dict:
    return {
        "has_data": False,
        "kinds": [],
        "totals": {
            "sales": 0.0,
            "purchase": 0.0,
            "expense": 0.0,
            "net_flow": 0.0,
            "tax": 0.0,
            "transactions": 0,
        },
        "monthly": [],
        "breakdown": {"sales": [], "purchase": [], "expense": []},
        "counterparties": {"sales": [], "purchase": [], "expense": []},
        "imports": [],
        "date_range": {"from": None, "to": None},
        "last_import_at": None,
    }


def financial_metrics(cur, tenant_id: str) -> dict:
    """Optional uploaded-book metrics; empty when this tenant uses only Tally sync."""
    cur.execute(
        """
        select kind, count(*), coalesce(sum(gross_amount), 0),
               coalesce(sum(net_amount), 0), coalesce(sum(tax_amount), 0),
               min(txn_date), max(txn_date)
        from financial_transactions
        where tenant_id = %s
        group by kind
        """,
        (tenant_id,),
    )
    summaries = cur.fetchall()
    if not summaries:
        return _empty_financials()

    by_kind = {
        kind: {
            "transactions": count,
            "gross": _num(gross),
            "net": _num(net),
            "tax": _num(tax),
            "from": first_date,
            "to": last_date,
        }
        for kind, count, gross, net, tax, first_date, last_date in summaries
    }
    sales = by_kind.get("sales", {}).get("gross", 0.0)
    purchase = by_kind.get("purchase", {}).get("gross", 0.0)
    expense = by_kind.get("expense", {}).get("gross", 0.0)

    cur.execute(
        """
        select to_char(date_trunc('month', txn_date), 'YYYY-MM'), kind,
               coalesce(sum(gross_amount), 0)
        from financial_transactions
        where tenant_id = %s and txn_date is not null
        group by 1, kind
        order by 1
        """,
        (tenant_id,),
    )
    monthly_map: dict[str, dict] = {}
    for month, kind, amount in cur.fetchall():
        point = monthly_map.setdefault(
            month,
            {"month": month, "sales": 0.0, "purchase": 0.0, "expense": 0.0},
        )
        point[kind] = _num(amount)
    monthly = []
    for point in monthly_map.values():
        point["net_flow"] = round(
            point["sales"] - point["purchase"] - point["expense"], 2
        )
        monthly.append(point)

    cur.execute(
        """
        select ft.kind, fl.name, coalesce(sum(fl.amount), 0)
        from financial_transaction_lines fl
        join financial_transactions ft on ft.id = fl.transaction_id
        where ft.tenant_id = %s and fl.line_type in ('item', 'category')
        group by ft.kind, fl.name
        order by ft.kind, 3 desc
        """,
        (tenant_id,),
    )
    breakdown = {"sales": [], "purchase": [], "expense": []}
    for kind, name, amount in cur.fetchall():
        if len(breakdown[kind]) < 7:
            breakdown[kind].append({"name": name, "amount": _num(amount)})

    cur.execute(
        """
        select kind, party_name, coalesce(sum(gross_amount), 0), count(*)
        from financial_transactions
        where tenant_id = %s and party_name is not null and party_name <> ''
        group by kind, party_name
        order by kind, 3 desc
        """,
        (tenant_id,),
    )
    counterparties = {"sales": [], "purchase": [], "expense": []}
    for kind, party, amount, count in cur.fetchall():
        if len(counterparties[kind]) < 6:
            counterparties[kind].append(
                {"party": party, "amount": _num(amount), "transactions": count}
            )

    cur.execute(
        """
        select id, source_filename, detected_kind, classification_confidence,
               transaction_count, min_date, max_date, created_at
        from financial_imports
        where tenant_id = %s
        order by created_at desc
        limit 8
        """,
        (tenant_id,),
    )
    imports = [
        {
            "id": str(import_id),
            "filename": filename,
            "kind": kind,
            "confidence": float(confidence),
            "transactions": count,
            "date_from": min_date.isoformat() if min_date else None,
            "date_to": max_date.isoformat() if max_date else None,
            "created_at": created_at.isoformat(),
        }
        for (
            import_id,
            filename,
            kind,
            confidence,
            count,
            min_date,
            max_date,
            created_at,
        ) in cur.fetchall()
    ]
    first_dates = [summary["from"] for summary in by_kind.values() if summary["from"]]
    last_dates = [summary["to"] for summary in by_kind.values() if summary["to"]]
    return {
        "has_data": True,
        "kinds": [kind for kind in ("sales", "purchase", "expense") if kind in by_kind],
        "totals": {
            "sales": sales,
            "purchase": purchase,
            "expense": expense,
            "net_flow": round(sales - purchase - expense, 2),
            "tax": round(sum(summary["tax"] for summary in by_kind.values()), 2),
            "transactions": sum(summary["transactions"] for summary in by_kind.values()),
        },
        "monthly": monthly,
        "breakdown": breakdown,
        "counterparties": counterparties,
        "imports": imports,
        "date_range": {
            "from": min(first_dates).isoformat() if first_dates else None,
            "to": max(last_dates).isoformat() if last_dates else None,
        },
        "last_import_at": imports[0]["created_at"] if imports else None,
    }


@router.get("/companies")
def companies() -> list[dict]:
    """Every tenant, with enough context for the dashboard's company picker."""
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(
            """
            select t.id, t.name, t.tally_company_guid, t.created_at,
                   (select count(*) from devices d
                     where d.tenant_id = t.id and d.revoked_at is null),
                   (select max(started_at) from sync_runs s where s.tenant_id = t.id),
                   (select count(*) from bills b where b.tenant_id = t.id),
                   (select max(created_at) from financial_imports fi
                     where fi.tenant_id = t.id),
                   exists(select 1 from financial_transactions ft
                     where ft.tenant_id = t.id)
            from tenants t
            order by t.created_at
            """
        )
        return [
            {
                "id": str(tid),
                "name": name,
                "company_guid": guid,
                "created_at": created_at.isoformat() if created_at else None,
                "devices": devices,
                "last_sync_at": last_sync.isoformat() if last_sync else None,
                "has_bills": bill_count > 0,
                "last_import_at": last_import.isoformat() if last_import else None,
                "has_financials": has_financials,
            }
            for (
                tid,
                name,
                guid,
                created_at,
                devices,
                last_sync,
                bill_count,
                last_import,
                has_financials,
            ) in cur.fetchall()
        ]


@router.get("/metrics/{tenant_id}")
def metrics(tenant_id: str) -> dict:
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute("select name from tenants where id = %s", (tenant_id,))
        row = cur.fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="No such company")
        (tenant_name,) = row

        run_id = latest_sync_run_id(cur, tenant_id)

        cur.execute(
            """
            select count(*), coalesce(sum(abs(closing_balance)), 0), max(updated_at)
            from ledgers where tenant_id = %s
            """,
            (tenant_id,),
        )
        ledger_count, ledger_balance, ledgers_updated = cur.fetchone()
        financials = financial_metrics(cur, tenant_id)
        ledger_updated_iso = ledgers_updated.isoformat() if ledgers_updated else None

        empty = {
            "tenant_id": tenant_id,
            "tenant_name": tenant_name,
            "has_data": financials["has_data"],
            "has_receivables_data": False,
            "has_financial_data": financials["has_data"],
            "totals": {
                "outstanding": 0.0, "overdue": 0.0, "not_due": 0.0, "bill_count": 0,
                "party_count": 0, "ledger_count": ledger_count,
                "ledger_balance": _num(ledger_balance),
                "avg_overdue_days": 0, "max_overdue_days": 0,
                "overdue_bill_count": 0, "concentration_pct": 0,
                "top_party": None, "largest_bill": None,
            },
            "aging": [], "top_debtors": [], "bills": [], "due_timeline": [],
            "oldest_bills": [], "alerts": [], "notes": [],
            "financials": financials,
            "last_sync_at": ledger_updated_iso,
            "last_activity_at": _latest_iso(
                ledger_updated_iso, financials["last_import_at"]
            ),
        }
        if run_id is None:
            return empty

        cur.execute(
            """
            select count(*),
                   coalesce(sum(abs(pending_amount)), 0),
                   coalesce(sum(abs(pending_amount)) filter (where coalesce(overdue_days, 0) > 0), 0),
                   count(distinct party_name),
                   count(*) filter (where coalesce(overdue_days, 0) > 0),
                   coalesce(max(coalesce(overdue_days, 0)), 0),
                   coalesce(avg(overdue_days) filter (where coalesce(overdue_days, 0) > 0), 0)
            from bills where tenant_id = %s and sync_run_id = %s
            """,
            (tenant_id, run_id),
        )
        (bill_count, outstanding, overdue, party_count,
         overdue_bill_count, max_overdue, avg_overdue) = cur.fetchone()

        # Aging buckets. Ordered, so the dashboard renders them as an ordinal ramp.
        cur.execute(
            """
            select case
                     when coalesce(overdue_days, 0) <= 0 then 'Not due'
                     when overdue_days <= 30 then '1-30 days'
                     when overdue_days <= 60 then '31-60 days'
                     when overdue_days <= 90 then '61-90 days'
                     else '90+ days'
                   end as bucket,
                   coalesce(sum(abs(pending_amount)), 0), count(*)
            from bills where tenant_id = %s and sync_run_id = %s
            group by bucket
            """,
            (tenant_id, run_id),
        )
        found = {b: (_num(amt), n) for b, amt, n in cur.fetchall()}
        order = ["Not due", "1-30 days", "31-60 days", "61-90 days", "90+ days"]
        aging = [
            {"bucket": b, "amount": found.get(b, (0.0, 0))[0], "bills": found.get(b, (0.0, 0))[1]}
            for b in order
        ]

        cur.execute(
            """
            select party_name,
                   coalesce(sum(abs(pending_amount)), 0),
                   coalesce(max(overdue_days), 0),
                   count(*)
            from bills where tenant_id = %s and sync_run_id = %s
            group by party_name
            order by 2 desc
            limit 8
            """,
            (tenant_id, run_id),
        )
        total_out = _num(outstanding) or 1.0
        top_debtors = [
            {
                "party": p,
                "amount": _num(amt),
                "max_overdue_days": days,
                "bills": n,
                "pct": round(_num(amt) / total_out * 100, 1),
            }
            for p, amt, days, n in cur.fetchall()
        ]

        # Money due per calendar month (past months = should already have come
        # in; future = collection outlook), split by overdue vs on-track.
        cur.execute(
            """
            select to_char(date_trunc('month', due_date), 'YYYY-MM') as ym,
                   coalesce(sum(abs(pending_amount)) filter (where coalesce(overdue_days, 0) > 0), 0),
                   coalesce(sum(abs(pending_amount)) filter (where coalesce(overdue_days, 0) <= 0), 0),
                   count(*)
            from bills
            where tenant_id = %s and sync_run_id = %s and due_date is not null
            group by 1 order by 1
            """,
            (tenant_id, run_id),
        )
        due_timeline = [
            {"month": ym, "overdue": _num(od), "on_track": _num(ok), "bills": n}
            for ym, od, ok, n in cur.fetchall()
        ]

        cur.execute(
            """
            select party_name, bill_ref, due_date, abs(pending_amount), coalesce(overdue_days, 0)
            from bills where tenant_id = %s and sync_run_id = %s and coalesce(overdue_days, 0) > 0
            order by overdue_days desc, abs(pending_amount) desc
            limit 5
            """,
            (tenant_id, run_id),
        )
        oldest_bills = [
            {
                "party": p, "bill_ref": ref,
                "due_date": dd.isoformat() if dd else None,
                "amount": _num(amt), "overdue_days": days,
            }
            for p, ref, dd, amt, days in cur.fetchall()
        ]

        cur.execute(
            """
            select party_name, bill_ref, bill_date, due_date, abs(pending_amount),
                   coalesce(overdue_days, 0)
            from bills where tenant_id = %s and sync_run_id = %s
            order by abs(pending_amount) desc
            """,
            (tenant_id, run_id),
        )
        bills = [
            {
                "party": p,
                "bill_ref": ref,
                "bill_date": bd.isoformat() if bd else None,
                "due_date": dd.isoformat() if dd else None,
                "amount": _num(amt),
                "overdue_days": days,
            }
            for p, ref, bd, dd, amt, days in cur.fetchall()
        ]

        cur.execute(
            "select max(finished_at), max(started_at) from sync_runs where id = %s",
            (run_id,),
        )
        finished, started = cur.fetchone()
        last_sync = finished or started

    largest_bill = bills[0] if bills else None  # bills come back sorted by amount desc
    top_party = top_debtors[0] if top_debtors else None
    concentration_pct = top_party["pct"] if top_party else 0
    overdue_share = _num(overdue) / total_out * 100 if bill_count else 0
    ninety_plus = [b for b in bills if b["overdue_days"] > 90]

    # Language-neutral alert facts; the dashboard renders them in the UI language.
    alerts = []
    if concentration_pct >= 35 and party_count > 1:
        alerts.append({
            "id": "concentration", "severity": "urgent" if concentration_pct >= 50 else "watch",
            "data": {"party": top_party["party"], "pct": concentration_pct,
                     "amount": top_party["amount"]},
        })
    if ninety_plus:
        alerts.append({
            "id": "ninety_plus", "severity": "urgent",
            "data": {"count": len(ninety_plus),
                     "amount": round(sum(b["amount"] for b in ninety_plus), 2),
                     "oldest_days": max(b["overdue_days"] for b in ninety_plus)},
        })
    if overdue_share >= 35 and bill_count > 0:
        alerts.append({
            "id": "overdue_share", "severity": "urgent" if overdue_share >= 60 else "watch",
            "data": {"pct": round(overdue_share), "amount": _num(overdue)},
        })
    if largest_bill and bill_count > 1 and largest_bill["amount"] / total_out >= 0.5:
        alerts.append({
            "id": "big_bill", "severity": "watch",
            "data": {"party": largest_bill["party"], "ref": largest_bill["bill_ref"],
                     "amount": largest_bill["amount"],
                     "pct": round(largest_bill["amount"] / total_out * 100)},
        })

    notes = [
        {"id": "snapshot", "data": {"bills": bill_count, "parties": party_count}},
        {"id": "sign", "data": {}},
        (
            {"id": "scope_extended", "data": {"kinds": financials["kinds"]}}
            if financials["has_data"]
            else {"id": "scope", "data": {}}
        ),
    ]
    last_sync_iso = last_sync.isoformat() if last_sync else None

    return {
        "tenant_id": tenant_id,
        "tenant_name": tenant_name,
        "has_data": bill_count > 0 or financials["has_data"],
        "has_receivables_data": bill_count > 0,
        "has_financial_data": financials["has_data"],
        "totals": {
            "outstanding": _num(outstanding),
            "overdue": _num(overdue),
            "not_due": round(_num(outstanding) - _num(overdue), 2),
            "bill_count": bill_count,
            "party_count": party_count,
            "ledger_count": ledger_count,
            "ledger_balance": _num(ledger_balance),
            "avg_overdue_days": round(_num(avg_overdue)),
            "max_overdue_days": max_overdue,
            "overdue_bill_count": overdue_bill_count,
            "concentration_pct": concentration_pct,
            "top_party": top_party["party"] if top_party else None,
            "largest_bill": largest_bill,
        },
        "aging": aging,
        "top_debtors": top_debtors,
        "bills": bills,
        "due_timeline": due_timeline,
        "oldest_bills": oldest_bills,
        "alerts": alerts,
        "notes": notes,
        "financials": financials,
        "last_sync_at": last_sync_iso,
        "last_activity_at": _latest_iso(last_sync_iso, financials["last_import_at"]),
    }
