"""XML -> dataclass parsers for Tally responses.

WARNING: field/tag names here follow the plan doc's documented skeletons but
have NOT been checked against a real Tally response (no live gateway was
available while this was written). Per the plan's rule 3 in section 10:
"Never invent Tally field names. When a parser fails, dump raw XML to a
debug file and inspect." Before relying on this in production:
  1. Run `arq-connector pull` against live Tally.
  2. Dump the raw XML into tests/fixtures/ (client.py already gives you the
     decoded, control-char-stripped text).
  3. Compare actual tag names to the ones referenced below and fix any
     mismatches.
`parse_bills_receivable` is the least certain of the three: the plan's XML
skeleton for it is a full report export with no FETCH field list, so the tag
names it looks for are best-effort guesses, not confirmed values.
"""
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from xml.etree import ElementTree as ET


@dataclass(frozen=True)
class CompanyRef:
    name: str
    guid: str | None
    starting_from: str | None


@dataclass(frozen=True)
class LedgerRecord:
    tally_guid: str
    name: str
    parent_group: str | None
    closing_balance: Decimal | None
    alter_id: int | None


@dataclass(frozen=True)
class BillRecord:
    party_guid: str | None
    party_name: str
    bill_ref: str | None
    bill_date: str | None
    due_date: str | None
    pending_amount: Decimal
    overdue_days: int | None


def _text(el: ET.Element, tag: str) -> str | None:
    child = el.find(tag)
    if child is None or child.text is None:
        return None
    value = child.text.strip()
    return value or None


def _decimal(value: str | None) -> Decimal | None:
    if value is None:
        return None
    cleaned = value.replace(",", "").strip()
    if not cleaned:
        return None
    try:
        return Decimal(cleaned)
    except InvalidOperation:
        return None


def _int(value: str | None) -> int | None:
    if value is None:
        return None
    try:
        return int(Decimal(value.strip()))
    except (InvalidOperation, ValueError):
        return None


def parse_companies(xml_text: str) -> list[CompanyRef]:
    root = ET.fromstring(xml_text)
    # NOTE: <CMPINFO><COMPANY>0</COMPANY></CMPINFO> is a summary *count*, not a
    # record — real company records live under <DATA><COLLECTION>. Scope the
    # search to DATA to avoid matching the CMPINFO count element by tag name.
    data_el = root.find(".//DATA")
    search_root = data_el if data_el is not None else root
    companies = []
    for el in search_root.iter("COMPANY"):
        name = _text(el, "NAME") or el.get("NAME") or ""
        if not name and el.text and el.text.strip().isdigit():
            continue  # not a record, just a numeric summary field
        companies.append(
            CompanyRef(
                name=name,
                guid=_text(el, "GUID"),
                starting_from=_text(el, "STARTINGFROM"),
            )
        )
    return companies


def parse_debtor_ledgers(xml_text: str) -> list[LedgerRecord]:
    root = ET.fromstring(xml_text)
    ledgers = []
    for el in root.iter("LEDGER"):
        name = _text(el, "NAME") or el.get("NAME") or ""
        guid = _text(el, "GUID")
        if not guid:
            continue
        ledgers.append(
            LedgerRecord(
                tally_guid=guid,
                name=name,
                parent_group=_text(el, "PARENT"),
                closing_balance=_decimal(_text(el, "CLOSINGBALANCE")),
                alter_id=_int(_text(el, "ALTERID")),
            )
        )
    return ledgers


_BILL_ELEMENT_CANDIDATES = ("BILLDETAILS", "BILL", "BILLALLOCATIONS.LIST")


def parse_bills_receivable(xml_text: str) -> list[BillRecord]:
    """Best-effort parse — see module docstring. Validate against a live fixture."""
    root = ET.fromstring(xml_text)
    bills = []
    for tag in _BILL_ELEMENT_CANDIDATES:
        for el in root.iter(tag):
            party_name = (
                _text(el, "PARTYNAME") or _text(el, "BILLPARTYNAME") or _text(el, "NAME")
            )
            pending = _decimal(
                _text(el, "PENDINGAMOUNT") or _text(el, "CLOSINGBALANCE") or _text(el, "AMOUNT")
            )
            if not party_name or pending is None:
                continue
            bills.append(
                BillRecord(
                    party_guid=_text(el, "PARTYGUID") or _text(el, "GUID"),
                    party_name=party_name,
                    bill_ref=_text(el, "BILLREF") or _text(el, "NAME"),
                    bill_date=_text(el, "BILLDATE") or _text(el, "DATE"),
                    due_date=_text(el, "DUEDATE") or _text(el, "BILLDUEDATE"),
                    pending_amount=pending,
                    overdue_days=_int(_text(el, "OVERDUEDAYS")),
                )
            )
        if bills:
            break
    return bills
