import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";

import {
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Apple,
  Heart,
  Pill,
  Globe2,
  ArrowUpRight,
  ScanLine,
  Upload,
  Check,
  AlertTriangle,
} from "lucide-react";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { VerdictBadge } from "@/components/site/VerdictBadge";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Halal Intelligence - AI Pre-Certification for Manufacturers" },
      {
        name: "description",
        content:
          "AI-powered halal pre-certification readiness for food, cosmetics, pharmaceuticals, and export compliance workflows.",
      },
      { property: "og:title", content: "Halal Intelligence Product Readiness Platform" },
      {
        property: "og:description",
        content:
          "AI-powered halal pre-certification readiness for manufacturers entering global halal markets.",
      },
    ],
  }),
  component: LandingPage,
});

type IngredientStatus = "halal" | "verify" | "haram";
const SAMPLE_INGREDIENTS: { name: string; status: IngredientStatus; note: string }[] = [
  { name: "Soybean Oil", status: "halal", note: "Plant-based - clear for food review" },
  {
    name: "Mixed Emulsifier",
    status: "verify",
    note: "Source still needs supplier proof",
  },
  {
    name: "Collagen",
    status: "haram",
    note: "Source must be confirmed before review",
  },
];

function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[800px]"
        style={{ background: "var(--gradient-aurora)" }}
      />
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-30 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_70%)]" />

      <Nav />

      <main className="relative">
        <Hero />
        <PlatformDemo />
        <EvidenceReadinessSection />
      </main>

      <Footer />
    </div>
  );
}

/* ============================================================ HERO */
function Hero() {
  return (
    <section className="relative mx-auto max-w-7xl px-4 pt-16 pb-16 sm:px-6 sm:pt-20 sm:pb-20">
      <div
        aria-hidden
        className="font-arabic pointer-events-none absolute right-4 top-12 select-none text-[120px] leading-none text-jade/[0.06] sm:right-10 sm:top-16 sm:text-[180px] md:text-[240px]"
      >
        {"\u062d\u0644\u0627\u0644"}
      </div>

      <div className="relative grid items-center gap-10 md:grid-cols-2 md:gap-[60px]">
        {/* LEFT COLUMN */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="text-left"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-hairline bg-surface/60 px-3.5 py-1.5 text-xs text-muted-foreground backdrop-blur">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-jade animate-pulse-ring" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-jade" />
            </span>
            Evidence-first halal readiness
          </div>

          <h1 className="font-display mt-6 text-balance text-[2.6rem] font-light leading-[1.02] text-foreground sm:text-5xl md:text-6xl">
            Turn Ingredients Into{" "}
            <span className="italic text-gradient-jade">Export Opportunities</span>
          </h1>

          <p className="font-display mt-5 text-pretty text-xl italic text-jade-glow sm:text-2xl">
            AI-powered halal pre-certification readiness
          </p>

          <p className="mt-6 max-w-xl text-pretty text-[15px] leading-relaxed text-muted-foreground sm:text-base md:text-lg">
            Know which ingredients need evidence before market review. Built for Bangladeshi
            manufacturers entering global halal markets.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="/scan"
              className="group inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background transition-all hover:scale-[1.02] glow-jade"
            >
              <ScanLine className="h-4 w-4" strokeWidth={2} />
              Scan Your Product
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </a>
            <a
              href="/assistant?focus=upload"
              className="group inline-flex items-center gap-2 rounded-full border border-hairline bg-surface/60 px-5 py-3 text-sm text-foreground backdrop-blur transition-colors hover:bg-surface"
            >
              <Upload className="h-4 w-4 text-jade" strokeWidth={1.75} />
              Upload Ingredient List
            </a>
          </div>
        </motion.div>

        {/* RIGHT COLUMN - Live Analysis Preview */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
          <div
            className="glass rounded-2xl p-6 shadow-elegant backdrop-blur-xl"
            style={{
              borderColor: "color-mix(in oklab, var(--gold, #d4af37) 20%, transparent)",
              borderWidth: 1,
              borderStyle: "solid",
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Live Analysis Preview
              </span>
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-jade animate-pulse-ring" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-jade" />
              </span>
            </div>

            <div className="mt-5 space-y-3">
              <PreviewRow name="Soybean Oil" status="halal" label="HALAL" />
              <PreviewRow
                name="Mixed Emulsifier"
                status="verify"
                label="VERIFY"
                note="Source documentation required"
              />
              <PreviewRow name="Gelatin" status="haram" label="HARAM" note="Must be removed" />
            </div>

            <div className="my-5 h-px w-full bg-hairline" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function PreviewRow({
  name,
  status,
  label,
  note,
}: {
  name: string;
  status: "halal" | "verify" | "haram";
  label: string;
  note?: string;
}) {
  const tone =
    status === "halal"
      ? "border-verdict-halal/30 bg-verdict-halal/10 text-verdict-halal"
      : status === "verify"
        ? "border-verdict-mushbooh/30 bg-verdict-mushbooh/10 text-verdict-mushbooh"
        : "border-verdict-haram/30 bg-verdict-haram/10 text-verdict-haram";
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="truncate text-sm text-foreground">{name}</div>
        {note && <div className="mt-0.5 text-[11px] text-muted-foreground">{note}</div>}
      </div>
      <span
        className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold tracking-wider ${tone}`}
      >
        {label}
      </span>
    </div>
  );
}

/* ============================================================ PLATFORM DEMO */
function PlatformDemo() {
  const readyCount = SAMPLE_INGREDIENTS.filter((i) => i.status === "halal").length;
  const total = SAMPLE_INGREDIENTS.length;
  const readyPct = Math.round((readyCount / total) * 100);

  return (
    <Section eyebrow="How it works" title="Find out what to fix before certification">
      <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2 md:gap-8">
        {/* LEFT - Step 1: Enter product */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="glass rounded-3xl p-7 shadow-elegant"
        >
          <div className="text-xs font-medium uppercase tracking-widest text-jade-glow">Step 1</div>
          <h3 className="font-display mt-2 text-2xl text-foreground">Enter your product</h3>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Paste a barcode or product name. We'll do the rest
          </p>

          <div className="mt-6 rounded-2xl border border-hairline bg-background/40 px-4 py-4">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Product
            </div>
            <div className="mt-1.5 font-display text-lg text-foreground">
              Chocolate Wafer Biscuit
            </div>
          </div>

          <Link
            to="/assistant"
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-jade px-5 py-3 text-sm font-medium text-background transition-all hover:scale-[1.01] hover:bg-jade-glow"
          >
            <ScanLine className="h-4 w-4" strokeWidth={2.25} />
            Analyze Product
          </Link>
        </motion.div>

        {/* RIGHT - Step 2 + 3: Analysis and what to fix */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="glass rounded-3xl p-7 shadow-elegant"
        >
          <div className="text-xs font-medium uppercase tracking-widest text-jade-glow">
            Step 2 and 3
          </div>
          <h3 className="font-display mt-2 text-2xl text-foreground">See what needs fixing</h3>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Each ingredient gets a clear status, so you know exactly what to do next
          </p>

          {/* Simple progress bar */}
          <div className="mt-6">
            <div className="flex items-end justify-between">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                How ready you are
              </div>
              <div className="font-display text-base text-foreground">
                {readyCount} of {total} ready
              </div>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-background/60">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: `${readyPct}%` }}
                viewport={{ once: true }}
                transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
                className="h-full rounded-full bg-gradient-to-r from-jade to-jade-glow"
              />
            </div>
          </div>

          {/* Ingredient list */}
          <div className="mt-6 space-y-2.5">
            {SAMPLE_INGREDIENTS.map((ing) => (
              <IngredientRow key={ing.name} {...ing} />
            ))}
          </div>
        </motion.div>
      </div>
    </Section>
  );
}

function EvidenceReadinessSection() {
  return (
    <Section eyebrow="Evidence and country readiness" title="Build a review-ready evidence pack">
      <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-3xl border border-hairline bg-surface p-6 shadow-elegant">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            What the reviewer needs
          </div>
          <h3 className="font-display mt-2 text-2xl text-foreground">Evidence pack builder</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Each document is linked to the ingredient that triggered it, so teams know what is
            required now, what can be reviewed soon, and what to prepare before submission.
          </p>
          <div className="mt-5 space-y-2.5">
            {[
              "Required now - ingredient source proof",
              "Review soon - supplier declaration",
              "Prepare - export evidence pack",
            ].map((line) => (
              <div
                key={line}
                className="rounded-xl border border-hairline bg-background/35 px-3.5 py-2.5 text-sm text-foreground"
              >
                {line}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-hairline bg-surface p-6 shadow-elegant">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Single-country focus
          </div>
          <h3 className="font-display mt-2 text-2xl text-foreground">
            Why country selection matters
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            The same product may need different proof depending on the destination market. Halal
            Intelligence keeps one selected country at a time so your team can prepare the right
            review package without visual overload.
          </p>
          <div className="mt-5 grid gap-2">
            {[
              "Malaysia: supplier declaration and ingredient origin proof",
              "Thailand: certifier evidence and batch traceability",
              "UK: certifier-ready evidence pack",
            ].map((line) => (
              <div
                key={line}
                className="rounded-xl border border-hairline bg-background/35 px-3.5 py-2.5 text-xs leading-relaxed text-muted-foreground"
              >
                {line}
              </div>
            ))}
          </div>
          <Link
            to="/methodology"
            className="mt-5 inline-flex items-center gap-1.5 text-sm text-jade transition-colors hover:text-jade-glow"
          >
            Read the assessment methodology
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </Section>
  );
}

function IngredientRow({
  name,
  status,
  note,
}: {
  name: string;
  status: IngredientStatus;
  note: string;
}) {
  const cfg = {
    halal: {
      label: "Ready",
      color: "var(--verdict-halal)",
      Icon: Check,
    },
    verify: {
      label: "Needs Fix",
      color: "var(--safety-orange)",
      Icon: AlertTriangle,
    },
    haram: {
      label: "Not Allowed",
      color: "var(--verdict-haram)",
      Icon: AlertTriangle,
    },
  }[status];

  return (
    <div
      className="flex items-center gap-3 rounded-xl border border-hairline bg-background/40 px-3.5 py-3"
      style={{ borderLeft: `3px solid ${cfg.color}` }}
    >
      <cfg.Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} style={{ color: cfg.color }} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="truncate text-sm font-medium text-foreground">{name}</div>
          <span
            className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: cfg.color, borderColor: `${cfg.color}55` }}
          >
            {cfg.label}
          </span>
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{note}</p>
      </div>
    </div>
  );
}

/* ============================================================ HOW IT WORKS */
function HowItWorks() {
  const steps = [
    { n: "01", t: "Scan", d: "Barcode, upload, or manual entry" },
    { n: "02", t: "Extract", d: "Ingredients identified and standardized" },
    { n: "03", t: "Analyze", d: "Checked against global halal standards" },
    { n: "04", t: "Export", d: "See what to fix before certification" },
  ];
  return (
    <Section eyebrow="How it works" title="How Certification Readiness Works">
      <div className="relative">
        <div className="absolute left-0 right-0 top-5 hidden h-px bg-gradient-to-r from-transparent via-jade/30 to-transparent md:block" />
        <div className="grid gap-8 md:grid-cols-4">
          {steps.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              className="relative flex flex-col items-start"
            >
              <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border border-hairline bg-surface">
                <span className="font-mono text-xs text-jade-glow">{s.n}</span>
              </div>
              <h3 className="mt-4 font-display text-base text-foreground">{s.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  );
}

/* ============================================================ DOMAINS */
function DomainsSection() {
  const domains = [
    {
      icon: Apple,
      t: "Food & Beverages",
      d: "E-numbers - Additives - Processing aids - Flavorings",
      verdict: "mushbooh" as const,
    },
    {
      icon: Heart,
      t: "Cosmetics & Personal Care",
      d: "Ingredients - Animal derivatives - Alcohol content - Carrier agents",
      verdict: "mushbooh" as const,
      customBadge: "verify",
    },
    {
      icon: Pill,
      t: "Pharmaceuticals",
      d: "Excipients - Capsule shells - Gelatin sources - Coating agents",
      verdict: "mushbooh" as const,
    },
    {
      icon: Globe2,
      t: "Export Compliance",
      d: "Market readiness and export review support",
      verdict: "halal" as const,
    },
  ];
  return (
    <Section eyebrow="Coverage" title="Every category, every market, one readiness report">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {domains.map((d, i) => (
          <motion.div
            key={d.t}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className="group relative overflow-hidden rounded-2xl border border-hairline bg-surface p-6 transition-all hover:border-jade/30 hover:bg-surface-elevated"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground/5 text-foreground">
                <d.icon className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </div>
            <h3 className="mt-6 font-display text-xl">{d.t}</h3>
            <p className="mt-1.5 text-xs text-muted-foreground">{d.d}</p>
            <div className="mt-5">
              {d.customBadge === "verify" ? (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-verdict-mushbooh/30 bg-verdict-mushbooh/10 px-2.5 py-1 text-xs font-medium text-verdict-mushbooh">
                  <AlertTriangle className="h-3 w-3" strokeWidth={2.5} />
                  Verify
                </div>
              ) : (
                <VerdictBadge verdict={d.verdict} size="sm" />
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}

/* ============================================================ PRODUCT SHOWCASE */
function ProductShowcase() {
  return (
    <Section eyebrow="The interface" title="Designed for clarity and nuance">
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="glass rounded-3xl p-6 shadow-elegant">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Evidence checklist
              </div>
              <h3 className="mt-1 font-display text-lg">What the reviewer needs next</h3>
            </div>
            <VerdictBadge verdict="mushbooh" size="sm" />
          </div>
          <div className="mt-6 space-y-3">
            {[
              {
                school: "Ingredient source",
                pos: "Supplier declaration needed",
                lean: 42,
                color: "verdict-mushbooh",
              },
              {
                school: "Animal-origin proof",
                pos: "Required for gelatin/collagen",
                lean: 28,
                color: "verdict-haram",
              },
              {
                school: "Market checklist",
                pos: "Certifier or export authority review",
                lean: 64,
                color: "verdict-mushbooh",
              },
              {
                school: "Final report",
                pos: "Saved to report history",
                lean: 86,
                color: "verdict-halal",
              },
            ].map((s) => (
              <div
                key={s.school}
                className="rounded-xl border border-hairline bg-background/30 p-3.5"
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">{s.school}</span>
                  <span className="text-xs text-muted-foreground">{s.pos}</span>
                </div>
                <div className="mt-3 h-1 overflow-hidden rounded-full bg-foreground/10">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${s.lean}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full"
                    style={{ background: `var(--${s.color})` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-hairline bg-surface p-6">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Confidence signal
            </div>
            <div className="mt-4 flex items-end gap-3">
              <div className="font-display text-5xl text-foreground">86</div>
              <div className="mb-1.5 text-sm text-muted-foreground">/ 100</div>
            </div>
            <div className="mt-5 grid grid-cols-12 gap-1">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-8 rounded-sm ${
                    i < 10 ? "bg-jade/80" : i < 11 ? "bg-jade/30" : "bg-foreground/5"
                  }`}
                />
              ))}
            </div>
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              Confidence reflects extraction quality, rule coverage, and whether evidence is still
              missing
            </p>
          </div>

          <div className="rounded-3xl border border-hairline bg-surface p-6">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Review-first path
            </div>
            <p className="mt-3 text-sm leading-relaxed text-foreground/85">
              When data is incomplete, Halal Intelligence marks the item as "Needs Review" instead
              of giving a false low-risk result
            </p>
            <div className="mt-4 inline-flex items-center gap-2 text-xs text-jade">
              <ShieldCheck className="h-3.5 w-3.5" />
              Review-first decision applied
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ============================================================ FINAL CTA */
function FinalCTA() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-32">
      <div className="relative overflow-hidden rounded-[1.5rem] border border-jade/20 bg-gradient-to-br from-surface via-background to-surface p-8 text-center sm:rounded-[2rem] sm:p-12 md:p-20">
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "var(--gradient-aurora)" }}
        />
        <div className="relative mx-auto max-w-2xl">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-hairline bg-surface/60 px-3.5 py-1.5 text-xs text-muted-foreground backdrop-blur">
            <Sparkles className="h-3 w-3 text-jade" />
            Built for the next billion decisions
          </div>
          <h2 className="font-display mt-6 text-balance text-4xl font-light leading-[1.05] sm:text-5xl md:text-6xl">
            Make every choice with <span className="italic text-gradient-jade">conviction</span>
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-pretty text-muted-foreground">
            Halal Intelligence helps manufacturers turn ingredient lists, label photos, and market
            rules into a clear pre-certification readiness report
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/assistant"
              className="group inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3.5 text-sm font-medium text-background transition-all hover:scale-[1.02] glow-jade"
            >
              Open the assistant
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              to="/methodology"
              className="inline-flex items-center gap-2 rounded-full border border-hairline bg-surface/60 px-6 py-3.5 text-sm backdrop-blur transition-colors hover:bg-surface"
            >
              Read the method
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================ Section helper */
function Section({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 md:py-32">
      <div className="mx-auto mb-10 max-w-2xl text-center sm:mb-14">
        <div className="text-xs uppercase tracking-widest text-jade">{eyebrow}</div>
        <h2 className="font-display mt-4 text-balance text-3xl font-light leading-[1.1] sm:text-4xl md:text-5xl">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}
