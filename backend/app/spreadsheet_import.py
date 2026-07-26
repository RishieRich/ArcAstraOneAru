"""Turn Tally-style Excel exports into a small, auditable finance model.

The importer deliberately uses workbook structure and voucher semantics rather
than asking an LLM to guess from customer data. That keeps uploads deterministic,
keeps party names and amounts on our server, and makes a wrong classification a
validation error instead of a silent database write.
"""
from __future__ import annotations

import hashlib
import re
import zipfile
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from io import BytesIO
from pathlib import PurePath
from typing import Iterable

from openpyxl import load_workbook
from openpyxl.utils.datetime import from_excel

MAX_UPLOAD_BYTES = 5 * 1024 * 1024
MAX_UNCOMPRESSED_BYTES = 100 * 1024 * 1024
MAX_ZIP_MEMBERS = 600
MAX_SHEET_ROWS = 100_000
MAX_SHEET_COLUMNS = 400
ALLOWED_KINDS = {"sales", "purchase", "expense"}

_NUMBER = re.compile(r"-?\d+(?:\.\d+)?")
_TAX_LEDGER = re.compile(r"(^|[^A-Z])(I?GST|CGST|SGST|UTGST|CESS|TAX)([^A-Z]|$)", re.I)
_ROUNDING_LEDGER = re.compile(r"round(?:ing)?[\s._-]*off", re.I)


class ImportValidationError(ValueError):
    """A safe, user-fixable workbook error."""


@dataclass(frozen=True)
class ParsedLine:
    line_type: str
    name: str
    amount: Decimal
    quantity: Decimal | None = None
    unit: str | None = None
    rate: Decimal | None = None


@dataclass(frozen=True)
class ParsedTransaction:
    source_key: str
    source_row: int
    kind: str
    txn_date: date | None
    voucher_number: str | None
    voucher_type: str | None
    party_name: str | None
    category: str | None
    gross_amount: Decimal
    net_amount: Decimal
    tax_amount: Decimal
    lines: tuple[ParsedLine, ...]


@dataclass(frozen=True)
class ParsedWorkbook:
    file_sha256: str
    detected_kind: str
    confidence: float
    classification_reason: str
    transactions: tuple[ParsedTransaction, ...]
    skipped_rows: int
    min_date: date | None
    max_date: date | None

    @property
    def line_count(self) -> int:
        return sum(len(transaction.lines) for transaction in self.transactions)


def clean_filename(value: str) -> str:
    """Keep a display-only basename; never trust a browser-provided path."""
    name = PurePath(value.replace("\\", "/")).name
    name = "".join(ch for ch in name if ch.isprintable() and ch not in "\r\n\t").strip()
    return (name or "upload.xlsx")[:180]


def parse_tally_workbook(
    data: bytes,
    filename: str,
    declared_kind: str | None = None,
) -> ParsedWorkbook:
    declared = _normalize_kind(declared_kind)
    safe_filename = clean_filename(filename)
    if not safe_filename.lower().endswith(".xlsx"):
        raise ImportValidationError(
            "Please export or save the file as .xlsx. Legacy .xls files are not supported."
        )
    if not data:
        raise ImportValidationError("The selected workbook is empty.")
    if len(data) > MAX_UPLOAD_BYTES:
        raise ImportValidationError("The workbook is larger than the 5 MB upload limit.")

    _validate_xlsx_container(data)
    file_sha256 = hashlib.sha256(data).hexdigest()

    try:
        workbook = load_workbook(
            BytesIO(data),
            read_only=True,
            data_only=True,
            keep_links=False,
        )
    except Exception as exc:
        raise ImportValidationError(
            "This file could not be read as an Excel workbook. Re-export it from Tally as .xlsx."
        ) from exc

    try:
        vouchers_sheet = _find_sheet(workbook, "vouchers")
        ledgers_sheet = _find_sheet(workbook, "ledgerentries")
        inventory_sheet = _find_sheet(workbook, "inventoryentries")
        if ledgers_sheet is None:
            raise ImportValidationError(
                "No 'Ledger Entries' sheet was found. Export voucher details from Tally with "
                "ledger entries included."
            )

        vouchers = _records(vouchers_sheet) if vouchers_sheet is not None else []
        ledgers = _records(ledgers_sheet)
        inventory = _records(inventory_sheet) if inventory_sheet is not None else []

        detected_kind, confidence, reason = _classify(
            safe_filename,
            vouchers,
            ledgers,
            declared,
        )
        transactions, skipped_rows = _build_transactions(
            detected_kind,
            vouchers,
            ledgers,
            inventory,
        )
    finally:
        workbook.close()

    if not transactions:
        raise ImportValidationError(
            "The workbook has no usable voucher amounts. Include party and amount fields in "
            "the Tally export, then try again."
        )

    dated = [transaction.txn_date for transaction in transactions if transaction.txn_date]
    return ParsedWorkbook(
        file_sha256=file_sha256,
        detected_kind=detected_kind,
        confidence=confidence,
        classification_reason=reason,
        transactions=tuple(transactions),
        skipped_rows=skipped_rows,
        min_date=min(dated) if dated else None,
        max_date=max(dated) if dated else None,
    )


def _validate_xlsx_container(data: bytes) -> None:
    try:
        with zipfile.ZipFile(BytesIO(data)) as archive:
            members = archive.infolist()
            if len(members) > MAX_ZIP_MEMBERS:
                raise ImportValidationError("The workbook contains too many internal files.")
            if sum(member.file_size for member in members) > MAX_UNCOMPRESSED_BYTES:
                raise ImportValidationError(
                    "The expanded workbook is too large to process safely."
                )
            names = {member.filename for member in members}
            if "[Content_Types].xml" not in names or "xl/workbook.xml" not in names:
                raise ImportValidationError("The selected file is not a valid .xlsx workbook.")
    except ImportValidationError:
        raise
    except (zipfile.BadZipFile, OSError) as exc:
        raise ImportValidationError("The selected file is not a valid .xlsx workbook.") from exc


def _find_sheet(workbook, normalized_name: str):
    for sheet in workbook.worksheets:
        if _header_key(sheet.title) == normalized_name.upper():
            return sheet
    return None


def _records(sheet) -> list[dict[str, object]]:
    rows = sheet.iter_rows(values_only=True)
    try:
        raw_headers = next(rows)
    except StopIteration:
        return []
    if len(raw_headers) > MAX_SHEET_COLUMNS:
        raise ImportValidationError(
            f"The '{sheet.title}' sheet has too many columns to process safely."
        )

    headers = [_header_key(value) for value in raw_headers]
    if not any(headers):
        raise ImportValidationError(f"The '{sheet.title}' sheet has no header row.")

    records: list[dict[str, object]] = []
    for row_number, values in enumerate(rows, start=2):
        if row_number > MAX_SHEET_ROWS + 1:
            raise ImportValidationError(
                f"The '{sheet.title}' sheet exceeds the {MAX_SHEET_ROWS:,}-row limit."
            )
        record = {
            header: values[index] if index < len(values) else None
            for index, header in enumerate(headers)
            if header
        }
        if any(value not in (None, "") for value in record.values()):
            record["_ROW"] = row_number
            records.append(record)
    return records


def _classify(
    filename: str,
    vouchers: list[dict[str, object]],
    ledgers: list[dict[str, object]],
    declared_kind: str | None,
) -> tuple[str, float, str]:
    voucher_types = Counter()
    for record in [*vouchers, *ledgers]:
        value = _text(
            _first(record, "VCHTYPE", "VOUCHERTYPENAME", "VOUCHERTYPE")
        )
        if value:
            voucher_types[value.casefold()] += 1

    joined_types = " ".join(voucher_types)
    sales_votes = sum(
        count for value, count in voucher_types.items() if re.search(r"\bsales?\b", value)
    )
    purchase_votes = sum(
        count for value, count in voucher_types.items() if re.search(r"\bpurchases?\b", value)
    )
    expense_votes = sum(
        count
        for value, count in voucher_types.items()
        if re.search(r"\b(expense|payment|journal|repair|maintenance|rent)\b", value)
    )

    if sales_votes and purchase_votes:
        raise ImportValidationError(
            "This workbook mixes sales and purchase vouchers. Export and upload each type "
            "as a separate file."
        )
    if sales_votes:
        detected = "sales"
        confidence = 0.99
        reason = "Tally voucher types identify sales transactions."
    elif purchase_votes:
        detected = "purchase"
        confidence = 0.99
        reason = "Tally voucher types identify purchase transactions."
    elif expense_votes:
        detected = "expense"
        confidence = 0.90
        reason = "Balanced journal/payment voucher entries identify expense transactions."
    elif declared_kind:
        detected = declared_kind
        confidence = 0.68
        reason = (
            "The workbook has a valid Tally ledger structure; the selected upload type "
            "resolved an otherwise custom voucher name."
        )
    else:
        filename_hint = _filename_kind(filename)
        if filename_hint:
            detected = filename_hint
            confidence = 0.60
            reason = (
                "The workbook has a valid Tally ledger structure and its filename supplied "
                "the only available transaction-type hint."
            )
        else:
            details = f" Found voucher types: {joined_types[:120]}." if joined_types else ""
            raise ImportValidationError(
                "The workbook structure is valid, but its transaction type is ambiguous. "
                "Choose Sales, Purchase or Expense before uploading." + details
            )

    if declared_kind and declared_kind != detected:
        raise ImportValidationError(
            f"This workbook looks like {detected}, but it was uploaded as {declared_kind}. "
            f"Use the {detected.title()} upload option."
        )
    return detected, confidence, reason


def _build_transactions(
    kind: str,
    vouchers: list[dict[str, object]],
    ledgers: list[dict[str, object]],
    inventory: list[dict[str, object]],
) -> tuple[list[ParsedTransaction], int]:
    voucher_meta = {
        _sequence(record.get("VOUCHERSEQ")): record
        for record in vouchers
        if _sequence(record.get("VOUCHERSEQ"))
    }
    ledger_groups = _group_by_sequence(ledgers)
    inventory_groups = _group_by_sequence(inventory)
    sequences = list(dict.fromkeys([*voucher_meta, *ledger_groups, *inventory_groups]))

    parsed: list[ParsedTransaction] = []
    skipped = 0
    for sequence in sequences:
        meta = voucher_meta.get(sequence, {})
        ledger_rows = ledger_groups.get(sequence, [])
        inventory_rows = inventory_groups.get(sequence, [])
        representative = ledger_rows[0] if ledger_rows else (
            inventory_rows[0] if inventory_rows else meta
        )

        party = _text(
            _first(meta, "PARTYLEDGERNAME", "PARTYNAME")
            or _first(representative, "PARTY", "PARTYNAME")
        )
        party_rows = [
            row
            for row in ledger_rows
            if _is_yes(row.get("ISPARTYLEDGER"))
            or (
                party
                and _text(row.get("LEDGERNAME"))
                and _text(row.get("LEDGERNAME")).casefold() == party.casefold()
            )
        ]
        tax_rows = [
            row
            for row in ledger_rows
            if row not in party_rows and _is_tax_ledger(_text(row.get("LEDGERNAME")))
        ]
        category_rows = [
            row
            for row in ledger_rows
            if row not in party_rows
            and row not in tax_rows
            and not _ROUNDING_LEDGER.search(_text(row.get("LEDGERNAME")) or "")
            and _amount(row.get("AMOUNT")) != 0
        ]

        gross = _dominant_side(_amount(row.get("AMOUNT")) for row in party_rows)
        tax = sum((abs(_amount(row.get("AMOUNT"))) for row in tax_rows), Decimal("0"))

        item_lines = _inventory_lines(inventory_rows)
        category_lines = _category_lines(category_rows)
        if item_lines:
            net = sum((line.amount for line in item_lines), Decimal("0"))
            business_lines = item_lines
        else:
            net = _kind_side(kind, (_amount(row.get("AMOUNT")) for row in category_rows))
            business_lines = category_lines

        if not gross:
            gross = max(net + tax, _dominant_side(_amount(row.get("AMOUNT")) for row in ledger_rows))
        if not net and gross:
            net = max(gross - tax, Decimal("0"))
        if gross <= 0:
            skipped += 1
            continue

        tax_lines = tuple(
            ParsedLine(
                line_type="tax",
                name=_text(row.get("LEDGERNAME")) or "Tax",
                amount=abs(_amount(row.get("AMOUNT"))),
            )
            for row in tax_rows
            if _amount(row.get("AMOUNT"))
        )
        lines = tuple(business_lines) + tax_lines
        category = max(business_lines, key=lambda line: line.amount).name if business_lines else None

        voucher_number = _text(
            _first(meta, "VOUCHERNUMBER")
            or _first(representative, "VOUCHERNUMBER")
        )
        voucher_type = _text(
            _first(meta, "VCHTYPE", "VOUCHERTYPENAME")
            or _first(representative, "VOUCHERTYPE")
        )
        txn_date = _date_value(
            _first(meta, "DATE") or _first(representative, "DATE")
        )
        guid = _text(_first(meta, "GUID") or _first(representative, "GUID"))
        source_key = _source_key(
            kind=kind,
            guid=guid,
            sequence=sequence,
            txn_date=txn_date,
            voucher_number=voucher_number,
            party=party,
        )

        parsed.append(
            ParsedTransaction(
                source_key=source_key,
                source_row=int(meta.get("_ROW") or representative.get("_ROW") or 0),
                kind=kind,
                txn_date=txn_date,
                voucher_number=voucher_number,
                voucher_type=voucher_type,
                party_name=party,
                category=category,
                gross_amount=_money(gross),
                net_amount=_money(net),
                tax_amount=_money(tax),
                lines=lines,
            )
        )
    # Some customized exports repeat the same voucher in more than one
    # sequence. Keep one normalized voucher so its item/category lines cannot
    # double the dashboard breakdown even though the transaction upsert is safe.
    unique = {transaction.source_key: transaction for transaction in parsed}
    skipped += len(parsed) - len(unique)
    return list(unique.values()), skipped


def _inventory_lines(rows: list[dict[str, object]]) -> tuple[ParsedLine, ...]:
    lines = []
    for row in rows:
        name = _text(row.get("STOCKITEMNAME"))
        amount = abs(_amount(row.get("AMOUNT")))
        if not name or not amount:
            continue
        quantity, unit = _quantity(row.get("BILLEDQTY") or row.get("ACTUALQTY"))
        lines.append(
            ParsedLine(
                line_type="item",
                name=name,
                amount=amount,
                quantity=quantity,
                unit=unit,
                rate=_positive_decimal(row.get("RATE")),
            )
        )
    return tuple(lines)


def _category_lines(rows: list[dict[str, object]]) -> tuple[ParsedLine, ...]:
    return tuple(
        ParsedLine(
            line_type="category",
            name=_text(row.get("LEDGERNAME")) or "Uncategorised",
            amount=abs(_amount(row.get("AMOUNT"))),
        )
        for row in rows
        if _amount(row.get("AMOUNT"))
    )


def _group_by_sequence(
    rows: list[dict[str, object]],
) -> dict[str, list[dict[str, object]]]:
    grouped: dict[str, list[dict[str, object]]] = defaultdict(list)
    for row in rows:
        sequence = _sequence(row.get("VOUCHERSEQ"))
        if sequence:
            grouped[sequence].append(row)
    return grouped


def _source_key(
    *,
    kind: str,
    guid: str | None,
    sequence: str,
    txn_date: date | None,
    voucher_number: str | None,
    party: str | None,
) -> str:
    if guid:
        return f"guid:{guid.strip().casefold()}"
    # VoucherSeq is an export-row locator and may change when the same period is
    # exported with a different sort order. Prefer business identity so a
    # modified re-export updates the existing voucher.
    voucher_identity = [
        kind,
        txn_date.isoformat() if txn_date else "",
        (voucher_number or "").strip().casefold(),
        (party or "").strip().casefold(),
    ]
    if any(voucher_identity[1:]):
        return "derived:" + "\x1f".join(voucher_identity)
    raw = "|".join(
        [kind, "sequence", sequence]
    )
    return "derived:" + hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _dominant_side(values: Iterable[Decimal]) -> Decimal:
    positive = Decimal("0")
    negative = Decimal("0")
    for value in values:
        if value > 0:
            positive += value
        elif value < 0:
            negative += abs(value)
    return max(positive, negative)


def _kind_side(kind: str, values: Iterable[Decimal]) -> Decimal:
    materialized = list(values)
    if kind == "sales":
        positive = sum((value for value in materialized if value > 0), Decimal("0"))
        if positive:
            return positive
    else:
        negative = sum((abs(value) for value in materialized if value < 0), Decimal("0"))
        if negative:
            return negative
    return _dominant_side(materialized)


def _header_key(value: object) -> str:
    return re.sub(r"[^A-Z0-9]", "", str(value or "").upper())


def _normalize_kind(value: str | None) -> str | None:
    if value is None or not value.strip():
        return None
    normalized = value.strip().casefold()
    aliases = {
        "sale": "sales",
        "sales": "sales",
        "purchase": "purchase",
        "purchases": "purchase",
        "expense": "expense",
        "expenses": "expense",
    }
    kind = aliases.get(normalized)
    if not kind:
        raise ImportValidationError("Upload type must be sales, purchase or expense.")
    return kind


def _filename_kind(filename: str) -> str | None:
    stem = PurePath(filename).stem.casefold()
    if re.search(r"\bsales?\b", stem):
        return "sales"
    if re.search(r"\bpurchases?\b", stem):
        return "purchase"
    if re.search(r"\b(expense|expenses|expences)\b", stem):
        return "expense"
    return None


def _sequence(value: object) -> str:
    if value in (None, ""):
        return ""
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value).strip()


def _first(record: dict[str, object], *keys: str) -> object:
    for key in keys:
        value = record.get(key)
        if value not in (None, ""):
            return value
    return None


def _text(value: object, max_length: int = 300) -> str | None:
    if value in (None, ""):
        return None
    cleaned = " ".join(str(value).split()).strip()
    return cleaned[:max_length] if cleaned else None


def _is_yes(value: object) -> bool:
    return str(value or "").strip().casefold() in {"yes", "true", "1", "y"}


def _is_tax_ledger(name: str | None) -> bool:
    return bool(name and _TAX_LEDGER.search(name))


def _amount(value: object) -> Decimal:
    if value in (None, ""):
        return Decimal("0")
    if isinstance(value, Decimal):
        return value
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return Decimal(str(value))
    text = str(value).strip().replace(",", "").replace("₹", "").replace("Rs.", "")
    match = _NUMBER.search(text)
    if not match:
        return Decimal("0")
    try:
        amount = Decimal(match.group())
    except InvalidOperation:
        return Decimal("0")
    if text.startswith("(") and text.endswith(")"):
        amount = -abs(amount)
    return amount


def _positive_decimal(value: object) -> Decimal | None:
    parsed = abs(_amount(value))
    return parsed or None


def _quantity(value: object) -> tuple[Decimal | None, str | None]:
    if value in (None, ""):
        return None, None
    text = str(value).strip().replace(",", "")
    match = _NUMBER.search(text)
    if not match:
        return None, _text(text, 30)
    try:
        quantity = abs(Decimal(match.group()))
    except InvalidOperation:
        return None, _text(text, 30)
    unit = _text(text[match.end() :].strip(), 30)
    return quantity, unit


def _date_value(value: object) -> date | None:
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if isinstance(value, (int, float)) and 1 <= value <= 2_958_465:
        try:
            converted = from_excel(value)
            return converted.date() if isinstance(converted, datetime) else converted
        except (OverflowError, ValueError):
            return None
    text = str(value or "").strip()
    for pattern in ("%Y%m%d", "%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%d.%m.%Y"):
        try:
            return datetime.strptime(text, pattern).date()
        except ValueError:
            continue
    return None


def _money(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"))
