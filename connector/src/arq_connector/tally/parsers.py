"""XML -> dataclass parsers for Tally responses.

`parse_companies` and `parse_debtor_ledgers` are live-verified against a real
TallyPrime instance (see tests/fixtures/). `parse_bills_receivable` is also
live-verified, but only against a single real bill -- its assumption about
how multiple bills repeat in the response is inferred, not independently
confirmed (see that function's docstring).
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


def parse_bills_receivable(xml_text: str) -> list[BillRecord]:
    """LIVE-VERIFIED against a real TallyPrime "Bills Receivable" export.

    The response shape is flat and unusual: no per-bill wrapper element.
    Instead <BILLFIXED>(date, ref, party)</BILLFIXED> is followed by sibling
    <BILLCL> (pending amount), <BILLDUE> (due date), <BILLOVERDUE> (overdue
    days) elements directly under <ENVELOPE>, e.g.:

        <ENVELOPE>
         <BILLFIXED>
          <BILLDATE>1-Apr-26</BILLDATE>
          <BILLREF>2</BILLREF>
          <BILLPARTY>Alpha Customer</BILLPARTY>
         </BILLFIXED>
         <BILLCL>-508989.00</BILLCL>
         <BILLDUE>1-Apr-26</BILLDUE>
         <BILLOVERDUE>62</BILLOVERDUE>
        </ENVELOPE>

    Confirmed against exactly one real bill. The repeating-group assumption
    for multiple bills (another BILLFIXED + trailing siblings appearing again
    in document order) is inferred, not independently confirmed -- verify
    against a company with 2+ outstanding bills before fully trusting this
    with multiple rows.

    Note pending_amount is returned exactly as Tally sends it (here,
    negative) -- no sign flip is applied since the correct convention wasn't
    independently confirmed. Check this against the Bills Receivable screen
    in Tally directly.
    """
    root = ET.fromstring(xml_text)
    bills = []
    current: dict | None = None

    for el in root:
        if el.tag == "BILLFIXED":
            if current is not None:
                bills.append(current)
            current = {
                "bill_date": (el.findtext("BILLDATE") or "").strip() or None,
                "bill_ref": (el.findtext("BILLREF") or "").strip() or None,
                "party_name": (el.findtext("BILLPARTY") or "").strip() or None,
                "due_date": None,
                "pending_amount": None,
                "overdue_days": None,
            }
        elif current is not None:
            if el.tag == "BILLCL":
                current["pending_amount"] = _decimal(el.text)
            elif el.tag == "BILLDUE":
                current["due_date"] = (el.text or "").strip() or None
            elif el.tag == "BILLOVERDUE":
                current["overdue_days"] = _int(el.text)

    if current is not None:
        bills.append(current)

    return [
        BillRecord(
            party_guid=None,
            party_name=b["party_name"],
            bill_ref=b["bill_ref"],
            bill_date=b["bill_date"],
            due_date=b["due_date"],
            pending_amount=b["pending_amount"],
            overdue_days=b["overdue_days"],
        )
        for b in bills
        if b["party_name"] and b["pending_amount"] is not None
    ]
