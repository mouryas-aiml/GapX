import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { AnalysisResult, AuditEntry } from "../types";

interface Props {
  latestResult: AnalysisResult | null;
  audits: AuditEntry[];
  connected: boolean;
}

export function DashboardPage({ latestResult, audits, connected }: Props) {
  const compliance = latestResult ? Math.round(latestResult.planogram.overall * 100) : 0;
  const gapCount = latestResult
    ? latestResult.facings_per_row.reduce((sum, row) => sum + row.gaps, 0)
    : 0;
  const stockoutRisk = latestResult
    ? latestResult.alerts.filter((alert) => alert.type === "stockout-risk").length
    : 0;

  const trend = audits
    .slice(0, 10)
    .reverse()
    .map((audit, idx) => ({
      tick: idx + 1,
      compliance: Math.round(audit.result.planogram.overall * 100),
      gaps: audit.result.facings_per_row.reduce((sum, row) => sum + row.gaps, 0)
    }));

  return (
    <div className="grid gap-md">
      <section className="metrics-grid">
        <article className="metric card">
          <h3>API Status</h3>
          <p className={connected ? "metric-value success" : "metric-value danger"}>
            {connected ? "Online" : "Offline"}
          </p>
        </article>
        <article className="metric card">
          <h3>Planogram Compliance</h3>
          <p className="metric-value">{compliance}%</p>
        </article>
        <article className="metric card">
          <h3>Shelf Gaps</h3>
          <p className="metric-value">{gapCount}</p>
        </article>
        <article className="metric card">
          <h3>Stockout Risk Alerts</h3>
          <p className="metric-value">{stockoutRisk}</p>
        </article>
      </section>

      <section className="card">
        <h2>Compliance and Gap Trend</h2>
        {trend.length === 0 ? (
          <p className="muted">Run an analysis to populate trend analytics.</p>
        ) : (
          <div style={{ width: "100%", height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={trend}>
                <XAxis dataKey="tick" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="compliance" fill="var(--accent)" />
                <Bar dataKey="gaps" fill="var(--warning)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </div>
  );
}

