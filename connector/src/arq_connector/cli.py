"""Entry point.

No arguments  -> open the GUI (what a double-click on the exe does).
`run`         -> headless sync (what the Windows scheduled task calls).
`doctor`      -> print Tally health (debugging aid).
"""
import argparse
import sys

from .logging_setup import setup_logging
from .settings import load_settings


def cmd_run() -> int:
    from .lock import acquire_lock, release_lock
    from .runner import run_sync

    settings = load_settings()
    logger = setup_logging(settings.get("log_level", "INFO"))

    if not acquire_lock():
        logger.info("another sync is already running; exiting")
        return 0
    try:
        outcome = run_sync(settings, logger)
        return 0 if outcome.ok else 1
    finally:
        release_lock()


def cmd_doctor() -> int:
    from .tally.detect import run_doctor

    settings = load_settings()
    logger = setup_logging(settings.get("log_level", "INFO"))
    result = run_doctor(
        host=settings["tally_host"],
        port=int(settings["tally_port"]),
        configured_company=settings["company_name"],
    )
    logger.info("doctor: exit_code=%s", result.exit_code)
    print(f"[exit {result.exit_code}] {result.message}")
    for c in result.companies:
        print(f"  - {c.name}  (GUID={c.guid})")
    return result.exit_code


def main() -> int:
    parser = argparse.ArgumentParser(prog="arq-connector")
    parser.add_argument("command", nargs="?", choices=["run", "doctor"], default=None)
    args = parser.parse_args()

    if args.command == "run":
        return cmd_run()
    if args.command == "doctor":
        return cmd_doctor()

    from .gui import launch
    launch()
    return 0


if __name__ == "__main__":
    sys.exit(main())
