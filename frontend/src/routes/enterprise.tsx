import { createFileRoute } from "@tanstack/react-router";
import { Building2, ClipboardCheck, Layers, Lock } from "lucide-react";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/enterprise")({
  head: () => ({
    meta: [
      { title: "Enterprise - Halal Intelligence Platform" },
      {
        name: "description",
        content:
          "Embed Halal Intelligence product readiness checks into manufacturing, QA, certification, and export compliance workflows.",
      },
      { property: "og:title", content: "Enterprise - Halal Intelligence" },
      {
        property: "og:description",
        content:
          "A guided halal pre-certification readiness layer for manufacturers and compliance teams.",
      },
    ],
  }),
  component: EnterprisePage,
});

const ENTERPRISE_FEATURES = [
  {
    icon: ClipboardCheck,
    title: "Readiness checks",
    description:
      "Check product formulas from QA, supplier, or export workflows using one consistent review process.",
  },
  {
    icon: Lock,
    title: "Private product records",
    description:
      "Keep product formulas, supplier evidence, and scan history in a controlled workspace for your team.",
  },
  {
    icon: Layers,
    title: "Domain-aware rules",
    description:
      "Review food today, then expand the same workflow to cosmetics, pharmaceuticals, and export readiness.",
  },
  {
    icon: Building2,
    title: "Audit history",
    description:
      "Store product submissions and generated reports so reviewers can see what changed between scans.",
  },
];

const DOMAINS = ["Food", "Cosmetics", "Export", "Pharma"];

function EnterprisePage() {
  return (
    <div className="min-h-screen bg-background">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[600px]"
        style={{ background: "var(--gradient-aurora)" }}
      />
      <Nav />
      <main className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="text-xs uppercase tracking-widest text-jade">Enterprise</div>
        <h1 className="font-display mt-4 max-w-3xl text-balance text-4xl font-light leading-[1.05] sm:text-5xl md:text-6xl">
          A halal readiness layer for{" "}
          <span className="italic text-gradient-jade">manufacturing teams</span>
        </h1>
        <p className="mt-6 max-w-2xl text-pretty text-muted-foreground">
          Halal Intelligence helps product, QA, and export teams identify blockers before formal
          certification review. The platform turns ingredients, markets, domains, and evidence
          requirements into a structured readiness report.
        </p>
        <section className="mt-16 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <div className="rounded-[2rem] border border-hairline bg-surface p-6 shadow-elegant">
            <div className="text-xs font-medium uppercase tracking-widest text-jade">
              Team workflow
            </div>
            <div className="mt-6 space-y-4">
              {[
                {
                  title: "Start from product formulas",
                  description:
                    "Product and QA teams submit ingredients, target country, and product domain in one review flow.",
                },
                {
                  title: "Collect the right evidence next",
                  description:
                    "Supplier and compliance teams get a clear checklist of proof to gather before formal submission.",
                },
                {
                  title: "Track progress between scans",
                  description:
                    "Every rescan shows what improved and what still needs action, so teams move faster with less confusion.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-hairline bg-background/40 p-4"
                >
                  <div className="text-sm text-foreground">{item.title}</div>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-hairline bg-surface p-6 shadow-elegant">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-jade">
              <Layers className="h-4 w-4" />
              Review logic
            </div>
            <div className="mt-6 rounded-2xl border border-hairline bg-background/40 p-5">
              <div className="flex items-center justify-between">
                <span className="rounded-full border border-jade/25 bg-jade/10 px-3 py-1 text-xs text-jade">
                  Ingredient
                </span>
                <span className="h-px flex-1 bg-hairline" />
                <span className="rounded-full border border-verdict-mushbooh/25 bg-verdict-mushbooh/10 px-3 py-1 text-xs text-verdict-mushbooh">
                  Risk
                </span>
                <span className="h-px flex-1 bg-hairline" />
                <span className="rounded-full border border-hairline bg-surface px-3 py-1 text-xs">
                  Evidence
                </span>
              </div>
              <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
                The system turns ingredients into clear risk findings, required evidence, and
                reviewer-ready next steps.
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {DOMAINS.map((domain, index) => (
                <span
                  key={domain}
                  className={`rounded-full border px-3 py-1 text-xs ${
                    index === 0
                      ? "border-jade/30 bg-jade/10 text-jade"
                      : "border-hairline bg-background/50 text-muted-foreground"
                  }`}
                >
                  {index + 1}. {domain}
                </span>
              ))}
            </div>
          </div>
        </section>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {ENTERPRISE_FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-hairline bg-surface p-5 sm:rounded-3xl sm:p-7"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-jade/10 text-jade">
                <feature.icon className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <h3 className="mt-5 font-display text-xl">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
