import React, { useState, useRef } from "react";
import type { AnalysisResult, FacingBox, GapBox } from "../types";
import { Eye, Layers, ZoomIn, ZoomOut, RotateCcw, AlertTriangle, CheckCircle2 } from "lucide-react";

interface Props {
  imageUrl: string | null;
  result: AnalysisResult | null;
  onSelectBox?: (box: FacingBox | GapBox | null) => void;
}

const BRAND_PALETTE: Record<string, { stroke: string; fill: string; text: string }> = {
  redco: { stroke: "#ef4444", fill: "rgba(239, 68, 68, 0.22)", text: "#fca5a5" },
  bluebrand: { stroke: "#0ea5e9", fill: "rgba(14, 165, 233, 0.22)", text: "#7dd3fc" },
  greenfoods: { stroke: "#22c55e", fill: "rgba(34, 197, 94, 0.22)", text: "#86efac" },
  orangeline: { stroke: "#f97316", fill: "rgba(249, 115, 22, 0.22)", text: "#fdba74" },
};

const DEFAULT_COLOR = { stroke: "#a855f7", fill: "rgba(168, 85, 247, 0.22)", text: "#d8b4fe" };

export const ShelfCanvasOverlay: React.FC<Props> = ({ imageUrl, result, onSelectBox }) => {
  const [showBoxes, setShowBoxes] = useState(true);
  const [showGaps, setShowGaps] = useState(true);
  const [showTags, setShowTags] = useState(true);
  const [useBackendAnnotated, setUseBackendAnnotated] = useState(false);
  const [hoveredBox, setHoveredBox] = useState<FacingBox | GapBox | null>(null);
  const [selectedBox, setSelectedBox] = useState<FacingBox | GapBox | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const imgRef = useRef<HTMLImageElement>(null);

  if (!imageUrl && !result?.annotated_image_base64 && !result?.original_image_base64) {
    return (
      <div className="canvas-empty-state">
        <Eye size={42} className="canvas-empty-icon" />
        <p className="canvas-empty-title">No shelf imagery loaded</p>
        <span className="canvas-empty-subtitle">Upload a shelf photo or trigger a synthetic demo scenario above</span>
      </div>
    );
  }

  const activeSrc = useBackendAnnotated && result?.annotated_image_base64
    ? `data:image/jpeg;base64,${result.annotated_image_base64}`
    : imageUrl || (result?.original_image_base64 ? `data:image/jpeg;base64,${result.original_image_base64}` : "");

  const boxes = result?.boxes ?? [];
  const gapBoxes = result?.gap_boxes ?? [];

  // Coordinate resolution (default synthetic shelf is 800px wide, or natural image size)
  const baseWidth = 800;
  const baseHeight = result?.n_rows ? result.n_rows * 120 + 16 : 400;

  const handleBoxClick = (box: FacingBox | GapBox) => {
    setSelectedBox(box);
    onSelectBox?.(box);
  };

  return (
    <div className="shelf-canvas-wrapper">
      {/* Canvas Top Bar Controls */}
      <div className="canvas-toolbar">
        <div className="toolbar-left">
          <span className="toolbar-title">
            <Layers size={15} style={{ marginRight: 6 }} />
            Shelf Vision Inspector
          </span>
          <span className="badge-pill count-pill">
            {boxes.length} facings &bull; {gapBoxes.length} gaps
          </span>
        </div>

        <div className="toolbar-layers">
          <label className="layer-checkbox">
            <input
              type="checkbox"
              checked={showBoxes}
              onChange={(e) => setShowBoxes(e.target.checked)}
            />
            <span>Products</span>
          </label>
          <label className="layer-checkbox">
            <input
              type="checkbox"
              checked={showGaps}
              onChange={(e) => setShowGaps(e.target.checked)}
            />
            <span className="text-warning">Gaps</span>
          </label>
          <label className="layer-checkbox">
            <input
              type="checkbox"
              checked={showTags}
              onChange={(e) => setShowTags(e.target.checked)}
            />
            <span>Labels</span>
          </label>
          {result?.annotated_image_base64 && (
            <label className="layer-checkbox">
              <input
                type="checkbox"
                checked={useBackendAnnotated}
                onChange={(e) => setUseBackendAnnotated(e.target.checked)}
              />
              <span className="text-accent">OpenCV Overlay</span>
            </label>
          )}

          <div className="zoom-controls">
            <button
              type="button"
              className="icon-btn"
              title="Zoom In"
              onClick={() => setZoomLevel((z) => Math.min(z + 0.25, 2.5))}
            >
              <ZoomIn size={14} />
            </button>
            <button
              type="button"
              className="icon-btn"
              title="Zoom Out"
              onClick={() => setZoomLevel((z) => Math.max(z - 0.25, 0.75))}
            >
              <ZoomOut size={14} />
            </button>
            <button
              type="button"
              className="icon-btn"
              title="Reset Zoom"
              onClick={() => setZoomLevel(1)}
            >
              <RotateCcw size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Image & Overlay Surface */}
      <div className="canvas-stage-viewport">
        <div
          className="canvas-stage-content"
          style={{ transform: `scale(${zoomLevel})`, transformOrigin: "top center" }}
        >
          <img
            ref={imgRef}
            src={activeSrc}
            alt="Retail shelf scan"
            className="shelf-img-element"
          />

          {/* Render SVG vector overlays when not using static OpenCV overlay */}
          {!useBackendAnnotated && (
            <svg
              className="shelf-svg-overlay"
              viewBox={`0 0 ${baseWidth} ${baseHeight}`}
              preserveAspectRatio="none"
            >
              {/* Gap Bounding Boxes */}
              {showGaps &&
                gapBoxes.map((gap, i) => {
                  const isHovered = hoveredBox === gap;
                  const isSelected = selectedBox === gap;
                  return (
                    <g
                      key={`gap-${i}`}
                      className="svg-box-group gap-box-group"
                      onMouseEnter={() => setHoveredBox(gap)}
                      onMouseLeave={() => setHoveredBox(null)}
                      onClick={() => handleBoxClick(gap)}
                    >
                      <rect
                        x={gap.x}
                        y={gap.y}
                        width={gap.w}
                        height={gap.h}
                        rx={6}
                        fill={isHovered || isSelected ? "rgba(239, 68, 68, 0.35)" : "rgba(239, 68, 68, 0.16)"}
                        stroke="#ef4444"
                        strokeWidth={isSelected ? 3.5 : 2}
                        strokeDasharray="6 4"
                        className="pulse-box"
                      />
                      {showTags && (
                        <g transform={`translate(${gap.x + 4}, ${gap.y + 16})`}>
                          <rect
                            x={0}
                            y={-12}
                            width={95}
                            height={18}
                            rx={4}
                            fill="#b91c1c"
                            opacity={0.92}
                          />
                          <text
                            x={6}
                            y={0}
                            fill="#ffffff"
                            fontSize={10}
                            fontWeight={800}
                            letterSpacing="0.05em"
                          >
                            OUT OF STOCK
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}

              {/* Product Facing Bounding Boxes */}
              {showBoxes &&
                boxes.map((box, i) => {
                  const color = BRAND_PALETTE[box.brand] || DEFAULT_COLOR;
                  const isHovered = hoveredBox === box;
                  const isSelected = selectedBox === box;
                  const conf = Math.round((box.confidence ?? 0.95) * 100);

                  return (
                    <g
                      key={`box-${i}`}
                      className="svg-box-group facing-box-group"
                      onMouseEnter={() => setHoveredBox(box)}
                      onMouseLeave={() => setHoveredBox(null)}
                      onClick={() => handleBoxClick(box)}
                    >
                      <rect
                        x={box.x}
                        y={box.y}
                        width={box.w}
                        height={box.h}
                        rx={5}
                        fill={isHovered || isSelected ? "rgba(255,255,255,0.2)" : color.fill}
                        stroke={color.stroke}
                        strokeWidth={isSelected ? 3.5 : isHovered ? 2.5 : 1.8}
                      />

                      {showTags && (
                        <g transform={`translate(${box.x + 2}, ${box.y - 4})`}>
                          <rect
                            x={0}
                            y={-14}
                            width={box.brand.length * 7.5 + 40}
                            height={16}
                            rx={4}
                            fill={color.stroke}
                            opacity={0.95}
                          />
                          <text
                            x={4}
                            y={-2}
                            fill="#ffffff"
                            fontSize={10}
                            fontWeight={700}
                          >
                            {box.brand} {conf}%
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}
            </svg>
          )}
        </div>
      </div>

      {/* Selected / Hovered Detail Drawer */}
      {(hoveredBox || selectedBox) && (
        <div className="canvas-inspector-footer">
          {(() => {
            const b = hoveredBox || selectedBox;
            if (!b) return null;
            const isGap = "type" in b && b.type === "empty_shelf_gap";
            return (
              <div className="inspector-pill">
                <div className="inspector-indicator">
                  {isGap ? (
                    <AlertTriangle size={16} className="text-danger" />
                  ) : (
                    <CheckCircle2 size={16} className="text-success" />
                  )}
                  <strong>{isGap ? "Empty Shelf Gap" : `Product Facing: ${(b as FacingBox).brand}`}</strong>
                </div>
                <div className="inspector-meta">
                  <span>Row: {b.row + 1}</span>
                  <span>Pos: X:{b.x} Y:{b.y} W:{b.w} H:{b.h}</span>
                  <span>Confidence: {Math.round((b.confidence ?? 0.9) * 100)}%</span>
                  {isGap && <span className="urgent-badge">Restock Action Required</span>}
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};
