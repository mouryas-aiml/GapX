export type AlertSeverity = "critical" | "high" | "medium" | "low";

export interface FacingBox {
  row: number;
  brand: string;
  x: number;
  y: number;
  w: number;
  h: number;
  confidence?: number;
}

export interface GapBox {
  row: number;
  x: number;
  y: number;
  w: number;
  h: number;
  type?: string;
  confidence?: number;
}

export interface FacingRow {
  row: number;
  order: string[];
  gaps: number;
  facings: number;
  brands: string[];
}

export interface MisplacedItem {
  row: number;
  position: number;
  detected_brand: string;
  expected_brand: string;
  message: string;
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
  misplaced_items?: MisplacedItem[];
}

export interface GapxAlert {
  id?: string;
  severity: AlertSeverity;
  type: string;
  row: number | null;
  message: string;
  action?: string;
  status?: "open" | "in_progress" | "resolved";
  timestamp?: string;
}

export interface RestockRecommendation {
  brand: string;
  row: number;
  row_display: string;
  current_facings: number;
  target_facings: number;
  deficit: number;
  urgency: "critical" | "high" | "medium";
  suggested_units: number;
  reason: string;
}

export interface AnalysisResult {
  n_rows: number;
  total_facings: number;
  share_of_shelf: Record<string, number>;
  facings_per_row: FacingRow[];
  boxes: FacingBox[];
  gap_boxes?: GapBox[];
  planogram: PlanogramReport;
  alerts: GapxAlert[];
  recommendations?: RestockRecommendation[];
  latency_ms?: number;
  annotated_image_base64?: string;
  original_image_base64?: string;
  truth?: any;
}

export interface AuditEntry {
  id: string;
  createdAt: string;
  source: "upload" | "demo" | "camera";
  filename?: string;
  storeId?: string;
  result: AnalysisResult;
}

export interface BenchmarkReport {
  num_samples: number;
  total_ground_truth_boxes: number;
  precision: number;
  recall: number;
  f1: number;
  mAP_50: number;
  gap_mean_absolute_error: number;
  mean_latency_ms: number;
  fps: number;
  per_brand?: Record<string, { precision: number; recall: number; f1: number; tp: number; fp: number; fn: number }>;
}

export interface HealthInfo {
  status: string;
  service?: string;
  version?: string;
  hardware?: string;
  engine?: string;
  ping_ms?: number;
}
