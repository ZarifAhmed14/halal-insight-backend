import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  BookOpen,
  FileSearch,
  History,
  Layers,
  ShieldCheck,
} from "lucide-react";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/transparency")({
  head: () => ({
    meta: [
      { title: "Transparency & Methodology - Halal Intelligence" },
      {
        name: "description",
        content:
          "How Halal Intelligence reviews ingredients, checks market requirements, and produces audit-friendly halal readiness reports.",
      },
      { property: "og:title", content: "Halal Intelligence Transparency & Methodology" },
      {
        property: "og:description",
        content:
          "A clear look at Halal Intelligence's halal pre-certification readiness workflow.",
      },
    ],
  }),
  component: TransparencyPage,
});

const ARCHITECTURE_STEPS = [
  {
    icon: FileSearch,
    title: "Input review",
    description:
      "Users provide a market, domain, and ingredients. Label-photo OCR is review-first so users can correct extraction mistakes before scanning.",
  },
  {
    icon: ShieldCheck,
    title: "Quality check",
    description:
      "The system rejects incomplete product details before producing a readiness report.",
  },
  {
    icon: Layers,
    title: "Compliance knowledge",
    description:
      "Ingredients are matched with risk levels, target markets, product categories, and required evidence documents.",
  },
  {
    icon: History,
    title: "Readiness report",
    description:
      "Halal Intelligence groups findings into blockers, warnings, and low-risk items, then saves the report for audit history.",
  },
];

const SAFETY_PRINCIPLES = [
  {
    icon: AlertTriangle,
    title: "Pre-certification, not a final fatwa",
    description:
      "Halal Intelligence flags readiness risks and required evidence. Final certification remains with qualified halal authorities.",
  },
  {
    icon: ShieldCheck,
    title: "Review before automation",
    description:
      "OCR and image extraction are treated as assistive signals. Users review extracted ingredients before analysis.",
  },
  {
    icon: BookOpen,
    title: "Evidence-first output",
    description:
      "Risk findings include reasoning and document requirements so manufacturers know what to fix or prove.",
  },
  {
    icon: History,
    title: "Auditable history",
    description:
      "Each scan can be stored with its product, ingredients, market, final report, and previous submission history.",
  },
];

const COUNTRY_REASONING = [
  {
    title: "Markets ask for different evidence",
    description:
      "The same ingredient can trigger different document expectations depending on where a product is being reviewed or exported.",
  },
  {
    title: "Export readiness is not one-size-fits-all",
    description:
      "Country selection helps Halal Intelligence show the right review summary, evidence pack, and readiness checklist for that destination.",
  },
  {
    title: "Judges should see market-aware compliance",
    description:
      "Using countries makes the product feel closer to real manufacturer workflows, where teams prepare differently for Malaysia, UAE, or UK review.",
  },
];

function TransparencyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[600px]"
        style={{ background: "var(--gradient-aurora)" }}
      />
      <Nav />
      <main className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="text-xs uppercase tracking-widest text-jade">Transparency</div>
        <h1 className="font-display mt-4 max-w-3xl text-balance text-4xl font-light leading-[1.05] sm:text-5xl md:text-6xl">
          Built to show the{" "}
          <span className="italic text-gradient-jade">reason behind every risk.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-pretty text-muted-foreground">
          Halal Intelligence is a B2B pre-certification readiness platform. It does not replace
          halal authorities. It helps manufacturers find ingredient, market, and evidence gaps
          before applying for certification.
        </p>

        <div className="mt-12 grid gap-px overflow-hidden rounded-3xl border border-hairline bg-hairline sm:mt-16 sm:grid-cols-2 md:grid-cols-4">
          {ARCHITECTURE_STEPS.map((step) => (
            <div key={step.title} className="bg-surface p-6">
              <step.icon className="h-5 w-5 text-jade" strokeWidth={1.5} />
              <h3 className="mt-4 font-display text-lg">{step.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </div>
          ))}
        </div>

        <section id="safety" className="mt-16 sm:mt-24">
          <h2 className="font-display text-2xl sm:text-3xl">Safety principles</h2>
          <div className="mt-6 space-y-px overflow-hidden rounded-2xl border border-hairline bg-hairline">
            {SAFETY_PRINCIPLES.map((principle) => (
              <div key={principle.title} className="flex items-start gap-5 bg-surface p-6">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-jade/10 text-jade">
                  <principle.icon className="h-5 w-5" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="font-display text-lg">{principle.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{principle.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16 sm:mt-24">
          <h2 className="font-display text-2xl sm:text-3xl">Why countries matter</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {COUNTRY_REASONING.map((item) => (
              <div key={item.title} className="rounded-2xl border border-hairline bg-surface p-6">
                <h3 className="font-display text-lg">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
