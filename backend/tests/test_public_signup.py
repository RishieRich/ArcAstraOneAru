from contextlib import contextmanager
from datetime import datetime, timezone
from uuid import uuid4

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app.routers import auth_dashboard
from app.routers.auth_dashboard import SignupRequest


class _SignupCursor:
    def __init__(self, *, active_trials: int, existing_account: bool = False):
        self.active_trials = active_trials
        self.existing_account = existing_account
        self.query = ""
        self.params = None
        self.tenant_id = uuid4()
        self.waitlist_created_at = datetime.now(timezone.utc)
        self.executed = []

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def execute(self, query, params=None):
        self.query = " ".join(query.split())
        self.params = params
        self.executed.append((self.query, params))

    def fetchone(self):
        if "from dashboard_users where email" in self.query:
            return (1,) if self.existing_account else None
        if "count(*) from dashboard_users" in self.query:
            return (self.active_trials,)
        if "insert into tenants" in self.query:
            return (self.tenant_id,)
        if "returning created_at" in self.query:
            return (self.waitlist_created_at,)
        if "from trial_waitlist" in self.query:
            return (4,)
        raise AssertionError(f"Unexpected fetch after query: {self.query}")


class _SignupConnection:
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


def _payload() -> SignupRequest:
    return SignupRequest(
        full_name="Asha Shah",
        company_name="Asha Foods",
        email="ASHA@example.com",
        password="MangoTree72",
    )


def test_public_signup_requires_a_letter_and_number_in_password():
    with pytest.raises(ValidationError, match="letter and one number"):
        SignupRequest(
            full_name="Asha Shah",
            company_name="Asha Foods",
            email="asha@example.com",
            password="onlyletters",
        )


def test_first_ten_signup_gets_an_isolated_trial_tenant(monkeypatch):
    cursor = _SignupCursor(active_trials=9)
    connection = _SignupConnection(cursor)

    @contextmanager
    def connection_factory():
        yield connection

    monkeypatch.setattr(auth_dashboard, "get_connection", connection_factory)
    monkeypatch.setattr(
        auth_dashboard,
        "issue_token",
        lambda email: (f"token-for-{email}", 1_800_000_000),
    )

    response = auth_dashboard.signup(_payload())

    assert response.status == "active"
    assert response.account_type == "free_trial"
    assert response.token == "token-for-asha@example.com"
    assert connection.committed
    statements = "\n".join(query for query, _ in cursor.executed)
    assert "insert into tenants" in statements
    assert "account_type" in statements
    assert "insert into dashboard_user_tenants" in statements
    assert "insert into trial_waitlist" not in statements


def test_eleventh_signup_is_waitlisted_without_persisting_password(monkeypatch):
    cursor = _SignupCursor(active_trials=10)
    connection = _SignupConnection(cursor)

    @contextmanager
    def connection_factory():
        yield connection

    monkeypatch.setattr(auth_dashboard, "get_connection", connection_factory)

    response = auth_dashboard.signup(_payload())

    assert response.status == "waitlisted"
    assert response.waitlist_position == 4
    assert response.token is None
    assert connection.committed
    waitlist_statement = next(
        item for item in cursor.executed if "insert into trial_waitlist" in item[0]
    )
    assert waitlist_statement[1] == (
        "Asha Shah",
        "Asha Foods",
        "asha@example.com",
    )
    assert "MangoTree72" not in repr(cursor.executed)


def test_existing_dashboard_email_cannot_create_a_second_tenant(monkeypatch):
    cursor = _SignupCursor(active_trials=2, existing_account=True)
    connection = _SignupConnection(cursor)

    @contextmanager
    def connection_factory():
        yield connection

    monkeypatch.setattr(auth_dashboard, "get_connection", connection_factory)

    with pytest.raises(HTTPException) as error:
        auth_dashboard.signup(_payload())

    assert error.value.status_code == 409
    assert not any("insert into tenants" in query for query, _ in cursor.executed)
