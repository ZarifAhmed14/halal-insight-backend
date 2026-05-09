import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Building2, Code, FileSearch, Globe2, Layers, Lock } from "lucide-react";
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
          "A graph-backed halal pre-certification readiness layer for manufacturers and compliance teams.",
      },
    ],
  }),
  component: EnterprisePage,
});

const ENTERPRISE_FEATURES = [
  {
    icon: Code,
    title: "Readiness API",
    description:
      "Run product scans from internal QA tools, supplier portals, or export workflows using the same analyze-food backend.",
  },
  {
    icon: Lock,
    title: "Private data flow",
    description:
      "Keep product formulas, supplier evidence, and scan history inside your Supabase project and controlled environment.",
  },
  {
    icon: Layers,
    title: "Domain-aware graph",
    description:
      "Extend Neo4j with food, cosmetics, pharmaceuticals, and export rules without rewriting the frontend.",
  },
  {
    icon: Building2,
    title: "Audit history",
    description:
      "Store product submissions and generated reports so reviewers can see what changed between scans.",
  },
];

const API_ACTIONS = [
  { label: "Analyze product", target: "/assistant" },
  { label: "Extract label image", target: "/assistant" },
  { label: "View report history", target: "/assistant" },
  { label: "Contact integration team", target: "#contact" },
];

const REGIONS = [
  { label: "Malaysia", value: 92 },
  { label: "UAE", value: 82 },
  { label: "United Kingdom", value: 68 },
  { label: "European Union", value: 58 },
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

        <div className="mt-10 flex flex-wrap gap-3">
          <a
            href="#contact"
            className="group inline-flex items-center gap-2 rounded-full border border-hairline bg-background/60 px-5 py-3 text-sm font-medium transition-colors hover:bg-background"
          >
            Talk to our team
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </a>
          <Link
            to="/assistant"
            className="inline-flex items-center gap-2 rounded-full border border-jade/25 bg-jade/10 px-5 py-3 text-sm font-medium text-jade transition-colors hover:bg-jade/15"
          >
            Open the assistant
          </Link>
        </div>

        <section className="mt-16 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <div className="rounded-[2rem] border border-hairline bg-surface p-6 shadow-elegant">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-jade">
              <Globe2 className="h-4 w-4" />
              Region visibility
            </div>
            <div className="mt-6 space-y-4">
              {REGIONS.map((region) => (
                <div key={region.label}>
                  <div className="flex items-center justify-between text-sm">
                    <span>{region.label}</span>
                    <span className="text-jade">{region.value}% modeled</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-background">
                    <div
                      className="h-full rounded-full bg-jade"
                      style={{ width: `${region.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-hairline bg-surface p-6 shadow-elegant">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-jade">
              <Layers className="h-4 w-4" />
              Graph placement
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
                Neo4j stays behind the compliance API, while the frontend shows only reviewer-ready
                ingredient findings and evidence requirements.
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

        <section className="mt-16 overflow-hidden rounded-2xl border border-hairline bg-ink shadow-elegant sm:mt-20 sm:rounded-3xl">
          <div className="flex flex-col gap-4 border-b border-hairline px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-jade">
                <FileSearch className="h-4 w-4" />
                API section
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Four demo actions for the backend integration flow
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {API_ACTIONS.map((action) =>
                action.target.startsWith("#") ? (
                  <a
                    key={action.label}
                    href={action.target}
                    className="rounded-xl border border-hairline bg-surface/60 px-3 py-2 text-center text-xs transition-colors hover:bg-surface"
                  >
                    {action.label}
                  </a>
                ) : (
                  <Link
                    key={action.label}
                    to={action.target}
                    className="rounded-xl border border-hairline bg-surface/60 px-3 py-2 text-center text-xs transition-colors hover:bg-surface"
                  >
                    {action.label}
                  </Link>
                ),
              )}
            </div>
          </div>
          <pre className="overflow-x-auto p-6 text-[13px] leading-relaxed text-foreground/85">
            {`{
  "ingredients": ["E471", "Gelatin", "Vanilla Flavor"],
  "market": "Malaysia",
  "domain": "food"
}

-> {
  "overall_status": "Not Ready",
  "summary": {
    "total_ingredients": 3,
    "blockers_count": 2,
    "warnings_count": 0
  },
  "blockers": [
    {
      "ingredient": "Gelatin",
      "risk": "Critical",
      "required_documents": ["Halal certificate", "Animal-origin statement"]
    }
  ]
}`}
          </pre>
        </section>

        <div
          id="contact"
          className="mt-16 rounded-2xl border border-hairline bg-surface p-8 text-center sm:mt-20 sm:rounded-3xl sm:p-10"
        >
          <h2 className="font-display text-2xl sm:text-3xl">
            Build a cleaner certification workflow
          </h2>
          <p className="mt-3 text-muted-foreground">
            Start with the assistant, then extend the graph with your supplier evidence and
            market-specific rules.
          </p>
          <a
            href="mailto:partners@halalintelligence.app"
            className="mt-6 inline-flex items-center gap-2 rounded-full border border-hairline bg-background/60 px-5 py-3 text-sm font-medium transition-colors hover:bg-background"
          >
            partners@halalintelligence.app
          </a>
        </div>
      </main>
      <Footer />
    </div>
  );
}
