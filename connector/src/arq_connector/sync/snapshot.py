import json
from dataclasses import asdict
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path

from .. import __version__
from ..tally.client import TallyClient
from ..tally.detect import run_doctor, EXIT_HEALTHY
from ..tally.envelopes import bills_receivable, debtor_ledgers
from ..tally.parsers import parse_bills_receivable, parse_debtor_ledgers


class SnapshotError(Exception):
    pass


def _json_default(obj):
    if isinstance(obj, Decimal):
        return str(obj)
    if isinstance(obj, date):
        return obj.isoformat()
    raise TypeError(f"Not JSON serializable: {type(obj)}")


def pull_snapshot(host: str, port: int, company_name: str) -> dict:
    """Local-only pull: no cloud calls. Raises SnapshotError if Tally isn't healthy."""
    doctor = run_doctor(host=host, port=port, configured_company=company_name)
    if doctor.exit_code != EXIT_HEALTHY:
        raise SnapshotError(doctor.message)

    client = TallyClient(host=host, port=port)

    ledgers_xml = client.post_envelope(debtor_ledgers(company_name))
    ledgers = parse_debtor_ledgers(ledgers_xml)

    bills_xml = client.post_envelope(bills_receivable(company_name))
    bills = parse_bills_receivable(bills_xml)

    return {
        "company": {
            "name": doctor.matched_company.name,
            "guid": doctor.matched_company.guid,
        },
        "ledgers": [asdict(l) for l in ledgers],
        "bills": [asdict(b) for b in bills],
        "pulled_at": datetime.now().isoformat(),
        "connector_version": __version__,
    }


def write_snapshot(snapshot: dict, out_path: Path) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(snapshot, f, indent=2, ensure_ascii=False, default=_json_default)
