"""Named CV Operations for GapX.

Implements discrete computer vision operations registered with @OperationRegistry.register.
"""

from __future__ import annotations

from typing import Any

import cv2
import numpy as np

from shelfsight.settings import get_config
from shelfsight.pipeline.registry import CVOperation, FilterContext, OperationRegistry


@OperationRegistry.register("bgr_to_hsv")
class BGRToHSVOp(CVOperation):
    """Converts BGR image tensor to HSV color space."""

    def execute(self, ctx: FilterContext, **params: Any) -> FilterContext:
        ctx.hsv = cv2.cvtColor(ctx.image_bgr, cv2.COLOR_BGR2HSV)
        ctx.artifacts["hsv_shape"] = ctx.hsv.shape
        return ctx


@OperationRegistry.register("row_band_segmenter")
class RowBandSegmenterOp(CVOperation):
    """Detects shelf row coordinate boundaries using saturation projection."""

    def execute(self, ctx: FilterContext, **params: Any) -> FilterContext:
        sat_floor = params.get("sat_floor", 70)
        min_band_height = params.get("min_band_height", 25)

        hsv = ctx.hsv
        if hsv is None:
            hsv = cv2.cvtColor(ctx.image_bgr, cv2.COLOR_BGR2HSV)
            ctx.hsv = hsv

        profile = (hsv[:, :, 1] >= sat_floor).mean(axis=1)
        active = profile > 0.15
        raw, start = [], None
        for i, val in enumerate(active):
            if val and start is None:
                start = i
            elif not val and start is not None:
                if i - start >= min_band_height:
                    raw.append((start, i))
                start = None
        if start is not None and len(active) - start >= min_band_height:
            raw.append((start, len(active)))

        # Merge adjacent bands
        merged = []
        for band in raw:
            if not merged:
                merged.append(band)
            elif band[0] - merged[-1][1] <= 15:
                merged[-1] = (merged[-1][0], band[1])
            else:
                merged.append(band)

        ctx.row_bands = merged
        ctx.artifacts["detected_rows_count"] = len(merged)
        return ctx


@OperationRegistry.register("brand_color_masker")
class BrandColorMaskerOp(CVOperation):
    """Extracts binary color segmentation masks for target brands."""

    def execute(self, ctx: FilterContext, **params: Any) -> FilterContext:
        brands = params.get(
            "brands",
            get_config()["brands"],
        )
        sat_floor = params.get("sat_floor", 70)

        hsv = ctx.hsv
        if hsv is None:
            hsv = cv2.cvtColor(ctx.image_bgr, cv2.COLOR_BGR2HSV)
            ctx.hsv = hsv

        masks = {}
        for brand, spec in brands.items():
            hue, tol = spec["hue"], spec["tol"]
            lo_h, hi_h = hue - tol, hue + tol
            sat_ok = hsv[:, :, 1] >= sat_floor
            h = hsv[:, :, 0].astype(int)
            if lo_h < 0:
                hue_ok = (h <= hi_h) | (h >= 180 + lo_h)
            elif hi_h > 179:
                hue_ok = (h >= lo_h) | (h <= hi_h - 180)
            else:
                hue_ok = (h >= lo_h) & (h <= hi_h)
            masks[brand] = (hue_ok & sat_ok).astype(np.uint8) * 255

        ctx.masks = masks
        ctx.artifacts["mask_keys"] = list(masks.keys())
        return ctx


@OperationRegistry.register("contour_facing_detector")
class ContourFacingDetectorOp(CVOperation):
    """Extracts bounding box product facings from binary brand masks."""

    def execute(self, ctx: FilterContext, **params: Any) -> FilterContext:
        min_facing_width = params.get("min_facing_width", 15)
        min_area = params.get("min_area", 400)

        facings = []
        for row_idx, (y0, y1) in enumerate(ctx.row_bands):
            row_h = y1 - y0
            for brand, mask in ctx.masks.items():
                row_slice = mask[y0:y1, :]
                kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
                cleaned = cv2.morphologyEx(row_slice, cv2.MORPH_OPEN, kernel)
                contours, _ = cv2.findContours(cleaned, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

                for c in contours:
                    if cv2.contourArea(c) < min_area:
                        continue
                    x, y, w, h = cv2.boundingRect(c)
                    if w >= min_facing_width and h >= row_h * 0.4:
                        facings.append(
                            {
                                "row": row_idx,
                                "brand": brand,
                                "x": int(x),
                                "y": int(y0 + y),
                                "w": int(w),
                                "h": int(h),
                            }
                        )

        # Sort facings by row and horizontal x-position
        facings.sort(key=lambda f: (f["row"], f["x"]))
        ctx.facings = facings
        ctx.artifacts["total_facings_detected"] = len(facings)
        return ctx


@OperationRegistry.register("planogram_compliance_evaluator")
class PlanogramComplianceEvaluatorOp(CVOperation):
    """Evaluates facing brand ordering against expected planogram rules."""

    def execute(self, ctx: FilterContext, **params: Any) -> FilterContext:
        expected_planogram = params.get("planogram", {})
        if not expected_planogram:
            expected_planogram = {idx: row for idx, row in enumerate(get_config()["planogram"]["expected"])}
        if not expected_planogram:
            ctx.compliance_score = 1.0
            return ctx
        if not ctx.facings:
            ctx.compliance_score = 0.0
            ctx.artifacts["compliance_score"] = ctx.compliance_score
            return ctx

        total_checks = 0
        passed_checks = 0

        # Group facings by row
        rows_map: dict[int, list[str]] = {}
        for f in ctx.facings:
            rows_map.setdefault(f["row"], []).append(f["brand"])

        for row_idx, expected_brands in expected_planogram.items():
            actual_brands = rows_map.get(int(row_idx), [])
            for exp_b, act_b in zip(expected_brands, actual_brands, strict=False):
                total_checks += 1
                if exp_b == act_b:
                    passed_checks += 1

        ctx.compliance_score = passed_checks / max(total_checks, 1)
        ctx.artifacts["compliance_score"] = ctx.compliance_score
        return ctx
