"""Named Operation Filter Chain for ShelfSight.

Sequentially executes named CV operations, passing and mutating a FilterContext.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np

from shelfsight.pipeline.registry import CVOperation, FilterContext, OperationRegistry


@dataclass
class ChainStep:
    """A configured step in the FilterChain."""

    op_name: str
    params: dict[str, Any]


class FilterChain:
    """Configurable pipeline of named computer vision operations."""

    def __init__(self, steps: list[ChainStep] | None = None) -> None:
        self.steps: list[ChainStep] = steps or []

    def add_step(self, op_name: str, **params: Any) -> FilterChain:
        """Appends a named operation with parameter bindings to the chain."""
        self.steps.append(ChainStep(op_name=op_name, params=params))
        return self

    def execute(self, image_bgr: np.ndarray) -> FilterContext:
        """Runs the entire filter chain on the input image."""
        ctx = FilterContext(image_bgr=image_bgr)
        for step in self.steps:
            op_cls_or_func = OperationRegistry.get(step.op_name)
            if isinstance(op_cls_or_func, type) and issubclass(op_cls_or_func, CVOperation):
                instance = op_cls_or_func()
                ctx = instance.execute(ctx, **step.params)
            elif callable(op_cls_or_func):
                ctx = op_cls_or_func(ctx, **step.params)
            else:
                raise TypeError(f"Invalid operation target for '{step.op_name}': {op_cls_or_func}")
        return ctx

    @classmethod
    def standard_retail_pipeline(cls) -> FilterChain:
        """Constructs the default standard shelf analysis filter chain."""
        chain = cls()
        chain.add_step("bgr_to_hsv")
        chain.add_step("row_band_segmenter", sat_floor=70, min_band_height=25)
        chain.add_step("brand_color_masker", sat_floor=70)
        chain.add_step("contour_facing_detector", min_facing_width=15, min_area=400)
        chain.add_step("planogram_compliance_evaluator")
        return chain
