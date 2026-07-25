from datetime import date
from io import BytesIO
from uuid import uuid4

import pytest
from openpyxl import Workbook

from app.spreadsheet_import import ImportValidationError, parse_tally_workbook


def _tally_workbook(kind: str) -> bytes:
    workbook = Workbook()
    vouchers = workbook.active
    vouchers.title = "Vouchers"
    vouchers.append(
        [
            "VoucherSeq",
            "VCHTYPE",
            "DATE",
            "GUID",
            "PARTYNAME",
            "VOUCHERNUMBER",
        ]
    )
    voucher_type = {"sales": "Sales", "purchase": "Purchase", "expense": "Journal"}[kind]
    vouchers.append([1, voucher_type, date(2026, 4, 5), f"{kind}-guid", "Test Party", "1"])

    ledgers = workbook.create_sheet("Ledger Entries")
    ledgers.append(
        [
            "VoucherSeq",
            "VoucherNumber",
            "VoucherType",
            "Date",
            "Party",
            "GUID",
            "LEDGERNAME",
            "ISDEEMEDPOSITIVE",
            "ISPARTYLEDGER",
            "AMOUNT",
        ]
    )
    if kind == "sales":
        rows = [
            [1, "1", voucher_type, date(2026, 4, 5), "Test Party", f"{kind}-guid",
             "Test Party", "Yes", "Yes", -118],
            [1, "1", voucher_type, date(2026, 4, 5), "Test Party", f"{kind}-guid",
             "Sales Ledger", "No", "No", 100],
            [1, "1", voucher_type, date(2026, 4, 5), "Test Party", f"{kind}-guid",
             "IGST", "No", "No", 18],
        ]
    else:
        category = "Purchase Ledger" if kind == "purchase" else "Repairs"
        rows = [
            [1, "1", voucher_type, date(2026, 4, 5), "Test Party", f"{kind}-guid",
             "Test Party", "No", "Yes", 118],
            [1, "1", voucher_type, date(2026, 4, 5), "Test Party", f"{kind}-guid",
             category, "Yes", "No", -100],
            [1, "1", voucher_type, date(2026, 4, 5), "Test Party", f"{kind}-guid",
             "IGST", "Yes", "No", -18],
        ]
    for row in rows:
        ledgers.append(row)

    if kind in {"sales", "purchase"}:
        inventory = workbook.create_sheet("Inventory Entries")
        inventory.append(
            [
                "VoucherSeq",
                "VoucherNumber",
                "VoucherType",
                "Date",
                "Party",
                "GUID",
                "STOCKITEMNAME",
                "RATE",
                "AMOUNT",
                "ACTUALQTY",
                "BILLEDQTY",
            ]
        )
        inventory.append(
            [
                1,
                "1",
                voucher_type,
                date(2026, 4, 5),
                "Test Party",
                f"{kind}-guid",
                "Widget",
                50,
                100 if kind == "sales" else -100,
                "2 Nos",
                "2 Nos",
            ]
        )

    output = BytesIO()
    workbook.save(output)
    workbook.close()
    return output.getvalue()


@pytest.mark.parametrize("kind", ["sales", "purchase", "expense"])
def test_tally_workbook_is_classified_and_normalized(kind):
    result = parse_tally_workbook(_tally_workbook(kind), f"{kind}.xlsx", kind)

    assert result.detected_kind == kind
    assert result.min_date == date(2026, 4, 5)
    assert len(result.transactions) == 1
    transaction = result.transactions[0]
    assert transaction.source_key == f"guid:{kind}-guid"
    assert transaction.gross_amount == 118
    assert transaction.net_amount == 100
    assert transaction.tax_amount == 18
    assert transaction.category in {"Widget", "Repairs"}
    assert {line.line_type for line in transaction.lines} >= {"tax"}


def test_declared_type_mismatch_is_rejected_before_database_write():
    with pytest.raises(ImportValidationError, match="looks like sales"):
        parse_tally_workbook(_tally_workbook("sales"), "sales.xlsx", "purchase")


def test_legacy_xls_is_rejected_with_export_guidance():
    with pytest.raises(ImportValidationError, match=r"\.xlsx"):
        parse_tally_workbook(b"not a workbook", "sales.xls", "sales")


def test_financial_import_endpoint_requires_dashboard_login(client):
    response = client.post(
        f"/v1/imports/financials?tenant_id={uuid4()}&declared_kind=sales",
        headers={"X-File-Name": "sales.xlsx"},
        content=b"not sent without auth",
    )
    assert response.status_code == 401
