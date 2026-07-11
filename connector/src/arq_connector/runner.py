"""The one sync flow, shared by the GUI's Push button and headless `run`:
doctor check -> pull from Tally -> push to backend.

PII rule: INFO-level logs carry counts/status only, never party names or
amounts (those exist in the payload, not the logs).
"""
import logging
from dataclasses import dataclass

from .security import credentials
from .sync.pusher import PushError, push_snapshot
from .sync.snapshot import SnapshotError, pull_snapshot
from .tally.detect import run_doctor, EXIT_HEALTHY


@dataclass(frozen=True)
class SyncOutcome:
    ok: bool
    message: str
    ledgers: int = 0
    bills: int = 0


def run_sync(settings: dict, logger: logging.Logger) -> SyncOutcome:
    company = settings.get("company_name", "")
    if not company:
        return SyncOutcome(ok=False, message="No company configured. Open the app and pick one.")

    token = credentials.load_token()
    if not token:
        return SyncOutcome(ok=False, message="Device not registered. Open the app and register with a pairing code.")

    doctor = run_doctor(
        host=settings["tally_host"],
        port=int(settings["tally_port"]),
        configured_company=company,
    )
    if doctor.exit_code != EXIT_HEALTHY:
        logger.warning("sync skipped: doctor exit=%s", doctor.exit_code)
        return SyncOutcome(ok=False, message=doctor.message)

    try:
        snapshot = pull_snapshot(
            host=settings["tally_host"],
            port=int(settings["tally_port"]),
            company_name=company,
        )
    except SnapshotError as e:
        logger.error("sync failed during pull: %s", e)
        return SyncOutcome(ok=False, message=f"Could not pull from Tally: {e}")

    try:
        result = push_snapshot(settings["api_base_url"], token, snapshot)
    except PushError as e:
        logger.error("sync failed during push: %s", e)
        return SyncOutcome(ok=False, message=str(e))

    counts = result.get("counts", {})
    ledgers, bills = counts.get("ledgers", 0), counts.get("bills", 0)
    logger.info("sync ok: ledgers=%s bills=%s run_id=%s", ledgers, bills, result.get("sync_run_id"))
    return SyncOutcome(ok=True, message=f"Pushed {ledgers} ledgers, {bills} bills", ledgers=ledgers, bills=bills)
