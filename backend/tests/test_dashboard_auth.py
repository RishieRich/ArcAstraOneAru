from app.dashauth import (
    dashboard_user_has_tenant_access,
    hash_password,
    verify_password,
)


class _Cursor:
    def __init__(self, row):
        self.row = row
        self.params = None

    def execute(self, _query, params):
        self.params = params

    def fetchone(self):
        return self.row


def test_password_hash_accepts_strong_passwords_and_legacy_pins():
    password_hash = hash_password("OrangeOrbit!72")
    pin_hash = hash_password("4821")

    assert verify_password("OrangeOrbit!72", password_hash)
    assert not verify_password("OrangeOrbit!73", password_hash)
    assert verify_password("4821", pin_hash)


def test_owner_with_all_tenants_flag_has_company_access():
    cursor = _Cursor((True, False))

    assert dashboard_user_has_tenant_access(cursor, "owner@example.com", "tenant-a")


def test_scoped_user_requires_an_explicit_matching_grant():
    allowed = _Cursor((False, True))
    denied = _Cursor((False, False))

    assert dashboard_user_has_tenant_access(allowed, "client@example.com", "tenant-a")
    assert not dashboard_user_has_tenant_access(
        denied, "client@example.com", "tenant-b"
    )


def test_missing_or_ungranted_user_is_denied_by_default():
    cursor = _Cursor((False, False))

    assert not dashboard_user_has_tenant_access(
        cursor, "missing@example.com", "tenant-a"
    )
