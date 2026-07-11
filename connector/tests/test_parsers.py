from decimal import Decimal
from pathlib import Path

from arq_connector.tally.client import decode_tally_response, strip_invalid_xml_chars
from arq_connector.tally.parsers import parse_companies, parse_debtor_ledgers

FIXTURES = Path(__file__).parent / "fixtures"


def test_parse_companies_from_live_fixture():
    xml = (FIXTURES / "list_of_companies.xml").read_text(encoding="utf-8")
    companies = parse_companies(xml)

    names = {c.name for c in companies}
    assert names == {"ARQ AA", "ARQ Code Test", "ARQ Demo Traders"}

    arq_aa = next(c for c in companies if c.name == "ARQ AA")
    assert arq_aa.guid == "83dd7f81-1c9a-44c9-aaa7-839b9aeb843b"
    assert arq_aa.starting_from == "20260401"


def test_parse_companies_ignores_cmpinfo_summary_count():
    # regression test: <CMPINFO><COMPANY>0</COMPANY></CMPINFO> is a summary
    # count, not a record -- must not appear as a bogus empty-name company.
    xml = (FIXTURES / "list_of_companies.xml").read_text(encoding="utf-8")
    companies = parse_companies(xml)
    assert all(c.name for c in companies)


def test_parse_debtor_ledgers_from_live_fixture():
    xml = (FIXTURES / "debtor_ledgers.xml").read_text(encoding="utf-8")
    ledgers = parse_debtor_ledgers(xml)

    assert len(ledgers) == 1
    ledger = ledgers[0]
    assert ledger.name == "Alpha Customer"
    assert ledger.parent_group == "Sundry Debtors"
    assert ledger.closing_balance == Decimal("0.00")
    assert ledger.tally_guid


def test_strip_invalid_xml_chars_removes_raw_control_bytes():
    assert strip_invalid_xml_chars("A\x00B\x04C\x1fD") == "ABCD"


def test_strip_invalid_xml_chars_removes_invalid_numeric_charref():
    # regression test: Tally emits "&#4;" (control char U+0004) inline, e.g.
    # <PARENT TYPE="String">&#4; Primary</PARENT> -- this is a real value
    # captured from a live "Profit & Loss A/c" ledger's PARENT field.
    assert strip_invalid_xml_chars("&#4; Primary") == " Primary"


def test_strip_invalid_xml_chars_keeps_valid_entities():
    assert strip_invalid_xml_chars("Profit &amp; Loss A/c") == "Profit &amp; Loss A/c"
    assert strip_invalid_xml_chars("&#65;") == "&#65;"


def test_decode_tally_response_detects_ascii_without_bom():
    # live finding: Tally does not always send UTF-16 despite the plan doc's
    # assumption -- a "List of Companies" response came back as plain ASCII.
    content = b"<ENVELOPE><A>1</A></ENVELOPE>"
    text, encoding = decode_tally_response(content)
    assert text == "<ENVELOPE><A>1</A></ENVELOPE>"
    assert encoding == "utf-8"


def test_decode_tally_response_detects_utf16_le_heuristic():
    content = "<ENVELOPE>ok</ENVELOPE>".encode("utf-16-le")
    text, encoding = decode_tally_response(content)
    assert text == "<ENVELOPE>ok</ENVELOPE>"
    assert "utf-16-le" in encoding


def test_decode_tally_response_detects_bom():
    content = b"\xff\xfe" + "<ENVELOPE>ok</ENVELOPE>".encode("utf-16-le")
    text, encoding = decode_tally_response(content)
    assert text == "<ENVELOPE>ok</ENVELOPE>"
    assert "bom" in encoding
