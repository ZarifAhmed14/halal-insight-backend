import { motion } from "framer-motion";
import { BookOpen, Sparkles, ChevronRight } from "lucide-react";
import { VerdictBadge } from "./VerdictBadge";

export function AnswerCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="glass relative overflow-hidden rounded-3xl p-1.5 shadow-elegant"
    >
      <div className="rounded-[22px] bg-surface p-7">
        {/* Question */}
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground/5 text-xs font-medium">
            Q
          </div>
          <p className="text-[15px] leading-relaxed text-foreground/90">
            Is this chocolate wafer ready for Malaysia halal certification review?
          </p>
        </div>

        <div className="my-6 h-px bg-hairline" />

        {/* Verdict header */}
        <div className="flex flex-wrap items-center gap-3">
          <VerdictBadge verdict="mushbooh" size="lg" />
          <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="h-3 w-3 text-jade" />
            Confidence 86% - 4 evidence checks
          </div>
        </div>

        {/* Answer */}
        <p className="mt-5 text-[15px] leading-relaxed text-foreground/85 text-pretty">
          The product needs review because{" "}
          <span className="text-foreground">
            gelatin and one emulsifier still need source proof
          </span>
          . The safer path is to collect supplier declarations and replace any animal-derived
          ingredient that cannot be certified.
        </p>

        {/* Reasoning chain */}
        <div className="mt-6 rounded-2xl border border-hairline bg-background/40 p-4">
          <div className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Reasoning trace
          </div>
          <ol className="mt-3 space-y-2.5 text-sm">
            {[
              "Normalize the ingredient list",
              "Compare ingredients with the compliance knowledge base",
              "Group findings into blockers, warnings, and low-risk items",
              "Return document requirements for reviewer follow-up",
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-foreground/75">
                <span className="mt-2 h-1 w-1 rounded-full bg-jade" />
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Sources */}
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {[
            { label: "Supplier halal certificate", tag: "Evidence" },
            { label: "Animal-origin statement", tag: "Document" },
          ].map((s) => (
            <button
              key={s.label}
              className="group flex items-center justify-between rounded-xl border border-hairline bg-background/30 px-3.5 py-2.5 text-left transition-colors hover:border-jade/40 hover:bg-background/60"
            >
              <div className="flex items-center gap-2.5">
                <BookOpen className="h-3.5 w-3.5 text-jade" />
                <div>
                  <div className="text-xs text-foreground">{s.label}</div>
                  <div className="text-[10px] text-muted-foreground">{s.tag}</div>
                </div>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
