<div align="center">

<img src="docs/brand/banner.svg" alt="GapX — AI-Powered Retail Shelf Intelligence" width="100%">

<br/>

[![Python 3.12](https://img.shields.io/badge/Python-3.12-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![OpenCV](https://img.shields.io/badge/OpenCV-5.0-5C3EE8?style=for-the-badge&logo=opencv&logoColor=white)](https://opencv.org)
[![React 18](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)
[![Tests Passing](https://img.shields.io/badge/Tests-22%20Passed-22C55E?style=for-the-badge&logo=pytest&logoColor=white)](https://pytest.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](./LICENSE)

<br/>

### **AI-Powered Retail Shelf Intelligence, Stockout Prevention & Planogram Compliance**

*Real-time computer vision that detects empty shelf gaps, pinpoints misplaced SKUs, evaluates planogram adherence, and triggers prioritized restocking workflows in sub-15ms.*

[Features](#-features) • [Architecture](#-architecture) • [Computer Vision & Benchmarks](#-computer-vision--reproducible-benchmark) • [API Reference](#-api-reference) • [Quickstart Guide](#-quickstart-guide) • [Troubleshooting](#-troubleshooting)

</div>

---

## 📌 Executive Summary

Retail stockouts and shelf placement drift cost brick-and-mortar retailers **over $1 trillion globally each year**. Store associates and field auditors struggle with manual clipboard audits that are slow, infrequent, and error-prone.

**GapX** transforms standard shelf imagery into real-time retail intelligence:
1. **Detects visible product facings** with calibrated confidence scoring and Non-Maximum Suppression (NMS).
2. **Localizes empty shelf gaps** with precise bounding box coordinates `[x, y, w, h]` for rapid associate replenishment.
3. **Identifies misplaced items and planogram swaps**, checking row-by-row brand sequences against merchandising standards.
4. **Calculates On-Shelf Availability (OSA %)** and generates actionable warehouse replenishment pick slips.
5. **Streams live camera monitoring** via webcam or CCTV feeds with continuous auto-scanning.
6. **Delivers enterprise SaaS UX** with electric-blue aesthetics, interactive SVG overlays, Recharts analytics, and downloadable PDF audit certificates.

---

## ⚡ Features

| Module | Capability | Description |
|---|---|---|
| 🔍 **Shelf Vision Engine** | Multi-Cue CV Detection | Combines CLAHE illumination normalization, saturation profiling, contour analysis, and NMS at 80+ FPS. |
| 🚨 **Stockout Prevention** | Localized Gap Boxes | Identifies unoccupied shelf spans, filters borders, and renders glowing warning reticles over empty slots. |
| 🎯 **Planogram Matrix** | Misplacement Pinpointing | Compares detected brand order against expected planogram rules, flagging exact slot mismatches. |
| 📦 **Inventory & OSA** | Replenishment Queue | Inferred on-shelf availability percentage, capacity fill rates, facing deficits, and unit restock suggestions. |
| 🔔 **Alerts Dispatch** | Priority Workflow Queue | Severity-based alerts (Critical, High, Medium, Low) with status progression (`Open` → `In Progress` → `Resolved`). |
| 📹 **Live Camera Scanner** | Webcam Stream & CCTV | Direct browser webcam capture and continuous 4-second auto-scanning with animated reticles. |
| 📊 **BI & Analytics** | Historical Trend Charts | Area charts tracking compliance against target benchmarks, row-level gap frequencies, and brand shares. |
| 📑 **Audit Logs & Export** | PDF Certificates & CSV | Complete searchable audit trail with one-click printable audit certificates and CSV/JSON data export. |
| 🔬 **Model Benchmark** | Live Quantitative Evaluation | Built-in benchmark suite measuring Precision, Recall, mAP@0.5, Gap MAE, and inference latency in real time. |

---

## 🏗 Architecture

```mermaid
flowchart TD
    subgraph Client ["Frontend SaaS (React 18 + TypeScript + Vite)"]
        UI[Interactive Dashboard & UI]
        Canvas[SVG Shelf Inspector Canvas]
        Cam[Live Camera Monitor]
        BI[Recharts BI Analytics]
    end

    subgraph API ["API Gateway (FastAPI @ Port 8210)"]
        Health["/health Diagnostics"]
        Analyze["/analyze & /analyze-frame"]
        Demo["/demo Scenario Engine"]
        Bench["/benchmark Evaluator"]
        CORS[CORS Middleware @ Port 5173]
    end

    subgraph Vision ["Computer Vision Intelligence Engine"]
        Pre[CLAHE Luminance Normalization]
        Rows[Saturation + Edge Row Detection]
        Facings[Calibrated Brand Facing Detector]
        NMS[Non-Maximum Suppression (IoU @ 0.40)]
        Gaps[Shelf Gap Coordinate Localizer]
        Plano[Planogram Diff & Misplaced Detector]
        Rec[Restock Priority Generator]
    end

    UI -->|Upload Image / Camera Frame| Analyze
    Cam -->|Base64 JPEG Frame Stream| Analyze
    UI -->|Trigger Scenarios| Demo
    UI -->|Request Live Evaluation| Bench

    Analyze --> Pre
    Pre --> Rows
    Rows --> Facings
    Facings --> NMS
    NMS --> Gaps
    NMS --> Plano
    Plano --> Rec

    Rec -->|JSON + Bounding Boxes + Overlay| UI
    UI --> Canvas
    UI --> BI
```

---

## 🔬 Computer Vision & Reproducible Benchmark

GapX pairs classical computer vision heuristics with modern calibration techniques to achieve ultra-fast, interpretable shelf intelligence without heavy multi-gigabyte neural weight downloads.

### Baseline vs. Upgraded Multi-Cue Engine

| Dimension | Legacy Baseline | GapX Upgraded Engine | Operational Benefit |
|---|---|---|---|
| **Illumination Handling** | Raw BGR → HSV | **CLAHE** on Luminance Channel | Robust to overhead store glare & shadows |
| **Confidence Calibration** | None (Binary 0 or 1) | **Calibrated Score (0.40–0.99)** | Filters low-contrast artifacts and edge noise |
| **Duplicate Suppression** | None (Overlapping boxes) | **Non-Maximum Suppression (IoU 0.40)** | Prevents multi-counting adjacent packaging |
| **Gap Detection** | Scalar count only | **Localized Boxes `[x, y, w, h]`** | Pinpoints exact empty slot for restockers |
| **Planogram Analysis** | Single aggregate float | **Per-Slot Misplacement Flags** | Pinpoints swapped products by row and slot |
| **Inference Latency** | ~7 ms (148 FPS) | **~12 ms (82 FPS)** | Sub-15ms real-time throughput on standard CPU/GPU |

### Reproducible Quantitative Metrics

Run the evaluation benchmark on 25 standardized ground-truth shelf scenes:

```bash
uv run python src/shelfsight/vision/benchmark.py
```

**Measured Benchmark Results:**
- **Precision (IoU @ 0.50):** `1.000` (100.0%)
- **Recall (IoU @ 0.50):** `1.000` (100.0%)
- **mAP @ 0.50:** `1.000` (100.0%)
- **F1 Detection Score:** `1.000`
- **Gap Counting Mean Absolute Error (MAE):** `0.48`
- **Inference Latency:** `12.27 ms` per frame
- **Throughput:** `81.5 FPS`
- **Tested Compute:** NVIDIA GeForce RTX 3050 Laptop GPU / Intel 12th Gen

---

## 📡 API Reference

The backend runs on **FastAPI** at `http://localhost:8210` with interactive Swagger docs at `http://localhost:8210/docs`.

### 1. Health & Diagnostics
```http
GET /health
```
```json
{
  "status": "ok",
  "service": "GapX AI Shelf Intelligence",
  "version": "0.1.0",
  "hardware": "NVIDIA GPU (CUDA-ready)",
  "engine": "OpenCV 5.0 + Calibrated Multi-Cue CV"
}
```

### 2. Analyze Uploaded Image
```http
POST /analyze?conf_threshold=0.35&nms_iou=0.40&gap_min_width=35&clahe=true&return_annotated=true
Content-Type: multipart/form-data
file: @shelf.jpg
```
Returns:
- `boxes` — Detected facings with `{row, brand, x, y, w, h, confidence}`.
- `gap_boxes` — Exact localized out-of-stock coordinates `{row, x, y, w, h, confidence}`.
- `facings_per_row` — Order, gap count, and brand list per shelf level.
- `planogram` — Overall compliance % and list of `misplaced_items`.
- `recommendations` — Units to restock, facing deficit, and urgency level.
- `alerts` — Priority dispatch messages.
- `annotated_image_base64` — Base64 JPEG of the rendered OpenCV detection overlay.

### 3. Analyze Base64 Frame (Camera / CCTV)
```http
POST /analyze-frame
Content-Type: application/json

{
  "image_base64": "data:image/jpeg;base64,...",
  "conf_threshold": 0.35,
  "nms_iou": 0.40,
  "gap_min_width": 35
}
```

### 4. Synthetic Demo Scenarios
```http
GET /demo?swap=true&gaps=true
```

### 5. Reproducible Benchmark Evaluator
```http
GET /benchmark?samples=15
```

---

## 🚀 Quickstart Guide

### Prerequisites
- **Python 3.12**
- **Node.js 18+** & npm
- **uv** package manager (`pip install uv`)

### Windows PowerShell Setup

```powershell
# 1. Clone repository & navigate to workspace
cd K:\GapX

# 2. Sync Python environment with locked dependencies
uv sync --group dev

# 3. Install frontend dependencies
Push-Location frontend
npm install
Pop-Location

# 4. Run automated test suite (22 tests)
uv run pytest --cov

# 5. Run the reproducible vision benchmark
uv run python src/shelfsight/vision/benchmark.py
```

### Starting the Servers

In **Terminal 1 (Backend - FastAPI @ Port 8210)**:
```powershell
uv run uvicorn shelfsight.api.main:app --host 127.0.0.1 --port 8210 --reload
```

In **Terminal 2 (Frontend - React + Vite @ Port 5173)**:
```powershell
Push-Location frontend
npm run dev -- --host 127.0.0.1 --port 5173
Pop-Location
```

Open your browser at **`http://localhost:5173`**.

---

## 🧪 Testing & Validation

The test suite thoroughly validates row detection, gap counting, brand order recovery, planogram evaluation, API endpoints, and streaming handlers:

```bash
# Run unit & integration tests
uv run pytest -v

# Run code style & formatting checks
uv run ruff check .
uv run ruff format --check .

# Validate frontend TypeScript compilation & build
cd frontend
npm run check
npm run build
```

---

## 🛠 Troubleshooting

- **`CORS Cross-Origin Request Blocked` in browser console**  
  Ensure your frontend URL is registered in `src/shelfsight/settings.py` (`allowed_origins`). Defaults include `http://localhost:5173`, `http://127.0.0.1:5173`, and `http://localhost:8711`.

- **Residual Package Shadowing**  
  If python complains about missing fastapi attributes, verify that no lingering `fastapi/` folder exists in the project root. Root shims have been cleaned up and verified.

- **Webcam Access Denied**  
  In browser privacy settings, grant camera permissions for `http://localhost:5173`. If using an external CCTV feed, frames can be sent via `/analyze-frame` or `/analyze`.

- **Port Conflicts**  
  If port `8210` or `5173` is busy, inspect running processes in PowerShell:
  ```powershell
  Get-Process -Id (Get-NetTCPConnection -LocalPort 8210).OwningProcess
  ```

---

## 📄 License

Distributed under the **MIT License**. See [LICENSE](./LICENSE) for full details.
