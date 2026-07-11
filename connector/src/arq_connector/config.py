from dataclasses import dataclass
from pathlib import Path
import tomllib


class ConfigError(Exception):
    pass


@dataclass(frozen=True)
class TallyConfig:
    host: str
    port: int
    company_name: str


@dataclass(frozen=True)
class CloudConfig:
    api_base_url: str


@dataclass(frozen=True)
class SyncConfig:
    interval_minutes: int


@dataclass(frozen=True)
class LoggingConfig:
    level: str


@dataclass(frozen=True)
class AppConfig:
    tally: TallyConfig
    cloud: CloudConfig
    sync: SyncConfig
    logging: LoggingConfig


def _require(section: dict, key: str, section_name: str, path: Path):
    if key not in section or section[key] in (None, ""):
        raise ConfigError(
            f"Missing required field '[{section_name}] {key}' in {path}"
        )
    return section[key]


def load_config(path: Path) -> AppConfig:
    if not path.exists():
        raise ConfigError(
            f"Config file not found: {path}. Copy config.example.toml to config.toml and edit it."
        )
    try:
        with open(path, "rb") as f:
            raw = tomllib.load(f)
    except tomllib.TOMLDecodeError as e:
        raise ConfigError(f"Malformed TOML in {path}: {e}") from e

    tally_raw = raw.get("tally", {})
    cloud_raw = raw.get("cloud", {})
    sync_raw = raw.get("sync", {})
    logging_raw = raw.get("logging", {})

    tally = TallyConfig(
        host=_require(tally_raw, "host", "tally", path),
        port=int(_require(tally_raw, "port", "tally", path)),
        company_name=_require(tally_raw, "company_name", "tally", path),
    )
    cloud = CloudConfig(
        api_base_url=_require(cloud_raw, "api_base_url", "cloud", path),
    )
    sync = SyncConfig(
        interval_minutes=int(sync_raw.get("interval_minutes", 60)),
    )
    logging_cfg = LoggingConfig(
        level=logging_raw.get("level", "INFO"),
    )

    return AppConfig(tally=tally, cloud=cloud, sync=sync, logging=logging_cfg)
