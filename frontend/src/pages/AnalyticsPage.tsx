import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { AuditEntry } from "../types";

interface Props {
  audits: AuditEntry[];
}

export function AnalyticsPage({ audits }: Props) {
  const chart = audits
    .slice(0, 20)
    .reverse()
    .map((entry, index) => ({
      idx: index + 1,
      compliance: Math.round(entry.result.planogram.overall * 100),
      gaps: entry.result.facings_per_row.reduce((sum, row) => sum + row.gaps, 0),
      alerts: entry.result.alerts.length
    }));

  return (
    <section className="card">
      <h2>Analytics</h2>
      <p className="muted">Trend visualization for compliance, gap count, and alert volume.</p>
      {chart.length === 0 ? (
        <p className="muted">Run analyses to generate analytics.</p>
      ) : (
        <div style={{ width: "100%", height: 320 }}>
          <ResponsiveContainer>
            <LineChart data={chart}>
              <XAxis dataKey="idx" />
              <YAxis />
              <Tooltip />
              <Line dataKey="compliance" stroke="var(--accent)" strokeWidth={2.5} />
              <Line dataKey="gaps" stroke="var(--warning)" strokeWidth={2.5} />
              <Line dataKey="alerts" stroke="var(--danger)" strokeWidth={2.5} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

