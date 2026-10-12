"""Named Operation Registry - Open-Closed CV Operator Registration.

Allows computer vision transformations and filter stages to be registered by
name and looked up dynamically by declarative pipeline definitions.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any, ClassVar

import numpy as np


@dataclass
class FilterContext:
    """Carries mutable image buffers, masks, detections, and intermediate metadata."""

    image_bgr: np.ndarray
    hsv: np.ndarray | None = None
    masks: dict[str, np.ndarray] = field(default_factory=dict)
    row_bands: list[tuple[int, int]] = field(default_factory=list)
    facings: list[dict[str, Any]] = field(default_factory=list)
    artifacts: dict[str, Any] = field(default_factory=dict)
    compliance_score: float = 1.0


class CVOperation(ABC):
    """Abstract base class for all named CV filter operations."""

    @abstractmethod
    def execute(self, ctx: FilterContext, **params: Any) -> FilterContext:
        """Executes operation and returns mutated context."""


class OperationRegistry:
    """Global registry mapping string names to CVOperation classes or callables."""

    _registry: ClassVar[dict[str, type[CVOperation] | Callable[..., Any]]] = {}

    @classmethod
    def register(cls, name: str) -> Callable[[Any], Any]:
        """Decorator to register a CVOperation class or function."""

        def decorator(target: Any) -> Any:
            cls._registry[name] = target
            return target

        return decorator

    @classmethod
    def get(cls, name: str) -> type[CVOperation] | Callable[..., Any]:
        if name not in cls._registry:
            raise KeyError(
                f"Unknown CV operation '{name}'. Available: {list(cls._registry.keys())}"
            )
        return cls._registry[name]

    @classmethod
    def list_operations(cls) -> list[str]:
        return sorted(cls._registry.keys())

    @classmethod
    def clear(cls) -> None:
        cls._registry.clear()
