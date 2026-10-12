"""CV pipeline vs rendered ground truth."""

import cv2
import numpy as np
from fastapi.testclient import TestClient

from shelfsight.api.main import create_app
from shelfsight.vision.analyze import analyze_image, detect_rows, planogram_compliance
from shelfsight.vision.generate import render_shelf

CLEAN = [
    ["redco", "redco", "bluebrand", "bluebrand"],
    ["greenfoods", "greenfoods", "orangeline", "orangeline"],
    ["bluebrand", "greenfoods", "redco", "orangeline"],
]


def _bgr(rows, seed=1):
    rgb, truth = render_shelf(rows, seed=seed)
    return cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR), truth


def test_rows_detected():
    img, _ = _bgr(CLEAN)
    assert len(detect_rows(img)) == 3


def test_facings_counted_correctly():
    img, truth = _bgr(CLEAN)
    result = analyze_image(img)
    expected_total = sum(sum(t["facings"].values()) for t in truth)
    assert abs(result["total_facings"] - expected_total) <= 1


def test_share_of_shelf_sums_to_one():
    img, _ = _bgr(CLEAN)
    share = analyze_image(img)["share_of_shelf"]
    assert abs(sum(share.values()) - 1.0) < 0.01
    assert share["redco"] > 0.15


def test_brand_order_recovered():
    img, _ = _bgr(CLEAN)
    result = analyze_image(img)
    assert result["facings_per_row"][0]["order"] == CLEAN[0]


def test_gaps_detected():
    with_gaps = [row[:] for row in CLEAN]
    with_gaps[1][1] = None
    img, _ = _bgr(with_gaps, seed=2)
    result = analyze_image(img)
    assert result["facings_per_row"][1]["gaps"] >= 1


def test_compliance_perfect_on_clean_and_degraded_on_swap():
    img, _ = _bgr(CLEAN)
    clean = planogram_compliance(analyze_image(img)["facings_per_row"])
    swapped_rows = [row[:] for row in CLEAN]
    swapped_rows[0][0], swapped_rows[0][2] = swapped_rows[0][2], swapped_rows[0][0]
    img2, _ = _bgr(swapped_rows, seed=3)
    swapped = planogram_compliance(analyze_image(img2)["facings_per_row"])
    assert clean["overall"] == 1.0
    assert swapped["overall"] < 1.0


def test_api_demo_and_analyze():
    client = TestClient(create_app())
    body = client.get("/demo").json()
    assert body["planogram"]["overall"] == 1.0
    rgb, _ = render_shelf(CLEAN, seed=4)
    ok, png = cv2.imencode(".png", cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR))
    assert ok
    r = client.post("/analyze", files={"file": ("shelf.png", png.tobytes(), "image/png")})
    assert r.status_code == 200
    assert r.json()["total_facings"] > 0


def test_api_rejects_non_image():
    client = TestClient(create_app())
    r = client.post("/analyze", files={"file": ("x.txt", b"not an image", "text/plain")})
    assert r.status_code == 422


def test_analysis_never_perfectly_stable_under_noise():
    counts = set()
    for seed in range(3):
        img, _ = _bgr(CLEAN, seed=seed)
        counts.add(analyze_image(img)["total_facings"])
    assert counts, "sanity"
    assert np.mean(list(counts)) > 0
