import type { AnalysisResult } from "../types";

interface Props {
  latestResult: AnalysisResult | null;
}

export function InventoryPage({ latestResult }: Props) {
  if (!latestResult) {
    return (
      <section className="card">
        <h2>Inventory Tracking</h2>
        <p className="muted">Run shelf analysis to derive inventory facings and stockout risk levels.</p>
      </section>
    );
  }

  const rows = Object.entries(latestResult.share_of_shelf).map(([brand, share]) => {
    const estimatedFacings = Math.round(share * latestResult.total_facings);
    const health =
      estimatedFacings === 0 ? "Critical" : estimatedFacings < 2 ? "Low" : estimatedFacings < 4 ? "Moderate" : "Healthy";
    return { brand, estimatedFacings, share: `${Math.round(share * 100)}%`, health };
  });

  return (
    <section className="card">
      <h2>Inventory Tracking</h2>
      <p className="muted">Brand inventory is inferred from detected facings in the latest analyzed frame.</p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Brand</th>
              <th>Estimated Facings</th>
              <th>Share of Shelf</th>
              <th>Inventory Health</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.brand}>
                <td>{row.brand}</td>
                <td>{row.estimatedFacings}</td>
                <td>{row.share}</td>
                <td>{row.health}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

