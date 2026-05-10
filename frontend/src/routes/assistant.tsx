import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import readExcelFile from "read-excel-file/browser";
import {
  AlertTriangle,
  ArrowUp,
  BadgeCheck,
  Camera,
  ChevronDown,
  ClipboardCheck,
  FileUp,
  FileText,
  History,
  Loader2,
  MapPinned,
  PackageCheck,
  Plus,
  ScanLine,
  ScrollText,
  ShieldCheck,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { Nav } from "@/components/site/Nav";
import { VerdictBadge } from "@/components/site/VerdictBadge";
import {
  analyzeProduct,
  extractIngredientsFromImage,
  type ComplianceDomain,
  type ComplianceEntry,
  type ComplianceReport,
  type ExtractIngredientsResult,
  type OverallStatus,
  type ReportHistoryItem,
} from "@/lib/halaliq-api";
import {
  clearActiveGuestEmail,
  getActiveGuestEmail,
  getGuestHistory,
  saveGuestReport,
} from "@/lib/guest-workspace";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type BarcodeFormat =
  | "qr_code"
  | "ean_13"
  | "ean_8"
  | "upc_a"
  | "upc_e"
  | "code_128";

type DetectedBarcode = {
  format: BarcodeFormat;
  rawValue?: string;
};

type BarcodeDetectorInstance = {
  detect: (source: ImageBitmapSource) => Promise<DetectedBarcode[]>;
};

type BarcodeDetectorConstructor = {
  new (options?: { formats?: BarcodeFormat[] }): BarcodeDetectorInstance;
  getSupportedFormats?: () => Promise<BarcodeFormat[]>;
};

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorConstructor;
  }
}

export const Route = createFileRoute("/assistant")({
  head: () => ({
    meta: [
      { title: "Assistant - Halal Intelligence Product Readiness" },
      {
        name: "description",
        content:
          "Run a product-level halal pre-certification scan with ingredient risk groups, required documents, and scan history.",
      },
      { property: "og:title", content: "Halal Intelligence Product Readiness Assistant" },
      {
        property: "og:description",
        content: "Halal readiness checks for B2B manufacturers.",
      },
    ],
  }),
  component: AssistantPage,
});

type ReportTab = "summary" | "blockers" | "warnings" | "safe" | "history";

const SAMPLE_SCANS = [
  {
    productName: "Chocolate Wafer Biscuit",
    ingredients: "Palm Oil\nGelatin\nVanilla Flavor",
    market: "Malaysia",
    domain: "food" as ComplianceDomain,
  },
  {
    productName: "Brightening Face Cream",
    ingredients: "Collagen\nGlycerin\nFragrance\nCarmine",
    market: "Malaysia",
    domain: "cosmetics" as ComplianceDomain,
  },
  {
    productName: "Export Compliance Demo",
    ingredients: "Palm Oil\nGelatin\nNatural Flavor\nMixed Emulsifier\nChocolate Flavor",
    market: "UAE",
    domain: "export_compliance" as ComplianceDomain,
  },
  {
    productName: "Softgel Supplement",
    ingredients: "Gelatin\nGlycerin\nMagnesium Stearate",
    market: "Malaysia",
    domain: "pharmaceuticals" as ComplianceDomain,
  },
];

const DOMAIN_OPTIONS: Array<{ value: ComplianceDomain; label: string; helper: string }> = [
  { value: "food", label: "Food", helper: "Ingredient halal readiness" },
  { value: "cosmetics", label: "Cosmetics", helper: "Personal care ingredients" },
  { value: "export_compliance", label: "Export Compliance", helper: "Market readiness checklist" },
  { value: "pharmaceuticals", label: "Pharmaceuticals", helper: "Excipients and capsules" },
];

const MAX_IMPORTED_FILE_ROWS = 10;

const MARKET_OPTIONS = [
  {
    value: "Malaysia",
    label: "Malaysia",
    authority: "Malaysia halal market",
    coverage: 92,
    focus: "Local halal certification readiness",
  },
  {
    value: "UAE",
    label: "UAE",
    authority: "UAE export market",
    coverage: 82,
    focus: "Export documentation and market entry",
  },
  {
    value: "United Kingdom",
    label: "United Kingdom",
    authority: "HFA / HMC style review",
    coverage: 68,
    focus: "Importer and certifier review support",
  },
  {
    value: "European Union",
    label: "European Union",
    authority: "EU-facing export pack",
    coverage: 58,
    focus: "Traceability and evidence checklist",
  },
];

type MarketProfile = {
  label: string;
  confidenceAdjustment: number;
  warningNote: string;
  readinessSummary: Record<OverallStatus, string>;
  defaultDocuments: string[];
  strictBlockerIngredients: string[];
  strictReviewIngredients: string[];
};

const MARKET_PROFILES: Record<string, MarketProfile> = {
  Malaysia: {
    label: "Malaysia",
    confidenceAdjustment: 4,
    warningNote: "Accepted with supplier proof in Malaysia",
    readinessSummary: {
      "Low Risk": "Ready for Malaysia review",
      "Needs Review": "Needs more evidence for Malaysia review",
      "Not Ready": "Not ready for Malaysia review",
    },
    defaultDocuments: ["Halal certificate", "Supplier declaration", "Ingredient origin proof"],
    strictBlockerIngredients: [],
    strictReviewIngredients: ["flavor", "emulsifier"],
  },
  UAE: {
    label: "UAE",
    confidenceAdjustment: -3,
    warningNote: "Needs export evidence for UAE",
    readinessSummary: {
      "Low Risk": "Ready for UAE export review",
      "Needs Review": "Needs more evidence for UAE export review",
      "Not Ready": "Not ready for UAE export submission",
    },
    defaultDocuments: ["Export documents", "Ingredient source proof", "Batch traceability"],
    strictBlockerIngredients: ["gelatin", "collagen"],
    strictReviewIngredients: ["flavor", "glycerin"],
  },
  "United Kingdom": {
    label: "United Kingdom",
    confidenceAdjustment: -6,
    warningNote: "Requires certifier review for UK",
    readinessSummary: {
      "Low Risk": "Ready for UK certifier review",
      "Needs Review": "Needs more evidence for UK certifier review",
      "Not Ready": "Not ready for UK certifier review",
    },
    defaultDocuments: ["Ingredient origin proof", "Certifier-ready evidence pack"],
    strictBlockerIngredients: [],
    strictReviewIngredients: ["collagen", "carmine", "gelatin"],
  },
  "European Union": {
    label: "European Union",
    confidenceAdjustment: -10,
    warningNote: "Needs broader export evidence for EU review",
    readinessSummary: {
      "Low Risk": "Ready for EU export review",
      "Needs Review": "Needs more evidence for EU export review",
      "Not Ready": "Not ready for EU export submission",
    },
    defaultDocuments: ["Ingredient source proof", "Traceability record", "Export pack readiness"],
    strictBlockerIngredients: [],
    strictReviewIngredients: ["gelatin", "collagen", "flavor"],
  },
};

function getDomainLabel(domain: ComplianceDomain | undefined): string {
  return DOMAIN_OPTIONS.find((option) => option.value === domain)?.label ?? "Food";
}

function getMarketLabel(market: string): string {
  return MARKET_OPTIONS.find((option) => option.value === market)?.label ?? market;
}

function getMarketProfile(market: string): MarketProfile {
  return (
    MARKET_PROFILES[market] ?? {
      label: market,
      confidenceAdjustment: -4,
      warningNote: `Needs market-specific evidence for ${market}`,
      readinessSummary: {
        "Low Risk": `Ready for ${market} review`,
        "Needs Review": `Needs more evidence for ${market} review`,
        "Not Ready": `Not ready for ${market} submission`,
      },
      defaultDocuments: ["Ingredient source proof", "Supplier documents", "Traceability record"],
      strictBlockerIngredients: [],
      strictReviewIngredients: ["flavor", "gelatin"],
    }
  );
}

function buildInternalProductName({
  productName,
  domain,
  market,
  ingredients,
}: {
  productName: string;
  domain: ComplianceDomain;
  market: string;
  ingredients: string[];
}): string {
  if (productName.trim().length > 0) {
    return productName.trim();
  }

  const ingredientCount = ingredients.length || 1;

  return `${getDomainLabel(domain)} scan with ${ingredientCount} ingredient${ingredientCount === 1 ? "" : "s"} for ${getMarketLabel(market)}`;
}

function mergeHistoryLists(
  primaryHistory: ReportHistoryItem[],
  secondaryHistory: ReportHistoryItem[],
): ReportHistoryItem[] {
  const merged = [...primaryHistory, ...secondaryHistory];
  const seenIds = new Set<string>();

  return merged.filter((item) => {
    if (seenIds.has(item.id)) {
      return false;
    }

    seenIds.add(item.id);
    return true;
  });
}

function matchesMarketIngredient(entry: ComplianceEntry, matchers: string[]): boolean {
  const ingredient = entry.ingredient.toLowerCase();
  return matchers.some((matcher) => ingredient.includes(matcher));
}

function mergeRequiredDocuments(existingDocuments: string[], market: string): string[] {
  const defaults = getMarketProfile(market).defaultDocuments;
  return Array.from(new Set([...existingDocuments, ...defaults]));
}

function applyMarketRulesToEntry(
  entry: ComplianceEntry,
  market: string,
  lane: "blockers" | "warnings" | "safe",
): ComplianceEntry {
  const profile = getMarketProfile(market);
  const laneMessage =
    lane === "blockers"
      ? `${profile.warningNote}. This item should stay blocked until the country-specific evidence is complete.`
      : lane === "warnings"
        ? `${profile.warningNote}. Review the country-specific evidence before submission.`
        : `Low-risk for now, but ${profile.warningNote.toLowerCase()}.`;

  return {
    ...entry,
    risk:
      lane === "blockers"
        ? `Blocked for ${profile.label}`
        : lane === "warnings"
          ? `Review for ${profile.label}`
          : `Low risk for ${profile.label}`,
    reasoning: `${simplifyReasoning(entry)} ${laneMessage}`,
    required_documents: mergeRequiredDocuments(entry.required_documents, market),
    affected_markets: Array.from(new Set([profile.label, ...entry.affected_markets])),
  };
}

function applyMarketRulesToReport(report: ComplianceReport, market: string): ComplianceReport {
  const profile = getMarketProfile(market);
  const nextBlockers = report.blockers.map((entry) => applyMarketRulesToEntry(entry, market, "blockers"));
  const strictWarnings = report.warnings.map((entry) => applyMarketRulesToEntry(entry, market, "warnings"));
  const strictSafe = report.safe.map((entry) => applyMarketRulesToEntry(entry, market, "safe"));

  const promotedWarnings = strictWarnings.filter((entry) =>
    matchesMarketIngredient(entry, profile.strictBlockerIngredients),
  );
  const remainingWarnings = strictWarnings.filter(
    (entry) => !matchesMarketIngredient(entry, profile.strictBlockerIngredients),
  );
  const promotedSafe = strictSafe.filter((entry) =>
    matchesMarketIngredient(entry, profile.strictReviewIngredients),
  );
  const remainingSafe = strictSafe.filter(
    (entry) => !matchesMarketIngredient(entry, profile.strictReviewIngredients),
  );

  const blockers = [...nextBlockers, ...promotedWarnings].map((entry) => ({
    ...entry,
    risk: `Blocked for ${profile.label}`,
  }));
  const warnings = [...remainingWarnings, ...promotedSafe].map((entry) => ({
    ...entry,
    risk: `Review for ${profile.label}`,
  }));
  const safe = remainingSafe;

  return {
    ...report,
    market,
    blockers,
    warnings,
    safe,
    overall_status:
      blockers.length > 0
        ? "Not Ready"
        : warnings.length > 0
          ? "Needs Review"
          : "Low Risk",
    summary: {
      ...report.summary,
      blockers_count: blockers.length,
      warnings_count: warnings.length,
      human_readable: profile.readinessSummary[
        blockers.length > 0 ? "Not Ready" : warnings.length > 0 ? "Needs Review" : "Low Risk"
      ],
    },
  };
}

function getMarketChecklist(report: ComplianceReport, market: string) {
  const hasBlockers = report.blockers.length > 0;
  const hasWarnings = report.warnings.length > 0;

  return [
    {
      label: "Ingredient review",
      state: hasBlockers ? "Required" : hasWarnings ? "Review" : "Ready",
    },
    {
      label: "Supplier documents",
      state: report.blockers.length + report.warnings.length > 0 ? "Required" : "Ready",
    },
    {
      label: "Traceability",
      state: market === "UAE" || market === "European Union" ? "Required" : hasWarnings ? "Review" : "Ready",
    },
    {
      label: "Labeling",
      state: hasWarnings ? "Review" : "Ready",
    },
    {
      label: "Export pack readiness",
      state: hasBlockers ? "Blocked" : hasWarnings ? "Review" : "Ready",
    },
  ];
}

type CodePayload = {
  ingredients: string[];
  productName?: string;
  market?: string;
  domain?: ComplianceDomain;
  sourceLabel: string;
};

function extractIngredientsFromText(rawValue: string): string[] {
  const normalized = rawValue.replace(/\|/g, "\n");
  const matchedIngredients = normalized.match(/ingredients?\s*[:=-]\s*([\s\S]+)/i);

  if (matchedIngredients?.[1]) {
    return parseIngredients(matchedIngredients[1]);
  }

  return parseIngredients(normalized);
}

function parseCodePayload(rawValue: string): CodePayload | null {
  const trimmedValue = rawValue.trim();

  if (!trimmedValue) {
    return null;
  }

  try {
    const parsedUrl = new URL(trimmedValue);
    const urlIngredients = parseIngredients(
      parsedUrl.searchParams.get("ingredients") ??
        parsedUrl.searchParams.get("ingredient_list") ??
        parsedUrl.searchParams.get("items") ??
        "",
    );

    if (urlIngredients.length > 0) {
      const nextDomain = parsedUrl.searchParams.get("domain");

      return {
        ingredients: urlIngredients,
        productName: parsedUrl.searchParams.get("product_name") ?? undefined,
        market: parsedUrl.searchParams.get("market") ?? undefined,
        domain: isComplianceDomain(nextDomain) ? nextDomain : undefined,
        sourceLabel: "QR code",
      };
    }
  } catch (_error) {
    // Ignore non-URL values and keep checking other payload shapes.
  }

  try {
    const parsedJson = JSON.parse(trimmedValue) as Record<string, unknown>;
    const rawIngredients =
      parsedJson.ingredients ??
      parsedJson.ingredient_list ??
      parsedJson.items ??
      parsedJson.ingredients_text;

    const ingredients = Array.isArray(rawIngredients)
      ? rawIngredients
          .filter((value): value is string => typeof value === "string")
          .flatMap((value) => parseIngredients(value))
      : typeof rawIngredients === "string"
        ? parseIngredients(rawIngredients)
        : [];

    if (ingredients.length > 0) {
      const nextDomain =
        typeof parsedJson.domain === "string" ? parsedJson.domain : undefined;

      return {
        ingredients,
        productName:
          typeof parsedJson.product_name === "string" ? parsedJson.product_name : undefined,
        market: typeof parsedJson.market === "string" ? parsedJson.market : undefined,
        domain: isComplianceDomain(nextDomain) ? nextDomain : undefined,
        sourceLabel: "QR code",
      };
    }
  } catch (_error) {
    // Ignore non-JSON values and try plain text extraction.
  }

  const ingredients = extractIngredientsFromText(trimmedValue);

  if (ingredients.length > 1) {
    return {
      ingredients,
      sourceLabel: "QR code",
    };
  }

  return null;
}

function isComplianceDomain(value: string | null | undefined): value is ComplianceDomain {
  return (
    value === "food" ||
    value === "cosmetics" ||
    value === "export_compliance" ||
    value === "pharmaceuticals"
  );
}

function AssistantPage() {
  const [submitted, setSubmitted] = useState(false);
  const [tab, setTab] = useState<ReportTab>("summary");
  const [productName, setProductName] = useState("");
  const [ingredientsInput, setIngredientsInput] = useState("");
  const [market, setMarket] = useState("Malaysia");
  const [domain, setDomain] = useState<ComplianceDomain>("food");
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [extractionResult, setExtractionResult] = useState<ExtractIngredientsResult | null>(null);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [fileImportMessage, setFileImportMessage] = useState<string | null>(null);
  const [fileImportError, setFileImportError] = useState<string | null>(null);
  const [isImportingFile, setIsImportingFile] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [report, setReport] = useState<ComplianceReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [guestEmail, setGuestEmail] = useState<string | null>(null);
  const [guestHistory, setGuestHistory] = useState<ReportHistoryItem[]>([]);
  const ingredientEditorRef = useRef<HTMLLabelElement | null>(null);
  const resultsTopRef = useRef<HTMLDivElement | null>(null);
  const activeHistory = report?.history ?? guestHistory;

  useEffect(() => {
    const nextGuestEmail = getActiveGuestEmail();
    setGuestEmail(nextGuestEmail);
    setGuestHistory(getGuestHistory(nextGuestEmail));
  }, []);

  useEffect(() => {
    if (!submitted || (!report && !isLoading && !error)) {
      return;
    }

    resultsTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [submitted, report, isLoading, error]);

  useEffect(() => {
    if (!extractionResult && !fileImportMessage) {
      return;
    }

    ingredientEditorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [extractionResult, fileImportMessage]);

  const updateIngredientsInput = (value: string) => {
    setIngredientsInput(value);
    setProductName("");
  };

  const updateMarket = (value: string) => {
    setMarket(value);
    setProductName("");
  };

  const updateDomain = (value: ComplianceDomain) => {
    setDomain(value);
    setProductName("");
  };

  const runPreparedScan = async ({
    nextProductName,
    nextIngredientsInput,
    nextMarket,
    nextDomain,
  }: {
    nextProductName: string;
    nextIngredientsInput: string;
    nextMarket: string;
    nextDomain: ComplianceDomain;
  }) => {
    const ingredients = parseIngredients(nextIngredientsInput);

    if (ingredients.length === 0) {
      setError("Add at least one ingredient before running a scan.");
      return;
    }

    if (nextMarket.trim().length === 0) {
      setError("Market is required before running a scan.");
      return;
    }

    setSubmitted(true);
    setTab("summary");
    setError(null);
    setIsLoading(true);

    try {
      const productNameForScan = buildInternalProductName({
        productName: nextProductName,
        domain: nextDomain,
        market: nextMarket.trim(),
        ingredients,
      });

      setProductName(productNameForScan);
      setIngredientsInput(nextIngredientsInput);
      setMarket(nextMarket);
      setDomain(nextDomain);

      const nextReport = await analyzeProduct({
        product_name: productNameForScan,
        ingredients,
        market: nextMarket.trim(),
        domain: nextDomain,
      });

      const marketAwareReport = applyMarketRulesToReport(nextReport, nextMarket.trim());
      const nextHistory = guestEmail ? saveGuestReport(guestEmail, marketAwareReport) : guestHistory;
      setGuestHistory(nextHistory);
      setReport({
        ...marketAwareReport,
        history: mergeHistoryLists(nextHistory, marketAwareReport.history ?? []),
      });
    } catch (scanError) {
      setReport(null);
      setError(scanError instanceof Error ? scanError.message : "Unable to run the scan.");
    } finally {
      setIsLoading(false);
    }
  };

  const runScan = async () => {
    await runPreparedScan({
      nextProductName: productName,
      nextIngredientsInput: ingredientsInput,
      nextMarket: market,
      nextDomain: domain,
    });
  };

  const handleImageSelected = (file: File | null) => {
    setImageFile(file);
    setProductName("");
    setExtractionResult(null);
    setExtractionError(null);
    setFileImportMessage(null);
    setFileImportError(null);

    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }

    setImagePreviewUrl(file ? URL.createObjectURL(file) : null);
  };

  const runImageExtraction = async () => {
    if (!imageFile) {
      setExtractionError("Choose a label photo before extracting ingredients.");
      return;
    }

    setExtractionError(null);
    setIsExtracting(true);

    try {
      const imagePayload = await readImageAsBase64(imageFile);
      const extracted = await extractIngredientsFromImage({
        ...imagePayload,
        market: market.trim() || undefined,
        domain,
      });
      const safeIngredients = sanitizeExtractedIngredients(extracted.ingredients);
      const safeExtraction = { ...extracted, ingredients: safeIngredients };

      setExtractionResult(safeExtraction);
      setFileImportMessage(null);
      setFileImportError(null);
      setReport(null);
      setError(null);
      setSubmitted(false);

      if (safeIngredients.length > 0) {
        setIngredientsInput(safeIngredients.join("\n"));
        setProductName("");
      }
    } catch (extractError) {
      setExtractionResult(null);
      setExtractionError(
        extractError instanceof Error ? extractError.message : "Unable to extract ingredients.",
      );
    } finally {
      setIsExtracting(false);
    }
  };

  const importIngredientFile = async (file: File | null) => {
    if (!file) {
      return;
    }

    setIsImportingFile(true);
    setFileImportError(null);
    setFileImportMessage(null);

    try {
      const importedIngredients = await readIngredientsFromFile(file);

      if (importedIngredients.length === 0) {
        setFileImportError("No ingredients were found in the selected file.");
        return;
      }

      setIngredientsInput(importedIngredients.join("\n"));
      setProductName("");
      setExtractionResult(null);
      setExtractionError(null);
      setReport(null);
      setError(null);
      setSubmitted(false);
      setFileImportMessage(
        `Imported ${importedIngredients.length} ingredient(s) from the first ${MAX_IMPORTED_FILE_ROWS} row(s)/line(s).`,
      );
    } catch (importError) {
      setFileImportError(
        importError instanceof Error ? importError.message : "Unable to import ingredients.",
      );
    } finally {
      setIsImportingFile(false);
    }
  };

  const loadSample = (sample: (typeof SAMPLE_SCANS)[number]) => {
    setProductName(sample.productName);
    setIngredientsInput(sample.ingredients);
    setMarket(sample.market);
    setDomain(sample.domain);
    handleImageSelected(null);
    setReport(null);
    setError(null);
    setSubmitted(false);
  };

  const runDemoSample = async (sample: (typeof SAMPLE_SCANS)[number]) => {
    handleImageSelected(null);
    setExtractionResult(null);
    setExtractionError(null);
    setFileImportMessage(null);
    setFileImportError(null);
    await runPreparedScan({
      nextProductName: sample.productName,
      nextIngredientsInput: sample.ingredients,
      nextMarket: sample.market,
      nextDomain: sample.domain,
    });
  };

  const applyCodePayload = (payload: CodePayload) => {
    setIngredientsInput(payload.ingredients.join("\n"));

    if (payload.productName?.trim()) {
      setProductName(payload.productName.trim());
    } else {
      setProductName("");
    }

    if (payload.market?.trim()) {
      setMarket(payload.market.trim());
    }

    if (payload.domain) {
      setDomain(payload.domain);
    }

    setExtractionResult(null);
    setExtractionError(null);
    setReport(null);
    setError(null);
    setSubmitted(false);
    setFileImportError(null);
    setFileImportMessage(
      `Loaded ${payload.ingredients.length} ingredient(s) from ${payload.sourceLabel}. Review them below before scanning.`,
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 lg:grid-cols-[280px_1fr]">
        <aside className="border-b border-hairline px-4 py-4 lg:border-r lg:border-b-0 lg:py-6">
          <button
            onClick={() => {
              setSubmitted(false);
              setReport(null);
              setError(null);
              setProductName("");
              setIngredientsInput("");
              setExtractionResult(null);
              setExtractionError(null);
              setFileImportMessage(null);
              setFileImportError(null);
              handleImageSelected(null);
            }}
            className="group flex w-full items-center justify-between rounded-xl border border-hairline bg-surface px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-surface-elevated"
          >
            <span className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New product scan
            </span>
            <Sparkles className="h-3.5 w-3.5 text-jade" />
          </button>

          <div className="mt-8">
            <div className="flex items-center justify-between gap-3 px-2">
              <div className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                Sample products
              </div>
              <button
                type="button"
                onClick={() => void runDemoSample(SAMPLE_SCANS[2])}
                className="inline-flex items-center gap-1.5 rounded-full border border-jade/25 bg-jade/10 px-3 py-1 text-[10px] font-medium text-jade transition-colors hover:bg-jade/15"
              >
                <ArrowUp className="h-3 w-3" />
                Run export demo
              </button>
            </div>
            <ul className="mt-2 grid gap-1 sm:grid-cols-2 lg:grid-cols-1">
              {SAMPLE_SCANS.map((sample) => (
                <li key={sample.productName}>
                  <button
                    onClick={() => loadSample(sample)}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-foreground/70 transition-colors hover:bg-surface hover:text-foreground"
                  >
                    <PackageCheck className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{sample.productName}</span>
                    <span className="ml-auto rounded-full border border-hairline px-2 py-0.5 text-[10px] text-muted-foreground">
                      {getDomainLabel(sample.domain)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <GuestWorkspaceCard
            guestEmail={guestEmail}
            historyCount={guestHistory.length}
            onSignOut={() => {
              clearActiveGuestEmail();
              setGuestEmail(null);
              setGuestHistory([]);
              setReport((currentReport) =>
                currentReport ? { ...currentReport, history: [] } : currentReport,
              );
            }}
          />

          <HistoryPanel history={activeHistory} />
        </aside>

        <main className="relative min-h-[calc(100vh-4rem)] px-4 py-6 sm:py-8 md:px-6 lg:px-10">
          <AnimatePresence mode="wait">
            {!submitted ? (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mx-auto flex max-w-3xl flex-col justify-center lg:min-h-[70vh]"
              >
                <IntroHeader />
                <ScanForm
                  ingredientsInput={ingredientsInput}
                  market={market}
                  domain={domain}
                  ingredientEditorRef={ingredientEditorRef}
                  isLoading={isLoading}
                  isExtracting={isExtracting}
                  error={error}
                  extractionError={extractionError}
                  fileImportMessage={fileImportMessage}
                  fileImportError={fileImportError}
                  imagePreviewUrl={imagePreviewUrl}
                  extractionResult={extractionResult}
                  isImportingFile={isImportingFile}
                  onIngredientsChange={updateIngredientsInput}
                  onMarketChange={updateMarket}
                  onDomainChange={updateDomain}
                  onImageSelected={handleImageSelected}
                  onExtractImage={runImageExtraction}
                  onImportIngredientFile={importIngredientFile}
                  onCodePayloadDetected={applyCodePayload}
                  onSubmit={runScan}
                />
              </motion.div>
            ) : (
              <motion.div
                key="report"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mx-auto max-w-4xl pb-32"
              >
                <div ref={resultsTopRef}>
                  <ReportHeader
                    productName={productName}
                    market={market}
                    domain={report?.domain ?? domain}
                    report={report}
                    isLoading={isLoading}
                    onEdit={() => setSubmitted(false)}
                  />
                </div>

                {error && <ErrorCard message={error} />}

                {isLoading && <LoadingCard />}

                {report && !isLoading && (
                  <>
                    <TabStrip activeTab={tab} onChange={setTab} report={report} />
                    <div className="mt-6">
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={tab}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.25 }}
                        >
                          {tab === "summary" && <SummaryTab report={report} />}
                          {tab === "blockers" && (
                            <EntryList
                              entries={report.blockers}
                              emptyText="No blockers found for this scan."
                              tone="blocker"
                            />
                          )}
                          {tab === "warnings" && (
                            <EntryList
                              entries={report.warnings}
                              emptyText="No warnings found for this scan."
                              tone="warning"
                            />
                          )}
                          {tab === "safe" && (
                            <EntryList
                              entries={report.safe}
                              emptyText="No low-risk ingredients were returned for this scan."
                              tone="safe"
                            />
                          )}
                          {tab === "history" && <HistoryTab history={activeHistory} />}
                        </motion.div>
                      </AnimatePresence>
                    </div>
                  </>
                )}

                <div className="fixed inset-x-0 bottom-0 border-t border-hairline bg-background/85 backdrop-blur-xl">
                  <div className="mx-auto max-w-4xl px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:py-4 md:px-10">
                    <MiniScanBar
                      market={market}
                      domain={domain}
                      isLoading={isLoading}
                      onMarketChange={updateMarket}
                      onDomainChange={updateDomain}
                      onSubmit={runScan}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

function parseIngredients(value: string): string[] {
  return value
    .split(/\r?\n|,/)
    .map((ingredient) => ingredient.trim())
    .filter(Boolean);
}

function isImportHeader(value: string): boolean {
  return ["ingredient", "ingredients", "item", "items"].includes(value.trim().toLowerCase());
}

function normalizeCellText(cell: unknown): string {
  if (cell === null || cell === undefined) {
    return "";
  }

  return String(cell).trim();
}

function isSummarySheetName(name: string): boolean {
  return /summary|meta|readme|notes/i.test(name);
}

function getIngredientColumnIndexes(headerRow: unknown[]): number[] {
  const exactMatches = new Set([
    "ingredient",
    "ingredients",
    "ingredient primary",
    "ingredient secondary",
    "ingredient_primary",
    "ingredient_secondary",
    "item",
    "items",
  ]);

  return headerRow.reduce<number[]>((matches, cell, index) => {
    const normalized = normalizeCellText(cell).toLowerCase();
    if (!normalized) {
      return matches;
    }

    if (exactMatches.has(normalized) || normalized.includes("ingredient")) {
      matches.push(index);
    }

    return matches;
  }, []);
}

function looksLikeMetadataRow(row: string[]): boolean {
  const joined = row.join(" ").toLowerCase();

  return (
    joined.includes("summary") ||
    joined.includes("demo sample") ||
    joined.includes("product rows") ||
    joined.includes("ingredient columns") ||
    joined.includes("countries") ||
    joined.includes("categories")
  );
}

function dedupeIngredients(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function extractIngredientsFromSheetRows(rows: unknown[][]): string[] {
  if (!rows.length) {
    return [];
  }

  const headerRow = rows.find((row) =>
    row.some((cell) => normalizeCellText(cell).length > 0),
  ) ?? [];
  const ingredientColumnIndexes = getIngredientColumnIndexes(headerRow);

  if (ingredientColumnIndexes.length > 0) {
    return dedupeIngredients(
      rows
        .slice(rows.indexOf(headerRow) + 1)
        .flatMap((row) =>
          ingredientColumnIndexes.flatMap((columnIndex) =>
            parseIngredients(normalizeCellText(row[columnIndex])),
          ),
        )
        .filter((cell) => cell.length > 0 && !isImportHeader(cell)),
    ).slice(0, MAX_IMPORTED_FILE_ROWS);
  }

  const cdColumnIngredients = dedupeIngredients(
    rows
      .flatMap((row) => [normalizeCellText(row[2]), normalizeCellText(row[3])])
      .filter((cell) => cell.length > 0 && !isImportHeader(cell))
      .flatMap((cell) => parseIngredients(cell)),
  ).filter((cell) => !looksLikeMetadataRow([cell]));

  if (cdColumnIngredients.length > 0) {
    return cdColumnIngredients.slice(0, MAX_IMPORTED_FILE_ROWS);
  }

  return dedupeIngredients(
    rows
      .flatMap((row) => row.map((cell) => normalizeCellText(cell)))
      .filter((cell) => cell.length > 0 && !isImportHeader(cell))
      .flatMap((cell) => parseIngredients(cell)),
  ).slice(0, MAX_IMPORTED_FILE_ROWS);
}

function extractIngredientsFromWorkbookSheets(
  workbook: unknown,
): string[] {
  const sheets = Array.isArray(workbook)
    ? workbook
        .map((entry) => {
          if (
            entry &&
            typeof entry === "object" &&
            "data" in entry &&
            Array.isArray((entry as { data?: unknown }).data)
          ) {
            const sheetEntry = entry as { sheet?: string; data: unknown[][] };
            return { sheet: sheetEntry.sheet ?? "", data: sheetEntry.data };
          }

          if (Array.isArray(entry)) {
            return { sheet: "", data: entry as unknown[][] };
          }

          return null;
        })
        .filter((entry): entry is { sheet: string; data: unknown[][] } => Boolean(entry))
    : [];

  const candidateSheets = sheets.filter(
    (sheet) => sheet.data.length > 0 && !isSummarySheetName(sheet.sheet),
  );

  const prioritizedSheet =
    candidateSheets.find((sheet) =>
      sheet.data.some((row) => getIngredientColumnIndexes(row).length > 0),
    ) ?? candidateSheets[0] ?? sheets.find((sheet) => sheet.data.length > 0);

  if (!prioritizedSheet) {
    return [];
  }

  return extractIngredientsFromSheetRows(prioritizedSheet.data);
}

function sanitizeExtractedIngredients(ingredients: unknown): string[] {
  const ingredientList = Array.isArray(ingredients) ? ingredients : [];

  return Array.from(
    new Set(
      ingredientList
        .filter((ingredient): ingredient is string => typeof ingredient === "string")
        .map((ingredient) => ingredient.trim())
        .filter(Boolean),
    ),
  );
}

async function readIngredientsFromFile(file: File): Promise<string[]> {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";

  if (["txt", "csv", "tsv"].includes(extension)) {
    const text = await file.text();
    const firstLines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !isImportHeader(line))
      .slice(0, MAX_IMPORTED_FILE_ROWS)
      .join("\n");

    return parseIngredients(firstLines);
  }

  if (extension === "xlsx") {
    const workbook = await readExcelFile(file);
    const ingredients = extractIngredientsFromWorkbookSheets(workbook);

    if (ingredients.length > 0) {
      return ingredients;
    }

    throw new Error("No ingredient columns were found in this Excel file.");
  }

  if (extension === "docx") {
    const mammoth = await import("mammoth");
    const result = await mammoth.default.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    const firstLines = result.value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !isImportHeader(line))
      .slice(0, MAX_IMPORTED_FILE_ROWS)
      .join("\n");

    return parseIngredients(firstLines);
  }

  throw new Error("Supported files: Excel (.xlsx), Word (.docx), CSV, TSV, and TXT.");
}

function readImageAsBase64(file: File): Promise<{ image_base64: string; mime_type: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const [, base64 = ""] = result.split(",");

      if (!base64) {
        reject(new Error("Could not read the selected image."));
        return;
      }

      resolve({ image_base64: base64, mime_type: file.type || "image/jpeg" });
    };

    reader.onerror = () => reject(new Error("Could not read the selected image."));
    reader.readAsDataURL(file);
  });
}

function statusToVerdict(status: OverallStatus): "halal" | "haram" | "mushbooh" {
  if (status === "Not Ready") {
    return "haram";
  }

  if (status === "Needs Review") {
    return "mushbooh";
  }

  return "halal";
}

function getReadinessConfidence(status: OverallStatus, market: string): number {
  const baseConfidence = status === "Not Ready" ? 88 : status === "Needs Review" ? 75 : 92;
  return Math.max(52, Math.min(98, baseConfidence + getMarketProfile(market).confidenceAdjustment));
}

function simplifyReasoning(entry: ComplianceEntry): string {
  const ingredient = entry.ingredient.toLowerCase();

  if (ingredient.includes("gelatin")) {
    return "Gelatin is usually animal-derived, so the source and halal certificate must be checked.";
  }

  if (ingredient.includes("collagen")) {
    return "Collagen often comes from animals, so the source needs to be confirmed before approval.";
  }

  if (ingredient.includes("carmine")) {
    return "Carmine is an insect-derived color, so it needs special review and evidence.";
  }

  return entry.reasoning;
}

function getReadinessCopy(status: OverallStatus, market: string): {
  title: string;
  description: string;
  action: string;
} {
  const profile = getMarketProfile(market);

  if (status === "Not Ready") {
    return {
      title: profile.readinessSummary["Not Ready"],
      description:
        "This market still has blocker ingredients or stricter evidence expectations that should be resolved before submission.",
      action: `Complete the ${profile.label} evidence pack before moving forward.`,
    };
  }

  if (status === "Needs Review") {
    return {
      title: profile.readinessSummary["Needs Review"],
      description:
        "No hard blocker is stopping the product, but this market still expects additional review evidence before submission.",
      action: `Collect the ${profile.label} review documents and close the open evidence items.`,
    };
  }

  return {
    title: profile.readinessSummary["Low Risk"],
    description:
      "No blocker or warning ingredients were found after applying the current market rules and evidence checks.",
    action: `Keep the ${profile.label} documents ready and continue with the next review step.`,
  };
}

function getToneStyles(tone: "blocker" | "warning" | "safe") {
  if (tone === "blocker") {
    return {
      card: "border-verdict-haram/25 bg-verdict-haram/5",
      badge: "border-verdict-haram/30 bg-verdict-haram/10 text-verdict-haram",
      icon: "text-verdict-haram",
      action: "Resolve before submission",
    };
  }

  if (tone === "warning") {
    return {
      card: "border-verdict-mushbooh/25 bg-verdict-mushbooh/5",
      badge: "border-verdict-mushbooh/30 bg-verdict-mushbooh/10 text-verdict-mushbooh",
      icon: "text-verdict-mushbooh",
      action: "Review supporting evidence",
    };
  }

  return {
    card: "border-verdict-halal/35 bg-verdict-halal/10",
    badge: "border-verdict-halal/40 bg-verdict-halal/15 text-verdict-halal",
    icon: "text-verdict-halal",
    action: "Ready for the next review step",
  };
}

function IntroHeader() {
  return (
    <div className="text-center">
      <h1 className="font-display text-balance text-3xl font-light leading-tight sm:text-4xl md:text-5xl">
        Scan a product before{" "}
        <span className="italic text-gradient-jade">certification review</span>
      </h1>
      <p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-relaxed text-muted-foreground">
        Upload a label or enter ingredients, choose a target country, and let Halal Intelligence
        group the risks, evidence needs, and saved report history
      </p>
    </div>
  );
}

function ScanForm({
  ingredientsInput,
  market,
  domain,
  ingredientEditorRef,
  isLoading,
  isExtracting,
  isImportingFile,
  error,
  extractionError,
  fileImportMessage,
  fileImportError,
  imagePreviewUrl,
  extractionResult,
  onIngredientsChange,
  onMarketChange,
  onDomainChange,
  onImageSelected,
  onExtractImage,
  onImportIngredientFile,
  onCodePayloadDetected,
  onSubmit,
}: {
  ingredientsInput: string;
  market: string;
  domain: ComplianceDomain;
  ingredientEditorRef: React.RefObject<HTMLLabelElement | null>;
  isLoading: boolean;
  isExtracting: boolean;
  isImportingFile: boolean;
  error: string | null;
  extractionError: string | null;
  fileImportMessage: string | null;
  fileImportError: string | null;
  imagePreviewUrl: string | null;
  extractionResult: ExtractIngredientsResult | null;
  onIngredientsChange: (value: string) => void;
  onMarketChange: (value: string) => void;
  onDomainChange: (value: ComplianceDomain) => void;
  onImageSelected: (file: File | null) => void;
  onExtractImage: () => void;
  onImportIngredientFile: (file: File | null) => void;
  onCodePayloadDetected: (payload: CodePayload) => void;
  onSubmit: () => void;
}) {
  const reviewedIngredientCount = parseIngredients(ingredientsInput).length;
  const hasExtractedIngredients = Boolean(
    extractionResult && extractionResult.ingredients.length > 0,
  );
  const [isCodeScannerOpen, setIsCodeScannerOpen] = useState(false);
  const [codeScannerError, setCodeScannerError] = useState<string | null>(null);
  const [codeScannerHint, setCodeScannerHint] = useState(
    "Point the camera at a QR code that contains ingredients or a linked product payload.",
  );
  const [isStartingScanner, setIsStartingScanner] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimeoutRef = useRef<number | null>(null);
  const detectorRef = useRef<BarcodeDetectorInstance | null>(null);
  const extractedConfidence = extractionResult
    ? Math.round(extractionResult.confidence * 100)
    : null;
  const preScanConfidence =
    extractedConfidence !== null
      ? hasExtractedIngredients
        ? Math.max(55, extractedConfidence)
        : extractedConfidence
      : reviewedIngredientCount > 0
        ? 75
        : 0;
  const scanButtonText = hasExtractedIngredients
    ? "Scan reviewed ingredients"
    : "Run compliance scan";

  const stopCodeScanner = () => {
    if (scanTimeoutRef.current !== null) {
      window.clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    detectorRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => stopCodeScanner, []);

  useEffect(() => {
    if (!isCodeScannerOpen) {
      stopCodeScanner();
      setIsStartingScanner(false);
      return;
    }

    let cancelled = false;

    const startScanner = async () => {
      setCodeScannerError(null);
      setIsStartingScanner(true);

      if (
        typeof window === "undefined" ||
        !window.BarcodeDetector ||
        !navigator.mediaDevices?.getUserMedia
      ) {
        setCodeScannerError(
          "This device does not support live code scanning here yet. You can still upload a label photo or ingredient file.",
        );
        setIsStartingScanner(false);
        return;
      }

      try {
        const requestedFormats: BarcodeFormat[] = [
          "qr_code",
          "ean_13",
          "ean_8",
          "upc_a",
          "upc_e",
          "code_128",
        ];
        const supportedFormats = window.BarcodeDetector.getSupportedFormats
          ? await window.BarcodeDetector.getSupportedFormats()
          : requestedFormats;
        const activeFormats = requestedFormats.filter((format) =>
          supportedFormats.includes(format),
        );

        detectorRef.current = new window.BarcodeDetector({
          formats: activeFormats.length > 0 ? activeFormats : ["qr_code"],
        });

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        setCodeScannerHint("Scan a QR code with ingredient data. Product-only barcodes need a linked catalog.");
        setIsStartingScanner(false);

        const scanFrame = async () => {
          if (
            cancelled ||
            !isCodeScannerOpen ||
            !videoRef.current ||
            !detectorRef.current ||
            videoRef.current.readyState < HTMLMediaElement.HAVE_CURRENT_DATA
          ) {
            scanTimeoutRef.current = window.setTimeout(scanFrame, 400);
            return;
          }

          try {
            const detections = await detectorRef.current.detect(videoRef.current);
            const rawValue = detections.find((item) => item.rawValue?.trim())?.rawValue?.trim();

            if (rawValue) {
              const payload = parseCodePayload(rawValue);

              if (payload) {
                onCodePayloadDetected(payload);
                setIsCodeScannerOpen(false);
                stopCodeScanner();
                return;
              }

              setCodeScannerError(
                "Code scanned, but it did not include ingredient data. Use a QR code that stores ingredients or a linked product payload.",
              );
            }
          } catch (_error) {
            setCodeScannerError(
              "The camera opened, but the code could not be read yet. Try better lighting or move the phone closer.",
            );
          }

          scanTimeoutRef.current = window.setTimeout(scanFrame, 600);
        };

        void scanFrame();
      } catch (_error) {
        setCodeScannerError(
          "Camera access is blocked right now. Allow camera access on your phone to scan a QR code.",
        );
        setIsStartingScanner(false);
      }
    };

    void startScanner();

    return () => {
      cancelled = true;
      stopCodeScanner();
    };
  }, [isCodeScannerOpen, onCodePayloadDetected]);

  return (
    <>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
        className="mt-10 rounded-[2rem] border border-hairline bg-surface p-4 shadow-elegant sm:p-6"
      >
      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <label className="space-y-2">
          <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Domain
          </span>
          <select
            value={domain}
            onChange={(event) => onDomainChange(event.target.value as ComplianceDomain)}
            className="w-full rounded-2xl border border-hairline bg-background/50 px-4 py-3 text-sm outline-none transition-colors focus:border-jade/50"
          >
            {DOMAIN_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {DOMAIN_OPTIONS.find((option) => option.value === domain)?.helper}
          </p>
        </label>

        <label className="space-y-2">
            <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Country
            </span>
          <select
            value={market}
            onChange={(event) => onMarketChange(event.target.value)}
            className="w-full rounded-2xl border border-hairline bg-background/50 px-4 py-3 text-sm outline-none transition-colors focus:border-jade/50"
          >
            {MARKET_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {MARKET_OPTIONS.find((option) => option.value === market)?.authority}
          </p>
        </label>
      </div>

      <div className="mt-4 rounded-[1.75rem] border border-dashed border-jade/30 bg-jade/5 p-4 sm:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-jade">
                <Camera className="h-3.5 w-3.5" />
                Step 1 - Scan from label photo
              </div>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Upload or take a photo of the ingredient label. Halal Intelligence extracts text only,
              then you review and edit the ingredient list before running the compliance scan.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-hairline bg-background/60 px-4 py-2.5 text-sm transition-colors hover:bg-background">
                <Camera className="h-4 w-4 text-jade" />
                Choose image
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(event) => onImageSelected(event.target.files?.[0] ?? null)}
                  className="sr-only"
                />
              </label>
              <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-hairline bg-background/60 px-4 py-2.5 text-sm transition-colors hover:bg-background">
                {isImportingFile ? (
                  <Loader2 className="h-4 w-4 animate-spin text-jade" />
                ) : (
                  <FileUp className="h-4 w-4 text-jade" />
                )}
                Insert file
                <input
                  type="file"
                  accept=".xlsx,.docx,.csv,.tsv,.txt"
                  onChange={(event) => {
                    onImportIngredientFile(event.target.files?.[0] ?? null);
                    event.target.value = "";
                  }}
                  className="sr-only"
                />
              </label>
              <button
                type="button"
                onClick={() => setIsCodeScannerOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-hairline bg-background/60 px-4 py-2.5 text-sm transition-colors hover:bg-background"
              >
                <ScanLine className="h-4 w-4 text-jade" />
                Scan code
              </button>
              <button
                type="button"
                onClick={onExtractImage}
                disabled={isExtracting || !imagePreviewUrl}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-jade/25 bg-jade/10 px-4 py-2.5 text-sm font-medium text-jade transition-colors hover:bg-jade/15 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isExtracting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <WandSparkles className="h-4 w-4" />
                )}
                Extract ingredients
              </button>
            </div>
          </div>

          {imagePreviewUrl && (
            <div className="overflow-hidden rounded-xl border border-hairline bg-background/50 md:w-40">
              <img
                src={imagePreviewUrl}
                alt="Selected ingredient label preview"
                className="h-36 w-full object-cover"
              />
            </div>
          )}
        </div>

        {extractionError && <ErrorCard message={extractionError} compact />}

        {extractionResult && (
          <div className="mt-4 grid gap-3 rounded-2xl border border-jade/25 bg-background/45 p-4 md:grid-cols-[1fr_0.9fr]">
            <div>
              <div className="flex items-center gap-2 text-xs text-jade">
                <ClipboardCheck className="h-3.5 w-3.5" />
                Step 2 - Review extracted ingredients
              </div>
              <p className="mt-2 text-sm leading-relaxed text-foreground/85">
                {extractionResult.ingredients.length > 0
                  ? extractionResult.ingredients.join(", ")
                  : "No ingredients were confidently extracted."}
              </p>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Confidence: {Math.round(extractionResult.confidence * 100)}% - Review required:{" "}
                {extractionResult.needs_review ? "Yes" : "No"}
              </p>
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                Review the editable ingredient list below, fix anything OCR missed,
                then scan the reviewed list.
              </p>
            </div>
            <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
              {extractionResult.visual_warning && (
                <div className="rounded-lg border border-verdict-mushbooh/25 bg-verdict-mushbooh/10 px-2.5 py-1.5 text-[10px] text-foreground/80">
                  {extractionResult.visual_warning}
                </div>
              )}
              {extractionResult.warnings.length > 0 ? (
                extractionResult.warnings.map((warning) => (
                  <div
                    key={warning}
                    className="rounded-lg border border-hairline bg-surface/80 px-2.5 py-1.5 text-[10px]"
                  >
                    {warning}
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-hairline bg-surface/80 px-2.5 py-1.5 text-[10px]">
                  Review the editable ingredient box below before scanning.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <label
        ref={ingredientEditorRef}
        className="mt-4 block space-y-2 rounded-[1.75rem] border border-hairline bg-background/25 p-4 shadow-soft"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Step 2 - Ingredients
            </span>
            <span className="mt-1 block text-[11px] leading-relaxed text-muted-foreground">
              {hasExtractedIngredients
                ? `${reviewedIngredientCount} ingredient(s) are loaded from the label photo. Edit this list before scanning if needed.`
                : "Type ingredients manually, paste a label list, or import them from a file."}
            </span>
          </div>
        </div>
        <span className="block text-[11px] leading-relaxed text-muted-foreground">
          Supports Excel .xlsx, Word .docx, CSV, TSV, and TXT. The first {MAX_IMPORTED_FILE_ROWS}{" "}
          rows/lines are imported for review.
        </span>
        <textarea
          value={ingredientsInput}
          onChange={(event) => onIngredientsChange(event.target.value)}
          placeholder="One ingredient per line, or separate with commas"
          rows={7}
          className={`w-full resize-none rounded-2xl border bg-background/50 px-4 py-3 text-sm leading-relaxed outline-none transition-colors placeholder:text-muted-foreground focus:border-jade/50 ${
            hasExtractedIngredients ? "border-jade/35 shadow-[0_0_0_1px_rgba(83,188,131,0.12)]" : "border-hairline"
          }`}
        />
      </label>

      {fileImportMessage && (
        <div className="mt-3 rounded-xl border border-jade/20 bg-jade/5 p-3 text-xs leading-relaxed text-jade">
          {fileImportMessage}
        </div>
      )}

      {fileImportError && <ErrorCard message={fileImportError} compact />}

      {error && <ErrorCard message={error} compact />}

      <PreScanConfidenceSignal
        confidence={preScanConfidence}
        ingredientCount={reviewedIngredientCount}
        isLoading={isLoading}
      />

      <div className="mt-5 flex justify-center">
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex min-w-[240px] items-center justify-center gap-2 rounded-2xl border border-hairline bg-background/60 px-8 py-4 text-base font-semibold transition-all hover:scale-[1.02] hover:bg-background disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-[280px]"
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <ArrowUp className="h-5 w-5" />
          )}
          {scanButtonText}
        </button>
      </div>
      <p className="mt-2 text-center text-[11px] leading-relaxed text-muted-foreground">
        Step 3 - Run the scan to see blockers, review items, low-risk ingredients, and confidence
      </p>
      </form>

      <Dialog open={isCodeScannerOpen} onOpenChange={setIsCodeScannerOpen}>
        <DialogContent className="max-w-md rounded-3xl border border-hairline bg-surface p-0 sm:rounded-3xl">
          <DialogHeader className="px-5 pt-5">
            <DialogTitle>Scan a product code</DialogTitle>
            <DialogDescription>
              Use the back camera to scan a QR code that contains ingredients or a linked product payload.
            </DialogDescription>
          </DialogHeader>
          <div className="px-5 pb-5">
            <div className="overflow-hidden rounded-2xl border border-hairline bg-background/50">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="aspect-[3/4] w-full bg-black object-cover"
              />
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              {isStartingScanner ? "Opening camera..." : codeScannerHint}
            </p>
            {codeScannerError && (
              <div className="mt-3 rounded-xl border border-verdict-mushbooh/25 bg-verdict-mushbooh/10 p-3 text-xs leading-relaxed text-foreground/85">
                {codeScannerError}
              </div>
            )}
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => setIsCodeScannerOpen(false)}
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-hairline bg-background/60 px-4 py-2.5 text-sm transition-colors hover:bg-background"
              >
                Close scanner
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function PreScanConfidenceSignal({
  confidence,
  ingredientCount,
  isLoading,
}: {
  confidence: number;
  ingredientCount: number;
  isLoading: boolean;
}) {
  const activeBlocks = Math.round((confidence / 100) * 12);

  return (
    <div className="mt-5 rounded-2xl border border-hairline bg-background/35 p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Confidence signal
          </div>
          <div className="mt-2 flex items-end gap-2">
            <span className="font-display text-3xl font-light text-foreground">
              {confidence || "--"}
            </span>
            <span className="mb-1 text-xs text-muted-foreground">/ 100</span>
          </div>
        </div>
        <div className="flex-1">
          <div className="grid grid-cols-12 gap-1">
            {Array.from({ length: 12 }).map((_, index) => (
              <div
                key={index}
                className={`h-7 rounded-md ${
                  index < activeBlocks ? "bg-jade/80" : "bg-foreground/5"
                }`}
              />
            ))}
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            {isLoading
              ? "Running compliance scan and building the readiness decision"
              : ingredientCount > 0
                ? `Input confidence based on ${ingredientCount} reviewed ingredient(s)`
                : "Add ingredients to generate a confidence signal before scanning"}
          </p>
        </div>
      </div>
    </div>
  );
}

function ReportHeader({
  productName,
  market,
  domain,
  report,
  isLoading,
  onEdit,
}: {
  productName: string;
  market: string;
  domain: ComplianceDomain;
  report: ComplianceReport | null;
  isLoading: boolean;
  onEdit: () => void;
}) {
  const reportMarket = report?.market ?? market;
  const readiness = report ? getReadinessCopy(report.overall_status, reportMarket) : null;
  const confidence = report ? getReadinessConfidence(report.overall_status, reportMarket) : null;

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-hairline bg-surface p-5 shadow-elegant sm:p-6">
      <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-jade/10 blur-3xl" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display mt-2 text-2xl font-light leading-tight sm:text-3xl">
            {report?.product_name || productName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {getDomainLabel(domain)} analysis for target market: {reportMarket}
          </p>
          {confidence && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-jade/25 bg-jade/5 px-3 py-1.5 text-xs text-jade">
              <ShieldCheck className="h-3.5 w-3.5" />
              Readiness Decision: {report?.overall_status} - {confidence}% Confidence
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {report && <VerdictBadge verdict={statusToVerdict(report.overall_status)} size="lg" />}
          {isLoading && (
            <span className="inline-flex items-center gap-2 rounded-full border border-hairline px-3 py-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-jade" />
              Scanning
            </span>
          )}
          <button
            onClick={onEdit}
            className="rounded-full border border-hairline px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
          >
            Edit input
          </button>
        </div>
      </div>
      {readiness && (
        <div className="relative mt-5 grid gap-3 rounded-2xl border border-hairline bg-background/35 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <div className="text-sm font-medium">{readiness.title}</div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {readiness.description}
            </p>
          </div>
          <div className="rounded-xl border border-jade/20 bg-jade/5 px-3 py-2 text-xs leading-relaxed text-jade sm:max-w-[220px]">
            {readiness.action}
          </div>
        </div>
      )}
    </div>
  );
}

function TabStrip({
  activeTab,
  onChange,
  report,
}: {
  activeTab: ReportTab;
  onChange: (tab: ReportTab) => void;
  report: ComplianceReport;
}) {
  const tabs = [
    { id: "summary" as const, label: "Summary", count: null },
    { id: "blockers" as const, label: "Blockers", count: report.blockers.length },
    { id: "warnings" as const, label: "Warnings", count: report.warnings.length },
    { id: "safe" as const, label: "Low Risk", count: report.safe.length },
    { id: "history" as const, label: "History", count: report.history?.length ?? 0 },
  ];

  return (
    <div className="-mx-4 mt-6 overflow-x-auto px-4 md:mx-0 md:overflow-visible md:px-0">
      <div className="flex w-max gap-1 rounded-full border border-hairline bg-surface p-1 text-xs md:w-fit">
        {tabs.map((item) => (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 transition-all ${
              activeTab === item.id
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {item.label}
            {item.count !== null && (
              <span className="rounded-full bg-background/10 px-1.5 text-[10px]">{item.count}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function SummaryTab({ report }: { report: ComplianceReport }) {
  const market = report.market ?? "Malaysia";
  const readiness = getReadinessCopy(report.overall_status, market);
  const confidence = getReadinessConfidence(report.overall_status, market);
  const checklist = getMarketChecklist(report, market);
  const cards = [
    {
      label: "Ingredients",
      value: report.summary.total_ingredients,
      icon: ClipboardCheck,
      tone: "text-jade",
      helper: "Normalized and checked",
    },
    {
      label: "Blockers",
      value: report.summary.blockers_count,
      icon: AlertTriangle,
      tone: "text-verdict-haram",
      helper: "Must be resolved",
    },
    {
      label: "Warnings",
      value: report.summary.warnings_count,
      icon: FileText,
      tone: "text-verdict-mushbooh",
      helper: "Needs review",
    },
  ];

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-[1.75rem] border border-hairline bg-surface">
        <div className="grid gap-5 p-5 sm:grid-cols-[1.1fr_0.9fr] sm:p-6">
          <div>
            <h2 className="font-display mt-3 text-3xl font-light leading-tight sm:text-4xl">
              {report.overall_status}
            </h2>
            <div className="mt-3 max-w-sm rounded-full border border-jade/25 bg-jade/5 p-1">
              <div
                className="rounded-full bg-jade px-3 py-1 text-[11px] font-medium text-background"
                style={{ width: `${confidence}%` }}
              >
                {confidence}% confidence
              </div>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-foreground/80">
              {readiness.description}
            </p>
          </div>
          <div className="rounded-2xl border border-jade/20 bg-jade/5 p-4">
            <div className="text-[10px] font-medium uppercase tracking-widest text-jade">
              Recommended next move
            </div>
            <p className="mt-2 text-sm leading-relaxed text-foreground/85">{readiness.action}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-hairline bg-surface p-5">
            <div className={`flex items-center gap-2 text-xs ${card.tone}`}>
              <card.icon className="h-3.5 w-3.5" />
              {card.label}
            </div>
            <div className="font-display mt-3 text-3xl font-light">{card.value}</div>
            <div className="mt-1 text-xs text-muted-foreground">{card.helper}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-hairline bg-surface p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              Country checklist
            </div>
            <div className="mt-1 text-sm text-foreground">{market}</div>
          </div>
          <span className="rounded-full border border-jade/20 bg-jade/5 px-3 py-1 text-[10px] text-jade">
            {getMarketProfile(market).readinessSummary[report.overall_status]}
          </span>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {checklist.map((item) => (
            <div
              key={`${market}-${item.label}`}
              className="flex items-center justify-between rounded-xl border border-hairline bg-background/35 px-3 py-2.5 text-sm"
            >
              <span>{item.label}</span>
              <span className="text-xs text-muted-foreground">{item.state}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <CategoryPreview
          title="Highest priority"
          entries={report.blockers}
          emptyText="No blocker ingredients returned."
          tone="blocker"
        />
        <CategoryPreview
          title="Review queue"
          entries={report.warnings.length > 0 ? report.warnings : report.safe}
          emptyText="No warnings or safe entries returned."
          tone={report.warnings.length > 0 ? "warning" : "safe"}
        />
      </div>
    </div>
  );
}

function CategoryPreview({
  title,
  entries,
  emptyText,
  tone,
}: {
  title: string;
  entries: ComplianceEntry[];
  emptyText: string;
  tone: "blocker" | "warning" | "safe";
}) {
  const styles = getToneStyles(tone);

  return (
    <div className={`rounded-2xl border p-4 ${styles.card}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          {title}
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-[10px] ${styles.badge}`}>
          {entries.length} item(s)
        </span>
      </div>
      <div className="mt-3 space-y-2">
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          entries.slice(0, 3).map((entry) => (
            <div
              key={`${title}-${entry.ingredient}-${entry.risk}`}
              className="rounded-xl border border-hairline bg-background/35 p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-display text-base">{entry.ingredient}</span>
                <span className={`text-xs ${styles.icon}`}>{entry.risk}</span>
              </div>
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                {simplifyReasoning(entry)}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function EntryList({
  entries,
  emptyText,
  tone,
}: {
  entries: ComplianceEntry[];
  emptyText: string;
  tone: "blocker" | "warning" | "safe";
}) {
  const [openIngredient, setOpenIngredient] = useState<string | null>(null);

  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-hairline bg-surface p-6">
        <div className="flex items-center gap-2 text-sm text-foreground">
          <BadgeCheck className="h-4 w-4 text-jade" />
          Nothing to review here
        </div>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{emptyText}</p>
      </div>
    );
  }

  const styles = getToneStyles(tone);
  const heading =
    tone === "blocker"
      ? "Blocker review"
      : tone === "warning"
        ? "Warning review"
        : "Low-risk ingredients";

  return (
    <div className="space-y-4">
      <div className={`rounded-2xl border p-4 ${styles.card}`}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              {heading}
            </div>
            <p className="mt-1 text-sm leading-relaxed text-foreground/80">
              {styles.action}. Click an ingredient to see simple reasoning, evidence needs, and
              market scope.
            </p>
          </div>
          <span
            className={`w-fit rounded-full border px-3 py-1 text-xs font-medium ${styles.badge}`}
          >
            {entries.length} ingredient(s)
          </span>
        </div>
      </div>

      {entries.map((entry) => (
        <ExpandableIngredientFinding
          key={`${entry.ingredient}-${entry.risk}`}
          entry={entry}
          isOpen={openIngredient === entry.ingredient}
          styles={styles}
          onToggle={() =>
            setOpenIngredient((currentIngredient) =>
              currentIngredient === entry.ingredient ? null : entry.ingredient,
            )
          }
        />
      ))}
    </div>
  );
}

function ExpandableIngredientFinding({
  entry,
  isOpen,
  styles,
  onToggle,
}: {
  entry: ComplianceEntry;
  isOpen: boolean;
  styles: ReturnType<typeof getToneStyles>;
  onToggle: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-hairline bg-surface shadow-soft">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 p-4 text-left transition-colors hover:bg-background/25 sm:p-5"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <AlertTriangle className={`h-3.5 w-3.5 ${styles.icon}`} />
            Ingredient
          </div>
          <h3 className="font-display mt-1 truncate text-2xl font-light">{entry.ingredient}</h3>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className={`rounded-full border px-3 py-1 text-xs font-medium ${styles.badge}`}>
            {entry.risk}
          </span>
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <div className="border-y border-hairline bg-background/25 p-5">
              <div className="flex items-center gap-2 text-xs text-jade">
                <ScrollText className="h-3.5 w-3.5" />
                Risk rationale
              </div>
              <p className="mt-2 text-sm leading-[1.8] text-foreground/85">
                {simplifyReasoning(entry)}
              </p>
            </div>

            <div className="grid gap-0 text-xs md:grid-cols-3">
              <InfoPanel
                icon={FileText}
                title="Required evidence"
                values={entry.required_documents}
                emptyText="No documents returned"
              />
              <InfoPanel
                icon={MapPinned}
                title="Market scope"
                values={entry.affected_markets}
                emptyText="No markets returned"
              />
              <div className="border-t border-hairline p-5 md:border-l md:border-t-0">
                <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                  <ShieldCheck className={`h-3.5 w-3.5 ${styles.icon}`} />
                  Certification impact
                </div>
                <p className="mt-3 text-sm leading-relaxed text-foreground/80">{styles.action}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InfoPanel({
  icon: Icon,
  title,
  values,
  emptyText,
}: {
  icon: typeof FileText;
  title: string;
  values: string[];
  emptyText: string;
}) {
  return (
    <div className="border-t border-hairline p-5 md:border-t-0">
      <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
        <Icon className="h-3.5 w-3.5 text-jade" />
        {title}
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {values.length > 0 ? (
          values.map((value) => (
            <span
              key={value}
              className="rounded-full border border-hairline bg-background/40 px-2.5 py-1 text-muted-foreground"
            >
              {value}
            </span>
          ))
        ) : (
          <span className="text-muted-foreground">{emptyText}</span>
        )}
      </div>
    </div>
  );
}

function GuestWorkspaceCard({
  guestEmail,
  historyCount,
  onSignOut,
}: {
  guestEmail: string | null;
  historyCount: number;
  onSignOut: () => void;
}) {
  return (
    <div className="mt-8 rounded-2xl border border-hairline bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Signed in as
          </div>
          <div className="mt-1 text-sm text-foreground">{guestEmail ?? "Demo visitor"}</div>
        </div>
        {guestEmail && (
          <button
            type="button"
            onClick={onSignOut}
            className="rounded-full border border-hairline px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
          >
            Sign out
          </button>
        )}
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        {guestEmail
          ? `This guest has ${historyCount} saved product scan${historyCount === 1 ? "" : "s"} on this device.`
          : "Sign in with a mock email to keep saved product scan history on this device."}
      </p>
    </div>
  );
}

function HistoryPanel({ history }: { history: ReportHistoryItem[] }) {
  return (
    <div className="mt-8">
      <div className="px-2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
        Returned history
      </div>
      <div className="mt-2 space-y-2">
        {history.length === 0 ? (
          <p className="rounded-xl border border-hairline bg-surface p-3 text-[11px] leading-relaxed text-muted-foreground">
            Run a scan to see previous submissions for the same product.
          </p>
        ) : (
          history.slice(0, 4).map((item) => <HistoryMiniCard key={item.id} item={item} />)
        )}
      </div>
    </div>
  );
}

function HistoryTab({ history }: { history: ReportHistoryItem[] }) {
  if (history.length === 0) {
    return (
      <div className="rounded-2xl border border-hairline bg-surface p-6 text-sm text-muted-foreground">
        No previous submissions were returned for this product yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {history.map((item) => (
        <HistoryFullCard key={item.id} item={item} />
      ))}
    </div>
  );
}

function HistoryMiniCard({ item }: { item: ReportHistoryItem }) {
  const latestReport = item.reports?.[0]?.result;
  const historyLabel = latestReport?.domain
    ? `Previous ${getDomainLabel(latestReport.domain)} scan`
    : "Previous saved scan";
  const historyMarket = latestReport?.market;

  return (
    <div className="rounded-xl border border-hairline bg-surface p-3">
      <div className="flex items-center gap-2 text-xs text-foreground/80">
        <History className="h-3.5 w-3.5 text-jade" />
        {historyLabel}
      </div>
      <div className="mt-1 text-[11px] text-muted-foreground">
        {latestReport?.overall_status ?? "Saved scan"}
        {historyMarket ? ` • ${historyMarket}` : ""}
        {" • "}
        {formatDate(item.created_at)}
      </div>
    </div>
  );
}

function HistoryFullCard({ item }: { item: ReportHistoryItem }) {
  const latestReport = item.reports?.[0]?.result;
  const historyLabel = latestReport?.domain
    ? `Previous ${getDomainLabel(latestReport.domain)} scan`
    : "Previous submission";
  const historyMarket = latestReport?.market;

  return (
    <div className="rounded-2xl border border-hairline bg-surface p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-sm font-medium">{historyLabel}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {historyMarket ? `${historyMarket} • ` : ""}
            Submission ID: {item.id}
          </div>
        </div>
        <div className="text-xs text-muted-foreground">{formatDate(item.created_at)}</div>
      </div>
      {latestReport && (
        <p className="mt-3 text-sm leading-relaxed text-foreground/80">
          {latestReport.summary.human_readable}
        </p>
      )}
    </div>
  );
}

function ErrorCard({ message, compact = false }: { message: string; compact?: boolean }) {
  return (
    <div
      className={`rounded-2xl border border-verdict-haram/25 bg-verdict-haram/5 ${compact ? "mt-4 p-4" : "mt-5 p-5"}`}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-verdict-haram" />
        <div>
          <div className="text-sm font-medium text-verdict-haram">Scan could not complete</div>
          <p className="mt-1 text-sm leading-relaxed text-foreground/80">{message}</p>
        </div>
      </div>
    </div>
  );
}

function LoadingCard() {
  return (
    <div className="mt-5 rounded-2xl border border-hairline bg-surface p-6">
      <div className="flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-jade" />
        <div>
          <div className="text-sm font-medium">Running product-level analysis</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Checking ingredients, evidence needs, saved reports, and previous scan history
          </p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-background">
            <div className="h-full w-3/4 animate-pulse rounded-full bg-jade" />
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniScanBar({
  market,
  domain,
  isLoading,
  onMarketChange,
  onDomainChange,
  onSubmit,
}: {
  market: string;
  domain: ComplianceDomain;
  isLoading: boolean;
  onMarketChange: (value: string) => void;
  onDomainChange: (value: ComplianceDomain) => void;
  onSubmit: () => void;
}) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"
    >
      <select
        value={market}
        onChange={(event) => onMarketChange(event.target.value)}
        className="min-h-11 rounded-xl border border-hairline bg-surface px-3 py-2 text-sm outline-none focus:border-jade/50"
      >
        {MARKET_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <select
        value={domain}
        onChange={(event) => onDomainChange(event.target.value as ComplianceDomain)}
        className="min-h-11 rounded-xl border border-hairline bg-surface px-3 py-2 text-sm outline-none focus:border-jade/50"
      >
        {DOMAIN_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={isLoading}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
      >
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
        Rescan
      </button>
    </form>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
