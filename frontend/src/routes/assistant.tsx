import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarcodeFormat as ZXingBarcodeFormat,
  BrowserMultiFormatReader,
  type IScannerControls,
} from "@zxing/browser";
import {
  AlertTriangle,
  ArrowUp,
  BadgeCheck,
  Camera,
  ChevronDown,
  ClipboardCheck,
  Download,
  FileUp,
  FileText,
  Loader2,
  MapPinned,
  PackageCheck,
  ScanLine,
  ScrollText,
  ShieldCheck,
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
} from "@/lib/halaliq-api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DOMAIN_OPTIONS,
  MARKET_OPTIONS,
  MAX_IMPORTED_FILE_ROWS,
  SAMPLE_SCANS,
} from "@/features/assistant/config";
import {
  applyDomainKnowledgeToReport,
  applyMarketRulesToReport,
  buildReadinessBrief,
  buildReplacementScenarios,
  buildInternalProductName,
  collectEvidenceDocuments,
  getDomainLabel,
  getMarketChecklist,
  getMarketProfile,
  getReadinessConfidence,
  getReadinessCopy,
  getToneStyles,
  simplifyReasoning,
  statusToVerdict,
  type EvidencePackItem,
  type ReadinessBrief,
  type ReplacementScenario,
} from "@/features/assistant/report-logic";
import {
  isComplianceDomain,
  parseCodePayload,
  parseIngredients,
  readImageAsBase64,
  readIngredientsFromFile,
  resolveBarcodePayload,
  sanitizeExtractedIngredients,
  shouldAutoOpenScannerOnThisDevice,
  type CodePayload,
} from "@/features/assistant/input-helpers";
import {
  downloadCertificatePdf,
  findCertificateForBrief,
  getCertificateVerificationUrl,
  isCertificateEligible,
  issueCertificate,
  type CertificateRecord,
} from "@/features/assistant/certificate";

export const Route = createFileRoute("/assistant")({
  head: () => ({
    meta: [
      { title: "Assistant - Halal Intelligence Product Readiness" },
      {
        name: "description",
        content:
          "Run a product-level halal pre-certification scan with ingredient risk groups and required documents.",
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

type ReportTab = "summary" | "blockers" | "warnings" | "safe";

const sampleReadinessTone: Record<OverallStatus, string> = {
  "Not Ready": "border-verdict-haram/30 bg-verdict-haram/10 text-verdict-haram",
  "Needs Review": "border-verdict-mushbooh/30 bg-verdict-mushbooh/10 text-verdict-mushbooh",
  "Low Risk": "border-verdict-halal/30 bg-verdict-halal/10 text-verdict-halal",
};

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
  const [lastScanAtIso, setLastScanAtIso] = useState<string>(new Date().toISOString());
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const ingredientEditorRef = useRef<HTMLLabelElement | null>(null);
  const resultsTopRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const shouldAutoScan = params.get("scan") === "1";

    if (!shouldAutoScan || !shouldAutoOpenScannerOnThisDevice()) {
      return;
    }

    setTimeout(() => {
      const scannerTrigger = document.querySelector<HTMLButtonElement>(
        "[data-scan-trigger='true']",
      );
      scannerTrigger?.click();
    }, 120);

    params.delete("scan");
    const nextQuery = params.toString();
    const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}${window.location.hash}`;
    window.history.replaceState({}, "", nextUrl);
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

      const domainAwareReport = applyDomainKnowledgeToReport(nextReport, nextDomain);
      const marketAwareReport = applyMarketRulesToReport(domainAwareReport, nextMarket.trim());
      setReport(marketAwareReport);
      setLastScanAtIso(new Date().toISOString());
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
    handleImageSelected(null);
    setProductName(sample.productName);
    setIngredientsInput(sample.ingredients);
    setMarket(sample.market);
    setDomain(sample.domain);
    setReport(null);
    setError(null);
    setSubmitted(false);
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
          <div className="space-y-5">
            <AssistantSidebarContext domain={domain} market={market} />

            <div className="px-2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              Sample products
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
                    <span
                      className={`ml-auto shrink-0 rounded-full border px-2 py-0.5 text-[10px] ${sampleReadinessTone[sample.readiness]}`}
                    >
                      {sample.readiness}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
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
                          {tab === "summary" && (
                            <SummaryTab
                              report={report}
                              domain={report?.domain ?? domain}
                              fallbackMarket={market}
                              scanDateIso={lastScanAtIso}
                              onViewAll={(nextTab) => setTab(nextTab)}
                            />
                          )}
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

function AssistantSidebarContext({ domain, market }: { domain: ComplianceDomain; market: string }) {
  const selectedMarket = MARKET_OPTIONS.find((option) => option.value === market);
  const selectedDomain = DOMAIN_OPTIONS.find((option) => option.value === domain);
  const legend = [
    {
      label: "Not Ready",
      helper: "Blocker found",
      dot: "bg-verdict-haram",
    },
    {
      label: "Needs Review",
      helper: "Evidence still needed",
      dot: "bg-verdict-mushbooh",
    },
    {
      label: "Low Risk",
      helper: "Ready for preparation review",
      dot: "bg-verdict-halal",
    },
  ];

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-hairline bg-surface p-4">
        <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-widest text-jade">
          <MapPinned className="h-3.5 w-3.5" />
          Current setup
        </div>
        <div className="mt-4 space-y-3">
          <SidebarFact label="Domain" value={selectedDomain?.label ?? getDomainLabel(domain)} />
          <SidebarFact label="Country" value={selectedMarket?.label ?? market} />
          <SidebarFact label="Scan mode" value="Label, file, code, or manual entry" />
        </div>
      </div>

      <div className="rounded-2xl border border-hairline bg-surface p-4">
        <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-jade" />
          Readiness legend
        </div>
        <div className="mt-3 space-y-2.5">
          {legend.map((item) => (
            <div key={item.label} className="flex items-start gap-2.5">
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.dot}`} />
              <div className="min-w-0">
                <div className="text-xs text-foreground">{item.label}</div>
                <div className="text-[11px] leading-relaxed text-muted-foreground">
                  {item.helper}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SidebarFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm leading-snug text-foreground">{value}</div>
    </div>
  );
}

function IntroHeader() {
  return (
    <div className="text-center">
      <h1 className="font-display text-balance text-3xl font-light leading-tight sm:text-4xl md:text-5xl">
        Scan a product before{" "}
        <span className="italic text-gradient-jade">certification review</span>
      </h1>
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
    "Point the camera at a QR code or retail product code.",
  );
  const [isStartingScanner, setIsStartingScanner] = useState(false);
  const [isLookingUpBarcode, setIsLookingUpBarcode] = useState(false);
  const [highlightUploadEntry, setHighlightUploadEntry] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerControlsRef = useRef<IScannerControls | null>(null);
  const scannerReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const detectionLockRef = useRef(false);
  const extractedConfidence = extractionResult
    ? Math.round(extractionResult.confidence * 100)
    : null;
  const preScanConfidence =
    extractedConfidence !== null
      ? hasExtractedIngredients
        ? extractedConfidence
        : extractedConfidence
      : reviewedIngredientCount > 0
        ? 75
        : 0;
  const scanButtonText = hasExtractedIngredients
    ? "Scan reviewed ingredients"
    : "Run compliance scan";

  const stopCodeScanner = () => {
    detectionLockRef.current = false;
    scannerControlsRef.current?.stop();
    scannerControlsRef.current = null;
    scannerReaderRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => stopCodeScanner, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const focusTarget = params.get("focus");

    if (focusTarget !== "upload") {
      return;
    }

    const scrollTimer = window.setTimeout(() => {
      const uploadTrigger = document.querySelector<HTMLElement>("[data-upload-trigger='true']");
      uploadTrigger?.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightUploadEntry(true);
    }, 140);

    params.delete("focus");
    const nextQuery = params.toString();
    const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}${window.location.hash}`;
    window.history.replaceState({}, "", nextUrl);

    const clearTimer = window.setTimeout(() => {
      setHighlightUploadEntry(false);
    }, 2600);

    return () => {
      window.clearTimeout(scrollTimer);
      window.clearTimeout(clearTimer);
    };
  }, []);

  useEffect(() => {
    if (!isCodeScannerOpen) {
      stopCodeScanner();
      setIsStartingScanner(false);
      setIsLookingUpBarcode(false);
      return;
    }

    let cancelled = false;

    const startScanner = async () => {
      setCodeScannerError(null);
      setIsStartingScanner(true);

      if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setCodeScannerError(
          "This device cannot open the camera here yet. You can still upload a label photo or ingredient file.",
        );
        setIsStartingScanner(false);
        return;
      }

      try {
        if (!videoRef.current) {
          throw new Error("Scanner preview is not ready.");
        }

        const reader = new BrowserMultiFormatReader();
        reader.possibleFormats = [
          ZXingBarcodeFormat.QR_CODE,
          ZXingBarcodeFormat.EAN_13,
          ZXingBarcodeFormat.EAN_8,
          ZXingBarcodeFormat.UPC_A,
          ZXingBarcodeFormat.UPC_E,
          ZXingBarcodeFormat.CODE_128,
        ];
        scannerReaderRef.current = reader;

        setCodeScannerHint(
          "Scan a QR code or retail product code. Hold the phone steady and keep the code inside the frame.",
        );

        setIsStartingScanner(false);

        const controls = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current,
          (result, _error, activeControls) => {
            if (cancelled || !result || detectionLockRef.current) {
              return;
            }

            const rawValue = result.getText().trim();

            if (!rawValue) {
              return;
            }

            detectionLockRef.current = true;
            const parsedCode = parseCodePayload(rawValue);

            if (parsedCode?.kind === "payload") {
              activeControls.stop();
              onCodePayloadDetected(parsedCode.payload);
              setIsCodeScannerOpen(false);
              stopCodeScanner();
              return;
            }

            if (parsedCode?.kind === "barcode") {
              setIsLookingUpBarcode(true);
              setCodeScannerError(null);
              setCodeScannerHint(`Looking up product code ${parsedCode.rawValue}...`);

              void resolveBarcodePayload(parsedCode.rawValue, domain)
                .then((barcodePayload) => {
                  if (barcodePayload) {
                    activeControls.stop();
                    onCodePayloadDetected(barcodePayload);
                    setIsCodeScannerOpen(false);
                    stopCodeScanner();
                    return;
                  }

                  setCodeScannerError(
                    `Barcode ${parsedCode.rawValue} was read, but no ingredient list was available for that product yet. Try another product, a QR code, or enter the ingredient list manually.`,
                  );
                  setCodeScannerHint(
                    "Scan a QR code or another product code. We will load ingredients when product data is available.",
                  );
                })
                .catch(() => {
                  setCodeScannerError(
                    "The code was read, but the product lookup could not be completed right now. Try again or enter the ingredient list manually.",
                  );
                })
                .finally(() => {
                  setIsLookingUpBarcode(false);
                  window.setTimeout(() => {
                    detectionLockRef.current = false;
                  }, 900);
                });

              return;
            }

            setCodeScannerError(
              "Code scanned, but it did not include ingredient data yet. Try a QR code with ingredients, or a retail product barcode with lookup support.",
            );
            window.setTimeout(() => {
              detectionLockRef.current = false;
            }, 900);
          },
        );

        if (cancelled) {
          controls.stop();
          return;
        }

        scannerControlsRef.current = controls;
      } catch (_error) {
        setCodeScannerError(
          "Camera access is blocked right now. Allow camera access on your phone to scan a QR code or barcode.",
        );
        setIsStartingScanner(false);
      }
    };

    void startScanner();

    return () => {
      cancelled = true;
      stopCodeScanner();
    };
  }, [domain, isCodeScannerOpen, onCodePayloadDetected]);

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
                Upload or take a photo of the ingredient label. Halal Intelligence extracts text
                only, then you review and edit the ingredient list before running the compliance
                scan.
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
                <label
                  data-upload-trigger="true"
                  className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm transition-colors hover:bg-background ${
                    highlightUploadEntry
                      ? "border-jade/45 bg-jade/12 shadow-[0_0_0_1px_rgba(83,188,131,0.18)]"
                      : "border-hairline bg-background/60"
                  }`}
                >
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
                  data-scan-trigger="true"
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
                  Review the editable ingredient list below, fix anything OCR missed, then scan the
                  reviewed list.
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
              hasExtractedIngredients
                ? "border-jade/35 shadow-[0_0_0_1px_rgba(83,188,131,0.12)]"
                : "border-hairline"
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
              Use the back camera to scan a QR code or a retail product barcode.
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
              {isStartingScanner
                ? "Opening camera..."
                : isLookingUpBarcode
                  ? "Looking up product details..."
                  : codeScannerHint}
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

function SummaryTab({
  report,
  domain,
  fallbackMarket,
  scanDateIso,
  onViewAll,
}: {
  report: ComplianceReport;
  domain: ComplianceDomain;
  fallbackMarket: string;
  scanDateIso: string;
  onViewAll: (tab: ReportTab) => void;
}) {
  const market = report.market ?? fallbackMarket;
  const readiness = getReadinessCopy(report.overall_status, market);
  const confidence = getReadinessConfidence(report.overall_status, market);
  const checklist = getMarketChecklist(report, market);
  const evidenceDocuments = collectEvidenceDocuments(report, market);
  const readinessBrief = useMemo(
    () =>
      buildReadinessBrief({
        report,
        domain,
        market,
        scanDateIso,
      }),
    [report, domain, market, scanDateIso],
  );
  const replacementScenarios = buildReplacementScenarios(report, market);
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const [issuedCertificate, setIssuedCertificate] = useState<CertificateRecord | null>(null);
  const [isCertificateDialogOpen, setIsCertificateDialogOpen] = useState(false);
  const [certificateDownloadError, setCertificateDownloadError] = useState<string | null>(null);
  const selectedScenario =
    replacementScenarios.find((scenario) => scenario.ingredient === activeScenario) ?? null;
  const certificateEligible = isCertificateEligible(readinessBrief);

  useEffect(() => {
    setIssuedCertificate(certificateEligible ? findCertificateForBrief(readinessBrief) : null);
  }, [certificateEligible, readinessBrief]);

  const handleDownloadCertificate = async (certificate: CertificateRecord) => {
    setCertificateDownloadError(null);
    try {
      await downloadCertificatePdf(certificate);
    } catch (_error) {
      setCertificateDownloadError("Certificate download could not be completed. Please try again.");
    }
  };

  const handleIssueCertificate = async ({
    manufacturerName,
    batchReference,
  }: {
    manufacturerName: string;
    batchReference: string;
  }) => {
    const certificate = issueCertificate({
      brief: readinessBrief,
      manufacturerName,
      batchReference,
    });
    setIssuedCertificate(certificate);
    setIsCertificateDialogOpen(false);
    await handleDownloadCertificate(certificate);
  };
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
              <span className="text-gradient-jade">{report.overall_status}</span>
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

      <ReadinessBriefCard
        brief={readinessBrief}
        scenario={selectedScenario}
        onDownload={() => downloadReadinessBrief(readinessBrief)}
      />

      <CertificatePanel
        eligible={certificateEligible}
        certificate={issuedCertificate}
        error={certificateDownloadError}
        onIssue={() => setIsCertificateDialogOpen(true)}
        onDownload={() => {
          if (issuedCertificate) {
            void handleDownloadCertificate(issuedCertificate);
          }
        }}
      />
      <CertificateIssueDialog
        open={isCertificateDialogOpen}
        brief={readinessBrief}
        onOpenChange={setIsCertificateDialogOpen}
        onIssue={handleIssueCertificate}
      />

      {replacementScenarios.length > 0 && (
        <div className="rounded-2xl border border-hairline bg-surface p-5">
          <div className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            What-if replacement
          </div>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Test safer ingredient options and preview how your readiness decision could improve.
          </p>
          <div className="mt-4 space-y-2">
            {replacementScenarios.map((scenario) => {
              const isActive = selectedScenario?.ingredient === scenario.ingredient;
              return (
                <button
                  key={scenario.ingredient}
                  type="button"
                  onClick={() => setActiveScenario(isActive ? null : scenario.ingredient)}
                  className={`w-full rounded-xl border px-3 py-3 text-left transition-colors ${
                    isActive
                      ? "border-jade/40 bg-jade/10"
                      : "border-hairline bg-background/35 hover:bg-background/55"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-foreground">{scenario.ingredient}</span>
                    <span className="rounded-full border border-hairline bg-background/60 px-2.5 py-1 text-[10px] text-muted-foreground">
                      Quick simulation
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {scenario.impactSummary}
                  </p>
                </button>
              );
            })}
          </div>
          {selectedScenario && (
            <div className="mt-4 rounded-xl border border-jade/25 bg-jade/5 p-4">
              <div className="text-xs font-medium uppercase tracking-widest text-jade">
                Simulation preview
              </div>
              <div className="mt-2 text-sm text-foreground">
                Replace <span className="font-medium">{selectedScenario.ingredient}</span> with:
              </div>
              <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
                {selectedScenario.alternatives.map((alternative) => (
                  <li key={`${selectedScenario.ingredient}-${alternative.name}`}>
                    <span className="text-foreground">{alternative.name}</span>:{" "}
                    {alternative.reason}
                  </li>
                ))}
              </ul>
              <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
                <div className="rounded-lg border border-hairline bg-background/45 px-3 py-2">
                  Decision: {selectedScenario.projectedStatus}
                </div>
                <div className="rounded-lg border border-hairline bg-background/45 px-3 py-2">
                  Blockers: {selectedScenario.projectedBlockers}
                </div>
                <div className="rounded-lg border border-hairline bg-background/45 px-3 py-2">
                  Confidence: {selectedScenario.projectedConfidence}%
                </div>
              </div>
            </div>
          )}
        </div>
      )}

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
          onViewAll={report.blockers.length > 5 ? () => onViewAll("blockers") : undefined}
        />
        <CategoryPreview
          title="Review queue"
          entries={report.warnings.length > 0 ? report.warnings : report.safe}
          emptyText="No warnings or safe entries returned."
          tone={report.warnings.length > 0 ? "warning" : "safe"}
          onViewAll={
            report.warnings.length > 5
              ? () => onViewAll("warnings")
              : report.warnings.length === 0 && report.safe.length > 5
                ? () => onViewAll("safe")
                : undefined
          }
        />
      </div>

      <div className="grid gap-3 md:grid-cols-[1.05fr_0.95fr]">
        <EvidencePackPanel documents={evidenceDocuments} market={market} />

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
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {getMarketProfile(market).warningNote}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Country expectation: prepare the evidence package listed for {market} before formal
            review.
          </p>
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
      </div>
    </div>
  );
}

function ReadinessBriefCard({
  brief,
  scenario,
  onDownload,
}: {
  brief: ReadinessBrief;
  scenario: ReplacementScenario | null;
  onDownload: () => void;
}) {
  return (
    <div className="rounded-[1.75rem] border border-hairline bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            {brief.title}
          </div>
          <h2 className="font-display mt-2 text-2xl font-light leading-tight sm:text-3xl">
            {brief.productName}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {brief.productDomain} • {brief.selectedCountry}
          </p>
        </div>
        <button
          type="button"
          onClick={onDownload}
          className="inline-flex items-center gap-2 rounded-full border border-hairline bg-background/50 px-4 py-2 text-sm text-foreground transition-colors hover:bg-background"
        >
          <Download className="h-4 w-4" />
          Download brief
        </button>
      </div>

      <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
        <div className="rounded-xl border border-hairline bg-background/35 px-3 py-2.5">
          <span className="text-xs text-muted-foreground">Decision</span>
          <div className="mt-1 text-foreground">{brief.readinessDecision}</div>
        </div>
        <div className="rounded-xl border border-hairline bg-background/35 px-3 py-2.5">
          <span className="text-xs text-muted-foreground">Confidence</span>
          <div className="mt-1 text-foreground">{brief.confidenceScore}%</div>
        </div>
        <div className="rounded-xl border border-hairline bg-background/35 px-3 py-2.5">
          <span className="text-xs text-muted-foreground">Scan date</span>
          <div className="mt-1 text-foreground">{brief.scanDate}</div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-hairline bg-background/35 p-3">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Summary</div>
          <p className="mt-2 text-sm text-foreground">{brief.blockerSummary}</p>
          <p className="mt-1 text-sm text-foreground">{brief.reviewSummary}</p>
          {scenario && (
            <p className="mt-2 text-xs text-jade">
              Simulation active: projected decision {scenario.projectedStatus} with{" "}
              {scenario.projectedConfidence}% confidence.
            </p>
          )}
        </div>
        <div className="rounded-xl border border-hairline bg-background/35 p-3">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">
            Recommended next step
          </div>
          <p className="mt-2 text-sm text-foreground">{brief.recommendedNextStep}</p>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-hairline bg-background/35 p-3">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">
          Required evidence and documents
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {brief.requiredEvidence.slice(0, 6).map((item) => (
            <span
              key={`brief-${item.name}`}
              className="rounded-full border border-hairline bg-background/55 px-2.5 py-1 text-[11px] text-foreground/85"
            >
              {item.name}
            </span>
          ))}
        </div>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">{brief.disclaimer}</p>
    </div>
  );
}

function CertificatePanel({
  eligible,
  certificate,
  error,
  onIssue,
  onDownload,
}: {
  eligible: boolean;
  certificate: CertificateRecord | null;
  error: string | null;
  onIssue: () => void;
  onDownload: () => void;
}) {
  return (
    <div className="rounded-2xl border border-hairline bg-surface p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-xl">
          <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-widest text-jade">
            <BadgeCheck className="h-4 w-4" />
            Export Readiness Certificate
          </div>
          {certificate ? (
            <>
              <h3 className="font-display mt-2 text-xl">Certificate issued</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Reference {certificate.id}. This assessment certificate is ready to download and
                verify on this device.
              </p>
            </>
          ) : eligible ? (
            <>
              <h3 className="font-display mt-2 text-xl">Ready for issuance</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                This product reached Low Risk with no open blocker or review item. Add the
                manufacturer name to issue its export preparation certificate.
              </p>
            </>
          ) : (
            <>
              <h3 className="font-display mt-2 text-xl">Certificate not available yet</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                An Export Readiness Certificate can be issued only after the product reaches Low
                Risk. Use the readiness brief to resolve the open findings first.
              </p>
            </>
          )}
          {error && <p className="mt-2 text-xs text-verdict-haram">{error}</p>}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          {certificate ? (
            <>
              <button
                type="button"
                onClick={onDownload}
                className="inline-flex items-center gap-2 rounded-xl bg-jade px-4 py-2.5 text-sm font-medium text-background transition-colors hover:bg-jade-glow"
              >
                <Download className="h-4 w-4" />
                Download certificate
              </button>
              <a
                href={getCertificateVerificationUrl(certificate.id)}
                className="inline-flex items-center rounded-xl border border-hairline bg-background/45 px-4 py-2.5 text-sm transition-colors hover:bg-background"
              >
                Verify record
              </a>
            </>
          ) : (
            <button
              type="button"
              onClick={onIssue}
              disabled={!eligible}
              className="inline-flex items-center gap-2 rounded-xl bg-jade px-4 py-2.5 text-sm font-medium text-background transition-colors hover:bg-jade-glow disabled:cursor-not-allowed disabled:bg-background/60 disabled:text-muted-foreground"
            >
              <BadgeCheck className="h-4 w-4" />
              Issue certificate
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CertificateIssueDialog({
  open,
  brief,
  onOpenChange,
  onIssue,
}: {
  open: boolean;
  brief: ReadinessBrief;
  onOpenChange: (open: boolean) => void;
  onIssue: (details: { manufacturerName: string; batchReference: string }) => Promise<void>;
}) {
  const [manufacturerName, setManufacturerName] = useState("");
  const [batchReference, setBatchReference] = useState("");
  const [isIssuing, setIsIssuing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setManufacturerName("");
      setBatchReference("");
      setError(null);
      setIsIssuing(false);
    }
  }, [open]);

  const submitCertificate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!manufacturerName.trim()) {
      setError("Manufacturer name is required.");
      return;
    }

    setError(null);
    setIsIssuing(true);
    try {
      await onIssue({ manufacturerName, batchReference });
    } catch (issueError) {
      setError(
        issueError instanceof Error ? issueError.message : "Certificate could not be issued.",
      );
      setIsIssuing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl border border-hairline bg-surface p-0 sm:rounded-3xl">
        <DialogHeader className="px-5 pt-5">
          <DialogTitle>Issue Export Readiness Certificate</DialogTitle>
          <DialogDescription>
            Create a certificate for {brief.productName} after its Low Risk readiness assessment.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submitCertificate} className="space-y-4 px-5 pb-5">
          <label className="block space-y-2">
            <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Manufacturer name
            </span>
            <input
              value={manufacturerName}
              onChange={(event) => setManufacturerName(event.target.value)}
              placeholder="Example Foods Ltd."
              className="w-full rounded-xl border border-hairline bg-background/50 px-3 py-3 text-sm outline-none focus:border-jade/50"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Batch or internal reference (optional)
            </span>
            <input
              value={batchReference}
              onChange={(event) => setBatchReference(event.target.value)}
              placeholder="BATCH-2026-05"
              className="w-full rounded-xl border border-hairline bg-background/50 px-3 py-3 text-sm outline-none focus:border-jade/50"
            />
          </label>
          {error && <p className="text-xs text-verdict-haram">{error}</p>}
          <p className="text-xs leading-relaxed text-muted-foreground">
            This document supports preparation for formal review. It is not a final halal
            certification or legal export approval.
          </p>
          <button
            type="submit"
            disabled={isIssuing}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-jade px-4 py-3 text-sm font-medium text-background transition-colors hover:bg-jade-glow disabled:opacity-60"
          >
            {isIssuing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <BadgeCheck className="h-4 w-4" />
            )}
            Issue and download PDF
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EvidencePackPanel({
  documents,
  market,
}: {
  documents: EvidencePackItem[];
  market: string;
}) {
  const previewDocuments = documents.slice(0, 6);

  return (
    <div className="rounded-2xl border border-hairline bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Evidence pack
          </div>
          <div className="mt-1 text-sm text-foreground">{market}</div>
        </div>
        <span className="rounded-full border border-hairline bg-background/35 px-3 py-1 text-[10px] text-muted-foreground">
          {documents.length} document{documents.length === 1 ? "" : "s"}
        </span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        These are the documents the manufacturer should prepare next based on the current ingredient
        findings and market expectations.
      </p>
      <div className="mt-4 space-y-2">
        {previewDocuments.map((document) => {
          const statusTone =
            document.status === "Required now"
              ? "border-verdict-haram/30 bg-verdict-haram/10 text-verdict-haram"
              : document.status === "Review soon"
                ? "border-verdict-mushbooh/30 bg-verdict-mushbooh/10 text-verdict-mushbooh"
                : "border-jade/25 bg-jade/10 text-jade";

          return (
            <div
              key={`${market}-${document.name}`}
              className="rounded-xl border border-hairline bg-background/35 px-3 py-3"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-foreground">{document.name}</span>
                <span className={`rounded-full border px-2.5 py-1 text-[10px] ${statusTone}`}>
                  {document.status}
                </span>
              </div>
              {document.relatedIngredients.length > 0 && (
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  Triggered by: {document.relatedIngredients.slice(0, 3).join(", ")}
                  {document.relatedIngredients.length > 3 ? ", more" : ""}
                </p>
              )}
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                {document.countryNote}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CategoryPreview({
  title,
  entries,
  emptyText,
  tone,
  onViewAll,
}: {
  title: string;
  entries: ComplianceEntry[];
  emptyText: string;
  tone: "blocker" | "warning" | "safe";
  onViewAll?: () => void;
}) {
  const styles = getToneStyles(tone);
  const previewEntries = entries.slice(0, 5);

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
      <div className="mt-3 max-h-[25rem] space-y-2 overflow-y-auto pr-1">
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          previewEntries.map((entry) => (
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
      {onViewAll && (
        <button
          type="button"
          onClick={onViewAll}
          className="mt-3 w-full rounded-xl border border-hairline bg-background/35 px-3 py-2 text-xs font-medium text-foreground/85 transition-colors hover:bg-background hover:text-foreground"
        >
          View all
        </button>
      )}
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
            Checking ingredients, evidence needs, and market readiness
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

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function downloadReadinessBrief(brief: ReadinessBrief) {
  if (typeof window === "undefined") return;

  const renderedEvidence = brief.requiredEvidence
    .map((item) => {
      const ingredients =
        item.relatedIngredients.length > 0
          ? item.relatedIngredients.join(", ")
          : "General country requirement";
      return `<tr>
        <td>${escapeHtml(item.name)}</td>
        <td>${escapeHtml(item.status)}</td>
        <td>${escapeHtml(ingredients)}</td>
      </tr>`;
    })
    .join("");

  const printableHtml = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(brief.title)}</title>
    <style>
      body { font-family: Inter, Segoe UI, Arial, sans-serif; margin: 28px; color: #0f172a; }
      h1 { margin: 0 0 4px; font-size: 22px; }
      h2 { margin: 22px 0 8px; font-size: 15px; }
      p { margin: 4px 0; line-height: 1.4; }
      .muted { color: #475569; font-size: 12px; }
      .chip { display: inline-block; margin-right: 10px; font-size: 12px; }
      table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
      th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; vertical-align: top; }
      th { background: #f8fafc; }
      .footer { margin-top: 18px; font-size: 11px; color: #64748b; }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(brief.title)}</h1>
    <p><strong>${escapeHtml(brief.productName)}</strong></p>
    <p class="muted">${escapeHtml(brief.productDomain)} • ${escapeHtml(brief.selectedCountry)} • ${escapeHtml(brief.scanDate)}</p>
    <p class="chip"><strong>Decision:</strong> ${escapeHtml(brief.readinessDecision)}</p>
    <p class="chip"><strong>Confidence:</strong> ${escapeHtml(String(brief.confidenceScore))}%</p>
    <h2>Summary</h2>
    <p>${escapeHtml(brief.blockerSummary)}</p>
    <p>${escapeHtml(brief.reviewSummary)}</p>
    <h2>Required evidence and documents</h2>
    <table>
      <thead>
        <tr><th>Document</th><th>Priority</th><th>Triggered by</th></tr>
      </thead>
      <tbody>${renderedEvidence}</tbody>
    </table>
    <h2>Recommended next step</h2>
    <p>${escapeHtml(brief.recommendedNextStep)}</p>
    <p class="footer">${escapeHtml(brief.disclaimer)}</p>
  </body>
</html>`;

  const printWindow = window.open("", "_blank", "noopener,noreferrer,width=1080,height=760");
  if (!printWindow) return;
  printWindow.document.write(printableHtml);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}
