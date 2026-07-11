import argparse
import sys
from pathlib import Path

from .config import ConfigError, load_config
from .logging_setup import setup_logging
from .sync.snapshot import SnapshotError, pull_snapshot, write_snapshot
from .tally.detect import run_doctor


def cmd_doctor(args: argparse.Namespace) -> int:
    try:
        config = load_config(Path(args.config))
    except ConfigError as e:
        print(f"Config error: {e}", file=sys.stderr)
        return 1

    logger = setup_logging(config.logging.level)
    logger.info(
        "doctor: checking host=%s port=%s configured_company=%s",
        config.tally.host, config.tally.port, config.tally.company_name,
    )

    result = run_doctor(
        host=config.tally.host,
        port=config.tally.port,
        configured_company=config.tally.company_name,
    )

    print(f"[exit {result.exit_code}] {result.message}")
    if result.companies:
        print("Open companies:")
        for c in result.companies:
            marker = " <-- configured" if result.matched_company and c.name == result.matched_company.name else ""
            print(f"  - {c.name}  (GUID={c.guid}){marker}")

    logger.info("doctor: exit_code=%s", result.exit_code)
    return result.exit_code


def cmd_pull(args: argparse.Namespace) -> int:
    try:
        config = load_config(Path(args.config))
    except ConfigError as e:
        print(f"Config error: {e}", file=sys.stderr)
        return 1

    logger = setup_logging(config.logging.level)
    try:
        snapshot = pull_snapshot(
            host=config.tally.host,
            port=config.tally.port,
            company_name=config.tally.company_name,
        )
    except SnapshotError as e:
        print(f"Pull failed: {e}", file=sys.stderr)
        logger.error("pull failed: %s", e)
        return 1

    out_path = Path(args.out)
    write_snapshot(snapshot, out_path)
    counts = f"{len(snapshot['ledgers'])} ledgers, {len(snapshot['bills'])} bills"
    print(f"Wrote {out_path} ({counts})")
    logger.info("pull: wrote %s (%s)", out_path, counts)
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="arq-connector")
    sub = parser.add_subparsers(dest="command", required=True)

    doctor_p = sub.add_parser("doctor", help="Check Tally health")
    doctor_p.add_argument("--config", default="config.toml")
    doctor_p.set_defaults(func=cmd_doctor)

    pull_p = sub.add_parser("pull", help="Pull a local snapshot.json (no cloud calls)")
    pull_p.add_argument("--config", default="config.toml")
    pull_p.add_argument("--out", default="snapshot.json")
    pull_p.set_defaults(func=cmd_pull)

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
