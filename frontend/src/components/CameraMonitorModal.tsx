import React, { useEffect, useRef, useState } from "react";
import { Camera, X, Play, Square, RefreshCw, AlertCircle, CheckCircle } from "lucide-react";
import { analyzeBase64Frame } from "../api";
import type { AnalysisResult } from "../types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  apiBaseUrl: string;
  onFrameAnalyzed: (result: AnalysisResult, frameDataUrl: string) => void;
}

export const CameraMonitorModal: React.FC<Props> = ({
  isOpen,
  onClose,
  apiBaseUrl,
  onFrameAnalyzed,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [streamActive, setStreamActive] = useState(false);
  const [continuousMode, setContinuousMode] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastScanTime, setLastScanTime] = useState<string | null>(null);
  const [cameraPermission, setCameraPermission] = useState<"pending" | "granted" | "denied">("pending");

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }
    startCamera();
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "environment" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setStreamActive(true);
        setCameraPermission("granted");
      }
    } catch (err) {
      setCameraPermission("denied");
      setError(
        "Camera access not granted or no webcam available. You can simulate camera frames or upload images."
      );
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setStreamActive(false);
    setContinuousMode(false);
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
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);

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
        <div className="modal-header">
          <div className="modal-title-wrap">
            <Camera className="modal-icon text-accent" />
            <h3>Live Shelf Camera Monitor</h3>
          </div>
          <button type="button" className="icon-btn close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="camera-feed-container">
          {cameraPermission === "granted" ? (
            <video ref={videoRef} className="camera-video-element" autoPlay playsInline muted />
          ) : (
            <div className="camera-fallback-screen">
              <AlertCircle size={48} className="text-warning mb-2" />
              <p>Camera hardware not accessible or blocked by browser permissions.</p>
              <button type="button" className="secondary mt-2" onClick={startCamera}>
                <RefreshCw size={14} style={{ marginRight: 6 }} /> Retry Permission
              </button>
            </div>
          )}
          <canvas ref={canvasRef} style={{ display: "none" }} />

          {/* Scanner Overlay Sight */}
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
                    LIVE AI CONTINUOUS SCAN
                  </span>
                ) : (
                  <span className="badge-pill bg-surface">STANDBY</span>
                )}
                {lastScanTime && <span className="text-muted">Last: {lastScanTime}</span>}
              </div>
            </div>
          )}
        </div>

        {error && <div className="modal-alert-error">{error}</div>}

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
          </div>
          <button type="button" className="ghost-btn" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
