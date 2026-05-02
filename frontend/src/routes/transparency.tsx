import { createFileRoute } from "@tanstack/react-router";
import { Database, BookOpen, GitBranch, ShieldCheck, Layers, FileText } from "lucide-react";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/transparency")({
  head: () => ({
    meta: [
      { title: "Transparency & Methodology — Halal Intelligence" },
      {
        name: "description",
        content:
          "How Halal Intelligence retrieves, reasons, and cites — methodology, sources, and the scholarly council.",
      },
      { property: "og:title", content: "Transparency & Methodology" },
      {
        property: "og:description",
        content: "Source-backed architecture, methodology, and the trust layer behind every answer.",
      },
    ],
  }),
  component: TransparencyPage,
});

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
          Every answer carries its{" "}
          <span className="italic text-gradient-jade">chain of evidence.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-pretty text-muted-foreground">
          We do not summarize the internet. We retrieve from a curated, scholar-reviewed corpus —
          and we show our work.
        </p>

        {/* Architecture diagram */}
        <div className="mt-12 grid gap-px overflow-hidden rounded-3xl border border-hairline bg-hairline sm:mt-16 sm:grid-cols-2 md:grid-cols-4">
          {[
            { icon: BookOpen, t: "Knowledge corpus", d: "12,400+ verified rulings, primary texts, and contemporary fatāwā." },
            { icon: Database, t: "Retrieval", d: "Semantic + symbolic search across categorized principles." },
            { icon: Layers, t: "Reasoning", d: "Halal-trained model weighs principles, context, and ikhtilāf." },
            { icon: FileText, t: "Citation", d: "Inline references, excerpts, and links to original sources." },
          ].map((s) => (
            <div key={s.t} className="bg-surface p-6">
              <s.icon className="h-5 w-5 text-jade" strokeWidth={1.5} />
              <h3 className="mt-4 font-display text-lg">{s.t}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>

        {/* Source categories */}
        <section className="mt-16 sm:mt-24">
          <h2 className="font-display text-2xl sm:text-3xl">Source categories</h2>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {[
              { t: "Primary texts", d: "Qur'an, ḥadīth collections (Bukhārī, Muslim, Sunan), with established chains." },
              { t: "Classical fiqh", d: "Hanafī, Mālikī, Shāfiʿī, Ḥanbalī authoritative manuals." },
              { t: "Contemporary fatāwā", d: "AAOIFI, ECFR, Fiqh Academy of OIC, individual senior scholars." },
              { t: "Domain standards", d: "Halal certification bodies, Islamic finance methodologies, medical fiqh." },
            ].map((s) => (
              <div key={s.t} className="rounded-2xl border border-hairline bg-surface p-5">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <BookOpen className="h-4 w-4 text-jade" />
                  {s.t}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Principles */}
        <section className="mt-16 sm:mt-24">
          <h2 className="font-display text-2xl sm:text-3xl">Operating principles</h2>
          <div className="mt-6 space-y-px overflow-hidden rounded-2xl border border-hairline bg-hairline">
            {[
              { icon: GitBranch, t: "Honor disagreement", d: "When scholars differ, we surface multiple positions rather than collapse them." },
              { icon: ShieldCheck, t: "Default to caution", d: "When evidence is mixed, we recommend the safer path explicitly." },
              { icon: BookOpen, t: "Cite or stay silent", d: "If we cannot cite a source, we do not assert a verdict." },
              { icon: Database, t: "Audit everything", d: "Every retrieval, every reasoning step, fully inspectable." },
            ].map((p) => (
              <div key={p.t} className="flex items-start gap-5 bg-surface p-6">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-jade/10 text-jade">
                  <p.icon className="h-5 w-5" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="font-display text-lg">{p.t}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{p.d}</p>
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
