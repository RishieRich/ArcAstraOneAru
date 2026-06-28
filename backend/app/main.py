import sys
from datetime import datetime
from pathlib import Path

from app.core.config import load_config
from app.core.logging import setup_logging

BACKEND_ROOT = Path(__file__).resolve().parent.parent   # .../backend
CONFIG_PATH = BACKEND_ROOT / "config.toml"

def run_once() -> int:
    config = load_config(CONFIG_PATH)
    logger = setup_logging(config.export.output_dir / "logs")
    run_id = datetime.now().strftime("%Y%m%d_%H%M%S")
    logger.info("Run started run_id=%s company=%s", run_id, config.tally.company)
    try:
        # M1 goes here: connect to Tally, fetch company list.
        logger.info("Run finished run_id=%s status=success", run_id)
        return 0
    except Exception:
        logger.exception("Run failed run_id=%s status=error", run_id)
        return 1

if __name__ == "__main__":
    sys.exit(run_once())