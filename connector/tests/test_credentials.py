import keyring
import keyring.errors

from arq_connector.security import credentials


class FakeKeyring(keyring.backend.KeyringBackend):
    priority = 1

    def __init__(self):
        self.store: dict[tuple[str, str], str] = {}

    def set_password(self, service, username, password):
        self.store[(service, username)] = password

    def get_password(self, service, username):
        return self.store.get((service, username))

    def delete_password(self, service, username):
        if (service, username) not in self.store:
            raise keyring.errors.PasswordDeleteError("not found")
        del self.store[(service, username)]


def test_save_load_delete_roundtrip(monkeypatch):
    fake = FakeKeyring()
    monkeypatch.setattr(keyring, "get_keyring", lambda: fake)
    keyring.set_keyring(fake)

    assert credentials.load_token() is None
    credentials.save_token("secret-token")
    assert credentials.load_token() == "secret-token"
    credentials.delete_token()
    assert credentials.load_token() is None


def test_delete_when_nothing_stored_is_silent(monkeypatch):
    fake = FakeKeyring()
    keyring.set_keyring(fake)
    credentials.delete_token()  # must not raise
