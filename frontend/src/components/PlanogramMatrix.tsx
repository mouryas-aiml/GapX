import React from "react";
import type { PlanogramReport, FacingRow } from "../types";
import { CheckCircle2, AlertTriangle, XCircle, ArrowRight } from "lucide-react";

interface Props {
  planogram: PlanogramReport | null;
  facingsPerRow?: FacingRow[];
}

const BRAND_CHIP_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  redco: { bg: "rgba(239, 68, 68, 0.15)", border: "#ef4444", text: "#fca5a5" },
  bluebrand: { bg: "rgba(14, 165, 233, 0.15)", border: "#0ea5e9", text: "#7dd3fc" },
  greenfoods: { bg: "rgba(34, 197, 94, 0.15)", border: "#22c55e", text: "#86efac" },
  orangeline: { bg: "rgba(249, 115, 22, 0.15)", border: "#f97316", text: "#fdba74" },
};

const DEFAULT_CHIP = { bg: "rgba(168, 85, 247, 0.15)", border: "#a855f7", text: "#d8b4fe" };

export const PlanogramMatrix: React.FC<Props> = ({ planogram, facingsPerRow }) => {
  if (!planogram || planogram.rows.length === 0) {
    return (
      <div className="matrix-empty">
        <p className="text-muted">No planogram comparison available. Run an analysis to inspect compliance.</p>
      </div>
    );
  }

  const misplaced = planogram.misplaced_items ?? [];

  return (
    <div className="planogram-matrix-container">
      {/* Misplaced Items Banner if any */}
      {misplaced.length > 0 && (
        <div className="misplaced-alert-banner">
          <div className="banner-header">
            <AlertTriangle size={18} className="text-warning" />
            <h4>{misplaced.length} Misplaced Product(s) Detected</h4>
          </div>
          <div className="misplaced-chips-grid">
            {misplaced.map((item, idx) => (
              <div key={idx} className="misplaced-chip">
                <span className="chip-pos">Row {item.row + 1}, Slot {item.position}:</span>
                <span className="chip-det text-danger">{item.detected_brand}</span>
                <ArrowRight size={12} className="chip-arrow" />
                <span className="chip-exp text-success">{item.expected_brand}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Row By Row Visual Comparison Strips */}
      <div className="matrix-rows-list">
        {planogram.rows.map((row) => {
          const rowGaps = facingsPerRow?.find((r) => r.row === row.row)?.gaps ?? 0;
          const compliancePct = Math.round(row.compliance * 100);
          const isFullMatch = compliancePct === 100;

          return (
            <div key={row.row} className={`matrix-row-card ${isFullMatch ? "row-ok" : "row-drift"}`}>
              <div className="row-card-header">
                <div className="header-left">
                  <span className="row-number-badge">Row {row.row + 1}</span>
                  <span className={`compliance-tag ${compliancePct >= 90 ? "tag-high" : compliancePct >= 60 ? "tag-med" : "tag-low"}`}>
                    {compliancePct}% Compliance
                  </span>
                  {rowGaps > 0 && (
                    <span className="gap-tag">
                      <XCircle size={13} style={{ marginRight: 4 }} />
                      {rowGaps} Empty Gap{rowGaps > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                {isFullMatch ? (
                  <span className="match-status text-success">
                    <CheckCircle2 size={16} style={{ marginRight: 5 }} /> Fully Compliant
                  </span>
                ) : (
                  <span className="match-status text-warning">
                    <AlertTriangle size={16} style={{ marginRight: 5 }} /> Placement Deviation
                  </span>
                )}
              </div>

              {/* Visual Strip: Expected vs Detected */}
              <div className="row-strips-comparison">
                {/* Expected Strip */}
                <div className="strip-group">
                  <span className="strip-label">Expected Layout:</span>
                  <div className="brand-slots-row">
                    {row.expected.map((brand, i) => {
                      const color = BRAND_CHIP_COLORS[brand] || DEFAULT_CHIP;
                      return (
                        <div
                          key={`exp-${i}`}
                          className="brand-slot-chip"
                          style={{ borderColor: color.border, backgroundColor: color.bg, color: color.text }}
                        >
                          <span className="slot-idx">#{i + 1}</span>
                          <span className="slot-name">{brand}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Detected Strip */}
                <div className="strip-group">
                  <span className="strip-label">Detected Layout:</span>
                  <div className="brand-slots-row">
                    {row.expected.map((expBrand, i) => {
                      const actBrand = row.detected[i];
                      const isMatch = actBrand === expBrand;
                      const isMissing = !actBrand;
                      const color = actBrand ? (BRAND_CHIP_COLORS[actBrand] || DEFAULT_CHIP) : { bg: "rgba(239, 68, 68, 0.12)", border: "#ef4444", text: "#fca5a5" };

                      return (
                        <div
                          key={`det-${i}`}
                          className={`brand-slot-chip ${isMatch ? "slot-match" : isMissing ? "slot-missing" : "slot-swapped"}`}
                          style={{ borderColor: color.border, backgroundColor: color.bg, color: color.text }}
                        >
                          <span className="slot-idx">#{i + 1}</span>
                          <span className="slot-name">{actBrand || "EMPTY GAP"}</span>
                          <span className="slot-indicator">
                            {isMatch ? "✓" : isMissing ? "MISSING" : "SWAP"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
