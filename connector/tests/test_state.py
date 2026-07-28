"""Last-run bookkeeping — the only way an operator can tell whether the
unattended syncs are actually running without opening a log file."""
from datetime import datetime, timedelta

import pytest

from arq_connector import state


@pytest.fixture(autouse=True)
def local_appdata(monkeypatch, tmp_path):
    monkeypatch.setenv("LOCALAPPDATA", str(tmp_path))
    return tmp_path


def test_no_state_yet_reads_as_empty():
    assert state.load_state() == {}


def test_successful_run_records_counts():
    state.record_run(ok=True, message="Pushed 4 ledgers, 9 bills", ledgers=4, bills=9)

    stored = state.load_state()
    assert stored["last_ok"] is True
    assert (stored["last_ledgers"], stored["last_bills"]) == (4, 9)
    assert stored["last_success_at"] == stored["last_attempt_at"]


def test_failure_keeps_the_previous_success():
    state.record_run(ok=True, message="Pushed 4 ledgers, 9 bills", ledgers=4, bills=9)
    good_run = state.load_state()["last_success_at"]

    state.record_run(ok=False, message="Tally is not running")

    stored = state.load_state()
    assert stored["last_ok"] is False
    assert stored["last_message"] == "Tally is not running"
    assert stored["last_success_at"] == good_run  # still points at the good run


def test_corrupt_state_does_not_break_a_sync(local_appdata):
    state.record_run(ok=True, message="ok", ledgers=1, bills=1)
    state.state_path().write_text("{{{ not json", encoding="utf-8")

    assert state.load_state() == {}
    state.record_run(ok=True, message="ok", ledgers=2, bills=2)  # must not raise
    assert state.load_state()["last_bills"] == 2


def test_unwritable_state_dir_is_swallowed(monkeypatch):
    def boom(*_a, **_kw):
        raise OSError("locked by antivirus")

    monkeypatch.setattr(state, "state_path", boom)
    state.record_run(ok=True, message="ok")  # bookkeeping must never fail a sync


@pytest.mark.parametrize("delta, expected", [
    (timedelta(seconds=5), "just now"),
    (timedelta(minutes=20), "20 min ago"),
    (timedelta(hours=1, minutes=5), "1 hour ago"),
    (timedelta(hours=6), "6 hours ago"),
    (timedelta(days=1, hours=2), "1 day ago"),
    (timedelta(days=9), "9 days ago"),
])
def test_humanize_age(delta, expected):
    now = datetime(2026, 7, 29, 12, 0, 0)
    assert state.humanize_age((now - delta).isoformat(), now=now) == expected


def test_humanize_age_handles_missing_and_broken_values():
    assert state.humanize_age(None) == "never"
    assert state.humanize_age("not a timestamp") == "unknown"


def test_clock_moving_backwards_does_not_report_the_future():
    now = datetime(2026, 7, 29, 12, 0, 0)
    future = (now + timedelta(hours=3)).isoformat()
    assert state.humanize_age(future, now=now) == "just now"
