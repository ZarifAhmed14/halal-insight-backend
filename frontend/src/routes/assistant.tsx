import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  ArrowUp,
  Bookmark,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  FileText,
  History,
  Loader2,
  PackageCheck,
  Plus,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Nav } from "@/components/site/Nav";
import { VerdictBadge } from "@/components/site/VerdictBadge";
import {
  analyzeProduct,
  type ComplianceEntry,
  type ComplianceReport,
  type OverallStatus,
  type ReportHistoryItem,
} from "@/lib/halaliq-api";

export const Route = createFileRoute("/assistant")({
  head: () => ({
    meta: [
      { title: "Assistant - HalalIQ Product Readiness" },
      {
        name: "description",
        content:
          "Run a product-level halal pre-certification scan with ingredient risk groups, required documents, and scan history.",
      },
      { property: "og:title", content: "HalalIQ Product Readiness Assistant" },
      {
        property: "og:description",
        content: "Product-level halal readiness checks for B2B manufacturers.",
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
  },
  {
    productName: "Strawberry Yogurt Drink",
    ingredients: "Gelatin\nNatural Flavor\nCitric Acid",
    market: "Malaysia",
  },
  {
    productName: "Instant Noodle Seasoning",
    ingredients: "E621\nChicken Flavor\nPalm Oil",
    market: "Indonesia",
  },
];

function AssistantPage() {
  const [submitted, setSubmitted] = useState(false);
  const [tab, setTab] = useState<ReportTab>("summary");
  const [productName, setProductName] = useState("Chocolate Wafer Biscuit");
  const [ingredientsInput, setIngredientsInput] = useState("E471\nGelatin\nVanilla Flavor");
  const [market, setMarket] = useState("Malaysia");
  const [report, setReport] = useState<ComplianceReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const runScan = async () => {
    const ingredients = parseIngredients(ingredientsInput);

    if (productName.trim().length === 0) {
      setError("Product name is required before running a scan.");
      return;
    }

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
      const nextReport = await analyzeProduct({
        product_name: productName.trim(),
        ingredients,
        market: market.trim(),
      });

      setReport(nextReport);
    } catch (scanError) {
      setReport(null);
      setError(scanError instanceof Error ? scanError.message : "Unable to run the scan.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadSample = (sample: (typeof SAMPLE_SCANS)[number]) => {
    setProductName(sample.productName);
    setIngredientsInput(sample.ingredients);
    setMarket(sample.market);
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
                  productName={productName}
                  ingredientsInput={ingredientsInput}
                  market={market}
                  isLoading={isLoading}
                  error={error}
                  onProductNameChange={setProductName}
                  onIngredientsChange={setIngredientsInput}
                  onMarketChange={setMarket}
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
                          {tab === "blockers" && <EntryList entries={report.blockers} emptyText="No blockers found for this scan." tone="blocker" />}
                          {tab === "warnings" && <EntryList entries={report.warnings} emptyText="No warnings found for this scan." tone="warning" />}
                          {tab === "safe" && <EntryList entries={report.safe} emptyText="No low-risk ingredients were returned for this scan." tone="safe" />}
                          {tab === "history" && <HistoryTab history={report.history ?? []} />}
                        </motion.div>
                      </AnimatePresence>
                    </div>

                    <ActionBar report={report} />
                  </>
                )}

                <div className="fixed inset-x-0 bottom-0 border-t border-hairline bg-background/85 backdrop-blur-xl">
                  <div className="mx-auto max-w-4xl px-4 py-3 sm:py-4 md:px-10">
                    <MiniScanBar
                      productName={productName}
                      market={market}
                      isLoading={isLoading}
                      onProductNameChange={setProductName}
                      onMarketChange={setMarket}
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

function statusToVerdict(status: OverallStatus): "halal" | "haram" | "mushbooh" {
  if (status === "Not Ready") {
    return "haram";
  }

  if (status === "Needs Review") {
    return "mushbooh";
  }

  return "halal";
}

function IntroHeader() {
  return (
    <div className="text-center">
      <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-hairline bg-surface/60 px-3.5 py-1.5 text-xs text-muted-foreground backdrop-blur">
        <Sparkles className="h-3 w-3 text-jade" />
        Product-level halal readiness
      </div>
      <h1 className="font-display text-balance text-3xl font-light leading-tight sm:text-4xl md:text-5xl">
        Scan a product before{" "}
        <span className="italic text-gradient-jade">certification review.</span>
      </h1>
      <p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-relaxed text-muted-foreground">
        Enter a product name, ingredient list, and target market. HalalIQ will call your Edge
        Function, group the risks, save the scan, and return report history.
      </p>
    </div>
  );
}

function ScanForm({
  productName,
  ingredientsInput,
  market,
  isLoading,
  error,
  onProductNameChange,
  onIngredientsChange,
  onMarketChange,
  onSubmit,
}: {
  productName: string;
  ingredientsInput: string;
  market: string;
  isLoading: boolean;
  error: string | null;
  onProductNameChange: (value: string) => void;
  onIngredientsChange: (value: string) => void;
  onMarketChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="mt-10 rounded-[2rem] border border-hairline bg-surface p-4 shadow-elegant sm:p-6"
    >
      <div className="grid gap-4 sm:grid-cols-[1.4fr_0.8fr]">
        <label className="space-y-2">
          <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Product name
          </span>
          <input
            value={productName}
            onChange={(event) => onProductNameChange(event.target.value)}
            placeholder="Chocolate Wafer Biscuit"
            className="w-full rounded-2xl border border-hairline bg-background/50 px-4 py-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-jade/50"
          />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Market
          </span>
          <input
            value={market}
            onChange={(event) => onMarketChange(event.target.value)}
            placeholder="Malaysia"
            className="w-full rounded-2xl border border-hairline bg-background/50 px-4 py-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-jade/50"
          />
        </label>
      </div>

      <label className="mt-4 block space-y-2">
        <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Ingredients
        </span>
        <textarea
          value={ingredientsInput}
          onChange={(event) => onIngredientsChange(event.target.value)}
          placeholder="One ingredient per line, or separate with commas"
          rows={7}
          className="w-full resize-none rounded-2xl border border-hairline bg-background/50 px-4 py-3 text-sm leading-relaxed outline-none transition-colors placeholder:text-muted-foreground focus:border-jade/50"
        />
      </label>

      {error && <ErrorCard message={error} compact />}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-relaxed text-muted-foreground">
          The frontend sends normalized-ready raw input to Supabase; validation and normalization
          still happen defensively in the Edge Function.
        </p>
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-foreground px-5 py-3 text-sm font-medium text-background transition-all hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
          Run compliance scan
        </button>
      </div>
    </form>
  );
}

function ReportHeader({
  productName,
  market,
  report,
  isLoading,
  onEdit,
}: {
  productName: string;
  market: string;
  report: ComplianceReport | null;
  isLoading: boolean;
  onEdit: () => void;
}) {
  return (
    <div className="rounded-[2rem] border border-hairline bg-surface p-5 shadow-elegant sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <PackageCheck className="h-3.5 w-3.5 text-jade" />
            Product scan
          </div>
          <h1 className="font-display mt-2 text-2xl font-light leading-tight sm:text-3xl">
            {report?.product_name || productName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Target market: {market}</p>
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
  const cards = [
    {
      label: "Ingredients",
      value: report.summary.total_ingredients,
      icon: ClipboardCheck,
      tone: "text-jade",
    },
    {
      label: "Blockers",
      value: report.summary.blockers_count,
      icon: AlertTriangle,
      tone: "text-verdict-haram",
    },
    {
      label: "Warnings",
      value: report.summary.warnings_count,
      icon: FileText,
      tone: "text-verdict-mushbooh",
    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-hairline bg-surface p-5">
            <div className={`flex items-center gap-2 text-xs ${card.tone}`}>
              <card.icon className="h-3.5 w-3.5" />
              {card.label}
            </div>
            <div className="font-display mt-3 text-3xl font-light">{card.value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-jade/20 bg-jade/5 p-5">
        <div className="flex items-center gap-2 text-xs text-jade">
          <ShieldCheck className="h-3.5 w-3.5" />
          Overall status: {report.overall_status}
        </div>
        <p className="mt-3 text-sm leading-relaxed text-foreground/85">
          {report.summary.human_readable}
        </p>
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
  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-hairline bg-surface p-6 text-sm text-muted-foreground">
        {emptyText}
      </div>
    );
  }

  const toneClass =
    tone === "blocker"
      ? "text-verdict-haram border-verdict-haram/30 bg-verdict-haram/5"
      : tone === "warning"
        ? "text-verdict-mushbooh border-verdict-mushbooh/30 bg-verdict-mushbooh/5"
        : "text-verdict-halal border-verdict-halal/30 bg-verdict-halal/5";

  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <div key={`${entry.ingredient}-${entry.risk}`} className="rounded-2xl border border-hairline bg-surface p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="font-display text-xl font-light">{entry.ingredient}</h3>
              <p className="mt-2 text-sm leading-relaxed text-foreground/80">{entry.reasoning}</p>
            </div>
            <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${toneClass}`}>
              {entry.risk}
            </span>
          </div>

          <div className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
            <InfoPills title="Required documents" values={entry.required_documents} />
            <InfoPills title="Affected markets" values={entry.affected_markets} />
          </div>
        </div>
      ))}
    </div>
  );
}

function InfoPills({ title, values }: { title: string; values: string[] }) {
  return (
    <div>
      <div className="mb-2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
        {title}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {values.length > 0 ? (
          values.map((value) => (
            <span key={value} className="rounded-full border border-hairline bg-background/40 px-2.5 py-1 text-muted-foreground">
              {value}
            </span>
          ))
        ) : (
          <span className="text-muted-foreground">None returned</span>
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
          <div className="text-sm font-medium">{latestReport?.product_name ?? "Previous submission"}</div>
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
    <div className={`rounded-2xl border border-verdict-haram/25 bg-verdict-haram/5 ${compact ? "mt-4 p-4" : "mt-5 p-5"}`}>
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
            Calling the Supabase Edge Function, querying Neo4j, saving the report, and loading history.
          </p>
        </div>
      </div>
    </div>
  );
}

function ActionBar({ report }: { report: ComplianceReport }) {
  const copyReport = async () => {
    await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
  };

  return (
    <div className="mt-6 flex items-center gap-2 border-t border-hairline pt-4">
      <button
        onClick={copyReport}
        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
      >
        <Copy className="h-3.5 w-3.5" />
        Copy JSON
      </button>
      <button className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-surface hover:text-foreground">
        <Bookmark className="h-3.5 w-3.5" />
        Saved in Supabase
      </button>
      <div className="ml-auto flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <CheckCircle2 className="h-3 w-3 text-jade" />
        API response rendered
      </div>
    </div>
  );
}

function MiniScanBar({
  productName,
  market,
  isLoading,
  onProductNameChange,
  onMarketChange,
  onSubmit,
}: {
  productName: string;
  market: string;
  isLoading: boolean;
  onProductNameChange: (value: string) => void;
  onMarketChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="grid gap-2 sm:grid-cols-[1fr_180px_auto]"
    >
      <input
        value={productName}
        onChange={(event) => onProductNameChange(event.target.value)}
        className="rounded-xl border border-hairline bg-surface px-3 py-2 text-sm outline-none focus:border-jade/50"
      />
      <input
        value={market}
        onChange={(event) => onMarketChange(event.target.value)}
        className="rounded-xl border border-hairline bg-surface px-3 py-2 text-sm outline-none focus:border-jade/50"
      />
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
