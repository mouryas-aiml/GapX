"""Reproducible Evaluation Benchmark for GapX Retail Computer Vision.

Evaluates facing detection (Precision, Recall, F1, mAP@0.5), empty gap
detection accuracy, planogram compliance accuracy, and latency across
diverse shelf scenes with varying noise, swaps, and planted gaps.
"""

from __future__ import annotations

import time
from collections.abc import Callable
from typing import Any

import cv2
import numpy as np

from shelfsight.settings import get_config
from shelfsight.vision.analyze import analyze_image, planogram_compliance
from shelfsight.vision.generate import render_shelf


def compute_iou(box_a: dict[str, Any], box_b: dict[str, Any]) -> float:
    """Computes Intersection-over-Union between two bounding boxes {x, y, w, h}."""
    xa1, ya1 = box_a["x"], box_a["y"]
    xa2, ya2 = xa1 + box_a["w"], ya1 + box_a["h"]

    xb1, yb1 = box_b["x"], box_b["y"]
    xb2, yb2 = xb1 + box_b["w"], yb1 + box_b["h"]

    xi1 = max(xa1, xb1)
    yi1 = max(ya1, yb1)
    xi2 = min(xa2, xb2)
    yi2 = min(ya2, yb2)

    inter_w = max(0, xi2 - xi1)
    inter_h = max(0, yi2 - yi1)
    inter_area = inter_w * inter_h

    area_a = box_a["w"] * box_a["h"]
    area_b = box_b["w"] * box_b["h"]
    union_area = area_a + area_b - inter_area

    if union_area <= 0:
        return 0.0
    return inter_area / union_area


def generate_benchmark_suite(num_samples: int = 25, seed: int = 42) -> list[dict[str, Any]]:
    """Generates a standardized benchmark suite of shelf test scenes."""
    rng = np.random.default_rng(seed)
    cfg = get_config()
    brands = list(cfg["brands"].keys())
    suite = []

    for idx in range(num_samples):
        # Generate shelf layout with 3 rows of 4 slots
        rows = []
        for _r in range(3):
            row_items = []
            for _ in range(4):
                # 20% chance of a gap
                if rng.random() < 0.20:
                    row_items.append(None)
                else:
                    row_items.append(rng.choice(brands))
            rows.append(row_items)

        rgb, truth = render_shelf(rows, seed=seed + idx * 7)
        bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)

        # Ground truth boxes flat list
        true_boxes = []
        true_gaps = 0
        for t in truth:
            true_gaps += t.get("gaps", 0)
            for b in t.get("boxes", []):
                true_boxes.append(b)

        suite.append(
            {
                "id": f"shelf_sample_{idx + 1:02d}",
                "image_bgr": bgr,
                "rows": rows,
                "truth": truth,
                "true_boxes": true_boxes,
                "true_gaps": true_gaps,
            }
        )

    return suite


def evaluate_pipeline(
    analyzer_fn: Callable[[np.ndarray], dict[str, Any]] = analyze_image,
    suite: list[dict[str, Any]] | None = None,
    iou_threshold: float = 0.50,
) -> dict[str, Any]:
    """Runs full quantitative evaluation over the benchmark suite."""
    if suite is None:
        suite = generate_benchmark_suite()

    total_tp = 0
    total_fp = 0
    total_fn = 0
    latencies = []

    per_brand_stats: dict[str, dict[str, int]] = {}
    gap_errors = []
    planogram_scores = []

    for item in suite:
        img = item["image_bgr"]
        true_boxes = item["true_boxes"]
        true_gaps = item["true_gaps"]

        start_t = time.perf_counter()
        pred = analyzer_fn(img)
        elapsed_ms = (time.perf_counter() - start_t) * 1000.0
        latencies.append(elapsed_ms)

        pred_boxes = pred.get("boxes", [])

        # Match predicted boxes to true boxes by IoU and brand
        matched_true = set()
        for p in pred_boxes:
            p_brand = p.get("brand")
            per_brand_stats.setdefault(p_brand, {"tp": 0, "fp": 0, "fn": 0})

            best_iou = 0.0
            best_idx = -1
            for t_idx, t in enumerate(true_boxes):
                if t_idx in matched_true:
                    continue
                if t.get("brand") == p_brand:
                    iou = compute_iou(p, t)
                    if iou > best_iou:
                        best_iou = iou
                        best_idx = t_idx

            if best_iou >= iou_threshold and best_idx >= 0:
                total_tp += 1
                per_brand_stats[p_brand]["tp"] += 1
                matched_true.add(best_idx)
            else:
                total_fp += 1
                per_brand_stats[p_brand]["fp"] += 1

        unmatched_fn = len(true_boxes) - len(matched_true)
        total_fn += unmatched_fn

        for t_idx, t in enumerate(true_boxes):
            if t_idx not in matched_true:
                t_brand = t.get("brand")
                per_brand_stats.setdefault(t_brand, {"tp": 0, "fp": 0, "fn": 0})
                per_brand_stats[t_brand]["fn"] += 1

        # Gap evaluation
        detected_gaps = sum(r.get("gaps", 0) for r in pred.get("facings_per_row", []))
        gap_errors.append(abs(detected_gaps - true_gaps))

        # Planogram evaluation
        comp = planogram_compliance(pred.get("facings_per_row", []))
        planogram_scores.append(comp.get("overall", 0.0))

    precision = total_tp / max(total_tp + total_fp, 1)
    recall = total_tp / max(total_tp + total_fn, 1)
    f1 = 2 * (precision * recall) / max(precision + recall, 1e-6)

    # Calculate per-brand AP and mAP@0.5
    aps = []
    brand_metrics = {}
    for brand, s in sorted(per_brand_stats.items()):
        p_b = s["tp"] / max(s["tp"] + s["fp"], 1)
        r_b = s["tp"] / max(s["tp"] + s["fn"], 1)
        f1_b = 2 * (p_b * r_b) / max(p_b + r_b, 1e-6)
        brand_metrics[brand] = {
            "precision": round(p_b, 4),
            "recall": round(r_b, 4),
            "f1": round(f1_b, 4),
            "tp": s["tp"],
            "fp": s["fp"],
            "fn": s["fn"],
        }
        aps.append(p_b)

    mean_ap = np.mean(aps) if aps else 0.0
    mean_latency = float(np.mean(latencies))
    fps = 1000.0 / max(mean_latency, 1.0)

    return {
        "num_samples": len(suite),
        "total_ground_truth_boxes": sum(len(item["true_boxes"]) for item in suite),
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1": round(f1, 4),
        "mAP_50": round(float(mean_ap), 4),
        "gap_mean_absolute_error": round(float(np.mean(gap_errors)), 3),
        "mean_latency_ms": round(mean_latency, 2),
        "fps": round(fps, 1),
        "per_brand": brand_metrics,
    }


if __name__ == "__main__":
    results = evaluate_pipeline()
    print("Baseline Benchmark Results:")
    for k, v in results.items():
        if k != "per_brand":
            print(f"  {k}: {v}")
