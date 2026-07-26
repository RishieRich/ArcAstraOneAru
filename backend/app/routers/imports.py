"""Authenticated Excel ingestion for optional sales, purchase and expense data."""
from decimal import Decimal
from urllib.parse import unquote
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from psycopg.types.json import Jsonb

from app.dashauth import ensure_dashboard_tenant_access, require_dashboard_user
from app.db import get_connection
from app.smart_spreadsheet import SmartWorkbook, parse_smart_workbook
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
    """Classify a familiar finance book or profile every table in an unknown file."""
    body = await request.body()
    filename = clean_filename(unquote(encoded_filename))
    parsed: ParsedWorkbook | None = None
    smart: SmartWorkbook | None = None
    try:
        parsed = parse_tally_workbook(body, filename, declared_kind)
        smart = _supplemental_smart_analysis(body, filename, parsed)
    except ImportValidationError as exc:
        # A manually selected accounting type is a deliberate assertion. Do not
        # silently turn a mismatch into generic analytics. Smart detect, however,
        # is allowed to fall back to a typed multi-sheet profile.
        if declared_kind.strip().casefold() != "auto":
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        try:
            smart = parse_smart_workbook(body, filename)
        except ImportValidationError as smart_exc:
            raise HTTPException(
                status_code=422,
                detail=(
                    f"{exc} Smart detect also stopped safely: {smart_exc}"
                ),
            ) from smart_exc

    with get_connection() as conn, conn.cursor() as cur:
        cur.execute("select 1 from tenants where id = %s", (str(tenant_id),))
        if cur.fetchone() is None:
            raise HTTPException(status_code=404, detail="No such company")
        ensure_dashboard_tenant_access(cur, uploaded_by, str(tenant_id))
        cur.execute(
            "select pg_advisory_xact_lock(hashtextextended(cast(%s as text), 0))",
            (str(tenant_id),),
        )
        smart_response = None
        if smart is not None:
            smart_response = _persist_smart_workbook(
                cur=cur,
                tenant_id=str(tenant_id),
                uploaded_by=uploaded_by,
                parsed=smart,
            )
        if parsed is None:
            conn.commit()
            return smart_response

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
            response = _existing_response(existing, filename, parsed)
            if smart_response:
                response["smart_supplement"] = smart_response["smart"]
            return response

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
            select kind, source_key, id
            from financial_transactions
            where tenant_id = %s and source_key = any(%s)
            """,
            (str(tenant_id), source_keys),
        )
        requested_transactions = {
            (transaction.kind, transaction.source_key)
            for transaction in parsed.transactions
        }
        transaction_ids = {
            (kind, source_key): transaction_id
            for kind, source_key, transaction_id in cur.fetchall()
            if (kind, source_key) in requested_transactions
        }
        ids_to_refresh = list(transaction_ids.values())
        cur.execute(
            "delete from financial_transaction_lines where transaction_id = any(%s)",
            (ids_to_refresh,),
        )

        line_rows = [
            (
                str(tenant_id),
                transaction_ids[(transaction.kind, transaction.source_key)],
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

    response = _parsed_response(import_id, filename, created_at, parsed)
    if smart_response:
        response["smart_supplement"] = smart_response["smart"]
    return response


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
        "source_format": parsed.source_format,
        "column_mapping": parsed.column_mapping,
        "warnings": list(parsed.warnings),
        "possible_duplicate_groups": parsed.possible_duplicate_groups,
        "date_range": {
            "from": parsed.min_date.isoformat() if parsed.min_date else None,
            "to": parsed.max_date.isoformat() if parsed.max_date else None,
        },
        "created_at": created_at.isoformat(),
    }


def _existing_response(row, filename: str, parsed: ParsedWorkbook) -> dict:
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
        "source_format": parsed.source_format,
        "column_mapping": parsed.column_mapping,
        "warnings": list(parsed.warnings),
        "possible_duplicate_groups": parsed.possible_duplicate_groups,
        "date_range": {
            "from": min_date.isoformat() if min_date else None,
            "to": max_date.isoformat() if max_date else None,
        },
        "created_at": created_at.isoformat(),
    }


def _persist_smart_workbook(
    *,
    cur,
    tenant_id: str,
    uploaded_by: str,
    parsed: SmartWorkbook,
) -> dict:
    cur.execute(
        """
        insert into smart_imports
            (tenant_id, uploaded_by, source_filename, file_sha256,
             dataset_count, row_count, duplicate_rows, skipped_sheets, warnings)
        values (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        on conflict (tenant_id, file_sha256) do nothing
        returning id, created_at
        """,
        (
            tenant_id,
            uploaded_by,
            parsed.filename,
            parsed.file_sha256,
            len(parsed.datasets),
            parsed.row_count,
            parsed.duplicate_rows,
            Jsonb(list(parsed.skipped_sheets)),
            Jsonb(list(parsed.warnings)),
        ),
    )
    inserted = cur.fetchone()
    if inserted is None:
        cur.execute(
            """
            select id, created_at
            from smart_imports
            where tenant_id = %s and file_sha256 = %s
            """,
            (tenant_id, parsed.file_sha256),
        )
        import_id, created_at = cur.fetchone()
        return _smart_response(import_id, created_at, parsed, duplicate=True)

    import_id, created_at = inserted
    for sheet_index, dataset in enumerate(parsed.datasets):
        cur.execute(
            """
            insert into smart_datasets
                (tenant_id, import_id, sheet_index, sheet_name, title, domain,
                 confidence, header_row, row_count, duplicate_rows,
                 schema_fingerprint, columns_json, date_columns,
                 dimension_columns, metric_columns, kpis, charts, warnings)
            values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s)
            returning id
            """,
            (
                tenant_id,
                import_id,
                sheet_index,
                dataset.sheet_name,
                dataset.title,
                dataset.domain,
                Decimal(str(dataset.confidence)),
                dataset.header_row,
                dataset.row_count,
                dataset.duplicate_rows,
                dataset.schema_fingerprint,
                Jsonb(list(dataset.columns)),
                Jsonb(list(dataset.date_columns)),
                Jsonb(list(dataset.dimension_columns)),
                Jsonb(list(dataset.metric_columns)),
                Jsonb(list(dataset.kpis)),
                Jsonb(list(dataset.charts)),
                Jsonb(list(dataset.warnings)),
            ),
        )
        (dataset_id,) = cur.fetchone()
        cur.executemany(
            """
            insert into smart_rows
                (tenant_id, dataset_id, source_row, row_fingerprint, values_json)
            values (%s, %s, %s, %s, %s)
            """,
            [
                (
                    tenant_id,
                    dataset_id,
                    row.source_row,
                    row.row_fingerprint,
                    Jsonb(row.values),
                )
                for row in dataset.rows
            ],
        )
    return _smart_response(import_id, created_at, parsed, duplicate=False)


def _supplemental_smart_analysis(
    data: bytes,
    filename: str,
    parsed: ParsedWorkbook,
) -> SmartWorkbook | None:
    """Keep useful extra sheets without re-aggregating the finance table."""
    try:
        profile = parse_smart_workbook(data, filename)
    except ImportValidationError:
        return None
    handled_names = {
        str(value).strip().casefold()
        for key, value in parsed.column_mapping.items()
        if key in {"sheet", "transactions", "ledger_lines", "product_lines"}
        and value
        and str(value).casefold() != "not supplied"
    }
    remaining = tuple(
        dataset
        for dataset in profile.datasets
        if dataset.sheet_name.strip().casefold() not in handled_names
    )
    if not remaining:
        return None
    return SmartWorkbook(
        file_sha256=profile.file_sha256,
        filename=profile.filename,
        datasets=remaining,
        skipped_sheets=profile.skipped_sheets,
        warnings=(
            *profile.warnings,
            "Known finance sheets were normalized separately; Smart Excel profiled only "
            "the additional useful sheets.",
        ),
    )


def _smart_response(
    import_id,
    created_at,
    parsed: SmartWorkbook,
    *,
    duplicate: bool,
) -> dict:
    datasets = [
        {
            "sheet_name": dataset.sheet_name,
            "title": dataset.title,
            "domain": dataset.domain,
            "confidence": dataset.confidence,
            "rows": dataset.row_count,
            "columns": list(dataset.columns),
            "date_columns": list(dataset.date_columns),
            "dimension_columns": list(dataset.dimension_columns),
            "metric_columns": list(dataset.metric_columns),
            "kpis": list(dataset.kpis),
            "charts": list(dataset.charts),
            "warnings": list(dataset.warnings),
            "duplicate_rows": dataset.duplicate_rows,
        }
        for dataset in parsed.datasets
    ]
    confidence = (
        round(sum(dataset.confidence for dataset in parsed.datasets) / len(datasets), 3)
        if datasets
        else 0.0
    )
    return {
        "import_id": str(import_id),
        "duplicate": duplicate,
        "filename": parsed.filename,
        "detected_kind": "smart_data",
        "confidence": confidence,
        "classification_reason": (
            "This exact file was already analyzed."
            if duplicate
            else (
                f"Smart detect found {len(datasets)} useful table(s), inferred typed "
                "measures and dimensions, and kept their accounting meaning explicit."
            )
        ),
        "transactions": parsed.row_count,
        "lines": 0,
        "skipped_rows": 0,
        "source_format": "smart-multi-sheet",
        "column_mapping": {
            "sheets": ", ".join(dataset.sheet_name for dataset in parsed.datasets),
            "mode": "Typed multi-sheet analytics",
        },
        "warnings": [*parsed.warnings, *[
            warning
            for dataset in parsed.datasets
            for warning in dataset.warnings
        ]],
        "possible_duplicate_groups": parsed.duplicate_rows,
        "date_range": {"from": None, "to": None},
        "created_at": created_at.isoformat(),
        "smart": {
            "dataset_count": len(datasets),
            "row_count": parsed.row_count,
            "duplicate_rows": parsed.duplicate_rows,
            "datasets": datasets,
        },
    }
