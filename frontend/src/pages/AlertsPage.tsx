import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock,
  Filter,
  Play,
  Pause,
  Download,
  Volume2,
  VolumeX,
} from "lucide-react";
import { fetchDemo } from "../api";
import type { AnalysisResult, GapxAlert } from "../types";

interface Props {
  latestResult: AnalysisResult | null;
  apiBaseUrl: string;
}

export const AlertsPage: React.FC<Props> = ({ latestResult, apiBaseUrl }) => {
  const [liveMode, setLiveMode] = useState(false);
  const [liveInterval, setLiveInterval] = useState(8);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [alerts, setAlerts] = useState<GapxAlert[]>(() => {
    return (latestResult?.alerts ?? []).map((a, idx) => ({
      ...a,
      id: `alert-${Date.now()}-${idx}`,
      status: "open",
      timestamp: new Date().toLocaleTimeString(),
    }));
  });
  const [error, setError] = useState<string | null>(null);

  // When latestResult updates from another page, incorporate new alerts
  useEffect(() => {
    if (latestResult?.alerts) {
      setAlerts(
        latestResult.alerts.map((a, idx) => ({
          ...a,
          id: `alert-${Date.now()}-${idx}`,
          status: "open",
          timestamp: new Date().toLocaleTimeString(),
        }))
      );
    }
  }, [latestResult]);

  // Live Mode polling
  useEffect(() => {
    if (!liveMode) return;
    let isSubscribed = true;

    const poll = async () => {
      try {
        const snapshot = await fetchDemo(apiBaseUrl, {
          swap: Math.random() > 0.6,
          gaps: Math.random() > 0.4,
        });
        if (isSubscribed && snapshot.alerts) {
          const freshAlerts: GapxAlert[] = snapshot.alerts.map((a, idx) => ({
            ...a,
            id: `alert-${Date.now()}-${idx}`,
            status: "open",
            timestamp: new Date().toLocaleTimeString(),
          }));
          setAlerts(freshAlerts);
          setError(null);
        }
      } catch (err) {
        if (isSubscribed) {
          setError(err instanceof Error ? err.message : "Failed to poll live alerts.");
        }
      }
    };

    poll();
    const timer = setInterval(poll, liveInterval * 1000);
    return () => {
      isSubscribed = false;
      clearInterval(timer);
    };
  }, [liveMode, liveInterval, apiBaseUrl]);

  const updateAlertStatus = (id: string | undefined, newStatus: "open" | "in_progress" | "resolved") => {
    if (!id) return;
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a))
    );
  };

  const filteredAlerts = alerts.filter((a) => {
    if (severityFilter !== "all" && a.severity !== severityFilter) return false;
    if (statusFilter !== "all" && (a.status || "open") !== statusFilter) return false;
    return true;
  });

  const exportAlertsCsv = () => {
    if (alerts.length === 0) return;
    const header = "ID,Severity,Type,Row,Message,Action,Status,Timestamp\n";
    const rows = alerts
      .map(
        (a) =>
          `"${a.id}","${a.severity}","${a.type}","${a.row ?? "-"}","${a.message}","${a.action ?? "-"}","${a.status ?? "open"}","${a.timestamp ?? "-"}"`
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `gapx-alerts-${Date.now()}.csv`);
    link.click();
  };

  return (
    <div className="alerts-page-container">
      {/* Alerts Command Header */}
      <section className="card alerts-command-card">
        <div className="command-header">
          <div>
            <h2>Priority Restock &amp; Placement Alerts</h2>
            <p className="text-muted">
              Real-time alert dispatch queue for shelf stockouts, empty gaps, and planogram drift.
            </p>
          </div>
          <div className="command-controls">
            <button
              type="button"
              className={liveMode ? "btn-danger" : "primary"}
              onClick={() => setLiveMode(!liveMode)}
            >
              {liveMode ? (
                <>
                  <Pause size={15} style={{ marginRight: 6 }} /> Stop Live Feed
                </>
              ) : (
                <>
                  <Play size={15} style={{ marginRight: 6 }} /> Start Live Feed ({liveInterval}s)
                </>
              )}
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? "Mute audio alarms" : "Enable sound alerts"}
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
            <button
              type="button"
              className="secondary"
              onClick={exportAlertsCsv}
              disabled={alerts.length === 0}
            >
              <Download size={15} style={{ marginRight: 6 }} /> Export CSV
            </button>
          </div>
        </div>

        {/* Severity Metrics Strip */}
        <div className="alert-metrics-strip">
          <div className="metric-pill">
            <span className="lbl">Total Alerts</span>
            <strong className="val">{alerts.length}</strong>
          </div>
          <div className="metric-pill pill-danger">
            <span className="lbl">Critical / High</span>
            <strong className="val">
              {alerts.filter((a) => a.severity === "high" || a.severity === "critical").length}
            </strong>
          </div>
          <div className="metric-pill pill-warning">
            <span className="lbl">Medium / Drift</span>
            <strong className="val">
              {alerts.filter((a) => a.severity === "medium").length}
            </strong>
          </div>
          <div className="metric-pill pill-success">
            <span className="lbl">Resolved</span>
            <strong className="val">
              {alerts.filter((a) => a.status === "resolved").length}
            </strong>
          </div>
        </div>

        {error && <div className="error-banner">{error}</div>}

        {/* Filter Controls */}
        <div className="alert-filters-bar">
          <div className="filter-group">
            <Filter size={14} style={{ marginRight: 6 }} className="text-muted" />
            <span>Severity:</span>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
            >
              <option value="all">All Severities</option>
              <option value="high">High &bull; Urgent Gaps</option>
              <option value="medium">Medium &bull; Stockout Risk</option>
              <option value="low">Low &bull; Healthy</option>
            </select>
          </div>
          <div className="filter-group">
            <span>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="open">Open (Unacknowledged)</option>
              <option value="in_progress">In Progress (Dispatched)</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
        </div>
      </section>

      {/* Alerts Feed List */}
      <section className="card alerts-feed-card">
        <h3>Live Dispatch Queue ({filteredAlerts.length})</h3>
        {filteredAlerts.length === 0 ? (
          <div className="empty-alerts-box">
            <CheckCircle2 size={36} className="text-success mb-2" />
            <p>No alerts matching current filters.</p>
            <span className="text-muted">Shelves are fully stocked or all alerts have been resolved.</span>
          </div>
        ) : (
          <div className="alerts-feed-list">
            {filteredAlerts.map((alert) => {
              const isResolved = alert.status === "resolved";
              const isInProgress = alert.status === "in_progress";

              return (
                <div
                  key={alert.id}
                  className={`alert-card-row severity-${alert.severity} ${isResolved ? "alert-resolved" : ""}`}
                >
                  <div className="alert-badge-col">
                    <span className={`alert-severity-badge ${alert.severity}`}>
                      {alert.severity.toUpperCase()}
                    </span>
                    {alert.row !== null && (
                      <span className="alert-row-badge">Row {alert.row + 1}</span>
                    )}
                  </div>

                  <div className="alert-content-col">
                    <div className="alert-title-row">
                      <strong>{alert.type}</strong>
                      <span className="alert-timestamp">
                        <Clock size={12} style={{ marginRight: 4 }} />
                        {alert.timestamp || "Just now"}
                      </span>
                    </div>
                    <p className="alert-msg">{alert.message}</p>
                    {alert.action && (
                      <span className="alert-action-guidance">
                        <strong>Action:</strong> {alert.action}
                      </span>
                    )}
                  </div>

                  <div className="alert-status-col">
                    <span className={`status-pill status-${alert.status || "open"}`}>
                      {(alert.status || "open").replace("_", " ").toUpperCase()}
                    </span>
                    <div className="action-buttons-group">
                      {!isResolved && !isInProgress && (
                        <button
                          type="button"
                          className="btn-action-sm secondary"
                          onClick={() => updateAlertStatus(alert.id, "in_progress")}
                        >
                          Acknowledge
                        </button>
                      )}
                      {!isResolved && (
                        <button
                          type="button"
                          className="btn-action-sm btn-resolve"
                          onClick={() => updateAlertStatus(alert.id, "resolved")}
                        >
                          Resolve
                        </button>
                      )}
                      {isResolved && (
                        <button
                          type="button"
                          className="btn-action-sm secondary"
                          onClick={() => updateAlertStatus(alert.id, "open")}
                        >
                          Reopen
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
