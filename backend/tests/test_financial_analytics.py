from datetime import date
from decimal import Decimal

from app.routers.dashboard import build_monthly_financials, financial_highlights


def test_monthly_financials_cover_the_complete_period_and_calculate_result():
    rows = [
        ("2025-04", "sales", Decimal("1000")),
        ("2025-04", "purchase", Decimal("400")),
        ("2025-04", "expense", Decimal("100")),
        ("2025-06", "sales", Decimal("300")),
        ("2025-06", "purchase", Decimal("500")),
        ("2025-06", "expense", Decimal("50")),
    ]

    monthly = build_monthly_financials(
        rows,
        date(2025, 4, 1),
        date(2025, 6, 30),
    )

    assert [point["month"] for point in monthly] == [
        "2025-04",
        "2025-05",
        "2025-06",
    ]
    assert monthly[0]["net_result"] == 500
    assert monthly[0]["profit"] == 500
    assert monthly[0]["loss"] == 0
    assert monthly[1]["sales"] == 0
    assert monthly[2]["net_result"] == -250
    assert monthly[2]["profit"] == 0
    assert monthly[2]["loss"] == 250


def test_financial_highlights_ignore_empty_months_for_low_activity_metrics():
    monthly = build_monthly_financials(
        [
            ("2025-04", "sales", Decimal("1000")),
            ("2025-04", "purchase", Decimal("300")),
            ("2025-05", "sales", Decimal("500")),
            ("2025-05", "purchase", Decimal("900")),
        ],
        date(2025, 4, 1),
        date(2025, 6, 30),
    )

    highlights = financial_highlights(monthly)

    assert highlights["highest_sales"] == {"month": "2025-04", "amount": 1000}
    assert highlights["lowest_sales"] == {"month": "2025-05", "amount": 500}
    assert highlights["highest_profit"] == {"month": "2025-04", "amount": 700}
    assert highlights["highest_loss"] == {"month": "2025-05", "amount": 400}
    assert highlights["weakest_result"] == {"month": "2025-05", "amount": -400}
