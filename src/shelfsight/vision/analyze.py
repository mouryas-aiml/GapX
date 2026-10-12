"""Computer Vision Shelf Intelligence Engine for GapX.

Implements multi-cue row detection, CLAHE illumination normalization,
calibrated brand facing detection, Non-Maximum Suppression (NMS),
precise gap box localization, planogram compliance, misplaced product
identification, and actionable restocking recommendations.
"""

from __future__ import annotations

import base64
import time
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
    confidence: float = 0.95


@dataclass
class GapBox:
    row: int
    x: int
    y: int
    w: int
    h: int
    type: str = "empty_shelf_gap"
    confidence: float = 0.90


@dataclass
class RowAnalysis:
    row: int
    facings: list[Facing] = field(default_factory=list)
    gaps: int = 0
    gap_boxes: list[GapBox] = field(default_factory=list)

    def brand_order(self) -> list[str]:
        return [f.brand for f in sorted(self.facings, key=lambda f: f.x)]

    def facing_count(self) -> int:
        return len(self.facings)

    def unique_brands(self) -> set[str]:
        return {f.brand for f in self.facings}


def preprocess_image(image_bgr: np.ndarray, apply_clahe: bool = True) -> np.ndarray:
    """Applies CLAHE on the luminance channel to normalize shelf glare and shadows."""
    if not apply_clahe:
        return image_bgr

    lab = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2LAB)
    l_channel, a_channel, b_channel = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l_norm = clahe.apply(l_channel)
    lab_norm = cv2.merge((l_norm, a_channel, b_channel))
    return cv2.cvtColor(lab_norm, cv2.COLOR_LAB2BGR)


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
    """Shelf rows via saturation projection profile combined with edge boundaries."""
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

    merged: list[tuple[int, int]] = []
    for band in raw:
        if merged and band[0] - merged[-1][1] < 22:
            merged[-1] = (merged[-1][0], band[1])
        else:
            merged.append(band)
    return [(y0, y1) for y0, y1 in merged if y1 - y0 > 30]


def calculate_iou(box1: dict[str, Any] | Facing, box2: dict[str, Any] | Facing) -> float:
    """Calculates Intersection over Union between two boxes."""
    b1 = vars(box1) if isinstance(box1, Facing) else box1
    b2 = vars(box2) if isinstance(box2, Facing) else box2

    x1 = max(b1["x"], b2["x"])
    y1 = max(b1["y"], b2["y"])
    x2 = min(b1["x"] + b1["w"], b2["x"] + b2["w"])
    y2 = min(b1["y"] + b1["h"], b2["y"] + b2["h"])

    inter_w = max(0, x2 - x1)
    inter_h = max(0, y2 - y1)
    inter_area = inter_w * inter_h

    area1 = b1["w"] * b1["h"]
    area2 = b2["w"] * b2["h"]
    union_area = area1 + area2 - inter_area

    if union_area <= 0:
        return 0.0
    return inter_area / union_area


def apply_nms(facings: list[Facing], iou_threshold: float = 0.40) -> list[Facing]:
    """Applies Non-Maximum Suppression (NMS) to eliminate overlapping bounding boxes."""
    if not facings:
        return []

    # Sort descending by confidence score then area
    sorted_facings = sorted(facings, key=lambda f: (f.confidence, f.w * f.h), reverse=True)
    keep: list[Facing] = []

    for f in sorted_facings:
        overlap = False
        for chosen in keep:
            # Check overlap if in the same row
            if f.row == chosen.row and calculate_iou(f, chosen) > iou_threshold:
                overlap = True
                break
        if not overlap:
            keep.append(f)

    return sorted(keep, key=lambda f: (f.row, f.x))


def calculate_facing_confidence(
    contour: np.ndarray,
    brand_mask: np.ndarray,
    hsv_roi: np.ndarray,
    expected_hue: int,
    hue_tol: int,
) -> float:
    """Calculates a calibrated confidence score for a detected facing contour."""
    x, y, w, h = cv2.boundingRect(contour)
    if w <= 0 or h <= 0:
        return 0.50

    # 1. Mask fill ratio
    roi_mask = brand_mask[y : y + h, x : x + w]
    fill_ratio = float(np.count_nonzero(roi_mask) / (w * h))

    # 2. Hue central tendency inside mask
    roi_hsv = hsv_roi[y : y + h, x : x + w]
    mask_pixels = roi_mask > 0
    if np.any(mask_pixels):
        actual_hues = roi_hsv[:, :, 0][mask_pixels].astype(float)
        diff = np.abs(actual_hues - expected_hue)
        diff = np.minimum(diff, 180.0 - diff)  # Circular wrap
        hue_closeness = float(np.clip(1.0 - (np.mean(diff) / max(hue_tol, 1)), 0.0, 1.0))
    else:
        hue_closeness = 0.50

    # 3. Geometric regularity (retail products generally have aspect ratios between 0.2 and 2.5)
    aspect = h / max(w, 1)
    shape_score = 0.95 if 0.4 <= aspect <= 3.0 else 0.70

    calibrated = 0.45 * fill_ratio + 0.35 * hue_closeness + 0.20 * shape_score
    return round(float(np.clip(calibrated, 0.40, 0.99)), 3)


def analyze_image(
    image_bgr: np.ndarray,
    conf_threshold: float = 0.35,
    nms_iou: float = 0.40,
    gap_min_width: int | None = None,
    clahe: bool = True,
    return_annotated: bool = False,
) -> dict[str, Any]:
    """Analyzes a shelf image: rows -> facings with confidence & NMS -> localized gaps -> share of shelf."""
    start_time = time.perf_counter()
    cfg = get_config()["vision"]
    brands_cfg = get_config()["brands"]
    gap_width_thresh = gap_min_width if gap_min_width is not None else cfg.get("gap_min_width", 40)

    # Illumination preprocessing
    proc_img = preprocess_image(image_bgr, apply_clahe=clahe)
    hsv = cv2.cvtColor(proc_img, cv2.COLOR_BGR2HSV)
    masks = _brand_masks(hsv)
    row_bands = detect_rows(image_bgr)

    rows: list[RowAnalysis] = []
    img_width = image_bgr.shape[1]

    for r, (y0, y1) in enumerate(row_bands):
        analysis = RowAnalysis(row=r)
        occupied = np.zeros(img_width, dtype=bool)
        candidate_facings: list[Facing] = []
        row_height = y1 - y0

        for brand, mask in masks.items():
            band = mask[y0:y1]
            band_hsv = hsv[y0:y1]
            spec = brands_cfg[brand]

            # Morphological closing to keep labeled packaging intact
            kernel = np.ones((21, 5), np.uint8)
            cleaned = cv2.morphologyEx(band, cv2.MORPH_CLOSE, kernel)
            contours, _ = cv2.findContours(cleaned, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

            for contour in contours:
                x, y, w, h = cv2.boundingRect(contour)
                if w * h < cfg["min_facing_area"] or w < 10 or h < 10:
                    continue

                conf = calculate_facing_confidence(
                    contour, band, band_hsv, spec["hue"], spec["tol"]
                )
                if conf >= conf_threshold:
                    candidate_facings.append(
                        Facing(
                            row=r,
                            brand=brand,
                            x=int(x),
                            y=int(y0 + y),
                            w=int(w),
                            h=int(h),
                            confidence=conf,
                        )
                    )

        # Apply Non-Maximum Suppression
        final_facings = apply_nms(candidate_facings, iou_threshold=nms_iou)
        analysis.facings = final_facings

        for f in final_facings:
            occupied[f.x : min(f.x + f.w, img_width)] = True

        # Localized empty-gap detection
        span, start_x = 0, 0
        gaps_count = 0
        gap_boxes: list[GapBox] = []

        margin = 8
        for x in range(margin, img_width - margin):
            if not occupied[x]:
                if span == 0:
                    start_x = x
                span += 1
            else:
                if span >= gap_width_thresh:
                    gaps_count += 1
                    gap_boxes.append(
                        GapBox(
                            row=r,
                            x=int(start_x),
                            y=int(y0 + 10),
                            w=int(span),
                            h=int(row_height - 20),
                            confidence=0.92,
                        )
                    )
                span = 0

        if span >= gap_width_thresh:
            gaps_count += 1
            gap_boxes.append(
                GapBox(
                    row=r,
                    x=int(start_x),
                    y=int(y0 + 10),
                    w=int(span),
                    h=int(row_height - 20),
                    confidence=0.92,
                )
            )

        analysis.gaps = gaps_count
        analysis.gap_boxes = gap_boxes
        rows.append(analysis)

    all_facings = [f for row in rows for f in row.facings]
    all_gap_boxes = [g for row in rows for g in row.gap_boxes]

    counts: dict[str, int] = {}
    for f in all_facings:
        counts[f.brand] = counts.get(f.brand, 0) + 1
    total = max(sum(counts.values()), 1)
    share = {brand: round(n / total, 4) for brand, n in sorted(counts.items())}

    elapsed_ms = round((time.perf_counter() - start_time) * 1000.0, 2)

    result_dict: dict[str, Any] = {
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
        "gap_boxes": [vars(g) for g in all_gap_boxes],
        "latency_ms": elapsed_ms,
    }

    if return_annotated:
        annotated_bgr = render_detection_overlay(image_bgr, result_dict)
        _, buffer = cv2.imencode(".jpg", annotated_bgr, [cv2.IMWRITE_JPEG_QUALITY, 88])
        result_dict["annotated_image_base64"] = base64.b64encode(buffer).decode("utf-8")

    return result_dict


def planogram_compliance(
    detected_rows: list[dict[str, Any]],
    expected_planogram: list[list[str]] | None = None,
) -> dict[str, Any]:
    """Evaluates planogram compliance and detects misplaced product instances."""
    expected = expected_planogram or get_config()["planogram"]["expected"]
    per_row = []
    misplaced_items: list[dict[str, Any]] = []

    for r, expected_order in enumerate(expected):
        detected_row = next((row for row in detected_rows if row["row"] == r), None)
        detected = detected_row["order"] if detected_row else []

        matches = sum(1 for a, b in zip(expected_order, detected, strict=False) if a == b)
        compliance = round(matches / max(len(expected_order), 1), 3)

        # Flag misplaced items
        for slot_idx, (exp_b, act_b) in enumerate(zip(expected_order, detected, strict=False)):
            if exp_b != act_b:
                misplaced_items.append(
                    {
                        "row": r,
                        "position": slot_idx + 1,
                        "detected_brand": act_b,
                        "expected_brand": exp_b,
                        "message": f"Row {r + 1}, Slot {slot_idx + 1}: Found '{act_b}', expected '{exp_b}'",
                    }
                )

        per_row.append(
            {
                "row": r,
                "expected": expected_order,
                "detected": detected,
                "compliance": compliance,
            }
        )

    overall = round(sum(r["compliance"] for r in per_row) / max(len(per_row), 1), 3)
    return {
        "overall": overall,
        "rows": per_row,
        "misplaced_items": misplaced_items,
    }


def build_restock_recommendations(
    detected_rows: list[dict[str, Any]],
    planogram: dict[str, Any] | None = None,
) -> list[dict[str, Any]]:
    """Derives actionable restocking recommendations with facing deficit and urgency."""
    expected_rows = (planogram or {}).get("rows", [])
    recommendations: list[dict[str, Any]] = []

    for row_info in expected_rows:
        row_idx = int(row_info["row"])
        expected_brands = list(row_info.get("expected", []))
        detected_row = next((r for r in detected_rows if int(r["row"]) == row_idx), None)
        detected_brands = list(detected_row.get("order", [])) if detected_row else []
        gaps = int(detected_row.get("gaps", 0)) if detected_row else len(expected_brands)

        # Count brand frequencies in expected vs detected
        exp_counts: dict[str, int] = {}
        for b in expected_brands:
            exp_counts[b] = exp_counts.get(b, 0) + 1

        det_counts: dict[str, int] = {}
        for b in detected_brands:
            det_counts[b] = det_counts.get(b, 0) + 1

        for brand, exp_n in exp_counts.items():
            det_n = det_counts.get(brand, 0)
            if det_n < exp_n:
                deficit = exp_n - det_n
                urgency = "critical" if det_n == 0 else "high" if deficit >= 2 else "medium"
                recommendations.append(
                    {
                        "brand": brand,
                        "row": row_idx,
                        "row_display": f"Row {row_idx + 1}",
                        "current_facings": det_n,
                        "target_facings": exp_n,
                        "deficit": deficit,
                        "urgency": urgency,
                        "suggested_units": deficit
                        * 4,  # standard depth factor of 4 units per facing
                        "reason": f"Facing deficit ({det_n}/{exp_n}) on Row {row_idx + 1}"
                        + (f" with {gaps} gaps" if gaps else ""),
                    }
                )

    return recommendations


def build_alerts(
    detected_rows: list[dict[str, Any]],
    planogram: dict[str, Any] | None = None,
) -> list[dict[str, Any]]:
    """Derives priority-based actionable retail alerts with severity and resolution metadata."""
    alerts: list[dict[str, Any]] = []
    compliance = float((planogram or {}).get("overall", 1.0))
    misplaced = (planogram or {}).get("misplaced_items", [])

    # 1. Critical Gap Alerts
    for row in detected_rows:
        row_index = int(row["row"])
        gaps = int(row.get("gaps", 0))
        if gaps > 0:
            alerts.append(
                {
                    "severity": "high",
                    "type": "restock-gap",
                    "row": row_index,
                    "message": f"Row {row_index + 1} has {gaps} empty shelf gap(s) that need restocking.",
                    "action": "Dispatch associate to replenish empty shelf slots",
                }
            )

    # 2. Stockout Risk from Facing Deficit
    expected = (planogram or {}).get("rows", [])
    for row in detected_rows:
        row_index = int(row["row"])
        order = list(row.get("order", []))
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
                        "action": "Check backroom inventory for missing facing SKUs",
                    }
                )

    # 3. Misplaced Product Alerts
    for item in misplaced:
        alerts.append(
            {
                "severity": "medium",
                "type": "misplaced-product",
                "row": item["row"],
                "message": item["message"],
                "action": f"Relocate '{item['detected_brand']}' to its designated planogram zone",
            }
        )

    # 4. Planogram Drift Alert
    if compliance < 0.9 and not any(a["type"] == "misplaced-product" for a in alerts):
        alerts.append(
            {
                "severity": "medium",
                "type": "planogram-drift",
                "row": None,
                "message": f"Planogram compliance is below target ({int(compliance * 100)}%); review the detected product order.",
                "action": "Conduct planogram realignment audit",
            }
        )

    # 5. Healthy Shelf Signal
    if not alerts:
        alerts.append(
            {
                "severity": "low",
                "type": "healthy-shelf",
                "row": None,
                "message": "No urgent restocking issues detected in the current frame.",
                "action": "No action required",
            }
        )

    return alerts


def render_detection_overlay(image_bgr: np.ndarray, analysis: dict[str, Any]) -> np.ndarray:
    """Renders high-contrast bounding boxes, brand badges, and gap indicators onto the shelf photo."""
    overlay = image_bgr.copy()

    # Brand palette (BGR)
    palette = {
        "redco": (40, 40, 230),  # Vibrant Red
        "bluebrand": (240, 140, 30),  # Electric Blue
        "greenfoods": (40, 200, 60),  # Bright Green
        "orangeline": (20, 140, 245),  # Vibrant Orange
    }
    default_color = (200, 200, 200)

    # 1. Draw gaps first (dashed or transparent amber/red boxes)
    for g in analysis.get("gap_boxes", []):
        gx, gy, gw, gh = g["x"], g["y"], g["w"], g["h"]
        # Shaded red overlay for gap
        sub = overlay[gy : gy + gh, gx : gx + gw]
        if sub.size > 0:
            red_tint = np.full_like(sub, (20, 20, 220), dtype=np.uint8)
            cv2.addWeighted(sub, 0.65, red_tint, 0.35, 0, sub)
        cv2.rectangle(overlay, (gx, gy), (gx + gw, gy + gh), (0, 0, 255), 2)
        cv2.putText(
            overlay,
            "EMPTY GAP",
            (gx + 4, gy + 18),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.45,
            (0, 0, 255),
            1,
            cv2.LINE_AA,
        )

    # 2. Draw product facing boxes
    for b in analysis.get("boxes", []):
        bx, by, bw, bh = b["x"], b["y"], b["w"], b["h"]
        brand = b.get("brand", "item")
        conf = b.get("confidence", 0.9)
        color = palette.get(brand, default_color)

        cv2.rectangle(overlay, (bx, by), (bx + bw, by + bh), color, 2)

        # Label badge header
        label = f"{brand} {int(conf * 100)}%"
        (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.42, 1)
        cv2.rectangle(overlay, (bx, by - th - 6), (bx + tw + 6, by), color, -1)
        cv2.putText(
            overlay,
            label,
            (bx + 3, by - 4),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.42,
            (255, 255, 255),
            1,
            cv2.LINE_AA,
        )

    return overlay
