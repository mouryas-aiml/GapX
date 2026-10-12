"""Streamlit demo: rendered shelf with detection overlays + compliance."""

from __future__ import annotations

import os

import cv2
import httpx
import streamlit as st

API_URL = os.environ.get("SHELFSIGHT_API_URL", "http://localhost:8210")

st.set_page_config(page_title="shelfsight", page_icon="🛒", layout="wide")
st.title("🛒 shelfsight")
st.caption("Classical-CV shelf analytics: facings, share-of-shelf, gaps, planogram compliance")


def _ok() -> bool:
    try:
        return httpx.get(f"{API_URL}/health", timeout=3).status_code == 200
    except httpx.HTTPError:
        return False


if not _ok():
    st.error(f"API not reachable at {API_URL}. Start it with `make api`.")
    st.stop()

col1, col2 = st.columns(2)
swap = col1.checkbox("Plant a planogram swap (row 0)")
gaps = col2.checkbox("Plant out-of-stock gaps")

r = httpx.get(f"{API_URL}/demo", params={"swap": swap, "gaps": gaps}, timeout=60)
if r.status_code != 200:
    st.error(r.text)
    st.stop()
body = r.json()

from shelfsight.settings import get_config  # noqa: E402
from shelfsight.vision.generate import render_shelf  # noqa: E402

expected = [list(row) for row in get_config()["planogram"]["expected"]]
if swap:
    expected[0][0], expected[0][2] = expected[0][2], expected[0][0]
if gaps:
    expected[1][1] = None
    expected[2][3] = None
rgb, _ = render_shelf(expected, seed=7)
overlay = cv2.cvtColor(rgb.copy(), cv2.COLOR_RGB2BGR)
for box in body["boxes"]:
    cv2.rectangle(
        overlay, (box["x"], box["y"]), (box["x"] + box["w"], box["y"] + box["h"]), (0, 0, 0), 2
    )
    cv2.putText(
        overlay,
        box["brand"][:5],
        (box["x"] + 4, box["y"] + 16),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.45,
        (0, 0, 0),
        1,
    )
st.image(cv2.cvtColor(overlay, cv2.COLOR_BGR2RGB), caption="Detected facings", width="stretch")

c1, c2, c3 = st.columns(3)
c1.metric("Facings", body["total_facings"])
c2.metric("Gaps", sum(row["gaps"] for row in body["facings_per_row"]))
c3.metric("Planogram compliance", f"{body['planogram']['overall']:.0%}")

st.subheader("Share of shelf")
st.bar_chart(body["share_of_shelf"])

st.subheader("Per-row planogram check")
for row in body["planogram"]["rows"]:
    icon = "✅" if row["compliance"] == 1 else "⚠️"
    st.markdown(
        f"{icon} row {row['row']}: expected `{row['expected']}` → detected `{row['detected']}` "
        f"({row['compliance']:.0%})"
    )
