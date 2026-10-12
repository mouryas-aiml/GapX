import type { AnalysisResult, BenchmarkReport, HealthInfo } from "./types";

export interface DetectionOptions {
  conf_threshold?: number;
  nms_iou?: number;
  gap_min_width?: number;
  clahe?: boolean;
  return_annotated?: boolean;
}

export async function checkHealth(apiBaseUrl: string): Promise<boolean> {
  try {
    const res = await fetch(`${apiBaseUrl}/health`, { method: "GET" });
    return res.ok;
  } catch {
    return false;
  }
}

export async function checkHealthDetails(apiBaseUrl: string): Promise<HealthInfo | null> {
  const start = performance.now();
  try {
    const res = await fetch(`${apiBaseUrl}/health`, { method: "GET" });
    const ping_ms = Math.round(performance.now() - start);
    if (!res.ok) return null;
    const data = (await res.json()) as HealthInfo;
    return { ...data, ping_ms };
  } catch {
    return null;
  }
}

export async function fetchDemo(
  apiBaseUrl: string,
  params: { swap?: boolean; gaps?: boolean; conf_threshold?: number; nms_iou?: number } = {}
): Promise<AnalysisResult> {
  const url = new URL(`${apiBaseUrl}/demo`);
  if (params.swap) url.searchParams.set("swap", "true");
  if (params.gaps) url.searchParams.set("gaps", "true");
  if (params.conf_threshold !== undefined) url.searchParams.set("conf_threshold", params.conf_threshold.toString());
  if (params.nms_iou !== undefined) url.searchParams.set("nms_iou", params.nms_iou.toString());
  url.searchParams.set("return_annotated", "true");

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Demo request failed with status ${response.status}`);
  }
  return (await response.json()) as AnalysisResult;
}

export async function analyzeImage(
  apiBaseUrl: string,
  file: File,
  options: DetectionOptions = {}
): Promise<AnalysisResult> {
  const url = new URL(`${apiBaseUrl}/analyze`);
  if (options.conf_threshold !== undefined) url.searchParams.set("conf_threshold", options.conf_threshold.toString());
  if (options.nms_iou !== undefined) url.searchParams.set("nms_iou", options.nms_iou.toString());
  if (options.gap_min_width !== undefined) url.searchParams.set("gap_min_width", options.gap_min_width.toString());
  if (options.clahe !== undefined) url.searchParams.set("clahe", options.clahe ? "true" : "false");
  url.searchParams.set("return_annotated", "true");

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(url.toString(), {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    let detail = `status ${response.status}`;
    try {
      const payload = (await response.json()) as { detail?: string };
      if (payload.detail) detail = payload.detail;
    } catch {
      detail = response.statusText || detail;
    }
    throw new Error(`Image analysis failed: ${detail}`);
  }
  return (await response.json()) as AnalysisResult;
}

export async function analyzeBase64Frame(
  apiBaseUrl: string,
  imageBase64: string,
  options: DetectionOptions = {}
): Promise<AnalysisResult> {
  const response = await fetch(`${apiBaseUrl}/analyze-frame`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image_base64: imageBase64,
      conf_threshold: options.conf_threshold ?? 0.35,
      nms_iou: options.nms_iou ?? 0.40,
      gap_min_width: options.gap_min_width ?? 35,
      clahe: options.clahe ?? true,
      return_annotated: true,
    }),
  });

  if (!response.ok) {
    let detail = `status ${response.status}`;
    try {
      const payload = (await response.json()) as { detail?: string };
      if (payload.detail) detail = payload.detail;
    } catch {
      detail = response.statusText || detail;
    }
    throw new Error(`Frame analysis failed: ${detail}`);
  }
  return (await response.json()) as AnalysisResult;
}

export async function fetchBenchmark(apiBaseUrl: string, samples: number = 15): Promise<BenchmarkReport> {
  const response = await fetch(`${apiBaseUrl}/benchmark?samples=${samples}`);
  if (!response.ok) {
    throw new Error(`Benchmark failed with status ${response.status}`);
  }
  return (await response.json()) as BenchmarkReport;
}

export async function fetchSystemConfig(apiBaseUrl: string): Promise<any> {
  const response = await fetch(`${apiBaseUrl}/config`);
  if (!response.ok) {
    throw new Error(`Failed to load system config: ${response.status}`);
  }
  return await response.json();
}
