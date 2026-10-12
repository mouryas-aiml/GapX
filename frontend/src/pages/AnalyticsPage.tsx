import React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
  CartesianGrid,
} from "recharts";
import type { AuditEntry } from "../types";
import { TrendingUp, BarChart3, AlertTriangle, CheckCircle2, ShieldCheck } from "lucide-react";

interface Props {
  audits: AuditEntry[];
}

export const AnalyticsPage: React.FC<Props> = ({ audits }) => {
  if (audits.length === 0) {
    return (
      <section className="card">
        <h2>Retail Intelligence Analytics</h2>
        <p className="text-muted">No audit history available yet. Run shelf scans to generate trend analytics.</p>
      </section>
    );
  }

  // Trend data over audits (last 20)
  const trendData = audits
    .slice(0, 20)
    .reverse()
    .map((entry, idx) => {
      const compliance = Math.round(entry.result.planogram.overall * 100);
      const gaps = entry.result.facings_per_row.reduce((sum, r) => sum + r.gaps, 0);
      const facings = entry.result.total_facings;
      return {
        session: `#${idx + 1}`,
        compliance,
        target: 90,
        gaps,
        facings,
        alerts: entry.result.alerts.length,
      };
    });

  // Calculate row-level gap frequency across all audits
  const rowGapsMap: Record<number, number> = {};
  audits.forEach((a) => {
    a.result.facings_per_row.forEach((r) => {
      rowGapsMap[r.row] = (rowGapsMap[r.row] || 0) + r.gaps;
    });
  });

  const rowGapData = Object.entries(rowGapsMap).map(([rowIdx, count]) => ({
    rowName: `Row ${parseInt(rowIdx) + 1}`,
    gaps: count,
  }));

  // Aggregated executive metrics
  const avgCompliance = Math.round(
    audits.reduce((acc, a) => acc + a.result.planogram.overall, 0) / audits.length * 100
  );
  const totalGapsDetected = audits.reduce(
    (acc, a) => acc + a.result.facings_per_row.reduce((sum, r) => sum + r.gaps, 0),
    0
  );
  const totalAudits = audits.length;

  return (
    <div className="analytics-page-container">
      {/* Analytics KPI Ribbon */}
      <section className="card analytics-kpi-card">
        <div>
          <h2>Executive Retail Shelf Analytics</h2>
          <p className="text-muted">
            Aggregated merchandising compliance, out-of-stock risk trends, and shelf performance insights.
          </p>
        </div>

        <div className="kpi-metrics-grid mt-3">
          <div className="kpi-card">
            <span className="kpi-label">Mean Compliance Rate</span>
            <span className={`kpi-value ${avgCompliance >= 90 ? "text-success" : "text-warning"}`}>
              {avgCompliance}%
            </span>
            <span className="kpi-sub">Target benchmark: 90%</span>
          </div>

          <div className="kpi-card">
            <span className="kpi-label">Cumulative Gaps Detected</span>
            <span className="kpi-value text-danger">{totalGapsDetected}</span>
            <span className="kpi-sub">Across {totalAudits} historical audit scans</span>
          </div>

          <div className="kpi-card">
            <span className="kpi-label">Audits Executed</span>
            <span className="kpi-value text-accent">{totalAudits}</span>
            <span className="kpi-sub">Camera, upload, and demo sources</span>
          </div>

          <div className="kpi-card">
            <span className="kpi-label">Merchandising Health</span>
            <span className="kpi-value text-success">
              {avgCompliance >= 85 ? "Excellent" : "Needs Attention"}
            </span>
            <span className="kpi-sub">Overall operational readiness</span>
          </div>
        </div>
      </section>

      {/* Chart 1: Planogram Compliance Trend */}
      <section className="card chart-card">
        <div className="chart-title-wrap">
          <TrendingUp size={18} className="text-accent" style={{ marginRight: 6 }} />
          <h3>Planogram Compliance Trajectory Over Scans</h3>
        </div>
        <p className="chart-sub text-muted">
          Tracking adherence to merchandising rules vs. the 90% benchmark target threshold.
        </p>

        <div style={{ width: "100%", height: 320 }}>
          <ResponsiveContainer>
            <AreaChart data={trendData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="compAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="session" stroke="#64748b" />
              <YAxis domain={[0, 100]} stroke="#64748b" />
              <Tooltip
                contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", borderRadius: 8 }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="compliance"
                name="Compliance %"
                stroke="#38bdf8"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#compAreaGrad)"
              />
              <Area
                type="monotone"
                dataKey="target"
                name="Target Benchmark (90%)"
                stroke="#22c55e"
                strokeWidth={2}
                strokeDasharray="5 5"
                fill="none"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Dual Charts: Gaps by Row & Facings vs Gaps */}
      <div className="dual-charts-grid">
        <section className="card chart-card">
          <div className="chart-title-wrap">
            <BarChart3 size={18} className="text-warning" style={{ marginRight: 6 }} />
            <h3>Cumulative Gaps by Shelf Level</h3>
          </div>
          <p className="chart-sub text-muted">Identify which shelf rows suffer the highest out-of-stock frequency.</p>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={rowGapData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="rowName" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", borderRadius: 8 }}
                />
                <Bar dataKey="gaps" name="Total Gaps" fill="#ef4444" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="card chart-card">
          <div className="chart-title-wrap">
            <BarChart3 size={18} className="text-accent" style={{ marginRight: 6 }} />
            <h3>Facings vs. Gap Volume</h3>
          </div>
          <p className="chart-sub text-muted">Comparison of stocked product units against empty shelf gaps.</p>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="session" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", borderRadius: 8 }}
                />
                <Legend />
                <Bar dataKey="facings" name="Stocked Facings" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="gaps" name="Empty Gaps" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </div>
  );
};
