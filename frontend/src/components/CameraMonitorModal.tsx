import React, { useEffect, useRef, useState } from "react";
import {
  Camera,
  X,
  Play,
  Square,
  RefreshCw,
  AlertCircle,
  Monitor,
  Video,
  Info,
} from "lucide-react";
import { analyzeBase64Frame } from "../api";
import type { AnalysisResult } from "../types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  apiBaseUrl: string;
  onFrameAnalyzed: (result: AnalysisResult, frameDataUrl: string) => void;
}

function drawVirtualShelf(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  _tick: number
) {
  // Deep aisle background
  ctx.fillStyle = "#070d18";
  ctx.fillRect(0, 0, width, height);

  // 3 Shelf Tiers
  const rows = 3;
  const rowHeight = height / rows;

  for (let r = 0; r < rows; r++) {
    const yShelf = (r + 1) * rowHeight - 20;

    // Shelf back grid
    ctx.strokeStyle = "rgba(56, 189, 248, 0.08)";
    ctx.lineWidth = 1;
    ctx.strokeRect(20, r * rowHeight + 15, width - 40, rowHeight - 35);

    // Shelf metal rack
    const rackGrad = ctx.createLinearGradient(0, yShelf, 0, yShelf + 16);
    rackGrad.addColorStop(0, "#334155");
    rackGrad.addColorStop(0.5, "#1e293b");
    rackGrad.addColorStop(1, "#0f172a");
    ctx.fillStyle = rackGrad;
    ctx.fillRect(15, yShelf, width - 30, 16);
    ctx.strokeStyle = "#475569";
    ctx.strokeRect(15, yShelf, width - 30, 16);

    // Blue price tag rail
    ctx.fillStyle = "#0284c7";
    ctx.globalAlpha = 0.45;
    ctx.fillRect(15, yShelf + 16, width - 30, 4);
    ctx.globalAlpha = 1.0;

    // Product facings on row
    const numSlots = 4;
    const slotW = (width - 80) / numSlots;

    for (let s = 0; s < numSlots; s++) {
      // Row 1, Slot 1 is an empty out-of-stock gap
      if (r === 1 && s === 1) {
        continue;
      }

      const pX = 40 + s * slotW + 12;
      const pY = r * rowHeight + 24;
      const pW = slotW - 24;
      const pH = rowHeight - 50;

      let pColor = "#ef4444"; // redco
      let brandLabel = "REDCO";
      if (r === 0) {
        if (s >= 2) {
          pColor = "#0ea5e9";
          brandLabel = "BLUE";
        }
      } else if (r === 1) {
        if (s === 0) {
          pColor = "#22c55e";
          brandLabel = "GREEN";
        } else {
          pColor = "#f97316";
          brandLabel = "ORANGE";
        }
      } else {
        if (s === 0) {
          pColor = "#0ea5e9";
          brandLabel = "BLUE";
        } else if (s === 1) {
          pColor = "#22c55e";
          brandLabel = "GREEN";
        } else if (s === 2) {
          pColor = "#ef4444";
          brandLabel = "REDCO";
        } else {
          pColor = "#f97316";
          brandLabel = "ORANGE";
        }
      }

      // Packaging body
      ctx.fillStyle = pColor;
      ctx.fillRect(pX, pY, pW, pH);

      // Label highlight
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.fillRect(pX + 4, pY + 4, pW - 8, 14);

      // Brand text
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 13px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(brandLabel, pX + pW / 2, pY + pH / 2);
    }
  }

  // CCTV Top HUD Bar
  ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
  ctx.fillRect(0, 0, width, 32);

  ctx.fillStyle = "#22c55e";
  ctx.font = "bold 12px monospace";
  ctx.textAlign = "left";
  ctx.fillText("● REC  CAM-02 [AISLE-04 SHELF-BAY]", 16, 21);

  const now = new Date();
  const timeStr = now.toISOString().replace("T", " ").slice(0, 19);
  ctx.textAlign = "right";
  ctx.fillStyle = "#38bdf8";
  ctx.fillText(timeStr + "  1080P", width - 16, 21);
}

export const CameraMonitorModal: React.FC<Props> = ({
  isOpen,
  onClose,
  apiBaseUrl,
  onFrameAnalyzed,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const virtualCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number | null>(null);

  const [streamActive, setStreamActive] = useState(false);
  const [isVirtualCctv, setIsVirtualCctv] = useState(false);
  const [continuousMode, setContinuousMode] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diagnosticReason, setDiagnosticReason] = useState<string | null>(null);
  const [lastScanTime, setLastScanTime] = useState<string | null>(null);
  const [cameraPermission, setCameraPermission] = useState<"pending" | "granted" | "denied">("pending");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }
    // Attempt physical camera first with resilient fallback ladder
    startPhysicalCamera();
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const stopCameraTracks = () => {
    if (animRef.current) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setStreamActive(false);
  };

  const stopCamera = () => {
    stopCameraTracks();
    setContinuousMode(false);
  };

  const startPhysicalCamera = async (deviceIdToUse?: string) => {
    stopCameraTracks();
    setIsVirtualCctv(false);
    setError(null);
    setDiagnosticReason(null);

    if (!navigator?.mediaDevices?.getUserMedia) {
      setCameraPermission("denied");
      setError("Webcam API is not supported in this browser. Please use the Virtual CCTV mode.");
      return;
    }

    let stream: MediaStream | null = null;
    let lastError: any = null;

    // Ladder Attempt 1: Specific deviceId if requested
    if (deviceIdToUse) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: deviceIdToUse } },
        });
      } catch (err) {
        console.warn("[GapX Camera] Specific deviceId failed:", err);
        lastError = err;
      }
    }

    // Ladder Attempt 2: Ideal 720p with ideal environment facingMode (safe on desktop & mobile)
    if (!stream) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: { ideal: "environment" },
          },
        });
      } catch (err) {
        console.warn("[GapX Camera] Attempt 2 (ideal facingMode) failed:", err);
        lastError = err;
      }
    }

    // Ladder Attempt 3: Ideal 720p without facingMode constraint
    if (!stream) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        });
      } catch (err) {
        console.warn("[GapX Camera] Attempt 3 (720p) failed:", err);
        lastError = err;
      }
    }

    // Ladder Attempt 4: Bare minimum video: true
    if (!stream) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      } catch (err) {
        console.warn("[GapX Camera] Attempt 4 (video: true) failed:", err);
        lastError = err;
      }
    }

    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch((e) => console.warn("Video play promise ignored:", e));
      setStreamActive(true);
      setCameraPermission("granted");

      // Enumerate available cameras
      try {
        const devs = await navigator.mediaDevices.enumerateDevices();
        const videoDevs = devs.filter((d) => d.kind === "videoinput");
        setDevices(videoDevs);
        const activeTrack = stream.getVideoTracks()[0];
        if (activeTrack) {
          const activeId = activeTrack.getSettings().deviceId;
          if (activeId) setSelectedDeviceId(activeId);
        }
      } catch (e) {
        console.warn("Could not enumerate devices:", e);
      }
    } else {
      setCameraPermission("denied");
      let msg = "Camera hardware not accessible or blocked by browser permissions.";
      let reason = "";

      if (lastError) {
        if (lastError.name === "NotAllowedError" || lastError.name === "PermissionDeniedError") {
          reason =
            "Browser or OS permission blocked. Ensure Chrome has camera access in the URL bar, and check Windows Settings > Privacy & security > Camera ('Let desktop apps access your camera').";
        } else if (lastError.name === "NotReadableError" || lastError.name === "TrackStartError") {
          reason =
            "Your webcam is currently locked by another application (Zoom, Teams, Discord, OBS, or Windows Camera app). Close conflicting apps or activate Virtual CCTV below.";
        } else if (lastError.name === "NotFoundError" || lastError.name === "DevicesNotFoundError") {
          reason =
            "No webcam hardware detected on this PC. You can activate the Virtual CCTV Shelf feed below to scan simulated live retail aisles.";
        } else if (lastError.name === "OverconstrainedError") {
          reason =
            "Camera hardware could not satisfy resolution or facingMode constraints. Click Retry to use basic mode.";
        } else {
          reason = `${lastError.name || "Error"}: ${lastError.message || "Unable to acquire video stream."}`;
        }
      }
      setError(msg);
      setDiagnosticReason(reason);
    }
  };

  const startVirtualCctv = () => {
    stopCameraTracks();
    setIsVirtualCctv(true);
    setCameraPermission("granted");
    setError(null);
    setDiagnosticReason(null);

    const canvas = virtualCanvasRef.current || document.createElement("canvas");
    canvas.width = 1280;
    canvas.height = 720;
    virtualCanvasRef.current = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let tick = 0;
    const loop = () => {
      tick++;
      drawVirtualShelf(ctx, 1280, 720, tick);
      animRef.current = requestAnimationFrame(loop);
    };
    loop();

    try {
      const stream = canvas.captureStream(30);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
        setStreamActive(true);
      }
    } catch (e) {
      console.error("Virtual stream error:", e);
    }
  };

  const captureFrame = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 800;
    canvas.height = video.videoHeight || 450;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.88);

    setAnalyzing(true);
    setError(null);
    try {
      const res = await analyzeBase64Frame(apiBaseUrl, dataUrl);
      setLastScanTime(new Date().toLocaleTimeString());
      onFrameAnalyzed(res, dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze camera frame.");
    } finally {
      setAnalyzing(false);
    }
  };

  // Continuous auto-scan timer
  useEffect(() => {
    if (!continuousMode || !streamActive) return;
    const interval = setInterval(() => {
      if (!analyzing) {
        captureFrame();
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [continuousMode, streamActive, analyzing]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-content camera-modal">
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-wrap">
            <Camera className="modal-icon text-accent" />
            <div>
              <h3 style={{ margin: 0 }}>Live Shelf Camera Monitor</h3>
              <span className="text-muted text-sm">
                {isVirtualCctv ? "Simulated Retail CCTV Stream (30 FPS)" : "Physical Device Webcam"}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {devices.length > 1 && !isVirtualCctv && (
              <select
                className="camera-device-select"
                value={selectedDeviceId}
                onChange={(e) => {
                  setSelectedDeviceId(e.target.value);
                  startPhysicalCamera(e.target.value);
                }}
              >
                {devices.map((d, idx) => (
                  <option key={d.deviceId || idx} value={d.deviceId}>
                    {d.label || `Camera ${idx + 1}`}
                  </option>
                ))}
              </select>
            )}

            <button type="button" className="icon-btn close-btn" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Video / Fallback Viewport */}
        <div className="camera-feed-container">
          <video
            ref={videoRef}
            className="camera-video-element"
            autoPlay
            playsInline
            muted
            style={{ display: cameraPermission === "granted" ? "block" : "none" }}
          />

          {cameraPermission !== "granted" && (
            <div className="camera-fallback-screen">
              <AlertCircle size={44} className="text-warning mb-2" />
              <h4 style={{ margin: "4px 0 8px 0" }}>Camera Hardware Not Accessible</h4>
              <p className="text-muted" style={{ maxWidth: 460, margin: "0 auto 10px" }}>
                Chrome permission was granted, but the physical video stream could not be started.
              </p>

              {diagnosticReason && (
                <div className="camera-diag-box">
                  <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                    <Info size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>{diagnosticReason}</span>
                  </div>
                </div>
              )}

              <div className="camera-fallback-actions">
                <button
                  type="button"
                  className="primary"
                  onClick={startVirtualCctv}
                  title="Stream an animated 1080p retail shelf scene with products and real-time detection"
                >
                  <Monitor size={15} style={{ marginRight: 6 }} />
                  ⚡ Use Virtual CCTV Camera (Works Instantly)
                </button>

                <button
                  type="button"
                  className="secondary"
                  onClick={() => startPhysicalCamera(selectedDeviceId)}
                >
                  <RefreshCw size={14} style={{ marginRight: 6 }} /> Retry Physical Camera
                </button>
              </div>
            </div>
          )}

          <canvas ref={canvasRef} style={{ display: "none" }} />

          {/* Scanner Reticle Overlay */}
          {streamActive && (
            <div className="camera-reticle-overlay">
              <div className="reticle-box">
                <span className="reticle-corner tl" />
                <span className="reticle-corner tr" />
                <span className="reticle-corner bl" />
                <span className="reticle-corner br" />
                <div className="reticle-scan-line" />
              </div>
              <div className="reticle-status">
                {continuousMode ? (
                  <span className="badge-pill bg-danger-subtle pulse-dot">
                    LIVE AI CONTINUOUS SCAN (4s)
                  </span>
                ) : (
                  <span className="badge-pill bg-surface">
                    {isVirtualCctv ? "VIRTUAL CCTV • STANDBY" : "WEBCAM • STANDBY"}
                  </span>
                )}
                {lastScanTime && <span className="text-muted">Last Scan: {lastScanTime}</span>}
              </div>
            </div>
          )}
        </div>

        {error && <div className="modal-alert-error">{error}</div>}

        {/* Modal Footer Controls */}
        <div className="modal-footer">
          <div className="camera-controls">
            <button
              type="button"
              className="primary"
              disabled={!streamActive || analyzing}
              onClick={captureFrame}
            >
              <Camera size={16} style={{ marginRight: 6 }} />
              {analyzing ? "Analyzing Frame..." : "Capture & Analyze"}
            </button>

            <button
              type="button"
              className={continuousMode ? "btn-danger" : "secondary"}
              disabled={!streamActive}
              onClick={() => setContinuousMode(!continuousMode)}
            >
              {continuousMode ? (
                <>
                  <Square size={16} style={{ marginRight: 6 }} /> Stop Auto-Scan
                </>
              ) : (
                <>
                  <Play size={16} style={{ marginRight: 6 }} /> Continuous Mode (4s)
                </>
              )}
            </button>

            <button
              type="button"
              className="secondary btn-sm"
              onClick={isVirtualCctv ? () => startPhysicalCamera() : startVirtualCctv}
              title={isVirtualCctv ? "Switch to physical webcam" : "Switch to virtual CCTV shelf"}
            >
              {isVirtualCctv ? (
                <>
                  <Video size={14} style={{ marginRight: 5 }} /> Physical Webcam
                </>
              ) : (
                <>
                  <Monitor size={14} style={{ marginRight: 5 }} /> Virtual CCTV
                </>
              )}
            </button>
          </div>

          <button type="button" className="ghost-btn" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
