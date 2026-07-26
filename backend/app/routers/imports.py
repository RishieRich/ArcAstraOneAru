"""Authenticated Excel ingestion for optional sales, purchase and expense data."""
from decimal import Decimal
from urllib.parse import unquote
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request

from app.dashauth import ensure_dashboard_tenant_access, require_dashboard_user
from app.db import get_connection
from app.spreadsheet_import import (
    ImportValidationError,
    ParsedWorkbook,
    clean_filename,
    parse_tally_workbook,
)

router = APIRouter(prefix="/v1/imports", tags=["imports"])


@router.post("/financials")
async def upload_financials(
    request: Request,
    tenant_id: UUID = Query(),
    declared_kind: str = Query(),
    encoded_filename: str = Header(alias="X-File-Name"),
    uploaded_by: str = Depends(require_dashboard_user),
) -> dict:
    """Classify one Tally workbook and upsert its vouchers for this tenant."""
    body = await request.body()
    filename = clean_filename(unquote(encoded_filename))
    try:
        parsed = parse_tally_workbook(body, filename, declared_kind)
    except ImportValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    with get_connection() as conn, conn.cursor() as cur:
        cur.execute("select 1 from tenants where id = %s", (str(tenant_id),))
        if cur.fetchone() is None:
            raise HTTPException(status_code=404, detail="No such company")
        ensure_dashboard_tenant_access(cur, uploaded_by, str(tenant_id))
        cur.execute(
            "select pg_advisory_xact_lock(hashtextextended(cast(%s as text), 0))",
            (str(tenant_id),),
        )

        cur.execute(
            """
            insert into financial_imports
                (tenant_id, uploaded_by, source_filename, file_sha256, detected_kind,
                 classification_confidence, classification_reason, transaction_count,
                 line_count, skipped_rows, min_date, max_date)
            values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            on conflict (tenant_id, file_sha256) do nothing
            returning id, created_at
            """,
            (
                str(tenant_id),
                uploaded_by,
                filename,
                parsed.file_sha256,
                parsed.detected_kind,
                Decimal(str(parsed.confidence)),
                parsed.classification_reason,
                len(parsed.transactions),
                parsed.line_count,
                parsed.skipped_rows,
                parsed.min_date,
                parsed.max_date,
            ),
        )
        inserted = cur.fetchone()
        if inserted is None:
            cur.execute(
                """
                select id, detected_kind, classification_confidence, transaction_count,
                       line_count, skipped_rows, min_date, max_date, created_at
                from financial_imports
                where tenant_id = %s and file_sha256 = %s
                """,
                (str(tenant_id), parsed.file_sha256),
            )
            existing = cur.fetchone()
            conn.commit()
            return _existing_response(existing, filename)

        import_id, created_at = inserted
        transaction_rows = [
            (
                str(tenant_id),
                import_id,
                transaction.source_key,
                transaction.source_row,
                transaction.kind,
                transaction.txn_date,
                transaction.voucher_number,
                transaction.voucher_type,
                transaction.party_name,
                transaction.category,
                transaction.gross_amount,
                transaction.net_amount,
                transaction.tax_amount,
            )
            for transaction in parsed.transactions
        ]
        cur.executemany(
            """
            insert into financial_transactions
                (tenant_id, latest_import_id, source_key, source_row, kind, txn_date,
                 voucher_number, voucher_type, party_name, category, gross_amount,
                 net_amount, tax_amount)
            values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            on conflict (tenant_id, kind, source_key) do update set
                latest_import_id = excluded.latest_import_id,
                source_row = excluded.source_row,
                txn_date = excluded.txn_date,
                voucher_number = excluded.voucher_number,
                voucher_type = excluded.voucher_type,
                party_name = excluded.party_name,
                category = excluded.category,
                gross_amount = excluded.gross_amount,
                net_amount = excluded.net_amount,
                tax_amount = excluded.tax_amount,
                updated_at = now()
            """,
            transaction_rows,
        )

        source_keys = [transaction.source_key for transaction in parsed.transactions]
        cur.execute(
            """
            select source_key, id
            from financial_transactions
            where tenant_id = %s and kind = %s and source_key = any(%s)
            """,
            (str(tenant_id), parsed.detected_kind, source_keys),
        )
        transaction_ids = dict(cur.fetchall())
        ids_to_refresh = list(transaction_ids.values())
        cur.execute(
            "delete from financial_transaction_lines where transaction_id = any(%s)",
            (ids_to_refresh,),
        )

        line_rows = [
            (
                str(tenant_id),
                transaction_ids[transaction.source_key],
                line.line_type,
                line.name,
                line.amount,
                line.quantity,
                line.unit,
                line.rate,
            )
            for transaction in parsed.transactions
            for line in transaction.lines
        ]
        if line_rows:
            cur.executemany(
                """
                insert into financial_transaction_lines
                    (tenant_id, transaction_id, line_type, name, amount, quantity, unit, rate)
                values (%s, %s, %s, %s, %s, %s, %s, %s)
                """,
                line_rows,
            )
        conn.commit()

    return _parsed_response(import_id, filename, created_at, parsed)


def _parsed_response(
    import_id: UUID,
    filename: str,
    created_at,
    parsed: ParsedWorkbook,
) -> dict:
    return {
        "import_id": str(import_id),
        "duplicate": False,
        "filename": filename,
        "detected_kind": parsed.detected_kind,
        "confidence": parsed.confidence,
        "classification_reason": parsed.classification_reason,
        "transactions": len(parsed.transactions),
        "lines": parsed.line_count,
        "skipped_rows": parsed.skipped_rows,
        "date_range": {
            "from": parsed.min_date.isoformat() if parsed.min_date else None,
            "to": parsed.max_date.isoformat() if parsed.max_date else None,
        },
        "created_at": created_at.isoformat(),
    }


def _existing_response(row, filename: str) -> dict:
    (
        import_id,
        detected_kind,
        confidence,
        transaction_count,
        line_count,
        skipped_rows,
        min_date,
        max_date,
        created_at,
    ) = row
    return {
        "import_id": str(import_id),
        "duplicate": True,
        "filename": filename,
        "detected_kind": detected_kind,
        "confidence": float(confidence),
        "classification_reason": "This exact workbook was already imported.",
        "transactions": transaction_count,
        "lines": line_count,
        "skipped_rows": skipped_rows,
        "date_range": {
            "from": min_date.isoformat() if min_date else None,
            "to": max_date.isoformat() if max_date else None,
        },
        "created_at": created_at.isoformat(),
    }
