import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  ClipboardCheck,
  FileSearch,
  ListChecks,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { Footer } from "@/components/site/Footer";
import { Nav } from "@/components/site/Nav";

export const Route = createFileRoute("/how-ai-works")({
  head: () => ({
    meta: [
      { title: "How AI Works - Halal Intelligence" },
      {
        name: "description",
        content:
          "A simple explanation of why Halal Intelligence uses AI and how it helps manufacturers prepare for halal export review.",
      },
      { property: "og:title", content: "How AI Works - Halal Intelligence" },
      {
        property: "og:description",
        content:
          "How AI turns messy ingredient information into clear halal readiness steps for SME manufacturers.",
      },
    ],
  }),
  component: HowAiWorksPage,
});

const WHY_AI = [
  {
    title: "Ingredient labels are messy",
    description:
      "A label photo, spreadsheet, QR code, or pasted list can all look different. AI helps turn that messy input into a cleaner ingredient list for review.",
  },
  {
    title: "Some risks depend on source",
    description:
      "Gelatin, collagen, enzymes, glycerin, shellac, and flavors are not always simple yes-or-no items. AI helps flag where the source needs proof.",
  },
  {
    title: "SMEs need next steps",
    description:
      "Manufacturers do not only need a status. They need to know which supplier evidence to collect and what to fix before approaching a certifier.",
  },
] as const;

const AI_STEPS = [
  {
    icon: FileSearch,
    title: "Reads product information",
    description:
      "The software can start from a label image, file, code scan, or manual ingredient entry.",
  },
  {
    icon: ListChecks,
    title: "Organises the ingredients",
    description:
      "It cleans the list and separates clear ingredients from items that need source confirmation.",
  },
  {
    icon: ShieldCheck,
    title: "Finds readiness signals",
    description:
      "It highlights clear blockers, review items, and lower-risk ingredients using halal-aware screening logic.",
  },
  {
    icon: ClipboardCheck,
    title: "Builds the action plan",
    description:
      "It turns the result into required documents, evidence gaps, replacement suggestions, and a readiness brief.",
  },
] as const;

const LIMITS = [
  "It does not issue a final halal certificate.",
  "It does not replace a scholar, certifier, regulator, or legal authority.",
  "When the source is unclear, it marks the item as Needs Review instead of guessing.",
] as const;

function HowAiWorksPage() {
  return (
    <div className="min-h-screen bg-background">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[620px]"
        style={{ background: "var(--gradient-aurora)" }}
      />
      <Nav />
      <main className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <section className="max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-hairline bg-surface px-3 py-1.5 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-jade" />
            Simple AI explanation
          </div>
          <h1 className="font-display mt-5 text-balance text-4xl font-light leading-[1.06] sm:text-5xl md:text-6xl">
            Why Halal Intelligence <span className="italic text-gradient-jade">needs AI</span>
          </h1>
          <p className="mt-6 max-w-2xl text-pretty leading-relaxed text-muted-foreground">
            Halal export preparation is not just a halal or haram label. A manufacturer needs to
            understand ingredient risk, missing supplier proof, and what to prepare before formal
            review. AI helps turn unclear product information into a clear business action plan.
          </p>
        </section>

        <section className="mt-12 grid gap-4 lg:grid-cols-3">
          {WHY_AI.map((item) => (
            <div key={item.title} className="rounded-2xl border border-hairline bg-surface p-6">
              <h2 className="font-display text-xl text-foreground">{item.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {item.description}
              </p>
            </div>
          ))}
        </section>

        <section className="mt-14 sm:mt-20">
          <div className="max-w-2xl">
            <div className="text-xs uppercase tracking-widest text-jade">
              What the AI helps with
            </div>
            <h2 className="font-display mt-3 text-3xl text-foreground">
              From product input to review-ready steps
            </h2>
          </div>
          <div className="mt-7 grid gap-px overflow-hidden rounded-2xl border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-4">
            {AI_STEPS.map((step) => (
              <div key={step.title} className="bg-surface p-5 sm:p-6">
                <step.icon className="h-5 w-5 text-jade" strokeWidth={1.5} />
                <h3 className="font-display mt-4 text-lg">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14 grid gap-6 lg:grid-cols-[0.9fr_1.1fr] sm:mt-20">
          <div>
            <div className="text-xs uppercase tracking-widest text-jade">Why this matters</div>
            <h2 className="font-display mt-3 text-3xl text-foreground">
              The value is preparation, not pretending to certify
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Without AI, a small manufacturer may spend hours reading ingredient lists, searching
              unfamiliar names, and guessing which document is needed. Halal Intelligence shortens
              that first review and gives the team a clearer path before they submit anything.
            </p>
          </div>
          <div className="rounded-2xl border border-hairline bg-surface p-5 sm:p-6">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-jade">
              <AlertTriangle className="h-4 w-4" />
              What AI does not do
            </div>
            <ul className="mt-5 space-y-4">
              {LIMITS.map((limit) => (
                <li
                  key={limit}
                  className="flex gap-3 text-sm leading-relaxed text-muted-foreground"
                >
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                  <span>{limit}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mt-14 rounded-2xl border border-jade/20 bg-jade/5 p-6 sm:mt-20 sm:p-7">
          <div className="text-xs uppercase tracking-widest text-jade">In one sentence</div>
          <p className="font-display mt-3 max-w-4xl text-2xl leading-relaxed text-foreground sm:text-3xl">
            The AI helps manufacturers move from uncertain ingredient information to a practical
            halal export-readiness plan that a human reviewer can check.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
