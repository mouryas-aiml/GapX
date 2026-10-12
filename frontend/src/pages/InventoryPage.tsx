import React from "react";
import type { AnalysisResult } from "../types";
import { Package, AlertTriangle, CheckCircle2, Download, TrendingDown, ArrowUpRight } from "lucide-react";

interface Props {
  latestResult: AnalysisResult | null;
}

export const InventoryPage: React.FC<Props> = ({ latestResult }) => {
  if (!latestResult) {
    return (
      <section className="card">
        <h2>Inventory &amp; On-Shelf Availability (OSA)</h2>
        <p className="text-muted">
          Run a shelf analysis or start camera monitoring to calculate live product facing counts and stockout risk.
        </p>
      </section>
    );
  }

  const totalFacings = latestResult.total_facings;
  const totalGaps = latestResult.facings_per_row.reduce((sum, r) => sum + r.gaps, 0);
  const potentialSlots = totalFacings + totalGaps;
  const onShelfAvailability = potentialSlots > 0 ? Math.round((totalFacings / potentialSlots) * 100) : 100;

  // Build brand inventory records
  const targetPerBrand: Record<string, number> = {
    redco: 4,
    bluebrand: 4,
    greenfoods: 4,
    orangeline: 4,
  };

  const inventoryRows = Object.entries(latestResult.share_of_shelf).map(([brand, share]) => {
    const estimatedFacings = Math.round(share * totalFacings);
    const target = targetPerBrand[brand] || 4;
    const deficit = Math.max(0, target - estimatedFacings);
    const fillRate = Math.min(100, Math.round((estimatedFacings / target) * 100));

    let healthStatus = "Optimal";
    let statusClass = "health-good";
    if (estimatedFacings === 0) {
      healthStatus = "Stockout";
      statusClass = "health-critical";
    } else if (fillRate < 50) {
      healthStatus = "Low Stock";
      statusClass = "health-warning";
    } else if (fillRate < 80) {
      healthStatus = "Moderate";
      statusClass = "health-med";
    }

    return {
      brand,
      estimatedFacings,
      target,
      deficit,
      fillRate,
      share: `${Math.round(share * 100)}%`,
      healthStatus,
      statusClass,
      suggestedRestock: deficit * 6, // 6 units depth per facing
    };
  });

  const exportInventorySlip = () => {
    const header = "Brand,CurrentFacings,TargetFacings,FillRate,ShareOfShelf,Deficit,UnitsToRestock,Status\n";
    const rows = inventoryRows
      .map(
        (r) =>
          `"${r.brand}",${r.estimatedFacings},${r.target},"${r.fillRate}%","${r.share}",${r.deficit},${r.suggestedRestock},"${r.healthStatus}"`
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `gapx-inventory-replenishment-${Date.now()}.csv`);
    link.click();
  };

  return (
    <div className="inventory-page-container">
      {/* Top Inventory Metrics */}
      <section className="card inventory-summary-card">
        <div className="summary-top">
          <div>
            <h2>Inventory &amp; On-Shelf Availability</h2>
            <p className="text-muted">
              Live facing metrics and replenishment triggers derived from computer-vision scans.
            </p>
          </div>
          <button
            type="button"
            className="secondary"
            onClick={exportInventorySlip}
          >
            <Download size={15} style={{ marginRight: 6 }} /> Export Warehouse Slip
          </button>
        </div>

        <div className="kpi-metrics-grid">
          <div className="kpi-card">
            <span className="kpi-label">On-Shelf Availability (OSA)</span>
            <span className={`kpi-value ${onShelfAvailability >= 90 ? "text-success" : onShelfAvailability >= 75 ? "text-warning" : "text-danger"}`}>
              {onShelfAvailability}%
            </span>
            <span className="kpi-sub">{totalFacings} stocked of {potentialSlots} slots</span>
          </div>

          <div className="kpi-card">
            <span className="kpi-label">Total Out-of-Stock Gaps</span>
            <span className="kpi-value text-danger">{totalGaps}</span>
            <span className="kpi-sub">Immediate restock zones detected</span>
          </div>

          <div className="kpi-card">
            <span className="kpi-label">Planogram Fill Rate</span>
            <span className="kpi-value text-accent">
              {Math.round((totalFacings / Math.max(potentialSlots, 1)) * 100)}%
            </span>
            <span className="kpi-sub">Target capacity vs detected facings</span>
          </div>

          <div className="kpi-card">
            <span className="kpi-label">Replenishment Units Needed</span>
            <span className="kpi-value text-warning">
              {inventoryRows.reduce((sum, r) => sum + r.suggestedRestock, 0)}
            </span>
            <span className="kpi-sub">Units to achieve 100% shelf readiness</span>
          </div>
        </div>
      </section>

      {/* Brand Facing & Inventory Table */}
      <section className="card inventory-table-card">
        <h3>Brand Facing Inventory Breakdown</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Brand / SKU</th>
                <th>On-Shelf Facings</th>
                <th>Target Capacity</th>
                <th>Capacity Fill Rate</th>
                <th>Share of Shelf</th>
                <th>Inventory Health</th>
                <th>Restock Action</th>
              </tr>
            </thead>
            <tbody>
              {inventoryRows.map((row) => (
                <tr key={row.brand}>
                  <td>
                    <div className="brand-cell">
                      <Package size={15} className="text-accent" style={{ marginRight: 6 }} />
                      <strong>{row.brand}</strong>
                    </div>
                  </td>
                  <td>{row.estimatedFacings}</td>
                  <td>{row.target}</td>
                  <td>
                    <div className="progress-bar-wrap">
                      <div
                        className="progress-bar-fill"
                        style={{
                          width: `${row.fillRate}%`,
                          backgroundColor:
                            row.fillRate < 50 ? "#ef4444" : row.fillRate < 80 ? "#f59e0b" : "#22c55e",
                        }}
                      />
                      <span className="progress-bar-text">{row.fillRate}%</span>
                    </div>
                  </td>
                  <td>{row.share}</td>
                  <td>
                    <span className={`badge-pill ${row.statusClass}`}>
                      {row.healthStatus}
                    </span>
                  </td>
                  <td>
                    {row.deficit > 0 ? (
                      <span className="restock-callout text-danger">
                        Restock +{row.suggestedRestock} units
                      </span>
                    ) : (
                      <span className="restock-callout text-success">
                        <CheckCircle2 size={13} style={{ marginRight: 4, display: "inline" }} />
                        Sufficient
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
