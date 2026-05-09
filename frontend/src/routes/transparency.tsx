import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  BookOpen,
  Database,
  FileSearch,
  GitBranch,
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
          "How Halal Intelligence validates inputs, normalizes ingredients, queries a compliance graph, and produces audit-friendly halal readiness reports.",
      },
      { property: "og:title", content: "Halal Intelligence Transparency & Methodology" },
      {
        property: "og:description",
        content:
          "A clear look at Halal Intelligence's graph-based halal pre-certification readiness workflow.",
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
    title: "Validation",
    description:
      "The Edge Function rejects unsafe or incomplete requests before any graph query or database write happens.",
  },
  {
    icon: GitBranch,
    title: "Knowledge graph",
    description:
      "Neo4j connects ingredients to risk levels, affected markets, domains, and required evidence documents.",
  },
  {
    icon: Layers,
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
    icon: Database,
    title: "Auditable history",
    description:
      "Each scan can be stored with its product, ingredients, market, report JSON, and previous submission history.",
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
      </main>
      <Footer />
    </div>
  );
}
