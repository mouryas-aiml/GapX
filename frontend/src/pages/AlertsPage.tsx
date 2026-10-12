import { useEffect, useState } from "react";
import { fetchDemo } from "../api";
import type { AnalysisResult } from "../types";

interface Props {
  latestResult: AnalysisResult | null;
  apiBaseUrl: string;
}

function severityClass(severity: string): string {
  if (severity === "high") return "alert-chip high";
  if (severity === "medium") return "alert-chip medium";
  return "alert-chip low";
}

export function AlertsPage({ latestResult, apiBaseUrl }: Props) {
  const [liveResult, setLiveResult] = useState<AnalysisResult | null>(latestResult);
  const [liveMode, setLiveMode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!liveMode) {
      return;
    }
    let mounted = true;
    const runPoll = async () => {
      try {
        const snapshot = await fetchDemo(apiBaseUrl, {
          swap: Math.random() > 0.6,
          gaps: Math.random() > 0.4
        });
        if (mounted) {
          setLiveResult(snapshot);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to poll live demo alerts.");
        }
      }
    };
    runPoll();
    const timer = window.setInterval(runPoll, 12000);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, [liveMode, apiBaseUrl]);

  const alerts = liveResult?.alerts ?? [];
  return (
    <div className="grid gap-md">
      <section className="card">
        <h2>Real-Time Restock Alerts</h2>
        <p className="muted">Enable live mode to poll backend demo snapshots and monitor incoming shelf risks.</p>
        <label className="inline-toggle">
          <input type="checkbox" checked={liveMode} onChange={(event) => setLiveMode(event.target.checked)} />
          Live mode (12s refresh)
        </label>
        {error && <p className="error">{error}</p>}
      </section>
      <section className="card">
        <h3>Current Alert Feed</h3>
        {alerts.length === 0 ? (
          <p className="muted">No alerts available yet. Run an analysis first.</p>
        ) : (
          <ul className="alert-list">
            {alerts.map((alert, index) => (
              <li key={`${alert.type}-${index}`} className="alert-item">
                <span className={severityClass(alert.severity)}>{alert.severity.toUpperCase()}</span>
                <strong>{alert.type}</strong>
                <p>{alert.message}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

