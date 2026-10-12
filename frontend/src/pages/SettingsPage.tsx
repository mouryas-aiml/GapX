import React, { FormEvent, useState, useEffect } from "react";
import { Settings, CheckCircle2, AlertCircle, RefreshCw, Cpu, Globe, Server, Database, Store } from "lucide-react";
import { checkHealthDetails } from "../api";
import type { HealthInfo } from "../types";

interface Props {
  apiBaseUrl: string;
  onSetApiBaseUrl: (value: string) => void;
  allowedOriginsHint: string;
}

export const SettingsPage: React.FC<Props> = ({
  apiBaseUrl,
  onSetApiBaseUrl,
  allowedOriginsHint,
}) => {
  const [pendingApi, setPendingApi] = useState(apiBaseUrl);
  const [testing, setTesting] = useState(false);
  const [healthInfo, setHealthInfo] = useState<HealthInfo | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [activeStore, setActiveStore] = useState("Store #402 — Downtown Supercenter");

  const runHealthTest = async (url: string) => {
    setTesting(true);
    const info = await checkHealthDetails(url);
    setHealthInfo(info);
    setTesting(false);
  };

  useEffect(() => {
    runHealthTest(apiBaseUrl);
  }, [apiBaseUrl]);

  const onSave = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = pendingApi.trim();
    if (!trimmed) return;
    onSetApiBaseUrl(trimmed);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
    runHealthTest(trimmed);
  };

  return (
    <div className="settings-page-container">
      {/* Settings Header */}
      <section className="card settings-header-card">
        <h2>System Configuration &amp; Compute Diagnostics</h2>
        <p className="text-muted">
          Manage backend endpoints, hardware acceleration parameters, store identification, and CORS policies.
        </p>
      </section>

      {/* Backend API Configuration */}
      <section className="card settings-api-card">
        <h3>Backend API Connection</h3>
        <form onSubmit={onSave} className="api-settings-form">
          <label>
            FastAPI Server URL
            <div className="input-with-button">
              <input
                type="url"
                value={pendingApi}
                onChange={(e) => setPendingApi(e.target.value)}
                placeholder="http://localhost:8210"
              />
              <button type="submit" className="primary">
                Save URL
              </button>
              <button
                type="button"
                className="secondary"
                disabled={testing}
                onClick={() => runHealthTest(pendingApi.trim())}
              >
                {testing ? <RefreshCw size={14} className="spin" /> : "Test Connection"}
              </button>
            </div>
          </label>
        </form>

        {savedSuccess && (
          <div className="alert-success-banner mt-2">
            <CheckCircle2 size={16} style={{ marginRight: 6 }} /> API URL saved to local storage!
          </div>
        )}

        {/* Live Diagnostics Card */}
        <div className="connection-diagnostics mt-3">
          <h4>Live Diagnostic Probe</h4>
          {healthInfo ? (
            <div className="diag-grid">
              <div className="diag-item">
                <span className="diag-lbl">Status:</span>
                <span className="diag-val text-success">
                  <CheckCircle2 size={14} style={{ display: "inline", marginRight: 4 }} />
                  {healthInfo.status.toUpperCase()}
                </span>
              </div>
              <div className="diag-item">
                <span className="diag-lbl">Ping Latency:</span>
                <span className="diag-val text-accent">{healthInfo.ping_ms} ms</span>
              </div>
              <div className="diag-item">
                <span className="diag-lbl">Hardware Engine:</span>
                <span className="diag-val">{healthInfo.hardware || "NVIDIA GPU (CUDA)"}</span>
              </div>
              <div className="diag-item">
                <span className="diag-lbl">Vision Pipeline:</span>
                <span className="diag-val">{healthInfo.engine || "OpenCV 5.0 Multi-Cue"}</span>
              </div>
            </div>
          ) : (
            <div className="diag-error">
              <AlertCircle size={16} className="text-danger" style={{ marginRight: 6 }} />
              <span>Could not reach backend at {pendingApi}. Ensure the FastAPI server is running.</span>
            </div>
          )}
        </div>

        <div className="cors-guidance-box mt-3">
          <strong>CORS Cross-Origin Policy</strong>
          <p className="text-muted">
            The FastAPI backend at <code>src/shelfsight/settings.py</code> allows incoming requests from the following development origins:
          </p>
          <code>{allowedOriginsHint}</code>
        </div>
      </section>

      {/* Store & Enterprise Identity */}
      <section className="card settings-store-card">
        <h3>Store Persona &amp; Merchandising Identity</h3>
        <p className="text-muted">Select the active retail location for shelf audits and restocking tickets.</p>
        <div className="store-options-grid mt-2">
          {[
            "Store #402 — Downtown Supercenter",
            "Store #108 — Metro Express Hub",
            "Store #882 — Airport Terminal Retail",
          ].map((storeName) => (
            <button
              key={storeName}
              type="button"
              className={`store-select-btn ${activeStore === storeName ? "selected" : ""}`}
              onClick={() => setActiveStore(storeName)}
            >
              <Store size={18} className="mr-2 text-accent" />
              <span>{storeName}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Architecture & Stack Blueprint */}
      <section className="card settings-arch-card">
        <h3>GapX Architecture Blueprint</h3>
        <div className="arch-layers-grid">
          <div className="arch-layer">
            <Globe className="text-accent mb-2" size={24} />
            <strong>Frontend SaaS</strong>
            <p>React 18 &bull; TypeScript &bull; Vite &bull; Recharts &bull; Framer Motion</p>
          </div>
          <div className="arch-layer">
            <Server className="text-accent mb-2" size={24} />
            <strong>API Gateway</strong>
            <p>FastAPI &bull; Uvicorn &bull; Starlette &bull; Pydantic v2 &bull; CORS Middleware</p>
          </div>
          <div className="arch-layer">
            <Cpu className="text-accent mb-2" size={24} />
            <strong>Computer Vision</strong>
            <p>OpenCV 5.0 &bull; CLAHE &bull; NMS &bull; Saturation Profiling &bull; Bounding Box IoU</p>
          </div>
          <div className="arch-layer">
            <Database className="text-accent mb-2" size={24} />
            <strong>Audit &amp; PubSub</strong>
            <p>In-Memory Event Bus &bull; SSE/WS Gateways &bull; Local Storage Audit Ledger</p>
          </div>
        </div>
      </section>
    </div>
  );
};
