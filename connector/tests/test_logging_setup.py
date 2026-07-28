"""Logging must survive having no console.

The shipped exe is built --windowed, so PyInstaller leaves sys.stderr as None.
A StreamHandler over that raises on the first record and the app dies before
the window is drawn — with no console, the client sees nothing at all.
"""
import logging

import pytest

from arq_connector import logging_setup


@pytest.fixture(autouse=True)
def isolated_logger(monkeypatch, tmp_path):
    monkeypatch.setenv("LOCALAPPDATA", str(tmp_path))
    logger = logging.getLogger("arq_connector")
    for handler in list(logger.handlers):
        logger.removeHandler(handler)
        handler.close()
    yield
    for handler in list(logger.handlers):
        logger.removeHandler(handler)
        handler.close()


def test_no_console_still_logs_to_file(monkeypatch, tmp_path):
    monkeypatch.setattr(logging_setup.sys, "stderr", None)

    logger = logging_setup.setup_logging("INFO")
    logger.info("sync ok: ledgers=1 bills=2")

    assert not any(type(h) is logging.StreamHandler for h in logger.handlers)
    log_file = tmp_path / "ARQ" / "logs" / "connector.log"
    assert "sync ok" in log_file.read_text(encoding="utf-8")


def test_detached_stderr_is_not_used(monkeypatch):
    class Detached:
        def write(self, _text):
            raise ValueError("I/O operation on closed file")

    monkeypatch.setattr(logging_setup.sys, "stderr", Detached())

    logger = logging_setup.setup_logging("INFO")
    logger.info("must not raise")

    assert not any(type(h) is logging.StreamHandler for h in logger.handlers)


def test_console_is_used_when_one_exists(monkeypatch):
    import io

    monkeypatch.setattr(logging_setup.sys, "stderr", io.StringIO())

    logger = logging_setup.setup_logging("INFO")

    assert any(type(h) is logging.StreamHandler for h in logger.handlers)
