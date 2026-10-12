import React from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
  CartesianGrid,
} from "recharts";
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Package,
  Layers,
  ArrowRight,
  Camera,
  Activity,
  Cpu,
  ShieldCheck,
} from "lucide-react";
import type { AnalysisResult, AuditEntry } from "../types";

interface Props {
  latestResult: AnalysisResult | null;
  audits: AuditEntry[];
  connected: boolean;
}

export const DashboardPage: React.FC<Props> = ({ latestResult, audits, connected }) => {
  const compliance = latestResult ? Math.round(latestResult.planogram.overall * 100) : 100;
  const gapCount = latestResult
    ? latestResult.facings_per_row.reduce((sum, row) => sum + row.gaps, 0)
    : 0;
  const stockoutRiskAlerts = latestResult
    ? latestResult.alerts.filter((a) => a.severity === "high" || a.severity === "critical").length
    : 0;
  const totalFacings = latestResult?.total_facings ?? 12;

  const trend = audits
    .slice(0, 10)
    .reverse()
    .map((audit, idx) => ({
      tick: `#${idx + 1}`,
      compliance: Math.round(audit.result.planogram.overall * 100),
      gaps: audit.result.facings_per_row.reduce((sum, row) => sum + row.gaps, 0),
      facings: audit.result.total_facings,
    }));

  return (
    <div className="dashboard-page-container">
      {/* Welcome Banner */}
      <section className="card dashboard-hero-card">
        <div className="hero-content">
          <div className="hero-text">
            <h2>Retail Shelf Intelligence Command Center</h2>
            <p className="text-muted">
              Real-time monitoring of shelf availability, stockout prevention, and automated planogram compliance verification.
            </p>
          </div>
          <div className="hero-actions">
            <Link to="/analyze" className="btn-primary-link">
              <Camera size={16} style={{ marginRight: 6 }} /> Analyze Shelf
            </Link>
            <Link to="/alerts" className="btn-secondary-link">
              View Alerts ({latestResult?.alerts.length ?? 0})
            </Link>
          </div>
        </div>

        {/* System Telemetry Bar */}
        <div className="telemetry-bar">
          <div className="telemetry-item">
            <Activity size={14} className={connected ? "text-success" : "text-danger"} />
            <span>FastAPI Backend:</span>
            <strong>{connected ? "Online (Port 8210)" : "Disconnected"}</strong>
          </div>
          <div className="telemetry-item">
            <Cpu size={14} className="text-accent" />
            <span>Compute Engine:</span>
            <strong>NVIDIA RTX 3050 &bull; OpenCV 5.0</strong>
          </div>
          <div className="telemetry-item">
            <ShieldCheck size={14} className="text-success" />
            <span>Detection Latency:</span>
            <strong>{latestResult?.latency_ms ?? 12} ms</strong>
          </div>
        </div>
      </section>

      {/* Primary KPI Ribbon */}
      <section className="kpi-metrics-grid">
        <article className="kpi-card">
          <span className="kpi-label">Planogram Compliance</span>
          <p className={`kpi-value ${compliance >= 90 ? "text-success" : compliance >= 75 ? "text-warning" : "text-danger"}`}>
            {compliance}%
          </p>
          <span className="kpi-sub">
            {compliance >= 90 ? "Optimal shelf layout" : "Placement deviation flagged"}
          </span>
        </article>

        <article className="kpi-card">
          <span className="kpi-label">Out-of-Stock Gaps</span>
          <p className={`kpi-value ${gapCount > 0 ? "text-danger" : "text-success"}`}>
            {gapCount}
          </p>
          <span className="kpi-sub">
            {gapCount > 0 ? "Replenishment actions required" : "Zero empty shelf slots"}
          </span>
        </article>

        <article className="kpi-card">
          <span className="kpi-label">Stocked Product Facings</span>
          <p className="kpi-value text-accent">{totalFacings}</p>
          <span className="kpi-sub">
            Across {latestResult?.n_rows ?? 3} shelf racks
          </span>
        </article>

        <article className="kpi-card">
          <span className="kpi-label">Critical Dispatch Alerts</span>
          <p className={`kpi-value ${stockoutRiskAlerts > 0 ? "text-warning" : "text-success"}`}>
            {stockoutRiskAlerts}
          </p>
          <span className="kpi-sub">High priority restocking tickets</span>
        </article>
      </section>

      {/* Main Trend Chart */}
      <section className="card chart-card">
        <div className="chart-header">
          <div>
            <h3>Audit Compliance &amp; Gap Trend</h3>
            <p className="chart-sub text-muted">Historical compliance rate and gap frequency across recent audit scans.</p>
          </div>
          <Link to="/analytics" className="card-header-link">
            Full BI Analytics <ArrowRight size={13} style={{ marginLeft: 4 }} />
          </Link>
        </div>

        {trend.length === 0 ? (
          <div className="empty-chart-box">
            <p className="text-muted">Perform an analysis or run a demo scenario to generate live trend charts.</p>
            <Link to="/analyze" className="secondary btn-sm mt-2">
              Launch Shelf Scanner
            </Link>
          </div>
        ) : (
          <div style={{ width: "100%", height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="tick" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", borderRadius: 8 }}
                />
                <Legend />
                <Bar dataKey="compliance" name="Compliance %" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="gaps" name="Shelf Gaps" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Quick Access Grid: Recent Audits & Quick Actions */}
      <div className="dashboard-subgrid">
        <section className="card recent-audits-card">
          <div className="card-header-row">
            <h3>Recent Shelf Scans</h3>
            <Link to="/history" className="card-header-link">
              View All <ArrowRight size={13} style={{ marginLeft: 4 }} />
            </Link>
          </div>

          {audits.length === 0 ? (
            <p className="text-muted">No audits recorded yet.</p>
          ) : (
            <ul className="recent-audits-list">
              {audits.slice(0, 5).map((a) => (
                <li key={a.id} className="audit-list-item">
                  <div className="audit-item-info">
                    <strong>{a.filename || `Scan #${a.id.slice(0, 8)}`}</strong>
                    <span className="text-muted">{new Date(a.createdAt).toLocaleTimeString()} &bull; {a.source}</span>
                  </div>
                  <div className="audit-item-score">
                    <span className="badge-pill bg-accent-subtle">
                      {Math.round(a.result.planogram.overall * 100)}%
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card active-alerts-preview-card">
          <div className="card-header-row">
            <h3>Active Shelf Alerts</h3>
            <Link to="/alerts" className="card-header-link">
              Manage Queue <ArrowRight size={13} style={{ marginLeft: 4 }} />
            </Link>
          </div>

          {!latestResult || latestResult.alerts.length === 0 ? (
            <div className="empty-alerts-inline">
              <CheckCircle2 size={24} className="text-success" style={{ marginRight: 8 }} />
              <span>All monitored shelves are currently compliant and stocked.</span>
            </div>
          ) : (
            <ul className="alerts-preview-list">
              {latestResult.alerts.slice(0, 4).map((alert, idx) => (
                <li key={idx} className={`alert-preview-item severity-${alert.severity}`}>
                  <span className={`alert-chip ${alert.severity}`}>
                    {alert.severity.toUpperCase()}
                  </span>
                  <div className="alert-preview-text">
                    <strong>{alert.type}</strong>
                    <p>{alert.message}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};
