"""Render synthetic shelf photos with ground truth.

Shelves are grey bands; products are saturated colored boxes (brand hues) with
noise, slight jitter, and optional planted gaps / planogram swaps. Ground
truth records per-row facings and gap locations.
"""

from __future__ import annotations

import colorsys

import numpy as np

BRAND_HUES = {"redco": 0, "bluebrand": 110, "greenfoods": 55, "orangeline": 18}
ROW_HEIGHT = 120
PRODUCT_TOP_PAD = 14
SHELF_BAR = 16


def _brand_rgb(brand: str, rng) -> tuple[int, int, int]:
    hue_cv = BRAND_HUES[brand]  # OpenCV hue (0-179)
    h = (hue_cv * 2) / 360.0
    r, g, b = colorsys.hsv_to_rgb(h, 0.85 + rng.uniform(-0.08, 0.08), 0.85 + rng.uniform(-0.1, 0.1))
    return int(r * 255), int(g * 255), int(b * 255)


def render_shelf(
    rows: list[list[str | None]],
    width: int = 800,
    seed: int = 0,
) -> tuple[np.ndarray, list[dict]]:
    """rows: per shelf row, left-to-right brand names (None = planted gap).

    Returns (RGB image array, truth rows [{row, facings: {...}, gaps: n}]).
    """
    rng = np.random.default_rng(seed)
    height = len(rows) * ROW_HEIGHT + SHELF_BAR
    img = np.full((height, width, 3), 235, dtype=np.uint8)
    img += rng.integers(-6, 7, img.shape, dtype=np.int16).astype(np.int8).view(np.uint8) * 0

    truth = []
    for r, row in enumerate(rows):
        y0 = r * ROW_HEIGHT
        # Shelf bar below products.
        img[y0 + ROW_HEIGHT - SHELF_BAR : y0 + ROW_HEIGHT, :] = 120
        slot_width = width // max(len(row), 1)
        facings: dict[str, int] = {}
        gaps = 0
        for i, brand in enumerate(row):
            if brand is None:
                gaps += 1
                continue
            facings[brand] = facings.get(brand, 0) + 1
            x0 = i * slot_width + int(rng.integers(4, 12))
            x1 = (i + 1) * slot_width - int(rng.integers(4, 12))
            top = y0 + PRODUCT_TOP_PAD + int(rng.integers(0, 8))
            bottom = y0 + ROW_HEIGHT - SHELF_BAR - int(rng.integers(2, 6))
            color = _brand_rgb(brand, rng)
            img[top:bottom, x0:x1] = color
            # Label stripe (white band) for realism.
            stripe_y = top + (bottom - top) // 2
            img[stripe_y : stripe_y + 8, x0 + 6 : x1 - 6] = 245
        truth.append({"row": r, "facings": facings, "gaps": gaps})

    noise = rng.normal(0, 4, img.shape)
    img = np.clip(img.astype(np.int16) + noise, 0, 255).astype(np.uint8)
    return img, truth
