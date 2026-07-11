"""Device token storage in Windows Credential Manager via keyring.

The raw token is returned exactly once by /v1/devices/register. It must never
touch a file, a log line, or the settings JSON — Credential Manager only.
"""
import keyring

SERVICE_NAME = "arq-connector"
USERNAME = "device-token"


def save_token(token: str) -> None:
    keyring.set_password(SERVICE_NAME, USERNAME, token)


def load_token() -> str | None:
    return keyring.get_password(SERVICE_NAME, USERNAME)


def delete_token() -> None:
    try:
        keyring.delete_password(SERVICE_NAME, USERNAME)
    except keyring.errors.PasswordDeleteError:
        pass  # nothing stored — already the desired state
