import type { AuditEntry } from "../types";

interface Props {
  audits: AuditEntry[];
}

export function HistoryPage({ audits }: Props) {
  return (
    <section className="card">
      <h2>Audit History</h2>
      <p className="muted">Historical snapshots are stored in browser local storage for quick retail audits.</p>
      {audits.length === 0 ? (
        <p className="muted">No audits captured yet.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Source</th>
                <th>File</th>
                <th>Compliance</th>
                <th>Gaps</th>
                <th>Alerts</th>
              </tr>
            </thead>
            <tbody>
              {audits.map((entry) => (
                <tr key={entry.id}>
                  <td>{new Date(entry.createdAt).toLocaleString()}</td>
                  <td>{entry.source}</td>
                  <td>{entry.filename ?? "-"}</td>
                  <td>{Math.round(entry.result.planogram.overall * 100)}%</td>
                  <td>{entry.result.facings_per_row.reduce((sum, row) => sum + row.gaps, 0)}</td>
                  <td>{entry.result.alerts.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

