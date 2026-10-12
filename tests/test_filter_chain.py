"""Unit tests for the Named Operation Registry and Filter Chain in GapX."""

from __future__ import annotations

import numpy as np
import pytest

from shelfsight.pipeline import (
    CVOperation,
    FilterChain,
    FilterContext,
    OperationRegistry,
)
from shelfsight.settings import get_config


@pytest.fixture
def synthetic_shelf_image() -> np.ndarray:
    """Generates a synthetic 400x600 BGR image with saturated product bands."""
    img = np.zeros((400, 600, 3), dtype=np.uint8)
    # Background gray
    img[:, :] = (180, 180, 180)

    # Row 1: y=50..150, Sparkle (redish BGR: (30, 30, 220))
    img[50:150, 50:200] = (30, 30, 220)
    # Row 1: PureGlow (yellowish BGR: (30, 220, 220))
    img[50:150, 250:400] = (30, 220, 220)

    # Row 2: y=220..320, FreshMint (greenish BGR: (30, 220, 30))
    img[220:320, 100:300] = (30, 220, 30)

    return img


def test_registry_registration_and_lookup():
    @OperationRegistry.register("mock_invert_op")
    class MockInvertOp(CVOperation):
        def execute(self, ctx: FilterContext, **params):
            ctx.artifacts["mock_called"] = True
            return ctx

    assert "mock_invert_op" in OperationRegistry.list_operations()
    op_cls = OperationRegistry.get("mock_invert_op")
    assert op_cls is MockInvertOp


def test_registry_unknown_op_raises():
    with pytest.raises(KeyError, match="Unknown CV operation"):
        OperationRegistry.get("non_existent_op_xyz")


def test_filter_chain_execution(synthetic_shelf_image):
    chain = FilterChain.standard_retail_pipeline()
    ctx = chain.execute(synthetic_shelf_image)

    assert isinstance(ctx, FilterContext)
    assert ctx.hsv is not None
    assert len(ctx.row_bands) >= 2
    assert len(ctx.masks) == len(get_config()["brands"])
    assert len(ctx.facings) >= 2
    assert "total_facings_detected" in ctx.artifacts
    assert 0.0 <= ctx.compliance_score <= 1.0


def test_custom_dynamic_filter_chain(synthetic_shelf_image):
    # Construct a minimal 2-step chain
    chain = (
        FilterChain()
        .add_step("bgr_to_hsv")
        .add_step("row_band_segmenter", sat_floor=60, min_band_height=20)
    )

    ctx = chain.execute(synthetic_shelf_image)
    assert ctx.hsv is not None
    assert len(ctx.row_bands) >= 2
    assert ctx.facings == []  # Not executed
