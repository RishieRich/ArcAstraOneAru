import logging
import os
import sys
from logging.handlers import RotatingFileHandler
from pathlib import Path


def default_log_dir() -> Path:
    local_appdata = os.environ.get("LOCALAPPDATA", str(Path.home() / "AppData" / "Local"))
    return Path(local_appdata) / "ARQ" / "logs"


def _console_stream():
    """The stderr stream to log to, or None when there isn't one.

    A windowed build has no console: PyInstaller leaves sys.stderr as None, and
    a StreamHandler built on that dies on the first log record — taking the
    whole app down before its window ever appears. The file handler is the one
    that matters for support anyway.
    """
    stream = sys.stderr
    if stream is None or not hasattr(stream, "write"):
        return None
    try:
        stream.write("")
    except (ValueError, OSError):
        return None  # detached or closed handle
    return stream


def setup_logging(level: str = "INFO", log_dir: Path | None = None) -> logging.Logger:
    log_dir = log_dir or default_log_dir()
    log_dir.mkdir(parents=True, exist_ok=True)

    logger = logging.getLogger("arq_connector")
    logger.setLevel(level.upper())
    if logger.handlers:
        return logger

    fmt = logging.Formatter("%(asctime)s %(levelname)s %(message)s")

    file_handler = RotatingFileHandler(
        log_dir / "connector.log", maxBytes=2_000_000, backupCount=5, encoding="utf-8"
    )
    file_handler.setFormatter(fmt)
    logger.addHandler(file_handler)

    stream = _console_stream()
    if stream is not None:
        console = logging.StreamHandler(stream)
        console.setFormatter(fmt)
        logger.addHandler(console)
    return logger
