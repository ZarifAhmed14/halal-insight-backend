import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Code, Lock, Layers, Building2 } from "lucide-react";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/enterprise")({
  head: () => ({
    meta: [
      { title: "Enterprise — Halal Intelligence Platform" },
      {
        name: "description",
        content:
          "Embed halal-aware intelligence into banking, fintech, e-commerce, healthcare, and compliance workflows.",
      },
      { property: "og:title", content: "Enterprise — Halal Intelligence" },
      {
        property: "og:description",
        content: "A halal-aware intelligence layer for institutional products and workflows.",
      },
    ],
  }),
  component: EnterprisePage,
});

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
          A halal-aware intelligence layer for{" "}
          <span className="italic text-gradient-jade">your institution.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-pretty text-muted-foreground">
          Integrate scholarly-grade reasoning into screening, support, certification, and product
          flows — on your infrastructure, with full audit logs.
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          <a
            href="#contact"
            className="group inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background transition-all hover:scale-[1.02] glow-jade"
          >
            Talk to our team
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </a>
          <a
            href="#"
            className="inline-flex items-center gap-2 rounded-full border border-hairline bg-surface/60 px-5 py-3 text-sm backdrop-blur transition-colors hover:bg-surface"
          >
            Read the API docs
          </a>
        </div>

        <div className="mt-16 grid gap-4 sm:gap-6 md:grid-cols-2 sm:mt-20">
          {[
            { icon: Code, t: "Drop-in API", d: "REST + streaming. Returns verdict, confidence, sources, and reasoning trace." },
            { icon: Lock, t: "On-prem deployment", d: "Run the full stack inside your VPC or on a managed Islamic-banking environment." },
            { icon: Layers, t: "BYO knowledge", d: "Augment our corpus with your internal fatāwā or compliance manuals." },
            { icon: Building2, t: "Audit & governance", d: "Every query logged with reasoning trace for regulator review." },
          ].map((f) => (
            <div key={f.t} className="rounded-2xl border border-hairline bg-surface p-5 sm:rounded-3xl sm:p-7">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-jade/10 text-jade">
                <f.icon className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <h3 className="mt-5 font-display text-xl">{f.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>

        {/* Code sample */}
        <div className="mt-16 overflow-hidden rounded-2xl border border-hairline bg-ink shadow-elegant sm:mt-20 sm:rounded-3xl">
          <div className="flex items-center justify-between border-b border-hairline px-5 py-3">
            <div className="flex gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
              <div className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
              <div className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
            </div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              POST /v1/verdict
            </div>
          </div>
          <pre className="overflow-x-auto p-6 text-[13px] leading-relaxed text-foreground/85">
{`{
  "query": "Is staking ETH halal?",
  "context": { "domain": "finance", "jurisdiction": "global" },
  "options": { "include_opinions": true, "safer_path": true }
}

→ {
  "verdict": "ikhtilaf",
  "confidence": 0.74,
  "summary": "Contemporary scholars differ on staking rewards…",
  "opinions": [ … 3 schools … ],
  "sources": [ … 5 citations … ],
  "reasoning_trace": [ … 6 steps … ],
  "safer_path": "Use non-staking custody until consensus matures."
}`}
          </pre>
        </div>

        <div id="contact" className="mt-16 rounded-2xl border border-hairline bg-surface p-8 text-center sm:mt-20 sm:rounded-3xl sm:p-10">
          <h2 className="font-display text-2xl sm:text-3xl">Let's build something trustworthy.</h2>
          <p className="mt-3 text-muted-foreground">
            We work with banks, fintechs, marketplaces, and certifiers worldwide.
          </p>
          <a
            href="mailto:partners@halal-intelligence.com"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background"
          >
            partners@halal-intelligence.com
          </a>
        </div>
      </main>
      <Footer />
    </div>
  );
}
