import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Upload,
  PencilLine,
  ScanLine,
  Camera,
  ChevronDown,
  X,
  Download,
  Share2,
} from "lucide-react";
import { Nav } from "@/components/site/Nav";
import { PageBackground } from "@/components/site/PageBackground";
import { StatusBadge } from "@/components/site/StatusBadge";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HalalIQ — Manufacturer Certification Tool" },
      {
        name: "description",
        content:
          "AI-powered halal pre-certification readiness for Bangladeshi manufacturers. Know exactly which ingredients to fix before applying for JAKIM, ESMA, or HFA.",
      },
      { property: "og:title", content: "HalalIQ — Turn Ingredients Into Export Opportunities" },
      {
        property: "og:description",
        content:
          "Pre-certification readiness assessment for halal exports. Scan products, analyze ingredients, generate market readiness passports.",
      },
    ],
  }),
  component: CertificationPage,
});

/* =============================================================== */
/*  TYPES + DEMO DATA                                                */
/* =============================================================== */

type Status = "halal" | "verify" | "haram";
type Ingredient = {
  name: string;
  eNumber?: string;
  status: Status;
  reason: string;
  detail: string;
  flaggedBy: string[];
  recommendation: string;
};
type MarketScore = {
  flag: string;
  country: string;
  body: string;
  score: number;
  status: string;
  gaps: string[];
};
type Product = {
  id: string;
  name: string;
  brand: string;
  barcode: string;
  origin: string;
  category: string;
  ingredients: Ingredient[];
  markets: MarketScore[];
};

const PRODUCTS: Record<string, Product> = {
  oil: {
    id: "oil",
    name: "Premium Soybean Oil",
    brand: "ACI Foods Ltd.",
    barcode: "8901234567890",
    origin: "🇧🇩 Bangladesh",
    category: "Edible Oil",
    ingredients: [
      {
        name: "Refined Soybean Oil",
        status: "halal",
        reason: "Plant-derived, no animal processing aids",
        detail: "Refined via mechanical extraction. No bone char or animal-origin filtering used.",
        flaggedBy: [],
        recommendation: "No action required.",
      },
      {
        name: "Tocopherols (Mixed)",
        eNumber: "E306",
        status: "halal",
        reason: "Vitamin E, plant-derived antioxidant",
        detail: "Sourced from soybean and sunflower distillates. Naturally occurring.",
        flaggedBy: [],
        recommendation: "No action required.",
      },
      {
        name: "Mono- and Diglycerides",
        eNumber: "E471",
        status: "verify",
        reason: "Could be animal or plant derived",
        detail: "Origin must be confirmed by supplier letter. Plant-source halal; animal-source requires zabihah documentation.",
        flaggedBy: ["JAKIM", "ESMA", "HFA"],
        recommendation: "Request written origin declaration from emulsifier supplier.",
      },
      {
        name: "Antifoaming Agent",
        eNumber: "E900",
        status: "halal",
        reason: "Polydimethylsiloxane — synthetic",
        detail: "Synthetic silicone-based. Universally accepted across major halal authorities.",
        flaggedBy: [],
        recommendation: "No action required.",
      },
    ],
    markets: [
      { flag: "🇲🇾", country: "Malaysia", body: "JAKIM", score: 78, status: "Nearly Ready", gaps: ["E471 origin documentation"] },
      { flag: "🇦🇪", country: "UAE", body: "ESMA", score: 84, status: "Ready to Apply", gaps: ["Minor — supplier letter for emulsifier"] },
      { flag: "🇬🇧", country: "UK", body: "HFA", score: 72, status: "Nearly Ready", gaps: ["E471 chain-of-custody audit"] },
      { flag: "🇪🇺", country: "EU", body: "Various", score: 70, status: "Nearly Ready", gaps: ["E471 origin", "Facility inspection"] },
    ],
  },
  sausage: {
    id: "sausage",
    name: "Premium Beef Sausage",
    brand: "Bengal Meat Co.",
    barcode: "8902345678901",
    origin: "🇧🇩 Bangladesh",
    category: "Processed Meat",
    ingredients: [
      {
        name: "Beef",
        status: "verify",
        reason: "Slaughter method unconfirmed",
        detail: "Halal status depends on zabihah compliance. No third-party slaughterhouse certificate on file.",
        flaggedBy: ["JAKIM", "ESMA", "HFA"],
        recommendation: "Submit slaughterhouse halal certificate from accredited body.",
      },
      {
        name: "Water",
        status: "halal",
        reason: "No concerns",
        detail: "Potable water. Universally permissible.",
        flaggedBy: [],
        recommendation: "No action required.",
      },
      {
        name: "Salt",
        status: "halal",
        reason: "No concerns",
        detail: "Mineral sodium chloride. Universally permissible.",
        flaggedBy: [],
        recommendation: "No action required.",
      },
      {
        name: "Sodium Nitrite",
        eNumber: "E250",
        status: "halal",
        reason: "Synthetic preservative",
        detail: "Chemically synthesized curing agent. No animal origin.",
        flaggedBy: [],
        recommendation: "Within permitted use levels.",
      },
      {
        name: "Mono- and Diglycerides",
        eNumber: "E471",
        status: "verify",
        reason: "Could be animal or plant derived",
        detail: "Source must be declared. Plant-derived halal; animal-derived requires zabihah evidence.",
        flaggedBy: ["JAKIM", "ESMA"],
        recommendation: "Request supplier origin declaration.",
      },
      {
        name: "Pork Casing",
        status: "haram",
        reason: "Pork derivative confirmed",
        detail: "Natural casing of porcine origin. Categorically impermissible across all schools.",
        flaggedBy: ["JAKIM", "ESMA", "HFA", "EU"],
        recommendation: "Replace with bovine or synthetic cellulose casing immediately.",
      },
    ],
    markets: [
      { flag: "🇲🇾", country: "Malaysia", body: "JAKIM", score: 42, status: "Nearly Ready", gaps: ["Pork casing — disqualifying", "Beef zabihah cert", "E471 origin"] },
      { flag: "🇦🇪", country: "UAE", body: "ESMA", score: 58, status: "Nearly Ready", gaps: ["Pork casing — disqualifying", "Beef zabihah cert"] },
      { flag: "🇬🇧", country: "UK", body: "HFA", score: 31, status: "Gaps Found", gaps: ["Pork casing — disqualifying", "Beef zabihah cert", "Facility audit"] },
      { flag: "🇪🇺", country: "EU", body: "Various", score: 28, status: "Gaps Found", gaps: ["Pork casing — disqualifying", "Beef zabihah", "EU label compliance"] },
    ],
  },
  biscuit: {
    id: "biscuit",
    name: "Butter Cream Biscuit",
    brand: "Olympic Industries",
    barcode: "8903456789012",
    origin: "🇧🇩 Bangladesh",
    category: "Bakery",
    ingredients: [
      {
        name: "Wheat Flour",
        status: "halal",
        reason: "Plant-derived",
        detail: "Refined wheat flour. No bleaching agents of animal origin.",
        flaggedBy: [],
        recommendation: "No action required.",
      },
      {
        name: "Sugar",
        status: "halal",
        reason: "No concerns",
        detail: "Cane sugar, refined without bone char in this facility.",
        flaggedBy: [],
        recommendation: "Confirm refinery uses non-bone-char filtration (already on file).",
      },
      {
        name: "Vegetable Shortening",
        status: "verify",
        reason: "Source emulsifier needs documentation",
        detail: "Palm-based shortening. Embedded emulsifiers (E471/E472e) require origin letter.",
        flaggedBy: ["JAKIM", "HFA"],
        recommendation: "Obtain composite supplier declaration.",
      },
      {
        name: "Soy Lecithin",
        eNumber: "E322",
        status: "halal",
        reason: "Plant-derived emulsifier",
        detail: "Extracted from soybean oil. Universally accepted.",
        flaggedBy: [],
        recommendation: "No action required.",
      },
      {
        name: "Vanilla Flavor",
        status: "verify",
        reason: "May contain ethanol carrier",
        detail: "Natural vanilla extracts often use ethanol as solvent. Threshold and source matter.",
        flaggedBy: ["JAKIM", "HFA"],
        recommendation: "Switch to alcohol-free vanillin or obtain residual-alcohol test report.",
      },
      {
        name: "Salt",
        status: "halal",
        reason: "No concerns",
        detail: "Mineral salt.",
        flaggedBy: [],
        recommendation: "No action required.",
      },
    ],
    markets: [
      { flag: "🇲🇾", country: "Malaysia", body: "JAKIM", score: 74, status: "Nearly Ready", gaps: ["Shortening emulsifier origin", "Vanilla solvent declaration"] },
      { flag: "🇦🇪", country: "UAE", body: "ESMA", score: 81, status: "Ready to Apply", gaps: ["Vanilla solvent threshold report"] },
      { flag: "🇬🇧", country: "UK", body: "HFA", score: 68, status: "Nearly Ready", gaps: ["Vanilla solvent — strict policy", "Emulsifier docs"] },
      { flag: "🇪🇺", country: "EU", body: "Various", score: 75, status: "Nearly Ready", gaps: ["Composite emulsifier letter"] },
    ],
  },
};

const QUICK_PICKS: Array<{ key: keyof typeof PRODUCTS; label: string }> = [
  { key: "oil", label: "Try: Soybean Oil" },
  { key: "sausage", label: "Try: Beef Sausage" },
  { key: "biscuit", label: "Try: Biscuit" },
];

/* =============================================================== */
/*  PAGE                                                             */
/* =============================================================== */

function CertificationPage() {
  const [product, setProduct] = useState<Product | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [showPassport, setShowPassport] = useState(false);
  const [tab, setTab] = useState<"barcode" | "upload" | "manual">("barcode");

  const loadProduct = (key: keyof typeof PRODUCTS) => {
    setAnalyzing(true);
    setProduct(null);
    setTimeout(() => {
      setProduct(PRODUCTS[key]);
      setTimeout(() => setAnalyzing(false), 1400);
    }, 350);
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      <PageBackground />
      <Nav />

      <main className="relative pt-24">
        <Hero onTry={() => loadProduct("sausage")} />
        <Dashboard
          product={product}
          analyzing={analyzing}
          tab={tab}
          setTab={setTab}
          loadProduct={loadProduct}
          onGenerate={() => setShowPassport(true)}
        />
        <SiteFooter />
      </main>

      {showPassport && product && (
        <PassportOverlay product={product} onClose={() => setShowPassport(false)} />
      )}
    </div>
  );
}

/* =============================================================== */
/*  HERO                                                             */
/* =============================================================== */

function Hero({ onTry }: { onTry: () => void }) {
  return (
    <section className="relative mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 sm:pb-24 sm:pt-12 lg:pt-16">
      {/* Arabic watermark */}
      <div
        aria-hidden
        className="font-arabic pointer-events-none absolute right-2 top-0 select-none text-[180px] leading-none text-gold/[0.06] sm:right-12 sm:text-[280px] lg:text-[360px]"
      >
        حلال
      </div>

      <div className="relative mx-auto max-w-3xl text-center">
        <div className="relative animate-fade-up">
          <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/[0.04] px-3.5 py-1.5 text-xs text-gold">
            <span className="text-sm leading-none">🏭</span>
            For Bangladeshi Manufacturers
          </div>

          <h1 className="font-display mt-6 text-[2.5rem] font-medium leading-[1.04] text-balance text-foreground sm:text-6xl lg:text-[4.5rem]">
            Turn Ingredients
            <br />
            Into <span className="text-gradient-gold italic">Export Opportunities.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-pretty text-base leading-relaxed text-text-secondary sm:text-lg">
            AI-powered halal pre-certification readiness. Know exactly which ingredients
            to fix <em className="not-italic text-foreground">before</em> applying for
            JAKIM, ESMA, or HFA certification.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={onTry}
              className="btn-gold inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-medium"
            >
              <ScanLine className="h-4 w-4" strokeWidth={2.25} />
              Scan Your Product
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
            </button>
            <button
              type="button"
              onClick={onTry}
              className="btn-ghost-gold inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-medium"
            >
              <Upload className="h-4 w-4" strokeWidth={2} />
              Upload Ingredient List
            </button>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            {[
              { flag: "🇲🇾", name: "JAKIM Malaysia" },
              { flag: "🇦🇪", name: "ESMA UAE" },
              { flag: "🇬🇧", name: "HFA United Kingdom" },
            ].map((c) => (
              <div
                key={c.name}
                className="inline-flex items-center gap-1.5 rounded-full border border-gold/25 bg-surface/60 px-3 py-1.5 text-xs text-foreground/85 backdrop-blur"
              >
                <span>{c.flag}</span>
                <span>{c.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}


/* =============================================================== */
/*  DASHBOARD — three panels                                         */
/* =============================================================== */

function Dashboard({
  product,
  analyzing,
  tab,
  setTab,
  loadProduct,
  onGenerate,
}: {
  product: Product | null;
  analyzing: boolean;
  tab: "barcode" | "upload" | "manual";
  setTab: (t: "barcode" | "upload" | "manual") => void;
  loadProduct: (k: keyof typeof PRODUCTS) => void;
  onGenerate: () => void;
}) {
  return (
    <section
      id="dashboard"
      className="relative mx-auto max-w-7xl px-4 pb-24 sm:px-6"
    >
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-gold">
            Certification Dashboard
          </div>
          <h2 className="font-display mt-1 text-2xl text-foreground sm:text-3xl">
            Pre-certification, in three steps.
          </h2>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[28fr_44fr_28fr]">
        <InputPanel
          tab={tab}
          setTab={setTab}
          loadProduct={loadProduct}
          product={product}
        />
        <IngredientsPanel product={product} analyzing={analyzing} />
        <MarketsPanel product={product} onGenerate={onGenerate} />
      </div>
    </section>
  );
}

/* ----- LEFT: Input panel ----- */
function InputPanel({
  tab,
  setTab,
  loadProduct,
  product,
}: {
  tab: "barcode" | "upload" | "manual";
  setTab: (t: "barcode" | "upload" | "manual") => void;
  loadProduct: (k: keyof typeof PRODUCTS) => void;
  product: Product | null;
}) {
  return (
    <div className="rounded-2xl border border-gold/15 bg-surface p-5 shadow-elegant">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-gold/25 bg-gold/[0.06]">
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-gold" fill="none" stroke="currentColor" strokeWidth="1.4">
            <rect x="2" y="2" width="12" height="12" />
            <rect x="2" y="2" width="12" height="12" transform="rotate(45 8 8)" />
          </svg>
        </span>
        <h3 className="font-display text-base text-foreground">Product Input</h3>
      </div>

      {/* Tabs */}
      <div className="relative mt-5 grid grid-cols-3 border-b border-hairline">
        {([
          { key: "barcode", icon: Camera, label: "Barcode" },
          { key: "upload", icon: Upload, label: "Upload" },
          { key: "manual", icon: PencilLine, label: "Manual" },
        ] as const).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`relative flex items-center justify-center gap-1.5 pb-2.5 text-xs transition-colors ${
              tab === t.key ? "text-gold" : "text-text-secondary hover:text-foreground"
            }`}
          >
            <t.icon className="h-3.5 w-3.5" strokeWidth={1.75} />
            {t.label}
            {tab === t.key && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 rounded bg-gold animate-fade-in" />
            )}
          </button>
        ))}
      </div>

      {/* Tab body */}
      <div className="mt-4">
        {tab === "barcode" && <BarcodeView />}
        {tab === "upload" && <UploadView />}
        {tab === "manual" && <ManualView />}
      </div>

      {/* Quick picks */}
      <div className="mt-3 grid grid-cols-1 gap-1.5">
        {QUICK_PICKS.map((q) => (
          <button
            key={q.key}
            type="button"
            onClick={() => loadProduct(q.key)}
            className="rounded-md border border-gold/15 bg-surface-elevated px-3 py-2 text-left text-xs text-text-secondary transition-colors hover:border-gold/40 hover:text-foreground"
          >
            {q.label}
          </button>
        ))}
      </div>

      {/* Loaded product card */}
      {product && (
        <div className="mt-5 animate-fade-up rounded-xl border border-gold/20 bg-surface-elevated p-4">
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-gold/10 to-foreground/5">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gold/10 to-transparent animate-pulse" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-display truncate text-sm text-foreground">{product.name}</div>
              <div className="truncate text-[11px] text-text-secondary">{product.brand}</div>
            </div>
          </div>
          <div className="mt-3 space-y-1.5 text-[11px]">
            <Row k="Barcode" v={<span className="font-mono text-gold">{product.barcode}</span>} />
            <Row k="Origin" v={product.origin} />
            <Row k="Category" v={product.category} />
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-text-secondary">{k}</span>
      <span className="text-foreground/90">{v}</span>
    </div>
  );
}

function BarcodeView() {
  return (
    <div>
      {/* Camera viewfinder */}
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-ink/80">
        {/* Corner brackets */}
        {[
          "left-2 top-2 border-l-2 border-t-2",
          "right-2 top-2 border-r-2 border-t-2",
          "left-2 bottom-2 border-l-2 border-b-2",
          "right-2 bottom-2 border-r-2 border-b-2",
        ].map((c, i) => (
          <span key={i} className={`absolute h-5 w-5 border-gold ${c}`} />
        ))}
        {/* Scanning line */}
        <div className="absolute inset-x-3 top-0 bottom-0 overflow-hidden">
          <div className="animate-scan h-px w-full bg-gradient-to-r from-transparent via-gold to-transparent shadow-[0_0_12px_2px_rgba(201,168,76,0.6)]" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <Camera className="mx-auto h-6 w-6 text-text-secondary/60" strokeWidth={1.25} />
            <div className="mt-2 font-mono text-[10px] uppercase tracking-widest text-text-secondary/70">
              Point camera at barcode
            </div>
          </div>
        </div>
      </div>

      <input
        type="text"
        placeholder="Or type barcode number..."
        className="mt-3 w-full rounded-lg border border-gold/15 bg-surface-elevated px-3 py-2.5 font-mono text-xs text-foreground placeholder:text-text-secondary/60 focus:border-gold/50 focus:outline-none focus:ring-2 focus:ring-gold/20"
      />

      <button
        type="button"
        className="btn-gold mt-3 w-full rounded-lg px-4 py-2.5 text-sm font-medium"
      >
        Analyze Product
      </button>
    </div>
  );
}

function UploadView() {
  return (
    <div className="rounded-lg border border-dashed border-gold/30 bg-ink/40 p-6 text-center">
      <Upload className="mx-auto h-7 w-7 text-gold" strokeWidth={1.5} />
      <div className="mt-3 text-sm text-foreground">Drop ingredient list</div>
      <div className="mt-1 text-[11px] text-text-secondary">
        PDF, JPG, PNG — up to 10MB
      </div>
      <button
        type="button"
        className="btn-ghost-gold mt-4 inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs"
      >
        Choose file
      </button>
    </div>
  );
}

function ManualView() {
  return (
    <div className="space-y-2">
      <input
        type="text"
        placeholder="Product name"
        className="w-full rounded-lg border border-gold/15 bg-surface-elevated px-3 py-2.5 text-xs text-foreground placeholder:text-text-secondary/60 focus:border-gold/50 focus:outline-none focus:ring-2 focus:ring-gold/20"
      />
      <textarea
        placeholder="Paste ingredient list, one per line..."
        rows={5}
        className="w-full resize-none rounded-lg border border-gold/15 bg-surface-elevated px-3 py-2.5 text-xs text-foreground placeholder:text-text-secondary/60 focus:border-gold/50 focus:outline-none focus:ring-2 focus:ring-gold/20"
      />
      <button
        type="button"
        className="btn-gold w-full rounded-lg px-4 py-2.5 text-sm font-medium"
      >
        Analyze Ingredients
      </button>
    </div>
  );
}

/* ----- CENTER: Ingredients panel ----- */
function IngredientsPanel({
  product,
  analyzing,
}: {
  product: Product | null;
  analyzing: boolean;
}) {
  const summary = useMemo(() => {
    if (!product) return { halal: 0, verify: 0, haram: 0 };
    return product.ingredients.reduce(
      (acc, i) => ({ ...acc, [i.status]: acc[i.status] + 1 }),
      { halal: 0, verify: 0, haram: 0 }
    );
  }, [product]);

  return (
    <div className="rounded-2xl border border-gold/15 bg-surface p-5 shadow-elegant">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-base text-foreground">Ingredient Analysis</h3>
        {analyzing && (
          <div className="inline-flex items-center gap-2 text-xs text-gold">
            <span className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse-dot" />
            Analyzing…
          </div>
        )}
      </div>

      {!product && !analyzing && (
        <EmptyState />
      )}

      {analyzing && !product && (
        <div className="mt-8 space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-lg border border-hairline bg-surface-elevated"
              style={{ animationDelay: `${i * 80}ms` }}
            />
          ))}
        </div>
      )}

      {product && (
        <>
          <div className="mt-4 max-h-[520px] space-y-2 overflow-y-auto pr-1">
            {product.ingredients.map((ing, i) => (
              <IngredientCard key={ing.name} ingredient={ing} index={i} />
            ))}
          </div>

          {/* Sticky summary bar */}
          <div className="mt-4 rounded-xl border border-hairline bg-surface-elevated p-3">
            <div className="flex items-center justify-between font-mono text-[11px]">
              <span className="text-halal">{summary.halal} Halal</span>
              <span className="text-verify">· {summary.verify} Verify</span>
              <span className="text-haram">· {summary.haram} Haram</span>
            </div>
            <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-ink">
              {summary.halal > 0 && (
                <div
                  className="bg-halal"
                  style={{
                    width: `${(summary.halal / product.ingredients.length) * 100}%`,
                  }}
                />
              )}
              {summary.verify > 0 && (
                <div
                  className="bg-verify"
                  style={{
                    width: `${(summary.verify / product.ingredients.length) * 100}%`,
                  }}
                />
              )}
              {summary.haram > 0 && (
                <div
                  className="bg-haram"
                  style={{
                    width: `${(summary.haram / product.ingredients.length) * 100}%`,
                  }}
                />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mt-12 flex flex-col items-center justify-center text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-gold/20 bg-gold/[0.04]">
        <ScanLine className="h-7 w-7 text-gold" strokeWidth={1.25} />
      </div>
      <h4 className="font-display mt-4 text-base text-foreground">Awaiting product</h4>
      <p className="mt-1 max-w-[260px] text-xs text-text-secondary">
        Scan a barcode or load a demo product to see live ingredient analysis.
      </p>
    </div>
  );
}

function IngredientCard({ ingredient, index }: { ingredient: Ingredient; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="animate-fade-up rounded-lg border border-hairline bg-surface-elevated"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-3.5 py-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">{ingredient.name}</span>
            {ingredient.eNumber && (
              <span className="font-mono text-[10px] text-text-secondary">
                {ingredient.eNumber}
              </span>
            )}
          </div>
          <div className="mt-0.5 truncate text-[11px] text-text-secondary">
            {ingredient.reason}
          </div>
        </div>
        <StatusBadge variant={ingredient.status} glow={ingredient.status === "haram"} />
        <ChevronDown
          className={`h-3.5 w-3.5 text-text-secondary transition-transform ${
            open ? "rotate-180" : ""
          }`}
          strokeWidth={2}
        />
      </button>
      {open && (
        <div className="border-t border-hairline px-3.5 py-3 animate-fade-in">
          <div className="space-y-2.5 text-[11px]">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-text-secondary">
                Source
              </div>
              <p className="mt-1 text-foreground/85">{ingredient.detail}</p>
            </div>
            {ingredient.flaggedBy.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-widest text-text-secondary">
                  Flagged by
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {ingredient.flaggedBy.map((b) => (
                    <span
                      key={b}
                      className="rounded border border-hairline bg-ink px-1.5 py-0.5 font-mono text-[10px] text-text-secondary"
                    >
                      {b}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div>
              <div className="text-[10px] uppercase tracking-widest text-text-secondary">
                Recommended action
              </div>
              <p className="mt-1 text-gold">{ingredient.recommendation}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ----- RIGHT: Markets panel ----- */
function MarketsPanel({
  product,
  onGenerate,
}: {
  product: Product | null;
  onGenerate: () => void;
}) {
  return (
    <div className="rounded-2xl border border-gold/15 bg-surface p-5 shadow-elegant">
      <h3 className="font-display text-base text-foreground">Market Readiness</h3>

      {!product && (
        <div className="mt-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-gold/20 bg-gold/[0.04]">
            <span className="text-xl">🌍</span>
          </div>
          <p className="mt-3 text-xs text-text-secondary">
            Markets activate after analysis.
          </p>
        </div>
      )}

      {product && (
        <>
          <div className="mt-4 space-y-3">
            {product.markets.map((m, i) => (
              <MarketCard key={m.country} market={m} index={i} />
            ))}
          </div>
          <div className="mt-5 space-y-2">
            <button
              type="button"
              onClick={onGenerate}
              className="btn-gold w-full rounded-lg px-4 py-2.5 text-sm font-medium"
            >
              Generate Readiness Passport
            </button>
            <button
              type="button"
              className="btn-ghost-gold w-full rounded-lg px-4 py-2.5 text-sm font-medium"
            >
              Book Expert Review
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function MarketCard({ market, index }: { market: MarketScore; index: number }) {
  const [open, setOpen] = useState(false);
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    setAnimatedScore(0);
    const start = performance.now();
    const duration = 1200;
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setAnimatedScore(market.score * eased);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    const delay = setTimeout(() => {
      raf = requestAnimationFrame(step);
    }, index * 120);
    return () => {
      clearTimeout(delay);
      cancelAnimationFrame(raf);
    };
  }, [market.score, index]);

  const color =
    market.score >= 80 ? "#2ECC8A" : market.score >= 40 ? "#E8864A" : "#E05252";

  // Arc geometry
  const r = 26;
  const c = 2 * Math.PI * r;
  const offset = c - (animatedScore / 100) * c;

  return (
    <div className="rounded-xl border border-hairline bg-surface-elevated p-3 animate-fade-up" style={{ animationDelay: `${index * 80}ms` }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 text-left"
      >
        <div className="relative h-16 w-16 shrink-0">
          <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90">
            <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(201,168,76,0.12)" strokeWidth="4" />
            <circle
              cx="32"
              cy="32"
              r={r}
              fill="none"
              stroke={color}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={offset}
              style={{ transition: "stroke 400ms ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-mono text-xs font-medium text-foreground">
              {Math.round(animatedScore)}%
            </span>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-sm">
            <span>{market.flag}</span>
            <span className="text-foreground">{market.country}</span>
          </div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-text-secondary">
            {market.body}
          </div>
          <div className="mt-1 text-[11px]" style={{ color }}>
            {market.status}
          </div>
        </div>
        <ChevronDown
          className={`h-3.5 w-3.5 text-text-secondary transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && market.gaps.length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-hairline pt-3 text-[11px] text-text-secondary animate-fade-in">
          {market.gaps.map((g) => (
            <li key={g} className="flex gap-2">
              <span className="text-gold">•</span>
              <span>{g}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* =============================================================== */
/*  PASSPORT OVERLAY                                                 */
/* =============================================================== */

function PassportOverlay({
  product,
  onClose,
}: {
  product: Product;
  onClose: () => void;
}) {
  const overall = Math.round(
    product.markets.reduce((s, m) => s + m.score, 0) / product.markets.length
  );
  const issuesNeedingAction = product.ingredients.filter((i) => i.status !== "halal");

  // Gauge
  const r = 56;
  const c = 2 * Math.PI * r;
  const offset = c - (overall / 100) * c;
  const color = overall >= 80 ? "#2ECC8A" : overall >= 40 ? "#E8864A" : "#E05252";

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-ink/85 px-3 py-8 backdrop-blur-md animate-fade-in sm:px-6">
      <div className="relative w-full max-w-3xl rounded-3xl border-2 border-gold/60 bg-surface p-2 shadow-elegant animate-fade-up">
        {/* Decorative corners */}
        <CornerOrnament className="absolute -left-1 -top-1" />
        <CornerOrnament className="absolute -right-1 -top-1 rotate-90" />
        <CornerOrnament className="absolute -left-1 -bottom-1 -rotate-90" />
        <CornerOrnament className="absolute -right-1 -bottom-1 rotate-180" />

        <div className="rounded-[1.4rem] border border-gold/20 p-6 sm:p-8">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-gold/30 bg-surface text-gold transition-colors hover:bg-gold hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gold/20 pb-5">
            <div>
              <div className="font-display text-2xl tracking-[0.2em] text-gold sm:text-3xl">
                HALAL READINESS PASSPORT
              </div>
              <div className="mt-1 text-sm text-text-secondary">
                Pre-Certification Assessment Report
              </div>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 font-mono text-[11px] text-text-secondary">
                <span>
                  Issued: <span className="text-foreground">{new Date().toLocaleDateString("en-GB")}</span>
                </span>
                <span>
                  ID: <span className="text-gold">HQ-{product.id.toUpperCase()}-{Date.now().toString(36).slice(-6).toUpperCase()}</span>
                </span>
              </div>
            </div>
            <div className="h-16 w-16 shrink-0 rounded-md border border-gold/30 bg-ink p-1.5">
              <QrPlaceholder />
            </div>
          </div>

          {/* Product + Gauge */}
          <div className="mt-6 grid gap-6 sm:grid-cols-[1fr_auto]">
            <div>
              <div className="font-display text-xl text-foreground">{product.name}</div>
              <div className="text-sm text-text-secondary">{product.brand}</div>
              <div className="mt-3 space-y-1 font-mono text-[11px]">
                <div>
                  <span className="text-text-secondary">Barcode</span>{" "}
                  <span className="text-gold">{product.barcode}</span>
                </div>
                <div>
                  <span className="text-text-secondary">Origin</span>{" "}
                  <span className="text-foreground">{product.origin}</span>
                </div>
                <div>
                  <span className="text-text-secondary">Category</span>{" "}
                  <span className="text-foreground">{product.category}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-xl border border-gold/20 bg-ink/60 p-4">
              <div className="relative h-32 w-32">
                <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
                  <circle cx="64" cy="64" r={r} fill="none" stroke="rgba(201,168,76,0.15)" strokeWidth="6" />
                  <circle
                    cx="64"
                    cy="64"
                    r={r}
                    fill="none"
                    stroke={color}
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={c}
                    strokeDashoffset={offset}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-mono text-3xl font-medium text-foreground">{overall}</span>
                  <span className="font-mono text-[9px] uppercase tracking-widest text-text-secondary">
                    overall
                  </span>
                </div>
              </div>
              <div>
                <div className="font-display text-sm text-foreground">Readiness Score</div>
                <div className="mt-1 text-[11px] text-text-secondary">
                  Aggregated across four target export markets.
                </div>
              </div>
            </div>
          </div>

          {/* Markets table */}
          <div className="mt-6">
            <div className="font-mono text-[10px] uppercase tracking-widest text-gold">
              Market breakdown
            </div>
            <div className="mt-2 overflow-hidden rounded-xl border border-gold/20">
              <table className="w-full text-sm">
                <thead className="bg-ink/50 text-left text-[11px] uppercase tracking-wider text-text-secondary">
                  <tr>
                    <th className="px-3 py-2">Market</th>
                    <th className="px-3 py-2">Body</th>
                    <th className="px-3 py-2 font-mono">Score</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {product.markets.map((m, i) => {
                    const c = m.score >= 80 ? "text-halal" : m.score >= 40 ? "text-verify" : "text-haram";
                    return (
                      <tr key={m.country} className={i > 0 ? "border-t border-hairline" : ""}>
                        <td className="px-3 py-2.5 text-foreground">
                          {m.flag} {m.country}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-xs text-text-secondary">
                          {m.body}
                        </td>
                        <td className={`px-3 py-2.5 font-mono ${c}`}>{m.score}%</td>
                        <td className={`px-3 py-2.5 ${c}`}>{m.status}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action items */}
          {issuesNeedingAction.length > 0 && (
            <div className="mt-6">
              <div className="font-mono text-[10px] uppercase tracking-widest text-gold">
                Ingredients requiring action
              </div>
              <ol className="mt-2 space-y-1.5">
                {issuesNeedingAction.map((ing, idx) => (
                  <li key={ing.name} className="flex gap-3 text-sm">
                    <span className="font-mono text-text-secondary">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <div className="flex-1">
                      <span className="text-foreground">{ing.name}</span>{" "}
                      <span className="text-text-secondary">— {ing.recommendation}</span>
                    </div>
                    <StatusBadge variant={ing.status} />
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Disclaimer */}
          <div className="mt-6 rounded-xl border border-verify/30 bg-verify/[0.08] p-4 text-[12px] leading-relaxed text-foreground/85">
            <div className="font-medium text-verify">⚠ Pre-Certification Notice</div>
            <p className="mt-1.5">
              This report is an AI-generated readiness assessment only. It does not
              constitute official halal certification. Final certification must be
              obtained through an accredited certification authority such as JAKIM,
              ESMA, or HFA.
            </p>
          </div>

          {/* Buttons */}
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            <button type="button" className="btn-gold inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium">
              <Download className="h-4 w-4" strokeWidth={2} />
              Download PDF
            </button>
            <button type="button" className="btn-ghost-gold inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium">
              <Share2 className="h-4 w-4" strokeWidth={2} />
              Share with Buyer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CornerOrnament({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={`h-10 w-10 text-gold/50 ${className}`} aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth="1">
        <path d="M2 2 L2 14 M2 2 L14 2" />
        <path d="M2 18 L8 18 L8 2" />
        <circle cx="2" cy="2" r="1.5" fill="currentColor" />
      </g>
    </svg>
  );
}

function QrPlaceholder() {
  // 7x7 deterministic pseudo-QR
  const cells = Array.from({ length: 49 }, (_, i) => (i * 31) % 7 < 3);
  return (
    <div className="grid h-full w-full grid-cols-7 gap-[1px]">
      {cells.map((on, i) => (
        <div key={i} className={on ? "bg-gold" : "bg-transparent"} />
      ))}
    </div>
  );
}

/* =============================================================== */
/*  SHARED FOOTER                                                    */
/* =============================================================== */

export function SiteFooter() {
  return (
    <footer className="relative mt-12 border-t border-gold/15">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <div className="font-display text-lg text-gold">
              Halal<span className="italic">IQ</span>
            </div>
            <p className="mt-3 max-w-xs text-xs leading-relaxed text-text-secondary">
              Pre-certification intelligence for halal exporters. Built for manufacturers, trusted by buyers.
            </p>
          </div>
          {[
            { title: "Modules", links: ["Certification", "Assistant", "Finance"] },
            { title: "Markets", links: ["JAKIM Malaysia", "ESMA UAE", "HFA United Kingdom", "EU Standards"] },
            { title: "Company", links: ["About", "Privacy", "Contact"] },
          ].map((col) => (
            <div key={col.title}>
              <div className="font-mono text-[10px] uppercase tracking-widest text-gold">
                {col.title}
              </div>
              <ul className="mt-3 space-y-2">
                {col.links.map((l) => (
                  <li key={l}>
                    <span className="text-xs text-foreground/80 transition-colors hover:text-gold">
                      {l}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-hairline pt-6 text-[11px] text-text-secondary md:flex-row md:items-center">
          <div>© {new Date().getFullYear()} HalalIQ. Pre-certification intelligence platform.</div>
          <div className="font-display italic">"And eat of what is lawful and good." — 2:168</div>
        </div>
      </div>
    </footer>
  );
}
