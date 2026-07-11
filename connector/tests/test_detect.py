from pathlib import Path

from arq_connector.tally import detect
from arq_connector.tally.client import TallyClient

FIXTURES = Path(__file__).parent / "fixtures"
LIVE_COMPANIES_XML = (FIXTURES / "list_of_companies.xml").read_text(encoding="utf-8")


def test_exit_10_when_process_not_running(monkeypatch):
    monkeypatch.setattr(detect, "is_tally_process_running", lambda: False)
    result = detect.run_doctor(host="localhost", port=9000, configured_company="ARQ AA")
    assert result.exit_code == detect.EXIT_NOT_RUNNING


def test_exit_11_when_port_closed(monkeypatch):
    monkeypatch.setattr(detect, "is_tally_process_running", lambda: True)
    monkeypatch.setattr(detect, "tcp_port_open", lambda host, port, timeout=3.0: False)
    result = detect.run_doctor(host="localhost", port=9000, configured_company="ARQ AA")
    assert result.exit_code == detect.EXIT_GATEWAY_OFF


def test_exit_0_when_configured_company_open(monkeypatch):
    monkeypatch.setattr(detect, "is_tally_process_running", lambda: True)
    monkeypatch.setattr(detect, "tcp_port_open", lambda host, port, timeout=3.0: True)
    monkeypatch.setattr(TallyClient, "post_envelope", lambda self, xml: LIVE_COMPANIES_XML)

    result = detect.run_doctor(host="localhost", port=9000, configured_company="ARQ AA")

    assert result.exit_code == detect.EXIT_HEALTHY
    assert result.matched_company.name == "ARQ AA"
    assert result.matched_company.guid == "83dd7f81-1c9a-44c9-aaa7-839b9aeb843b"


def test_exit_12_when_configured_company_not_open(monkeypatch):
    monkeypatch.setattr(detect, "is_tally_process_running", lambda: True)
    monkeypatch.setattr(detect, "tcp_port_open", lambda host, port, timeout=3.0: True)
    monkeypatch.setattr(TallyClient, "post_envelope", lambda self, xml: LIVE_COMPANIES_XML)

    result = detect.run_doctor(host="localhost", port=9000, configured_company="Does Not Exist")

    assert result.exit_code == detect.EXIT_MULTIPLE_COMPANIES  # 3 open, none pinned matches


def test_exit_12_when_no_companies_open(monkeypatch):
    empty_xml = "<ENVELOPE><BODY><DATA><COLLECTION></COLLECTION></DATA></BODY></ENVELOPE>"
    monkeypatch.setattr(detect, "is_tally_process_running", lambda: True)
    monkeypatch.setattr(detect, "tcp_port_open", lambda host, port, timeout=3.0: True)
    monkeypatch.setattr(TallyClient, "post_envelope", lambda self, xml: empty_xml)

    result = detect.run_doctor(host="localhost", port=9000, configured_company="ARQ AA")

    assert result.exit_code == detect.EXIT_NO_COMPANY
