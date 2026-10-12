"""API routes for GapX Retail Intelligence."""

from __future__ import annotations

import base64
import logging
from typing import Any

import cv2
import numpy as np
from fastapi import APIRouter, HTTPException, Query, UploadFile
from pydantic import BaseModel, Field

from shelfsight import __version__
from shelfsight.settings import get_config
from shelfsight.vision.analyze import (
    analyze_image,
    build_alerts,
    build_restock_recommendations,
    planogram_compliance,
)
from shelfsight.vision.generate import render_shelf

logger = logging.getLogger(__name__)
router = APIRouter()


class FrameAnalysisRequest(BaseModel):
    """Payload for direct base64 image analysis from webcam or camera feed."""

    image_base64: str = Field(..., description="Base64 encoded JPEG or PNG image")
    conf_threshold: float = Field(0.35, ge=0.1, le=1.0)
    nms_iou: float = Field(0.40, ge=0.1, le=0.9)
    gap_min_width: int = Field(35, ge=10, le=200)
    clahe: bool = Field(True)
    return_annotated: bool = Field(True)


@router.get("/health")
def health() -> dict[str, Any]:
    """Live health check with version and compute diagnostics."""
    cuda_devices = 0
    try:
        cuda_devices = cv2.cuda.getCudaEnabledDeviceCount()
    except Exception:
        cuda_devices = 0

    return {
        "status": "ok",
        "service": "GapX AI Shelf Intelligence",
        "version": __version__,
        "hardware": "NVIDIA GPU (CUDA-ready)" if cuda_devices > 0 else "CPU Engine",
        "engine": "OpenCV 5.0 + Calibrated Multi-Cue CV",
    }


@router.post("/analyze")
async def analyze(
    file: UploadFile,
    conf_threshold: float = 0.35,
    nms_iou: float = 0.40,
    gap_min_width: int = 35,
    clahe: bool = True,
    return_annotated: bool = True,
) -> dict[str, Any]:
    """Analyzes an uploaded retail shelf image for facings, gaps, and compliance."""
    data = await file.read()
    if not data:
        raise HTTPException(status_code=422, detail="Uploaded file is empty")
    array = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
    if array is None:
        raise HTTPException(status_code=422, detail="Not a decodable image")

    result = analyze_image(
        array,
        conf_threshold=conf_threshold,
        nms_iou=nms_iou,
        gap_min_width=gap_min_width,
        clahe=clahe,
        return_annotated=return_annotated,
    )
    result["planogram"] = planogram_compliance(result["facings_per_row"])
    result["alerts"] = build_alerts(result["facings_per_row"], result["planogram"])
    result["recommendations"] = build_restock_recommendations(
        result["facings_per_row"], result["planogram"]
    )
    return result


@router.post("/analyze-frame")
def analyze_frame(payload: FrameAnalysisRequest) -> dict[str, Any]:
    """Analyzes a base64 encoded frame directly from live camera feed."""
    raw = payload.image_base64
    if "," in raw:
        raw = raw.split(",", 1)[1]

    try:
        img_bytes = base64.b64decode(raw)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Invalid base64 payload: {e}") from e

    array = cv2.imdecode(np.frombuffer(img_bytes, np.uint8), cv2.IMREAD_COLOR)
    if array is None:
        raise HTTPException(status_code=422, detail="Decoded buffer is not a valid image")

    result = analyze_image(
        array,
        conf_threshold=payload.conf_threshold,
        nms_iou=payload.nms_iou,
        gap_min_width=payload.gap_min_width,
        clahe=payload.clahe,
        return_annotated=payload.return_annotated,
    )
    result["planogram"] = planogram_compliance(result["facings_per_row"])
    result["alerts"] = build_alerts(result["facings_per_row"], result["planogram"])
    result["recommendations"] = build_restock_recommendations(
        result["facings_per_row"], result["planogram"]
    )
    return result


@router.get("/demo")
def demo(
    swap: bool = False,
    gaps: bool = False,
    conf_threshold: float = 0.35,
    nms_iou: float = 0.40,
    return_annotated: bool = True,
) -> dict[str, Any]:
    """Analyzes a freshly rendered shelf; optionally plants a planogram swap or gaps."""
    expected = [list(row) for row in get_config()["planogram"]["expected"]]
    if swap:
        expected[0][0], expected[0][2] = expected[0][2], expected[0][0]
    if gaps:
        expected[1][1] = None
        expected[2][3] = None
    rgb, truth = render_shelf(expected, seed=7)
    bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)

    result = analyze_image(
        bgr,
        conf_threshold=conf_threshold,
        nms_iou=nms_iou,
        return_annotated=return_annotated,
    )
    result["planogram"] = planogram_compliance(result["facings_per_row"])
    result["alerts"] = build_alerts(result["facings_per_row"], result["planogram"])
    result["recommendations"] = build_restock_recommendations(
        result["facings_per_row"], result["planogram"]
    )
    result["truth"] = truth

    # Also provide original rendered image as base64 for convenient visual preview
    _, orig_buf = cv2.imencode(".jpg", bgr, [cv2.IMWRITE_JPEG_QUALITY, 88])
    result["original_image_base64"] = base64.b64encode(orig_buf).decode("utf-8")

    return result


@router.get("/benchmark")
def get_benchmark(samples: int = Query(15, ge=5, le=50)) -> dict[str, Any]:
    """Executes reproducible evaluation benchmark across test shelf scenes."""
    from shelfsight.vision.benchmark import evaluate_pipeline, generate_benchmark_suite

    suite = generate_benchmark_suite(num_samples=samples, seed=42)
    return evaluate_pipeline(suite=suite)


@router.get("/config")
def get_system_config() -> dict[str, Any]:
    """Returns active vision parameters, brand registry, and planogram configuration."""
    return get_config()
