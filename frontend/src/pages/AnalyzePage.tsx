import React, { FormEvent, useMemo, useState } from "react";
import { Pie, PieChart, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import {
  Upload,
  Play,
  Camera,
  Sliders,
  Download,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Cpu,
  Layers,
  Sparkles,
} from "lucide-react";
import { analyzeImage, fetchDemo } from "../api";
import type { AnalysisResult } from "../types";
import { ShelfCanvasOverlay } from "../components/ShelfCanvasOverlay";
import { CameraMonitorModal } from "../components/CameraMonitorModal";
import { PlanogramMatrix } from "../components/PlanogramMatrix";
import { RestockRecommendationsView } from "../components/RestockRecommendationsView";

interface Props {
  apiBaseUrl: string;
  latestResult: AnalysisResult | null;
  onStoreAudit: (source: "upload" | "demo" | "camera", result: AnalysisResult, filename?: string) => void;
}

const CHART_COLORS = ["#38bdf8", "#22c55e", "#f97316", "#ef4444", "#a855f7"];

export const AnalyzePage: React.FC<Props> = ({ apiBaseUrl, latestResult, onStoreAudit }) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [swap, setSwap] = useState(false);
  const [gaps, setGaps] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(latestResult);
  const [activeTab, setActiveTab] = useState<"planogram" | "restock" | "share" | "table">("planogram");

  // Advanced CV Thresholds
  const [showConfig, setShowConfig] = useState(false);
  const [confThreshold, setConfThreshold] = useState(0.35);
  const [nmsIou, setNmsIou] = useState(0.40);
  const [gapMinWidth, setGapMinWidth] = useState(35);
  const [clahe, setClahe] = useState(true);

  // Camera Monitor Modal
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const shareData = useMemo(() => {
    if (!result) return [];
    return Object.entries(result.share_of_shelf).map(([brand, value]) => ({
      brand,
      value: Math.round(value * 100),
    }));
  }, [result]);

  const runDemoScenario = async (plantedSwap: boolean, plantedGaps: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchDemo(apiBaseUrl, {
        swap: plantedSwap,
        gaps: plantedGaps,
        conf_threshold: confThreshold,
        nms_iou: nmsIou,
      });
      setResult(res);
      setPreviewUrl(res.original_image_base64 ? `data:image/jpeg;base64;${res.original_image_base64}` : null);
      onStoreAudit("demo", res, `Demo Scene (Gaps:${plantedGaps}, Swap:${plantedSwap})`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run demo analysis.");
    } finally {
      setLoading(false);
    }
  };

  const onAnalyzeUpload = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please select or drop an image first.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await analyzeImage(apiBaseUrl, file, {
        conf_threshold: confThreshold,
        nms_iou: nmsIou,
        gap_min_width: gapMinWidth,
        clahe,
      });
      setResult(res);
      onStoreAudit("upload", res, file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze uploaded shelf image.");
    } finally {
      setLoading(false);
    }
  };

  const handleCameraCapture = (camResult: AnalysisResult, frameDataUrl: string) => {
    setResult(camResult);
    setPreviewUrl(frameDataUrl);
    setIsCameraOpen(false);
    onStoreAudit("camera", camResult, "Camera Stream Frame");
  };

  const exportAuditSummary = () => {
    if (!result) return;
    const jsonStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(result, null, 2));
    const dlAnchor = document.createElement("a");
    dlAnchor.setAttribute("href", jsonStr);
    dlAnchor.setAttribute("download", `gapx-audit-${Date.now()}.json`);
    dlAnchor.click();
  };

  return (
    <div className="analyze-page-container">
      {/* Top Hero Ingestion Bar */}
      <section className="card ingestion-card">
        <div className="ingestion-header">
          <div>
            <h2>AI Shelf Vision Intelligence</h2>
            <p className="text-muted">
              Detect products, localize empty shelf gaps, verify planogram alignment, and trigger restocking alerts.
            </p>
          </div>
          <div className="ingestion-quick-actions">
            <button
              type="button"
              className="btn-camera"
              onClick={() => setIsCameraOpen(true)}
            >
              <Camera size={16} style={{ marginRight: 6 }} />
              Live Camera Monitor
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => setShowConfig(!showConfig)}
            >
              <Sliders size={16} style={{ marginRight: 6 }} />
              {showConfig ? "Hide Tuner" : "CV Parameters"}
            </button>
          </div>
        </div>

        {/* CV Parameter Tuner Accordion */}
        {showConfig && (
          <div className="tuner-panel">
            <div className="tuner-title">
              <Cpu size={15} style={{ marginRight: 6 }} />
              Active Computer Vision Calibration
            </div>
            <div className="tuner-grid">
              <div className="tuner-item">
                <div className="tuner-label">
                  <span>Confidence Threshold</span>
                  <strong>{confThreshold}</strong>
                </div>
                <input
                  type="range"
                  min="0.10"
                  max="0.90"
                  step="0.05"
                  value={confThreshold}
                  onChange={(e) => setConfThreshold(parseFloat(e.target.value))}
                />
              </div>
              <div className="tuner-item">
                <div className="tuner-label">
                  <span>NMS IoU Threshold</span>
                  <strong>{nmsIou}</strong>
                </div>
                <input
                  type="range"
                  min="0.10"
                  max="0.80"
                  step="0.05"
                  value={nmsIou}
                  onChange={(e) => setNmsIou(parseFloat(e.target.value))}
                />
              </div>
              <div className="tuner-item">
                <div className="tuner-label">
                  <span>Gap Min Width</span>
                  <strong>{gapMinWidth}px</strong>
                </div>
                <input
                  type="range"
                  min="15"
                  max="120"
                  step="5"
                  value={gapMinWidth}
                  onChange={(e) => setGapMinWidth(parseInt(e.target.value))}
                />
              </div>
              <div className="tuner-item toggle-item">
                <label className="inline-toggle">
                  <input
                    type="checkbox"
                    checked={clahe}
                    onChange={(e) => setClahe(e.target.checked)}
                  />
                  <span>CLAHE Illumination Normalization</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Input Methods: File Upload Form + One-Click Synthetic Demo Presets */}
        <div className="ingestion-methods-grid">
          {/* File Upload Drop Area */}
          <form onSubmit={onAnalyzeUpload} className="upload-form-box">
            <label className="file-dropzone">
              <Upload size={28} className="dropzone-icon" />
              <span className="dropzone-text">
                {file ? file.name : "Click to select or drop shelf photo"}
              </span>
              <span className="dropzone-sub">Supports JPG, PNG, WEBP from camera or CCTV</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const selected = e.target.files?.[0] ?? null;
                  setFile(selected);
                  setPreviewUrl(selected ? URL.createObjectURL(selected) : null);
                  setError(null);
                }}
              />
            </label>
            <button type="submit" className="primary btn-analyze-now" disabled={loading || !file}>
              {loading ? "Processing AI Analysis..." : "Analyze Uploaded Image"}
            </button>
          </form>

          {/* Preset Demo Scenarios */}
          <div className="demo-presets-box">
            <span className="presets-title">
              <Sparkles size={16} className="text-accent" style={{ marginRight: 6 }} />
              Reproducible Demo Scenarios
            </span>
            <div className="presets-btn-grid">
              <button
                type="button"
                className="preset-btn"
                disabled={loading}
                onClick={() => runDemoScenario(false, false)}
              >
                <CheckCircle2 size={15} className="text-success" />
                <div>
                  <strong>Clean Shelf</strong>
                  <p>100% compliant, fully stocked</p>
                </div>
              </button>
              <button
                type="button"
                className="preset-btn"
                disabled={loading}
                onClick={() => runDemoScenario(false, true)}
              >
                <AlertTriangle size={15} className="text-warning" />
                <div>
                  <strong>Planted Gaps (OOS)</strong>
                  <p>Trigger empty-shelf stockout alerts</p>
                </div>
              </button>
              <button
                type="button"
                className="preset-btn"
                disabled={loading}
                onClick={() => runDemoScenario(true, false)}
              >
                <Layers size={15} className="text-accent" />
                <div>
                  <strong>Planogram Swap</strong>
                  <p>Detect misplaced products &amp; drift</p>
                </div>
              </button>
              <button
                type="button"
                className="preset-btn"
                disabled={loading}
                onClick={() => runDemoScenario(true, true)}
              >
                <TrendingUp size={15} className="text-danger" />
                <div>
                  <strong>Mixed Challenge</strong>
                  <p>Both empty gaps &amp; misplaced items</p>
                </div>
              </button>
            </div>
          </div>
        </div>

        {error && <div className="error-banner">{error}</div>}
      </section>

      {/* Interactive Visual Canvas Area */}
      <section className="card canvas-section">
        <div className="canvas-header">
          <h3>Interactive Shelf Visualizer</h3>
          {result && (
            <div className="canvas-header-meta">
              <span className="badge-pill bg-surface">
                Latency: <strong>{result.latency_ms ?? 12}ms</strong>
              </span>
              <button
                type="button"
                className="secondary btn-sm"
                onClick={exportAuditSummary}
              >
                <Download size={13} style={{ marginRight: 4 }} /> Export JSON
              </button>
            </div>
          )}
        </div>

        <ShelfCanvasOverlay
          imageUrl={previewUrl}
          result={result}
        />
      </section>

      {/* KPI Ribbons & Tabbed Deep Dive */}
      {result && (
        <section className="card analysis-deepdive-section">
          <div className="kpi-metrics-grid">
            <div className="kpi-card">
              <span className="kpi-label">Total Facings</span>
              <span className="kpi-value text-accent">{result.total_facings}</span>
              <span className="kpi-sub">Across {result.n_rows} detected rows</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">Shelf Gaps (OOS)</span>
              <span className="kpi-value text-danger">
                {result.facings_per_row.reduce((sum, r) => sum + r.gaps, 0)}
              </span>
              <span className="kpi-sub">Empty shelf regions localized</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">Planogram Compliance</span>
              <span className="kpi-value text-success">
                {Math.round(result.planogram.overall * 100)}%
              </span>
              <span className="kpi-sub">
                {result.planogram.misplaced_items?.length ?? 0} misplaced product(s)
              </span>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">Active Alerts</span>
              <span className="kpi-value text-warning">{result.alerts.length}</span>
              <span className="kpi-sub">
                {result.recommendations?.length ?? 0} replenishment action(s)
              </span>
            </div>
          </div>

          {/* Deep Dive Tabs */}
          <div className="tab-navigation">
            <button
              type="button"
              className={`tab-btn ${activeTab === "planogram" ? "active" : ""}`}
              onClick={() => setActiveTab("planogram")}
            >
              Planogram &amp; Misplacement Matrix
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === "restock" ? "active" : ""}`}
              onClick={() => setActiveTab("restock")}
            >
              Restock Recommendations ({result.recommendations?.length ?? 0})
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === "share" ? "active" : ""}`}
              onClick={() => setActiveTab("share")}
            >
              Share of Shelf
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === "table" ? "active" : ""}`}
              onClick={() => setActiveTab("table")}
            >
              Row Breakdown
            </button>
          </div>

          <div className="tab-content-area">
            {activeTab === "planogram" && (
              <PlanogramMatrix
                planogram={result.planogram}
                facingsPerRow={result.facings_per_row}
              />
            )}

            {activeTab === "restock" && (
              <RestockRecommendationsView recommendations={result.recommendations} />
            )}

            {activeTab === "share" && (
              <div className="share-of-shelf-tab">
                <div style={{ width: "100%", height: 260 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={shareData}
                        dataKey="value"
                        nameKey="brand"
                        cx="50%"
                        cy="50%"
                        outerRadius={95}
                        innerRadius={50}
                        paddingAngle={4}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {shareData.map((entry, index) => (
                          <Cell key={entry.brand} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {activeTab === "table" && (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Shelf Row</th>
                      <th>Facings Detected</th>
                      <th>Empty Gaps</th>
                      <th>Detected Brand Sequence</th>
                      <th>Row Compliance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.planogram.rows.map((rowReport) => {
                      const row = result.facings_per_row.find((item) => item.row === rowReport.row);
                      return (
                        <tr key={rowReport.row}>
                          <td><strong>Row {rowReport.row + 1}</strong></td>
                          <td>{row?.facings ?? 0}</td>
                          <td className={row?.gaps ? "text-danger font-bold" : ""}>{row?.gaps ?? 0}</td>
                          <td>{rowReport.detected.join(" → ") || "None"}</td>
                          <td>
                            <span className={`badge-pill ${rowReport.compliance >= 0.9 ? "tag-high" : "tag-med"}`}>
                              {Math.round(rowReport.compliance * 100)}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Camera Live Feed Modal */}
      <CameraMonitorModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        apiBaseUrl={apiBaseUrl}
        onFrameAnalyzed={handleCameraCapture}
      />
    </div>
  );
};
