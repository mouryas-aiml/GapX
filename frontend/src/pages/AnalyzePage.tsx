import { FormEvent, useMemo, useState } from "react";
import { Pie, PieChart, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { analyzeImage, fetchDemo } from "../api";
import type { AnalysisResult } from "../types";

interface Props {
  apiBaseUrl: string;
  latestResult: AnalysisResult | null;
  onStoreAudit: (source: "upload" | "demo", result: AnalysisResult, filename?: string) => void;
}

const CHART_COLORS = ["#3b82f6", "#22c55e", "#f97316", "#e11d48", "#a855f7"];

export function AnalyzePage({ apiBaseUrl, latestResult, onStoreAudit }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [swap, setSwap] = useState(false);
  const [gaps, setGaps] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(latestResult);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const shareData = useMemo(() => {
    if (!result) {
      return [];
    }
    return Object.entries(result.share_of_shelf).map(([brand, value]) => ({ brand, value }));
  }, [result]);

  async function runDemo() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchDemo(apiBaseUrl, { swap, gaps });
      setResult(response);
      onStoreAudit("demo", response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error while running demo analysis.");
    } finally {
      setLoading(false);
    }
  }

  async function onAnalyzeUpload(event: FormEvent) {
    event.preventDefault();
    if (!file) {
      setError("Choose an image before running analysis.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await analyzeImage(apiBaseUrl, file);
      setResult(response);
      onStoreAudit("upload", response, file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error while analyzing image.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-md">
      <section className="card">
        <h2>Shelf Analysis</h2>
        <p className="muted">
          Upload real shelf images or run synthetic demo scenarios. All outputs are returned by the FastAPI backend.
        </p>
        <form onSubmit={onAnalyzeUpload} className="grid gap-sm">
          <input
            type="file"
            accept="image/*"
            onChange={(event) => {
              const selected = event.target.files?.[0] ?? null;
              setFile(selected);
              setPreviewUrl(selected ? URL.createObjectURL(selected) : null);
              setError(null);
            }}
          />
          <div className="button-row">
            <button type="submit" disabled={loading}>
              {loading ? "Analyzing..." : "Analyze uploaded image"}
            </button>
            <button type="button" className="secondary" disabled={loading} onClick={runDemo}>
              {loading ? "Processing..." : "Run synthetic demo"}
            </button>
          </div>
          <label className="inline-toggle">
            <input type="checkbox" checked={swap} onChange={(event) => setSwap(event.target.checked)} />
            Plant planogram swap
          </label>
          <label className="inline-toggle">
            <input type="checkbox" checked={gaps} onChange={(event) => setGaps(event.target.checked)} />
            Plant shelf gaps
          </label>
        </form>
        {error && <p className="error">{error}</p>}
        {previewUrl && (
          <div className="image-preview-wrap">
            <img src={previewUrl} alt="Selected shelf" className="image-preview" />
          </div>
        )}
      </section>

      <section className="card">
        <h2>Analysis Results</h2>
        {!result ? (
          <p className="muted">No analysis result yet.</p>
        ) : (
          <div className="grid gap-md">
            <div className="metrics-grid">
              <article className="metric card nested">
                <h3>Total Facings</h3>
                <p className="metric-value">{result.total_facings}</p>
              </article>
              <article className="metric card nested">
                <h3>Rows Detected</h3>
                <p className="metric-value">{result.n_rows}</p>
              </article>
              <article className="metric card nested">
                <h3>Overall Compliance</h3>
                <p className="metric-value">{Math.round(result.planogram.overall * 100)}%</p>
              </article>
              <article className="metric card nested">
                <h3>Alerts</h3>
                <p className="metric-value">{result.alerts.length}</p>
              </article>
            </div>

            <div className="chart-frame">
              <h3>Share of Shelf</h3>
              {shareData.length === 0 ? (
                <p className="muted">No brand share data available for this image.</p>
              ) : (
                <div style={{ width: "100%", height: 280 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={shareData} dataKey="value" nameKey="brand" outerRadius={95} label>
                        {shareData.map((entry, index) => (
                          <Cell key={entry.brand} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Row</th>
                    <th>Facings</th>
                    <th>Gaps</th>
                    <th>Detected Order</th>
                    <th>Compliance</th>
                  </tr>
                </thead>
                <tbody>
                  {result.planogram.rows.map((rowReport) => {
                    const row = result.facings_per_row.find((item) => item.row === rowReport.row);
                    return (
                      <tr key={rowReport.row}>
                        <td>{rowReport.row + 1}</td>
                        <td>{row?.facings ?? 0}</td>
                        <td>{row?.gaps ?? 0}</td>
                        <td>{rowReport.detected.join(" → ") || "None"}</td>
                        <td>{Math.round(rowReport.compliance * 100)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

