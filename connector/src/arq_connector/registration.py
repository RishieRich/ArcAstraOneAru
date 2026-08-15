"""Local device-registration lifecycle.

Pairing codes are one-time credentials exchanged for a device token. The
connector can forget that token so the operator can pair this PC again, but
only an admin can revoke the old server-side device. Keeping that boundary in
one small module prevents the GUI from promising more than it actually does.
"""
from dataclasses import dataclass

from . import scheduler, state
from .security import credentials
from .settings import save_settings


@dataclass(frozen=True)
class DeregistrationResult:
    warnings: tuple[str, ...] = ()


def deregister_local_device(settings: dict) -> DeregistrationResult:
    """Forget this PC's token and reset state needed for a clean re-pair.

    Credential removal is the decisive operation and happens first. Cleanup
    failures are reported as warnings instead of restoring a token that may no
    longer exist or leaving the operator trapped behind a disabled Register
    button.
    """
    credentials.delete_token()
    warnings: list[str] = []

    settings["company_name"] = ""
    settings["company_guid"] = ""
    try:
        save_settings(settings)
    except OSError as exc:
        warnings.append(f"Could not clear the saved company: {exc}")

    try:
        state.clear_state()
    except OSError as exc:
        warnings.append(f"Could not clear the previous sync status: {exc}")

    try:
        if scheduler.task_exists():
            scheduler.delete_task()
    except (OSError, RuntimeError) as exc:
        warnings.append(f"Could not turn automatic sync off: {exc}")

    return DeregistrationResult(warnings=tuple(warnings))
