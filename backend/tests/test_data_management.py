from contextlib import contextmanager

import pytest
from fastapi import HTTPException

from app.dashauth import hash_password
from app.routers import data_management
from app.routers.data_management import CleanupRequest


class FakeCursor:
    def __init__(self, password: str = "OrangeOrbit!72"):
        self.password_hash = hash_password(password)
        self.queries = []
        self.rowcount = 0
        self._result = None

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def execute(self, query, params):
        normalized = " ".join(query.split()).lower()
        self.queries.append((normalized, params))
        if "select t.name, du.pin_hash" in normalized:
            self._result = ("Pawan Engineering", self.password_hash)
        elif "select coalesce(" in normalized:
            self._result = (False, True)
        elif normalized.startswith("delete from"):
            self.rowcount = 1
            self._result = None
        else:
            self._result = None

    def fetchone(self):
        return self._result


class FakeConnection:
    def __init__(self, cursor):
        self._cursor = cursor
        self.committed = False

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def cursor(self):
        return self._cursor

    def commit(self):
        self.committed = True


@contextmanager
def fake_connection(cursor):
    connection = FakeConnection(cursor)
    yield connection


def test_cleanup_requires_exact_company_name(monkeypatch):
    cursor = FakeCursor()
    monkeypatch.setattr(
        data_management,
        "get_connection",
        lambda: fake_connection(cursor),
    )

    with pytest.raises(HTTPException) as error:
        data_management.cleanup_company_data(
            "tenant-1",
            CleanupRequest(company_name="pawan engineering", password="OrangeOrbit!72"),
            "owner@example.com",
        )

    assert error.value.status_code == 400
    assert not any(query.startswith("delete from") for query, _ in cursor.queries)


def test_cleanup_requires_current_password(monkeypatch):
    cursor = FakeCursor()
    monkeypatch.setattr(
        data_management,
        "get_connection",
        lambda: fake_connection(cursor),
    )

    with pytest.raises(HTTPException) as error:
        data_management.cleanup_company_data(
            "tenant-1",
            CleanupRequest(company_name="Pawan Engineering", password="wrong-password"),
            "owner@example.com",
        )

    assert error.value.status_code == 403
    assert not any(query.startswith("delete from") for query, _ in cursor.queries)


def test_cleanup_deletes_facts_but_not_company_or_access(monkeypatch):
    cursor = FakeCursor()
    connection = FakeConnection(cursor)

    @contextmanager
    def connection_factory():
        yield connection

    monkeypatch.setattr(data_management, "get_connection", connection_factory)

    response = data_management.cleanup_company_data(
        "tenant-1",
        CleanupRequest(
            company_name="Pawan Engineering",
            password="OrangeOrbit!72",
        ),
        "owner@example.com",
    )

    delete_queries = [query for query, _ in cursor.queries if query.startswith("delete from")]
    assert response["status"] == "cleared"
    assert response["preserved"] == ["tenant", "dashboard_access", "devices"]
    assert connection.committed
    assert delete_queries == [
        "delete from financial_transaction_lines where tenant_id = %s",
        "delete from financial_transactions where tenant_id = %s",
        "delete from financial_imports where tenant_id = %s",
        "delete from bills where tenant_id = %s",
        "delete from ledgers where tenant_id = %s",
        "delete from sync_runs where tenant_id = %s",
    ]
