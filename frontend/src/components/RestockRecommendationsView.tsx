import React, { useState } from "react";
import type { RestockRecommendation } from "../types";
import { Package, ArrowUpRight, CheckCircle2, Clock } from "lucide-react";

interface Props {
  recommendations: RestockRecommendation[] | undefined;
}

export const RestockRecommendationsView: React.FC<Props> = ({ recommendations = [] }) => {
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());

  if (recommendations.length === 0) {
    return (
      <div className="recommendations-empty card nested">
        <CheckCircle2 size={32} className="text-success mb-2" />
        <h4>All Shelf Facings Fully Stocked</h4>
        <p className="text-muted">No facing deficits or restocking actions required for this shelf frame.</p>
      </div>
    );
  }

  const toggleRestocked = (key: string) => {
    setCompletedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <div className="restock-recommendations-wrapper">
      <div className="recommendations-header">
        <div>
          <h4>Priority Restocking Queue</h4>
          <p className="text-muted">
            {recommendations.length} replenishment item(s) recommended based on detected shelf gaps and facing deficits.
          </p>
        </div>
        <span className="badge-pill bg-danger-subtle">
          {recommendations.filter((r) => r.urgency === "critical").length} Critical
        </span>
      </div>

      <div className="recommendations-grid">
        {recommendations.map((rec, i) => {
          const itemKey = `${rec.brand}-${rec.row}-${i}`;
          const isDone = completedItems.has(itemKey);

          return (
            <div
              key={itemKey}
              className={`recommendation-card ${isDone ? "item-restocked" : `urgency-${rec.urgency}`}`}
            >
              <div className="card-top">
                <div className="brand-ident">
                  <Package size={16} className="text-accent mr-2" />
                  <strong>{rec.brand}</strong>
                  <span className="row-tag">{rec.row_display}</span>
                </div>
                <span className={`urgency-pill ${rec.urgency}`}>
                  {rec.urgency.toUpperCase()}
                </span>
              </div>

              <div className="card-metrics">
                <div className="metric-col">
                  <span className="metric-lbl">On-Shelf</span>
                  <span className="metric-val">{rec.current_facings}</span>
                </div>
                <div className="metric-col">
                  <span className="metric-lbl">Target</span>
                  <span className="metric-val">{rec.target_facings}</span>
                </div>
                <div className="metric-col">
                  <span className="metric-lbl">Deficit</span>
                  <span className="metric-val text-danger">-{rec.deficit}</span>
                </div>
                <div className="metric-col">
                  <span className="metric-lbl">To Restock</span>
                  <span className="metric-val text-accent">+{rec.suggested_units} units</span>
                </div>
              </div>

              <p className="rec-reason">{rec.reason}</p>

              <div className="card-action">
                <button
                  type="button"
                  className={isDone ? "btn-restocked" : "btn-action-primary"}
                  onClick={() => toggleRestocked(itemKey)}
                >
                  {isDone ? (
                    <>
                      <CheckCircle2 size={14} style={{ marginRight: 5 }} /> Restocked
                    </>
                  ) : (
                    <>
                      <ArrowUpRight size={14} style={{ marginRight: 5 }} /> Mark Replenished
                    </>
                  )}
                </button>
                <span className="eta-text">
                  <Clock size={12} style={{ marginRight: 4 }} /> SLA: &lt; 15 min
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
