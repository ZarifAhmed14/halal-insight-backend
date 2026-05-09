import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import readXlsxFile from "read-excel-file/browser";
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
    ingredients: "E471\nGelatin\nVanilla Flavor",
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
    productName: "UAE Export Snack Pack",
    ingredients: "E471\nGelatin\nNatural Flavor",
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

function getDomainLabel(domain: ComplianceDomain | undefined): string {
  return DOMAIN_OPTIONS.find((option) => option.value === domain)?.label ?? "Food";
}

function getMarketLabel(market: string): string {
  return MARKET_OPTIONS.find((option) => option.value === market)?.label ?? market;
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

  const firstIngredient = ingredients[0] ?? "Reviewed Label";
  const ingredientSuffix = ingredients.length > 1 ? ` + ${ingredients.length - 1}` : "";

  return `${getDomainLabel(domain)} scan: ${firstIngredient}${ingredientSuffix} for ${getMarketLabel(market)}`;
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

  const runScan = async () => {
    const ingredients = parseIngredients(ingredientsInput);

    if (ingredients.length === 0) {
      setError("Add at least one ingredient before running a scan.");
      return;
    }

    if (market.trim().length === 0) {
      setError("Market is required before running a scan.");
      return;
    }

    setSubmitted(true);
    setTab("summary");
    setError(null);
    setIsLoading(true);

    try {
      const productNameForScan = buildInternalProductName({
        productName,
        domain,
        market: market.trim(),
        ingredients,
      });

      setProductName(productNameForScan);

      const nextReport = await analyzeProduct({
        product_name: productNameForScan,
        ingredients,
        market: market.trim(),
        domain,
      });

      setReport(nextReport);
    } catch (scanError) {
      setReport(null);
      setError(scanError instanceof Error ? scanError.message : "Unable to run the scan.");
    } finally {
      setIsLoading(false);
    }
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

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 lg:grid-cols-[280px_1fr]">
        <aside className="hidden border-r border-hairline px-4 py-6 lg:block">
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
            <div className="px-2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              Sample products
            </div>
            <ul className="mt-2 space-y-1">
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

          <HistoryPanel history={report?.history ?? []} />

          <div className="mt-8 rounded-2xl border border-hairline bg-surface p-4">
            <div className="flex items-center gap-2 text-xs text-jade">
              <ShieldCheck className="h-3.5 w-3.5" />
              Supabase Edge Function
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
              Scans are sent to the backend, saved into Supabase, and returned with report history.
            </p>
          </div>
        </aside>

        <main className="relative min-h-[calc(100vh-4rem)] px-4 py-6 sm:py-8 md:px-10">
          <AnimatePresence mode="wait">
            {!submitted ? (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mx-auto flex min-h-[70vh] max-w-3xl flex-col justify-center"
              >
                <IntroHeader />
                <ScanForm
                  ingredientsInput={ingredientsInput}
                  market={market}
                  domain={domain}
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
                <ReportHeader
                  productName={productName}
                  market={market}
                  domain={report?.domain ?? domain}
                  report={report}
                  isLoading={isLoading}
                  onEdit={() => setSubmitted(false)}
                />

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
                          {tab === "history" && <HistoryTab history={report.history ?? []} />}
                        </motion.div>
                      </AnimatePresence>
                    </div>
                  </>
                )}

                <div className="fixed inset-x-0 bottom-0 border-t border-hairline bg-background/85 backdrop-blur-xl">
                  <div className="mx-auto max-w-4xl px-4 py-3 sm:py-4 md:px-10">
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
    const rows = await readXlsxFile(file);
    const text = rows
      .flatMap((row) => row.filter((cell) => cell !== null && cell !== undefined))
      .map((cell) => String(cell).trim())
      .filter((cell) => cell.length > 0 && !isImportHeader(cell))
      .slice(0, MAX_IMPORTED_FILE_ROWS)
      .join("\n");

    return parseIngredients(text);
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

function getReadinessConfidence(status: OverallStatus): number {
  if (status === "Not Ready") {
    return 88;
  }

  if (status === "Needs Review") {
    return 75;
  }

  return 92;
}

function simplifyReasoning(entry: ComplianceEntry): string {
  const ingredient = entry.ingredient.toLowerCase();

  if (ingredient.includes("e471")) {
    return "E471 can come from plant or animal fat, so the supplier must prove the source.";
  }

  if (ingredient.includes("gelatin")) {
    return "Gelatin is usually animal-derived, so the source and halal certificate must be checked.";
  }

  if (ingredient.includes("collagen")) {
    return "Collagen is often animal-derived, so the product needs origin evidence before approval.";
  }

  if (ingredient.includes("carmine")) {
    return "Carmine is an insect-derived color, so it needs special review and evidence.";
  }

  return entry.reasoning;
}

function getReadinessCopy(status: OverallStatus): {
  title: string;
  description: string;
  action: string;
} {
  if (status === "Not Ready") {
    return {
      title: "Certification blocker detected",
      description:
        "This product should not move into certification submission until the blocker ingredients are resolved or supported with stronger documentation.",
      action: "Review blocker ingredients before preparing the submission pack.",
    };
  }

  if (status === "Needs Review") {
    return {
      title: "Needs technical review",
      description:
        "No hard blockers were found, but the product still has medium-risk ingredients that should be reviewed before submission.",
      action:
        "Collect supporting documents and ask a halal assurance reviewer to confirm the risk position.",
    };
  }

  return {
    title: "Low-risk scan result",
    description:
      "No blocker or warning ingredients were found in this scan, based on the current Neo4j knowledge graph.",
    action:
      "Keep ingredient documentation ready and continue with the normal pre-certification workflow.",
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
    card: "border-verdict-halal/25 bg-verdict-halal/5",
    badge: "border-verdict-halal/30 bg-verdict-halal/10 text-verdict-halal",
    icon: "text-verdict-halal",
    action: "Keep documentation on file",
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
  onSubmit,
}: {
  ingredientsInput: string;
  market: string;
  domain: ComplianceDomain;
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
  onSubmit: () => void;
}) {
  const reviewedIngredientCount = parseIngredients(ingredientsInput).length;
  const hasExtractedIngredients = Boolean(
    extractionResult && extractionResult.ingredients.length > 0,
  );
  const preScanConfidence = extractionResult
    ? Math.max(55, Math.round(extractionResult.confidence * 100))
    : reviewedIngredientCount > 0
      ? 75
      : 0;
  const scanButtonText = hasExtractedIngredients
    ? "Scan reviewed ingredients"
    : "Run compliance scan";

  return (
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
            Target country
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

      <div className="mt-4 rounded-2xl border border-dashed border-jade/30 bg-jade/5 p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-start">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-jade">
                <Camera className="h-3.5 w-3.5" />
                Scan from label photo
              </div>
              <span className="rounded-full border border-jade/20 bg-background/60 px-2.5 py-1 text-[10px] text-jade">
                Optional fast path
              </span>
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
                Extracted ingredients applied to editor
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
                Step 2 is ready: check the editable ingredient list below, fix anything OCR missed,
                then scan the reviewed list.
              </p>
            </div>
            <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
              {extractionResult.visual_warning && (
                <div className="rounded-xl border border-verdict-mushbooh/25 bg-verdict-mushbooh/10 px-3 py-2 text-[11px] text-foreground/80">
                  {extractionResult.visual_warning}
                </div>
              )}
              {extractionResult.warnings.length > 0 ? (
                extractionResult.warnings.map((warning) => (
                  <div
                    key={warning}
                    className="rounded-xl border border-hairline bg-surface/80 px-3 py-2"
                  >
                    {warning}
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-hairline bg-surface/80 px-3 py-2">
                  Review the editable ingredient box below before scanning.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <label className="mt-4 block space-y-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Ingredients
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
          className="w-full resize-none rounded-2xl border border-hairline bg-background/50 px-4 py-3 text-sm leading-relaxed outline-none transition-colors placeholder:text-muted-foreground focus:border-jade/50"
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
    </form>
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
  const readiness = report ? getReadinessCopy(report.overall_status) : null;
  const confidence = report ? getReadinessConfidence(report.overall_status) : null;

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-hairline bg-surface p-5 shadow-elegant sm:p-6">
      <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-jade/10 blur-3xl" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <PackageCheck className="h-3.5 w-3.5 text-jade" />
            Product scan
          </div>
          <h1 className="font-display mt-2 text-2xl font-light leading-tight sm:text-3xl">
            {report?.product_name || productName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {getDomainLabel(domain)} analysis for target market: {market}
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
    { id: "safe" as const, label: "Safe", count: report.safe.length },
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
  const readiness = getReadinessCopy(report.overall_status);
  const confidence = getReadinessConfidence(report.overall_status);
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
            <div className="flex items-center gap-2 text-xs text-jade">
              <ShieldCheck className="h-3.5 w-3.5" />
              Readiness decision
            </div>
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
        <div className="border-t border-hairline bg-background/25 px-5 py-3 text-xs leading-relaxed text-muted-foreground sm:px-6">
          {report.summary.human_readable}
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
            Ingredient finding
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

  return (
    <div className="rounded-xl border border-hairline bg-surface p-3">
      <div className="flex items-center gap-2 text-xs text-foreground/80">
        <History className="h-3.5 w-3.5 text-jade" />
        {latestReport?.overall_status ?? "Saved scan"}
      </div>
      <div className="mt-1 text-[11px] text-muted-foreground">{formatDate(item.created_at)}</div>
    </div>
  );
}

function HistoryFullCard({ item }: { item: ReportHistoryItem }) {
  const latestReport = item.reports?.[0]?.result;

  return (
    <div className="rounded-2xl border border-hairline bg-surface p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-sm font-medium">
            {latestReport?.product_name ?? "Previous submission"}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">Submission ID: {item.id}</div>
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
            Building confidence from the backend scan, compliance graph, saved report, and history
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
        className="rounded-xl border border-hairline bg-surface px-3 py-2 text-sm outline-none focus:border-jade/50"
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
        className="rounded-xl border border-hairline bg-surface px-3 py-2 text-sm outline-none focus:border-jade/50"
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
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
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
