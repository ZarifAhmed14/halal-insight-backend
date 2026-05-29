import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowUpRight,
  BookOpen,
  Building2,
  ClipboardCheck,
  FileSearch,
  Layers,
  Lock,
  ShieldCheck,
} from "lucide-react";

import { Footer } from "@/components/site/Footer";
import { Nav } from "@/components/site/Nav";

export const Route = createFileRoute("/methodology")({
  head: () => ({
    meta: [
      { title: "Methodology - Halal Intelligence" },
      {
        name: "description",
        content:
          "The Islamic grounding, screening method, and evidence boundaries behind Halal Intelligence readiness reports.",
      },
      { property: "og:title", content: "Methodology - Halal Intelligence" },
      {
        property: "og:description",
        content:
          "How Halal Intelligence separates clear blockers, items needing review, and evidence-ready findings.",
      },
    ],
  }),
  component: MethodologyPage,
});

const SCREENING_STEPS = [
  {
    icon: FileSearch,
    title: "Confirm the input",
    description:
      "A user reviews ingredients captured from a label, file, or code scan before an assessment is created.",
  },
  {
    icon: ShieldCheck,
    title: "Identify clear blockers",
    description:
      "Direct references to pork, intoxicants, blood, carrion, or unverified slaughtered meat are marked Not Ready.",
  },
  {
    icon: BookOpen,
    title: "Escalate uncertain sources",
    description:
      "Ingredients such as gelatin, collagen, enzymes, glycerin, or shellac remain Needs Review when their source matters.",
  },
  {
    icon: ClipboardCheck,
    title: "Prepare evidence",
    description:
      "The selected country shapes which supplier documents and export-readiness proof should be gathered next.",
  },
] as const;

const DECISION_LEVELS = [
  {
    title: "Not Ready",
    tone: "border-verdict-haram/30 bg-verdict-haram/10 text-verdict-haram",
    description:
      "At least one clear blocker is found. The formula must be corrected or formally evidenced before proceeding.",
  },
  {
    title: "Needs Review",
    tone: "border-verdict-mushbooh/30 bg-verdict-mushbooh/10 text-verdict-mushbooh",
    description:
      "No direct blocker is confirmed, but ingredient source or supplier evidence is still missing.",
  },
  {
    title: "Low Risk",
    tone: "border-verdict-halal/30 bg-verdict-halal/10 text-verdict-halal",
    description:
      "No blocker is identified from the reviewed ingredient list and the evidence path is ready for submission preparation.",
  },
] as const;

const CLEAR_BLOCKERS = [
  "Pork, swine, ham, bacon, lard, and porcine derivatives",
  "Alcohol intended for consumption, wine, beer, or spirits",
  "Flowing blood, carrion, and explicitly non-halal slaughtered meat",
] as const;

const SOURCE_REVIEW = [
  "Gelatin, collagen, capsule shells, rennet, and enzymes",
  "Glycerin, stearic acid, mono- and diglycerides",
  "Carmine, shellac, natural flavors, and alcohol-carried flavorings",
] as const;

const WORKSPACE_FEATURES = [
  {
    icon: ClipboardCheck,
    title: "Readiness checks",
    description: "Product, QA, and export teams use one review flow for ingredients and evidence.",
  },
  {
    icon: Layers,
    title: "Domain coverage",
    description:
      "Food is strongest today, with cosmetics and pharma prepared through the same flow.",
  },
  {
    icon: Lock,
    title: "Private records",
    description: "Reports and supplier evidence can be kept together for later review.",
  },
  {
    icon: Building2,
    title: "Progress history",
    description: "Rescans show what changed, what improved, and what still needs action.",
  },
] as const;

function MethodologyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[620px]"
        style={{ background: "var(--gradient-aurora)" }}
      />
      <Nav />
      <main className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="text-xs uppercase tracking-widest text-jade">Methodology</div>
        <h1 className="font-display mt-4 max-w-4xl text-balance text-4xl font-light leading-[1.06] sm:text-5xl md:text-6xl">
          A careful path from ingredients to{" "}
          <span className="italic text-gradient-jade">readiness evidence</span>
        </h1>
        <p className="mt-6 max-w-2xl text-pretty leading-relaxed text-muted-foreground">
          Halal Intelligence helps manufacturers identify clear risks and uncertain sources before
          formal certification review. It supports preparation; it does not issue a religious ruling
          or replace an authorised certifier.
        </p>

        <section className="mt-12 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-hairline bg-surface p-6 sm:p-7">
            <div className="text-xs uppercase tracking-widest text-jade">Qur'anic basis</div>
            <blockquote className="font-display mt-4 text-xl leading-relaxed text-foreground sm:text-2xl">
              "He has only forbidden you to eat carrion, blood, swine, and what is slaughtered in
              the name of any other than Allah."
            </blockquote>
            <p className="mt-4 text-sm text-muted-foreground">Qur'an, Al-Baqarah 2:173</p>
            <a
              href="https://quran.com/2/173"
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex items-center gap-1.5 text-sm text-jade hover:text-jade-glow"
            >
              Read source
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>

          <div className="rounded-2xl border border-hairline bg-surface p-6 sm:p-7">
            <div className="text-xs uppercase tracking-widest text-jade">Review principle</div>
            <blockquote className="font-display mt-4 text-xl leading-relaxed text-foreground sm:text-2xl">
              "The lawful is clear and the unlawful is clear, and between that are matters that are
              doubtful."
            </blockquote>
            <p className="mt-4 text-sm text-muted-foreground">
              Jami` at-Tirmidhi 1205, narrated by An-Nu'man bin Bashir
            </p>
            <a
              href="https://sunnah.com/tirmidhi:1205"
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex items-center gap-1.5 text-sm text-jade hover:text-jade-glow"
            >
              Read source
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </section>

        <section className="mt-14 sm:mt-20">
          <div className="max-w-2xl">
            <div className="text-xs uppercase tracking-widest text-jade">Screening method</div>
            <h2 className="font-display mt-3 text-3xl text-foreground">
              How the readiness decision is formed
            </h2>
          </div>
          <div className="mt-7 grid gap-px overflow-hidden rounded-2xl border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-4">
            {SCREENING_STEPS.map((step) => (
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
            <div className="text-xs uppercase tracking-widest text-jade">Decision levels</div>
            <h2 className="font-display mt-3 text-3xl text-foreground">
              A readiness status, not a fatwa
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              The result describes what a manufacturer should do next. Confidence reflects available
              ingredient and evidence coverage, not religious certainty.
            </p>
          </div>
          <div className="space-y-3">
            {DECISION_LEVELS.map((level) => (
              <div key={level.title} className="rounded-2xl border border-hairline bg-surface p-4">
                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${level.tone}`}
                >
                  {level.title}
                </span>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {level.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14 sm:mt-20">
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <div className="text-xs uppercase tracking-widest text-jade">
                Manufacturer workflow
              </div>
              <h2 className="font-display mt-3 text-3xl text-foreground">
                How teams use the readiness report
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                The same method supports product, supplier, QA, and export preparation. A team
                starts with ingredients, sees what needs proof, then gathers the documents needed
                before formal review.
              </p>
            </div>
            <div className="rounded-2xl border border-hairline bg-surface p-5 sm:p-6">
              <div className="grid gap-3 sm:grid-cols-2">
                {WORKSPACE_FEATURES.map((feature) => (
                  <div
                    key={feature.title}
                    className="rounded-xl border border-hairline bg-background/35 p-4"
                  >
                    <feature.icon className="h-4 w-4 text-jade" strokeWidth={1.5} />
                    <h3 className="mt-3 text-sm font-medium text-foreground">{feature.title}</h3>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-14 sm:mt-20">
          <div className="mb-6 max-w-2xl">
            <div className="text-xs uppercase tracking-widest text-jade">Ingredient coverage</div>
            <h2 className="font-display mt-3 text-3xl text-foreground">
              What the system looks for
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              The review separates direct blockers from ingredients where the source must be
              confirmed. This keeps the report useful without pretending every uncertain ingredient
              has a final answer.
            </p>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <IngredientGroup title="Clear blockers" items={CLEAR_BLOCKERS} />
            <IngredientGroup title="Source verification required" items={SOURCE_REVIEW} />
          </div>
          <div className="mt-5 rounded-2xl border border-jade/20 bg-jade/5 p-5 text-sm leading-relaxed text-muted-foreground">
            Product ingredients, processing aids, supplier documents, and certifier policy can
            affect final review. Halal Intelligence provides an Export Readiness Certificate only as
            a preparation document for products assessed as Low Risk.
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function IngredientGroup({ title, items }: { title: string; items: readonly string[] }) {
  return (
    <div className="rounded-2xl border border-hairline bg-surface p-5 sm:p-6">
      <h3 className="font-display text-xl text-foreground">{title}</h3>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-jade" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
