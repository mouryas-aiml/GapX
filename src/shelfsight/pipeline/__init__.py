"""Named Operation Registry & Filter Chain Package for GapX.

Provides dynamic CV operation registration and declarative filter chains.
"""

from shelfsight.pipeline.chain import ChainStep, FilterChain
from shelfsight.pipeline.ops import (
    BGRToHSVOp,
    BrandColorMaskerOp,
    ContourFacingDetectorOp,
    PlanogramComplianceEvaluatorOp,
    RowBandSegmenterOp,
)
from shelfsight.pipeline.registry import CVOperation, FilterContext, OperationRegistry

__all__ = [
    "BGRToHSVOp",
    "BrandColorMaskerOp",
    "CVOperation",
    "ChainStep",
    "ContourFacingDetectorOp",
    "FilterChain",
    "FilterContext",
    "OperationRegistry",
    "PlanogramComplianceEvaluatorOp",
    "RowBandSegmenterOp",
]
