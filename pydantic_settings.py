"""Minimal local compatibility layer for pydantic-settings.

This project only needs a tiny subset of the real package: a settings base
class that can read defaults, override them from environment variables, and
optionally hydrate a simple `.env` file.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any, get_type_hints


class SettingsConfigDict(dict[str, Any]):
    """Lightweight stand-in for the real typed config dict."""


class BaseSettings:
    """Small subset of pydantic-settings used by GapX."""

    model_config: dict[str, Any] = {}

    def __init__(self, **values: Any) -> None:
        config = dict(getattr(self, "model_config", {}))
        env_file = config.get("env_file")
        env_encoding = config.get("env_file_encoding", "utf-8")
        if env_file:
            self._load_env_file(Path(env_file), env_encoding)

        hints = get_type_hints(self.__class__)
        for name, hint in hints.items():
            if name.startswith("_"):
                continue
            if name in values:
                value = values[name]
            elif name.upper() in os.environ:
                value = self._convert(os.environ[name.upper()], hint)
            else:
                value = getattr(self.__class__, name, None)
            setattr(self, name, value)

    @staticmethod
    def _load_env_file(path: Path, encoding: str) -> None:
        if not path.exists():
            return
        for raw_line in path.read_text(encoding=encoding).splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip("'\"")
            os.environ.setdefault(key, value)

    @staticmethod
    def _convert(value: str, annotation: Any) -> Any:
        if annotation is Path:
            return Path(value)
        if annotation is bool:
            return value.strip().lower() in {"1", "true", "yes", "on"}
        if annotation is int:
            return int(value)
        if annotation is float:
            return float(value)
        return value
