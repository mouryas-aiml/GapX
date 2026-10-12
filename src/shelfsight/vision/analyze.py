"""Classical-CV shelf analysis: rows -> facings -> share-of-shelf -> gaps ->
planogram compliance. OpenCV only, every stage returns inspectable artifacts."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

import cv2
import numpy as np

from shelfsight.settings import get_config


@dataclass
class Facing:
    row: int
    brand: str
    x: int
    y: int
    w: int
    h: int


@dataclass
class RowAnalysis:
    row: int
    facings: list[Facing] = field(default_factory=list)
    gaps: int = 0

    def brand_order(self) -> list[str]:
        return [f.brand for f in sorted(self.facings, key=lambda f: f.x)]

    def facing_count(self) -> int:
        return len(self.facings)

    def unique_brands(self) -> set[str]:
        return {f.brand for f in self.facings}


def _brand_masks(hsv: np.ndarray) -> dict[str, np.ndarray]:
    cfg = get_config()
    sat_floor = cfg["vision"]["saturation_floor"]
    masks = {}
    for brand, spec in cfg["brands"].items():
        hue, tol = spec["hue"], spec["tol"]
        lo_h, hi_h = hue - tol, hue + tol
        sat_ok = hsv[:, :, 1] >= sat_floor
        h = hsv[:, :, 0].astype(int)
        if lo_h < 0:  # red wraps around 0/179
            hue_ok = (h <= hi_h) | (h >= 180 + lo_h)
        elif hi_h > 179:
            hue_ok = (h >= lo_h) | (h <= hi_h - 180)
        else:
            hue_ok = (h >= lo_h) & (h <= hi_h)
        masks[brand] = (hue_ok & sat_ok).astype(np.uint8) * 255
    return masks


def detect_rows(image_bgr: np.ndarray) -> list[tuple[int, int]]:
    """Shelf rows via the saturation projection profile (product bands are
    saturated; shelf bars and background are not)."""
    hsv = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2HSV)
    sat_floor = get_config()["vision"]["saturation_floor"]
    profile = (hsv[:, :, 1] >= sat_floor).mean(axis=1)
    active = profile > 0.15
    raw, start = [], None
    for y, on in enumerate(active):
        if on and start is None:
            start = y
        elif not on and start is not None:
            raw.append((start, y))
            start = None
    if start is not None:
        raw.append((start, len(active)))
    # Merge bands split by thin low-saturation stripes (product labels), then
    # drop slivers.
    merged: list[tuple[int, int]] = []
    for band in raw:
        if merged and band[0] - merged[-1][1] < 22:
            merged[-1] = (merged[-1][0], band[1])
        else:
            merged.append(band)
    return [(y0, y1) for y0, y1 in merged if y1 - y0 > 30]


def analyze_image(image_bgr: np.ndarray) -> dict:
    cfg = get_config()["vision"]
    hsv = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2HSV)
    masks = _brand_masks(hsv)
    row_bands = detect_rows(image_bgr)

    rows: list[RowAnalysis] = []
    for r, (y0, y1) in enumerate(row_bands):
        analysis = RowAnalysis(row=r)
        occupied = np.zeros(image_bgr.shape[1], dtype=bool)
        for brand, mask in masks.items():
            band = mask[y0:y1]
            # Tall closing kernel: white label stripes must not split a facing.
            kernel = np.ones((21, 5), np.uint8)
            cleaned = cv2.morphologyEx(band, cv2.MORPH_CLOSE, kernel)
            contours, _ = cv2.findContours(cleaned, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            for contour in contours:
                x, y, w, h = cv2.boundingRect(contour)
                if w * h < cfg["min_facing_area"] or w < 10 or h < 10:
                    continue
                analysis.facings.append(Facing(row=r, brand=brand, x=x, y=y0 + y, w=w, h=h))
                occupied[x : x + w] = True
        # Gaps: unoccupied spans inside the row (excluding image margins).
        span, gaps = 0, 0
        for x in range(8, image_bgr.shape[1] - 8):
            if not occupied[x]:
                span += 1
            else:
                if span >= cfg["gap_min_width"]:
                    gaps += 1
                span = 0
        if span >= cfg["gap_min_width"]:
            gaps += 1
        analysis.gaps = gaps
        rows.append(analysis)

    all_facings = [f for row in rows for f in row.facings]
    counts: dict[str, int] = {}
    for f in all_facings:
        counts[f.brand] = counts.get(f.brand, 0) + 1
    total = max(sum(counts.values()), 1)
    share = {brand: round(n / total, 4) for brand, n in sorted(counts.items())}

    return {
        "n_rows": len(rows),
        "facings_per_row": [
            {
                "row": r.row,
                "order": r.brand_order(),
                "gaps": r.gaps,
                "facings": r.facing_count(),
                "brands": sorted(r.unique_brands()),
            }
            for r in rows
        ],
        "total_facings": len(all_facings),
        "share_of_shelf": share,
        "boxes": [vars(f) for f in all_facings],
    }


def planogram_compliance(detected_rows: list[dict]) -> dict:
    expected = get_config()["planogram"]["expected"]
    per_row = []
    for r, expected_order in enumerate(expected):
        detected = next((row["order"] for row in detected_rows if row["row"] == r), [])
        matches = sum(1 for a, b in zip(expected_order, detected, strict=False) if a == b)
        per_row.append(
            {
                "row": r,
                "expected": expected_order,
                "detected": detected,
                "compliance": round(matches / max(len(expected_order), 1), 3),
            }
        )
    overall = round(sum(r["compliance"] for r in per_row) / max(len(per_row), 1), 3)
    return {"overall": overall, "rows": per_row}


def build_alerts(
    detected_rows: list[dict[str, Any]],
    planogram: dict[str, Any] | None = None,
) -> list[dict[str, Any]]:
    """Derive actionable restocking alerts from row gaps and compliance drift."""

    alerts: list[dict[str, Any]] = []
    compliance = float((planogram or {}).get("overall", 1.0))
    for row in detected_rows:
        row_index = int(row["row"])
        gaps = int(row.get("gaps", 0))
        order = list(row.get("order", []))
        if gaps > 0:
            alerts.append(
                {
                    "severity": "high",
                    "type": "restock-gap",
                    "row": row_index,
                    "message": f"Row {row_index + 1} has {gaps} empty shelf gap(s) that need restocking.",
                }
            )
        expected = (planogram or {}).get("rows", [])
        expected_row = next((item for item in expected if int(item["row"]) == row_index), None)
        if expected_row is not None:
            expected_order = list(expected_row.get("expected", []))
            if len(order) < len(expected_order):
                missing = len(expected_order) - len(order)
                alerts.append(
                    {
                        "severity": "medium",
                        "type": "stockout-risk",
                        "row": row_index,
                        "message": (
                            f"Row {row_index + 1} is missing {missing} expected facing(s) "
                            "relative to the planogram."
                        ),
                    }
                )
    if compliance < 0.9 and not alerts:
        alerts.append(
            {
                "severity": "medium",
                "type": "planogram-drift",
                "row": None,
                "message": "Planogram compliance is below target; review the detected product order.",
            }
        )
    if not alerts:
        alerts.append(
            {
                "severity": "low",
                "type": "healthy-shelf",
                "row": None,
                "message": "No urgent restocking issues detected in the current frame.",
            }
        )
    return alerts
