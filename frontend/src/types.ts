export type AlertSeverity = "high" | "medium" | "low";

export interface FacingBox {
  row: number;
  brand: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FacingRow {
  row: number;
  order: string[];
  gaps: number;
  facings: number;
  brands: string[];
}

export interface PlanogramRow {
  row: number;
  expected: string[];
  detected: string[];
  compliance: number;
}

export interface PlanogramReport {
  overall: number;
  rows: PlanogramRow[];
}

export interface GapxAlert {
  severity: AlertSeverity;
  type: string;
  row: number | null;
  message: string;
}

export interface AnalysisResult {
  n_rows: number;
  total_facings: number;
  share_of_shelf: Record<string, number>;
  facings_per_row: FacingRow[];
  boxes: FacingBox[];
  planogram: PlanogramReport;
  alerts: GapxAlert[];
}

export interface AuditEntry {
  id: string;
  createdAt: string;
  source: "upload" | "demo";
  filename?: string;
  result: AnalysisResult;
}

