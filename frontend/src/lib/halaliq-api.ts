export type OverallStatus = "Not Ready" | "Needs Review" | "Low Risk";

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
};

const DEFAULT_ANALYZE_URL =
  "https://bwelgjbnzhlxwymakbtp.supabase.co/functions/v1/analyze-food";

function getAnalyzeUrl(): string {
  return import.meta.env.VITE_HALALIQ_ANALYZE_URL || DEFAULT_ANALYZE_URL;
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
