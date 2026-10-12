import type { AnalysisResult } from "./types";

export async function checkHealth(apiBaseUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`${apiBaseUrl}/health`, { method: "GET" });
    return response.ok;
  } catch {
    return false;
  }
}

export async function fetchDemo(
  apiBaseUrl: string,
  params: { swap?: boolean; gaps?: boolean } = {}
): Promise<AnalysisResult> {
  const url = new URL(`${apiBaseUrl}/demo`);
  if (params.swap) {
    url.searchParams.set("swap", "true");
  }
  if (params.gaps) {
    url.searchParams.set("gaps", "true");
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Demo request failed with status ${response.status}`);
  }
  return (await response.json()) as AnalysisResult;
}

export async function analyzeImage(apiBaseUrl: string, file: File): Promise<AnalysisResult> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(`${apiBaseUrl}/analyze`, {
    method: "POST",
    body: formData
  });
  if (!response.ok) {
    let detail = `status ${response.status}`;
    try {
      const payload = (await response.json()) as { detail?: string };
      if (payload.detail) {
        detail = payload.detail;
      }
    } catch {
      detail = response.statusText || detail;
    }
    throw new Error(`Image analysis failed: ${detail}`);
  }
  return (await response.json()) as AnalysisResult;
}

