export type OverallStatus = "Not Ready" | "Needs Review" | "Low Risk";

export type ComplianceDomain = "food" | "cosmetics" | "export_compliance" | "pharmaceuticals";

export type ComplianceEntry = {
  ingredient: string;
  risk: string;
  reasoning: string;
  required_documents: string[];
  affected_markets: string[];
};

export type ComplianceSummary = {
  total_ingredients: number;
  blockers_count: number;
  warnings_count: number;
  human_readable: string;
};

export type ReportHistoryItem = {
  id: string;
  created_at: string;
  reports?: Array<{
    result?: ComplianceReport;
    created_at?: string;
  }>;
};

export type ComplianceReport = {
  product_name: string;
  domain?: ComplianceDomain;
  market?: string;
  overall_status: OverallStatus;
  summary: ComplianceSummary;
  blockers: ComplianceEntry[];
  warnings: ComplianceEntry[];
  safe: ComplianceEntry[];
  history?: ReportHistoryItem[];
};

export type AnalyzeProductInput = {
  product_name: string;
  ingredients: string[];
  market: string;
  domain?: ComplianceDomain;
};

export type ExtractIngredientsInput = {
  image_base64: string;
  mime_type: string;
  product_name?: string;
  market?: string;
  domain?: ComplianceDomain;
};

export type ExtractIngredientsResult = {
  raw_text: string;
  ingredients: string[];
  confidence: number;
  warnings: string[];
  needs_review: boolean;
  visual_warning?: string | null;
};

const DEFAULT_ANALYZE_URL = "https://bwelgjbnzhlxwymakbtp.supabase.co/functions/v1/analyze-food";

const DEFAULT_EXTRACT_URL =
  "https://bwelgjbnzhlxwymakbtp.supabase.co/functions/v1/extract-ingredients-from-image";

function getAnalyzeUrl(): string {
  return import.meta.env.VITE_HALALIQ_ANALYZE_URL || DEFAULT_ANALYZE_URL;
}

function getExtractUrl(): string {
  return import.meta.env.VITE_HALALIQ_EXTRACT_URL || DEFAULT_EXTRACT_URL;
}

function getOptionalAnonKey(): string | undefined {
  return import.meta.env.VITE_SUPABASE_ANON_KEY || undefined;
}

function buildHeaders(): HeadersInit {
  const anonKey = getOptionalAnonKey();

  if (!anonKey) {
    return {
      "Content-Type": "application/json",
    };
  }

  return {
    "Content-Type": "application/json",
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
  };
}

async function readJsonResponse(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch (_error) {
    return null;
  }
}

function extractErrorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object" && "error" in payload) {
    const error = (payload as { error?: unknown }).error;

    if (typeof error === "string" && error.trim().length > 0) {
      return error;
    }
  }

  return fallback;
}

export async function analyzeProduct(input: AnalyzeProductInput): Promise<ComplianceReport> {
  const response = await fetch(getAnalyzeUrl(), {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(input),
  });

  const payload = await readJsonResponse(response);

  if (!response.ok) {
    throw new Error(extractErrorMessage(payload, "The compliance scan failed."));
  }

  return payload as ComplianceReport;
}

export async function extractIngredientsFromImage(
  input: ExtractIngredientsInput,
): Promise<ExtractIngredientsResult> {
  const response = await fetch(getExtractUrl(), {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(input),
  });

  const payload = await readJsonResponse(response);

  if (!response.ok) {
    throw new Error(extractErrorMessage(payload, "Ingredient extraction failed."));
  }

  return payload as ExtractIngredientsResult;
}
