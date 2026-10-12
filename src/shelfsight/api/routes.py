"""API routes: /analyze (upload), /demo, /health."""

from __future__ import annotations

import logging

import cv2
import numpy as np
from fastapi import APIRouter, HTTPException, UploadFile

from shelfsight.settings import get_config
from shelfsight.vision.analyze import analyze_image, planogram_compliance, build_alerts
from shelfsight.vision.generate import render_shelf

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.post("/analyze")
async def analyze(file: UploadFile) -> dict:
    data = await file.read()
    if not data:
        raise HTTPException(status_code=422, detail="Uploaded file is empty")
    array = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
    if array is None:
        raise HTTPException(status_code=422, detail="Not a decodable image")
    result = analyze_image(array)
    result["planogram"] = planogram_compliance(result["facings_per_row"])
    result["alerts"] = build_alerts(result["facings_per_row"], result["planogram"])
    return result


@router.get("/demo")
def demo(swap: bool = False, gaps: bool = False) -> dict:
    """Analyze a freshly rendered shelf; optionally plant a planogram swap or gaps."""
    expected = [list(row) for row in get_config()["planogram"]["expected"]]
    if swap:
        expected[0][0], expected[0][2] = expected[0][2], expected[0][0]
    if gaps:
        expected[1][1] = None
        expected[2][3] = None
    rgb, truth = render_shelf(expected, seed=7)
    bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
    result = analyze_image(bgr)
    result["planogram"] = planogram_compliance(result["facings_per_row"])
    result["alerts"] = build_alerts(result["facings_per_row"], result["planogram"])
    result["truth"] = truth
    return result
