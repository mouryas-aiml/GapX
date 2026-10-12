"""Tests for extended GapX API routes, benchmarking, and detection enhancements."""

import base64

import cv2
from fastapi.testclient import TestClient

from shelfsight.api.main import create_app
from shelfsight.vision.benchmark import evaluate_pipeline, generate_benchmark_suite
from shelfsight.vision.generate import render_shelf

CLEAN = [
    ["redco", "redco", "bluebrand", "bluebrand"],
    ["greenfoods", "greenfoods", "orangeline", "orangeline"],
    ["bluebrand", "greenfoods", "redco", "orangeline"],
]


def test_api_health_extended():
    client = TestClient(create_app())
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert "version" in data
    assert "hardware" in data
    assert "engine" in data


def test_api_config_endpoint():
    client = TestClient(create_app())
    res = client.get("/config")
    assert res.status_code == 200
    cfg = res.json()
    assert "brands" in cfg
    assert "planogram" in cfg


def test_api_benchmark_endpoint():
    client = TestClient(create_app())
    res = client.get("/benchmark?samples=5")
    assert res.status_code == 200
    report = res.json()
    assert report["num_samples"] == 5
    assert report["precision"] >= 0.90
    assert report["recall"] >= 0.90
    assert "gap_mean_absolute_error" in report
    assert "fps" in report


def test_api_analyze_frame_base64():
    client = TestClient(create_app())
    rgb, _ = render_shelf(CLEAN, seed=4)
    bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
    ok, buf = cv2.imencode(".jpg", bgr)
    assert ok
    b64_str = base64.b64encode(buf).decode("utf-8")

    payload = {
        "image_base64": f"data:image/jpeg;base64,{b64_str}",
        "conf_threshold": 0.35,
        "nms_iou": 0.40,
        "gap_min_width": 35,
        "clahe": True,
        "return_annotated": True,
    }
    res = client.post("/analyze-frame", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["total_facings"] > 0
    assert "gap_boxes" in data
    assert "recommendations" in data
    assert "annotated_image_base64" in data


def test_benchmark_suite_generation():
    suite = generate_benchmark_suite(num_samples=3, seed=123)
    assert len(suite) == 3
    results = evaluate_pipeline(suite=suite)
    assert results["num_samples"] == 3
    assert results["mAP_50"] >= 0.85
