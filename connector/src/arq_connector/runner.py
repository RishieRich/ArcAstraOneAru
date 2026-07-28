"""The one sync flow, shared by the GUI's Push button and headless `run`:
doctor check -> pull from Tally -> push to backend.

PII rule: INFO-level logs carry counts/status only, never party names or
amounts (those exist in the payload, not the logs).
"""
import logging
from dataclasses import dataclass

from . import state
from .security import credentials
from .settings import save_settings
from .sync.pusher import PushError, push_snapshot
from .sync.snapshot import SnapshotError, pull_snapshot
from .tally.detect import run_doctor, EXIT_HEALTHY, EXIT_NOT_RUNNING, EXIT_NO_COMPANY
from .tally.launcher import ensure_tally_ready


@dataclass(frozen=True)
class SyncOutcome:
    ok: bool
    message: str
    ledgers: int = 0
    bills: int = 0


def _remember_company(settings: dict, doctor, logger: logging.Logger) -> None:
    """Pin the company by GUID the first time we see it, and follow a rename.

    This is what keeps the client out of the app: once a healthy sync has
    identified the company, its GUID is stored, and every later run matches on
    that GUID even if somebody renames the company inside Tally.
    """
    company = doctor.matched_company
    if company is None:
        return

    changed = {}
    if company.guid and settings.get("company_guid", "") != company.guid:
        changed["company_guid"] = company.guid
    if company.name and settings.get("company_name", "") != company.name:
        changed["company_name"] = company.name
    if not changed:
        return

    settings.update(changed)
    try:
        save_settings(settings)
    except OSError as e:
        # Not fatal: the sync itself already worked, and name matching still
        # covers the next run. Worth a line so support can spot a locked file.
        logger.warning("could not persist company binding: %s", e)
        return
    if "company_guid" in changed:
        logger.info("company binding pinned by GUID")
    if "company_name" in changed:
        logger.info("company name updated from Tally (renamed upstream)")


def run_sync(settings: dict, logger: logging.Logger,
             source: str = "scheduled") -> SyncOutcome:
    outcome = _run_sync(settings, logger)
    state.record_run(
        ok=outcome.ok,
        message=outcome.message,
        ledgers=outcome.ledgers,
        bills=outcome.bills,
        source=source,
    )
    return outcome


def _run_sync(settings: dict, logger: logging.Logger) -> SyncOutcome:
    company = settings.get("company_name", "")
    company_guid = settings.get("company_guid", "")
    if not company and not company_guid:
        return SyncOutcome(ok=False, message="No company configured. Open the app and pick one.")

    token = credentials.load_token()
    if not token:
        return SyncOutcome(ok=False, message="Device not registered. Open the app and register with a pairing code.")

    doctor = run_doctor(
        host=settings["tally_host"],
        port=int(settings["tally_port"]),
        configured_company=company,
        configured_guid=company_guid,
    )
    if doctor.exit_code in (EXIT_NOT_RUNNING, EXIT_NO_COMPANY):
        # Tally closed (or still loading its company) — try to rescue the run
        # by launching Tally and waiting for it, if the setting allows.
        doctor = ensure_tally_ready(settings, doctor, logger)
    if doctor.exit_code != EXIT_HEALTHY:
        logger.warning("sync skipped: doctor exit=%s", doctor.exit_code)
        return SyncOutcome(ok=False, message=doctor.message)

    _remember_company(settings, doctor, logger)

    try:
        snapshot = pull_snapshot(
            host=settings["tally_host"],
            port=int(settings["tally_port"]),
            company_name=settings["company_name"],
            company_guid=settings.get("company_guid", ""),
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
