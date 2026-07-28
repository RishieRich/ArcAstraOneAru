"""The company is picked once and must never need picking again.

These cover the matching rules that make that true: the GUID is the identity,
the name is only a fallback, and a healthy sync writes the GUID back so the
next unattended run no longer depends on the name at all.
"""
import logging
from pathlib import Path

from arq_connector import runner, settings as settings_mod
from arq_connector.tally import detect
from arq_connector.tally.client import TallyClient
from arq_connector.tally.parsers import CompanyRef

FIXTURES = Path(__file__).parent / "fixtures"
LIVE_COMPANIES_XML = (FIXTURES / "list_of_companies.xml").read_text(encoding="utf-8")

LOGGER = logging.getLogger("test")

ACME = CompanyRef(name="Acme Traders", guid="guid-acme", starting_from="20260401")
BETA = CompanyRef(name="Beta Metals", guid="guid-beta", starting_from="20260401")


def test_guid_wins_over_a_name_that_matches_another_company():
    # Worst case: the operator's old name now belongs to a different company.
    companies = [CompanyRef(name="Acme Traders", guid="guid-beta", starting_from=None), ACME]

    matched, how = detect.find_company(companies, "Acme Traders", "guid-acme")

    assert matched is ACME
    assert how == "guid"


def test_rename_in_tally_still_matches_on_guid():
    renamed = CompanyRef(name="Acme Traders Pvt Ltd", guid="guid-acme", starting_from=None)

    matched, how = detect.find_company([renamed, BETA], "Acme Traders", "guid-acme")

    assert matched is renamed
    assert how == "guid"


def test_falls_back_to_name_when_no_guid_stored_yet():
    matched, how = detect.find_company([ACME, BETA], "Beta Metals", "")

    assert matched is BETA
    assert how == "name"


def test_name_match_tolerates_case_and_spacing():
    matched, _ = detect.find_company([ACME, BETA], "  acme   traders ", "")

    assert matched is ACME


def test_no_match_returns_nothing():
    matched, how = detect.find_company([ACME, BETA], "Gamma Foods", "guid-gamma")

    assert matched is None
    assert how == ""


def test_doctor_reports_how_it_matched(monkeypatch):
    monkeypatch.setattr(detect, "is_tally_process_running", lambda: True)
    monkeypatch.setattr(detect, "tcp_port_open", lambda host, port, timeout=3.0: True)
    monkeypatch.setattr(TallyClient, "post_envelope", lambda self, xml: LIVE_COMPANIES_XML)

    # Name deliberately stale — only the stored GUID can find this company.
    result = detect.run_doctor(
        host="localhost", port=9000, configured_company="Whatever It Was Called",
        configured_guid="83dd7f81-1c9a-44c9-aaa7-839b9aeb843b")

    assert result.exit_code == detect.EXIT_HEALTHY
    assert result.matched_company.name == "ARQ AA"
    assert result.matched_by == "guid"


def test_healthy_sync_pins_the_guid(monkeypatch, tmp_path):
    monkeypatch.setenv("LOCALAPPDATA", str(tmp_path))
    stored = {"company_name": "Acme Traders", "company_guid": ""}
    doctor = detect.DoctorResult(exit_code=detect.EXIT_HEALTHY, message="ok",
                                 matched_company=ACME, matched_by="name")

    runner._remember_company(stored, doctor, LOGGER)

    assert stored["company_guid"] == "guid-acme"
    assert settings_mod.load_settings()["company_guid"] == "guid-acme"


def test_healthy_sync_follows_a_rename(monkeypatch, tmp_path):
    monkeypatch.setenv("LOCALAPPDATA", str(tmp_path))
    renamed = CompanyRef(name="Acme Traders Pvt Ltd", guid="guid-acme", starting_from=None)
    stored = {"company_name": "Acme Traders", "company_guid": "guid-acme"}
    doctor = detect.DoctorResult(exit_code=detect.EXIT_HEALTHY, message="ok",
                                 matched_company=renamed, matched_by="guid")

    runner._remember_company(stored, doctor, LOGGER)

    assert stored["company_name"] == "Acme Traders Pvt Ltd"
    assert settings_mod.load_settings()["company_name"] == "Acme Traders Pvt Ltd"


def test_settings_survive_a_corrupt_file(monkeypatch, tmp_path):
    monkeypatch.setenv("LOCALAPPDATA", str(tmp_path))
    settings_mod.save_settings({"company_name": "Acme", "company_guid": "guid-acme"})
    assert settings_mod.load_settings()["company_guid"] == "guid-acme"

    settings_mod.settings_path().write_text("{ this is not json", encoding="utf-8")

    # A corrupt file must not crash the unattended run; defaults are the floor.
    assert settings_mod.load_settings()["interval_hours"] == 3
