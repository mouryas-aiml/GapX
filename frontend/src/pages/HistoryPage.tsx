import React, { useState } from "react";
import type { AuditEntry } from "../types";
import { History, Download, Trash2, Search, Eye, FileText, CheckCircle2 } from "lucide-react";

interface Props {
  audits: AuditEntry[];
  onClearHistory?: () => void;
  onSelectAudit?: (audit: AuditEntry) => void;
}

export const HistoryPage: React.FC<Props> = ({ audits, onClearHistory, onSelectAudit }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [selectedAudit, setSelectedAudit] = useState<AuditEntry | null>(null);

  const filteredAudits = audits.filter((a) => {
    if (sourceFilter !== "all" && a.source !== sourceFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchFile = a.filename?.toLowerCase().includes(term);
      const matchSource = a.source.toLowerCase().includes(term);
      const matchId = a.id.toLowerCase().includes(term);
      if (!matchFile && !matchSource && !matchId) return false;
    }
    return true;
  });

  const exportAllAuditsJson = () => {
    if (audits.length === 0) return;
    const jsonStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(audits, null, 2));
    const dlAnchor = document.createElement("a");
    dlAnchor.setAttribute("href", jsonStr);
    dlAnchor.setAttribute("download", `gapx-audits-export-${Date.now()}.json`);
    dlAnchor.click();
  };

  const printAuditSummary = (audit: AuditEntry) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const compliance = Math.round(audit.result.planogram.overall * 100);
    const gaps = audit.result.facings_per_row.reduce((sum, r) => sum + r.gaps, 0);

    printWindow.document.write(`
      <html>
        <head>
          <title>GapX Retail Audit Report - ${audit.id}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 30px; color: #1e293b; }
            h1 { color: #0284c7; margin-bottom: 4px; }
            .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 20px; }
            .meta { color: #64748b; font-size: 14px; margin-bottom: 24px; }
            .metric-box { display: inline-block; padding: 12px 20px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-right: 12px; margin-bottom: 16px; }
            .metric-val { font-size: 24px; font-weight: bold; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; }
            th { background: #f1f5f9; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>GapX Retail Shelf Audit Certificate</h1>
            <div class="meta">Audit ID: ${audit.id} | Date: ${new Date(audit.createdAt).toLocaleString()} | Source: ${audit.source}</div>
          </div>
          <div>
            <div class="metric-box"><div>Planogram Compliance</div><div class="metric-val">${compliance}%</div></div>
            <div class="metric-box"><div>Total Facings</div><div class="metric-val">${audit.result.total_facings}</div></div>
            <div class="metric-box"><div>Stockout Gaps</div><div class="metric-val">${gaps}</div></div>
            <div class="metric-box"><div>Active Alerts</div><div class="metric-val">${audit.result.alerts.length}</div></div>
          </div>
          <h3>Shelf Row Breakdown</h3>
          <table>
            <thead><tr><th>Row</th><th>Facings</th><th>Gaps</th><th>Brand Sequence</th><th>Compliance</th></tr></thead>
            <tbody>
              ${audit.result.planogram.rows.map(r => `
                <tr>
                  <td>Row ${r.row + 1}</td>
                  <td>${r.detected.length}</td>
                  <td>${audit.result.facings_per_row.find(f => f.row === r.row)?.gaps ?? 0}</td>
                  <td>${r.detected.join(" &rarr; ") || "None"}</td>
                  <td>${Math.round(r.compliance * 100)}%</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="history-page-container">
      <section className="card history-header-card">
        <div className="header-top">
          <div>
            <h2>Shelf Audit History &amp; Logs</h2>
            <p className="text-muted">
              Historical compliance records, gap counts, and audit trails stored for operations review.
            </p>
          </div>
          <div className="header-actions">
            <button
              type="button"
              className="secondary"
              onClick={exportAllAuditsJson}
              disabled={audits.length === 0}
            >
              <Download size={15} style={{ marginRight: 6 }} /> Export All Logs (JSON)
            </button>
            {onClearHistory && (
              <button
                type="button"
                className="secondary"
                onClick={onClearHistory}
                disabled={audits.length === 0}
              >
                <Trash2 size={15} style={{ marginRight: 6 }} /> Clear History
              </button>
            )}
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="history-filter-bar">
          <div className="search-input-wrap">
            <Search size={15} className="search-icon text-muted" />
            <input
              type="text"
              placeholder="Search by file name, source, or audit ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="source-filter-wrap">
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
            >
              <option value="all">All Ingestion Sources</option>
              <option value="upload">Uploads</option>
              <option value="camera">Live Camera Scans</option>
              <option value="demo">Synthetic Demos</option>
            </select>
          </div>
        </div>
      </section>

      {/* Audit Log Table */}
      <section className="card history-table-card">
        {filteredAudits.length === 0 ? (
          <div className="empty-history-box">
            <History size={36} className="text-muted mb-2" />
            <p>No audit records match your query.</p>
            <span className="text-muted">Perform shelf scans or demo analyses to populate this audit log.</span>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Source</th>
                  <th>Target / File</th>
                  <th>Compliance</th>
                  <th>Total Facings</th>
                  <th>Gaps</th>
                  <th>Alerts</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAudits.map((entry) => {
                  const compliance = Math.round(entry.result.planogram.overall * 100);
                  const gaps = entry.result.facings_per_row.reduce((sum, r) => sum + r.gaps, 0);

                  return (
                    <tr key={entry.id}>
                      <td>
                        <span className="timestamp-text">
                          {new Date(entry.createdAt).toLocaleString()}
                        </span>
                      </td>
                      <td>
                        <span className={`source-pill source-${entry.source}`}>
                          {entry.source.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <strong>{entry.filename || `Scan #${entry.id.slice(0, 8)}`}</strong>
                      </td>
                      <td>
                        <span className={`compliance-tag ${compliance >= 90 ? "tag-high" : compliance >= 60 ? "tag-med" : "tag-low"}`}>
                          {compliance}%
                        </span>
                      </td>
                      <td>{entry.result.total_facings}</td>
                      <td>
                        <span className={gaps > 0 ? "text-danger font-bold" : "text-muted"}>
                          {gaps}
                        </span>
                      </td>
                      <td>{entry.result.alerts.length}</td>
                      <td>
                        <div className="row-actions">
                          <button
                            type="button"
                            className="btn-icon-action"
                            title="Print / PDF Report"
                            onClick={() => printAuditSummary(entry)}
                          >
                            <FileText size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
