from dataclasses import dataclass
from pathlib import Path
import tomllib


@dataclass(frozen=True)
class TallyConfig:
    url: str
    company: str
    timeout_seconds: int


@dataclass(frozen=True)
class ExportConfig:
    output_dir: Path


@dataclass(frozen=True)
class AppConfig:
    tally: TallyConfig
    export: ExportConfig


def load_config(path: Path) -> AppConfig:
    with open(path, "rb") as f:
        raw = tomllib.load(f)

    output_dir = Path(raw["export"]["output_dir"]).expanduser()
    if not output_dir.is_absolute():
        output_dir = path.parent / output_dir

    return AppConfig(
        tally=TallyConfig(**raw["tally"]),
        export=ExportConfig(output_dir=output_dir),
    )
