import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUp,
  Sparkles,
  BookOpen,
  Plus,
  MessageSquare,
  Wallet,
  Apple,
  Heart,
  Building2,
  ShieldCheck,
  ChevronRight,
  Copy,
  Bookmark,
  GitBranch,
} from "lucide-react";
import { Nav } from "@/components/site/Nav";
import { VerdictBadge } from "@/components/site/VerdictBadge";

export const Route = createFileRoute("/assistant")({
  head: () => ({
    meta: [
      { title: "Assistant — Halal Intelligence Platform" },
      {
        name: "description",
        content:
          "Ask any halal question. Get an evidence-grounded, source-cited answer with scholarly comparisons.",
      },
      { property: "og:title", content: "Assistant — Halal Intelligence" },
      {
        property: "og:description",
        content: "Evidence-first answers with transparent reasoning and scholarly comparison.",
      },
    ],
  }),
  component: AssistantPage,
});

const SUGGESTIONS = [
  { icon: Wallet, text: "Is investing in a S&P 500 ETF halal?" },
  { icon: Apple, text: "Is the additive E471 halal?" },
  { icon: Heart, text: "Are gelatin capsules in medication permissible?" },
  { icon: Building2, text: "How do I screen a private startup for shariah compliance?" },
];

const HISTORY = [
  "Mortgage alternatives in the UK",
  "Crypto staking rulings",
  "E-numbers in chocolate",
  "Vanilla extract & alcohol traces",
  "Music in advertising",
];

function AssistantPage() {
  const [submitted, setSubmitted] = useState(false);
  const [tab, setTab] = useState<"answer" | "sources" | "opinions" | "trace">("answer");
  const [input, setInput] = useState("");

  const submit = (q?: string) => {
    if (q) setInput(q);
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 lg:grid-cols-[260px_1fr]">
        {/* Sidebar */}
        <aside className="hidden border-r border-hairline px-4 py-6 lg:block">
          <button
            onClick={() => setSubmitted(false)}
            className="group flex w-full items-center justify-between rounded-xl border border-hairline bg-surface px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-surface-elevated"
          >
            <span className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New conversation
            </span>
            <span className="text-xs text-muted-foreground">⌘K</span>
          </button>

          <div className="mt-8">
            <div className="px-2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              Recent
            </div>
            <ul className="mt-2 space-y-0.5">
              {HISTORY.map((h) => (
                <li key={h}>
                  <button className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-foreground/70 transition-colors hover:bg-surface hover:text-foreground">
                    <MessageSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{h}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-8 rounded-2xl border border-hairline bg-surface p-4">
            <div className="flex items-center gap-2 text-xs text-jade">
              <ShieldCheck className="h-3.5 w-3.5" />
              Local model active
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
              Your questions never leave this device.
            </p>
          </div>
        </aside>

        {/* Main */}
        <main className="relative min-h-[calc(100vh-4rem)] px-4 py-6 sm:py-8 md:px-10">
          <AnimatePresence mode="wait">
            {!submitted ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center"
              >
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-hairline bg-surface/60 px-3.5 py-1.5 text-xs text-muted-foreground backdrop-blur">
                  <Sparkles className="h-3 w-3 text-jade" />
                  Grounded · Cited · Private
                </div>
                <h1 className="font-display text-balance text-center text-3xl font-light leading-tight sm:text-4xl md:text-5xl">
                  What guidance do you{" "}
                  <span className="italic text-gradient-jade">seek today?</span>
                </h1>
                <p className="mt-3 text-center text-sm text-muted-foreground">
                  Ask anything across finance, food, lifestyle, or business.
                </p>

                <div className="mt-10 w-full">
                  <InputBox value={input} onChange={setInput} onSubmit={() => submit()} />
                </div>

                <div className="mt-6 grid w-full gap-2 sm:grid-cols-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s.text}
                      onClick={() => submit(s.text)}
                      className="group flex items-center gap-3 rounded-xl border border-hairline bg-surface px-4 py-3 text-left text-sm text-foreground/85 transition-all hover:border-jade/30 hover:bg-surface-elevated"
                    >
                      <s.icon className="h-4 w-4 shrink-0 text-jade" strokeWidth={1.5} />
                      <span className="flex-1 truncate">{s.text}</span>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="conversation"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mx-auto max-w-3xl pb-32"
              >
                {/* User question */}
                <div className="flex gap-3 sm:gap-4">
                  <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground/5 text-xs">
                    Q
                  </div>
                  <p className="font-display text-xl leading-snug text-foreground sm:text-2xl">
                    {input || "Is investing in a S&P 500 ETF halal?"}
                  </p>
                </div>

                {/* Tab strip */}
                <div className="-mx-4 mt-8 overflow-x-auto px-4 md:mx-0 md:overflow-visible md:px-0">
                  <div className="flex w-max gap-1 rounded-full border border-hairline bg-surface p-1 text-xs md:w-fit">
                    {[
                      { id: "answer", label: "Answer", icon: Sparkles },
                      { id: "sources", label: "Sources", icon: BookOpen },
                      { id: "opinions", label: "Opinions", icon: GitBranch },
                      { id: "trace", label: "Reasoning", icon: ChevronRight },
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setTab(t.id as typeof tab)}
                        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 transition-all ${
                          tab === t.id
                            ? "bg-foreground text-background"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <t.icon className="h-3 w-3" />
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Content */}
                <div className="mt-6">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={tab}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.25 }}
                    >
                      {tab === "answer" && <AnswerTab />}
                      {tab === "sources" && <SourcesTab />}
                      {tab === "opinions" && <OpinionsTab />}
                      {tab === "trace" && <TraceTab />}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Action bar */}
                <div className="mt-6 flex items-center gap-2 border-t border-hairline pt-4">
                  <ActionBtn icon={Copy} label="Copy" />
                  <ActionBtn icon={Bookmark} label="Save" />
                  <div className="ml-auto text-[10px] text-muted-foreground">
                    Generated locally · 1.2s
                  </div>
                </div>

                {/* Follow-up */}
                <div className="fixed inset-x-0 bottom-0 border-t border-hairline bg-background/80 backdrop-blur-xl">
                  <div className="mx-auto max-w-3xl px-4 py-3 sm:py-4 md:px-10">
                    <InputBox
                      value=""
                      onChange={() => {}}
                      onSubmit={() => submit()}
                      placeholder="Ask a follow-up…"
                      compact
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

/* ----- Tabs ----- */
function AnswerTab() {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <VerdictBadge verdict="ikhtilaf" size="lg" />
        <span className="text-xs text-muted-foreground">Confidence 86 / 100</span>
      </div>
      <p className="text-[15px] leading-[1.75] text-foreground/90">
        A broad-market S&P 500 ETF includes financial-sector exposure, which most contemporary
        Shariah boards consider <em className="font-display not-italic italic">mushbooh</em>{" "}
        without screening. The mainstream contemporary opinion (AAOIFI; Mufti Taqi Usmani) permits
        passive investment when:
      </p>
      <ul className="space-y-2.5 text-[15px] leading-relaxed text-foreground/85">
        {[
          "The non-compliant revenue ratio is below the standard threshold (commonly 5%).",
          "Interest-bearing debt is below 33% of market cap.",
          "The investor purifies the impermissible portion of returns through ṣadaqah.",
        ].map((s, i) => (
          <li key={i} className="flex gap-3">
            <span className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-jade" />
            <span>{s}</span>
          </li>
        ))}
      </ul>
      <div className="rounded-2xl border border-jade/20 bg-jade/5 p-5">
        <div className="flex items-center gap-2 text-xs text-jade">
          <ShieldCheck className="h-3.5 w-3.5" />
          Safer path
        </div>
        <p className="mt-2 text-sm leading-relaxed text-foreground/85">
          Choose a Shariah-compliant ETF (e.g., SPUS, HLAL, ISDU) to avoid screening burden and
          ongoing purification.
        </p>
      </div>
    </div>
  );
}

function SourcesTab() {
  const sources = [
    {
      t: "AAOIFI Shariah Standard No. 21",
      sub: "Financial Papers (Shares & Bonds)",
      ex: "Investment in shares is permitted when the corporation's primary activity is permissible and financial ratios remain within prescribed bounds…",
      tag: "Standard",
    },
    {
      t: "An Introduction to Islamic Finance",
      sub: "Mufti Muhammad Taqi Usmani · Ch. 17",
      ex: "If a company is engaged in a halal business but deposits its surplus in interest-bearing accounts, scholars have allowed investment subject to purification…",
      tag: "Treatise",
    },
    {
      t: "Dow Jones Islamic Market Methodology",
      sub: "Index screening criteria",
      ex: "Companies are excluded if total debt divided by trailing 24-month average market cap is ≥ 33%…",
      tag: "Methodology",
    },
    {
      t: "Fatwa — European Council for Fatwa & Research",
      sub: "Resolution 4/8",
      ex: "Permissible with the conditions of screening and purification, given the necessity (ḥāja) of contemporary Muslim financial participation…",
      tag: "Fatwa",
    },
  ];
  return (
    <div className="space-y-3">
      {sources.map((s) => (
        <div
          key={s.t}
          className="group rounded-2xl border border-hairline bg-surface p-5 transition-colors hover:border-jade/30"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <BookOpen className="h-3.5 w-3.5 text-jade" />
                <h4 className="text-sm font-medium">{s.t}</h4>
                <span className="rounded-full border border-hairline px-2 py-0.5 text-[10px] text-muted-foreground">
                  {s.tag}
                </span>
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">{s.sub}</div>
            </div>
            <button className="text-xs text-muted-foreground hover:text-foreground">View →</button>
          </div>
          <p className="font-display mt-3 border-l-2 border-jade/40 pl-3 text-sm italic leading-relaxed text-foreground/75">
            "{s.ex}"
          </p>
        </div>
      ))}
    </div>
  );
}

function OpinionsTab() {
  const ops = [
    { school: "AAOIFI / Usmani", view: "Permitted", note: "With screening + purification", v: "halal" as const },
    { school: "Salim al-Hassani", view: "Permitted", note: "Conditional on threshold compliance", v: "halal" as const },
    { school: "Stricter contemporary view", view: "Discouraged", note: "Avoid even minor riba exposure", v: "mushbooh" as const },
    { school: "Classical fuqahā extrapolation", view: "Impermissible", note: "Direct involvement in riba", v: "haram" as const },
  ];
  return (
    <div className="overflow-hidden rounded-2xl border border-hairline">
      {ops.map((o, i) => (
        <div
          key={o.school}
          className={`grid grid-cols-[1fr_auto] items-start gap-x-4 gap-y-2 p-4 sm:grid-cols-[1.5fr_1fr_1.5fr_auto] sm:items-center sm:gap-4 sm:p-5 ${
            i > 0 ? "border-t border-hairline" : ""
          }`}
        >
          <div className="min-w-0">
            <div className="text-sm font-medium">{o.school}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">Position</div>
          </div>
          <div className="justify-self-end sm:justify-self-auto sm:order-none">
            <VerdictBadge verdict={o.v} size="sm" />
          </div>
          <div className="col-span-2 text-sm sm:col-span-1 sm:order-none">{o.view}</div>
          <div className="col-span-2 text-xs text-muted-foreground sm:col-span-1 sm:order-none">{o.note}</div>
        </div>
      ))}
    </div>
  );
}

function TraceTab() {
  const steps = [
    { t: "Parse intent", d: "Identified as: passive equity investment in broad-market ETF." },
    { t: "Retrieve principles", d: "Pulled rulings on shareholding, riba, and screening thresholds." },
    { t: "Match contemporary fatwa", d: "Cross-referenced AAOIFI 21, Usmani treatise, ECFR resolution." },
    { t: "Compare positions", d: "Surfaced majority + stricter + classical extrapolation." },
    { t: "Compute confidence", d: "Strong source consensus → 86/100." },
    { t: "Suggest safer path", d: "Recommended Shariah-screened ETF alternatives." },
  ];
  return (
    <div className="relative pl-6">
      <div className="absolute left-[7px] top-1 bottom-1 w-px bg-gradient-to-b from-jade/40 via-hairline to-transparent" />
      {steps.map((s, i) => (
        <div key={i} className="relative pb-6 last:pb-0">
          <div className="absolute -left-[22px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-jade bg-background" />
          <div className="text-sm font-medium">{s.t}</div>
          <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.d}</div>
        </div>
      ))}
    </div>
  );
}

/* ----- Input ----- */
function InputBox({
  value,
  onChange,
  onSubmit,
  placeholder = "Ask anything halal-related…",
  compact = false,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  compact?: boolean;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="group relative"
    >
      <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-jade/30 via-gold/20 to-jade/30 opacity-0 blur-md transition-opacity group-focus-within:opacity-100" />
      <div className="relative flex items-center gap-2 rounded-2xl border border-hairline bg-surface p-2 shadow-elegant">
        <input
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`flex-1 bg-transparent px-4 outline-none placeholder:text-muted-foreground ${
            compact ? "py-2.5 text-sm" : "py-3.5 text-[15px]"
          }`}
        />
        <button
          type="submit"
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground text-background transition-all hover:scale-105 disabled:opacity-40"
        >
          <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
        </button>
      </div>
    </form>
  );
}

function ActionBtn({ icon: Icon, label }: { icon: typeof Copy; label: string }) {
  return (
    <button className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-surface hover:text-foreground">
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
