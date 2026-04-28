import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search, BookOpen } from "lucide-react";
import { Nav } from "@/components/site/Nav";
import { PageBackground } from "@/components/site/PageBackground";
import { SiteFooter } from "./index";

export const Route = createFileRoute("/finance")({
  head: () => ({
    meta: [
      { title: "HalalIQ Finance — Shariah Compliance Screening" },
      {
        name: "description",
        content:
          "Check stocks, ETFs, and financial instruments against AAOIFI and major Islamic finance screening standards.",
      },
      { property: "og:title", content: "HalalIQ Finance Intelligence" },
      {
        property: "og:description",
        content: "Shariah-compliance screening for stocks and financial instruments.",
      },
    ],
  }),
  component: FinancePage,
});

type Verdict = "halal" | "mushbooh" | "haram";
type Stock = {
  ticker: string;
  name: string;
  verdict: Verdict;
  business: { label: string; status: Verdict; note: string };
  debt: { ratio: number; threshold: number; status: Verdict };
  interest: { ratio: number; threshold: number; status: Verdict };
  position: string;
  sources: { label: string; ref: string }[];
};

const STOCKS: Record<string, Stock> = {
  AAPL: {
    ticker: "AAPL",
    name: "Apple Inc.",
    verdict: "mushbooh",
    business: {
      label: "Business activity",
      status: "halal",
      note: "Consumer electronics — permissible core business.",
    },
    debt: { ratio: 32.4, threshold: 33, status: "halal" },
    interest: { ratio: 4.1, threshold: 5, status: "halal" },
    position:
      "AAOIFI screens permissible. However, AAOIFI applies a 5% incidental income tolerance — purification of dividends is required.",
    sources: [
      { label: "AAOIFI Standard 21", ref: "§3.4" },
      { label: "Dow Jones Islamic Market Index Methodology", ref: "2024" },
    ],
  },
  MSFT: {
    ticker: "MSFT",
    name: "Microsoft Corporation",
    verdict: "halal",
    business: {
      label: "Business activity",
      status: "halal",
      note: "Software and cloud services — permissible.",
    },
    debt: { ratio: 28.1, threshold: 33, status: "halal" },
    interest: { ratio: 2.7, threshold: 5, status: "halal" },
    position:
      "Compliant under AAOIFI and DJIM. Dividend purification of approximately 2.7% recommended.",
    sources: [
      { label: "AAOIFI Standard 21", ref: "§3.4" },
      { label: "S&P Shariah Indices Methodology", ref: "2024" },
    ],
  },
  UL: {
    ticker: "UL",
    name: "Unilever plc",
    verdict: "mushbooh",
    business: {
      label: "Business activity",
      status: "mushbooh",
      note: "Consumer goods — but holds alcohol-adjacent product lines below 5%.",
    },
    debt: { ratio: 41.8, threshold: 33, status: "haram" },
    interest: { ratio: 6.2, threshold: 5, status: "haram" },
    position:
      "Fails both AAOIFI debt-to-market-cap and interest income thresholds. Most major Shariah screens currently exclude this name.",
    sources: [
      { label: "AAOIFI Standard 21", ref: "§3.4" },
      { label: "MSCI Islamic Index Methodology", ref: "2024" },
    ],
  },
};

function FinancePage() {
  const [stock, setStock] = useState<Stock | null>(null);
  const [query, setQuery] = useState("");

  const search = (q: string) => {
    const key = q.replace(/[$\s]/g, "").toUpperCase();
    const match =
      STOCKS[key] ||
      Object.values(STOCKS).find((s) =>
        s.name.toLowerCase().includes(q.toLowerCase())
      );
    setStock(match || null);
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      <PageBackground aurora={false} />
      <Nav />

      <main className="relative mx-auto max-w-3xl px-4 pb-24 pt-28 sm:px-6 sm:pt-32">
        <div className="animate-fade-up">
          <div className="font-mono text-[10px] uppercase tracking-widest text-gold">
            Module · Finance
          </div>
          <h1 className="font-display mt-2 text-4xl text-foreground sm:text-5xl">
            Halal Finance Intelligence
          </h1>
          <p className="mt-3 max-w-xl text-pretty text-sm text-text-secondary sm:text-base">
            Check stocks, ETFs, and financial instruments against Islamic finance standards.
          </p>
        </div>

        {/* Search */}
        <div className="mt-8 flex items-center gap-2 rounded-xl border border-gold/20 bg-surface px-3 py-2.5 shadow-elegant focus-within:border-gold/50">
          <Search className="h-4 w-4 text-gold" strokeWidth={2} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search(query)}
            placeholder="Enter company name or ticker..."
            className="flex-1 bg-transparent px-2 py-1 text-sm text-foreground placeholder:text-text-secondary/60 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => search(query)}
            className="btn-gold rounded-md px-3 py-1.5 text-xs font-medium"
          >
            Screen
          </button>
        </div>

        {/* Quick searches */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-text-secondary">
            Try
          </span>
          {[
            { label: "$AAPL", key: "AAPL" },
            { label: "$MSFT", key: "MSFT" },
            { label: "Unilever", key: "UL" },
          ].map((q) => (
            <button
              key={q.label}
              type="button"
              onClick={() => {
                setQuery(q.label);
                search(q.key);
              }}
              className="rounded-full border border-gold/20 bg-surface/60 px-3 py-1 text-xs text-foreground/85 transition-colors hover:border-gold/50 hover:text-gold"
            >
              {q.label}
            </button>
          ))}
        </div>

        {/* Result */}
        {stock && <StockResult stock={stock} />}

        {!stock && query.length === 0 && (
          <div className="mt-12 rounded-2xl border border-hairline bg-surface/60 p-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-gold/20 bg-gold/[0.04]">
              <Search className="h-5 w-5 text-gold" strokeWidth={1.5} />
            </div>
            <h3 className="font-display mt-3 text-lg text-foreground">
              Screen a security
            </h3>
            <p className="mt-1 text-xs text-text-secondary">
              Enter a ticker or company name above to see Shariah-compliance breakdown.
            </p>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}

function StockResult({ stock }: { stock: Stock }) {
  const verdictMap = {
    halal: { label: "Halal", color: "text-halal", bg: "bg-halal/10", border: "border-halal/40" },
    mushbooh: { label: "Mushbooh", color: "text-verify", bg: "bg-verify/10", border: "border-verify/40" },
    haram: { label: "Not Compliant", color: "text-haram", bg: "bg-haram/10", border: "border-haram/40" },
  };
  const v = verdictMap[stock.verdict];

  return (
    <div className="mt-8 animate-fade-up rounded-2xl border border-gold/20 bg-surface p-6 shadow-elegant">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-widest text-gold">
            {stock.ticker}
          </div>
          <h2 className="font-display mt-1 text-2xl text-foreground">{stock.name}</h2>
        </div>
        <div className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium ${v.color} ${v.bg} ${v.border}`}>
          {v.label}
        </div>
      </div>

      {/* Criteria */}
      <div className="mt-6 space-y-2.5">
        <CriterionRow
          label={stock.business.label}
          status={stock.business.status}
          note={stock.business.note}
        />
        <CriterionRow
          label="Debt-to-market-cap"
          status={stock.debt.status}
          note={`Threshold ${stock.debt.threshold}% · AAOIFI Standard 21`}
          value={`${stock.debt.ratio.toFixed(1)}%`}
        />
        <CriterionRow
          label="Interest income ratio"
          status={stock.interest.status}
          note={`Threshold ${stock.interest.threshold}% · AAOIFI tolerance`}
          value={`${stock.interest.ratio.toFixed(1)}%`}
        />
      </div>

      {/* Position */}
      <div className="mt-6 rounded-xl border border-hairline bg-ink/40 p-4">
        <div className="font-mono text-[10px] uppercase tracking-widest text-gold">
          Scholarly position
        </div>
        <p className="mt-2 text-sm leading-relaxed text-foreground/85">{stock.position}</p>
      </div>

      {/* Sources */}
      <div className="mt-5">
        <div className="font-mono text-[10px] uppercase tracking-widest text-text-secondary">
          Sources
        </div>
        <ul className="mt-2 space-y-1.5">
          {stock.sources.map((s) => (
            <li
              key={s.label}
              className="flex items-start gap-2 rounded-md border border-hairline bg-surface-elevated px-2.5 py-1.5"
            >
              <BookOpen className="mt-0.5 h-3 w-3 text-gold" strokeWidth={2} />
              <div className="flex-1 text-[11px]">
                <div className="text-foreground/85">{s.label}</div>
                <div className="font-mono text-text-secondary">{s.ref}</div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function CriterionRow({
  label,
  status,
  note,
  value,
}: {
  label: string;
  status: Verdict;
  note: string;
  value?: string;
}) {
  const colors = {
    halal: "text-halal border-l-halal",
    mushbooh: "text-verify border-l-verify",
    haram: "text-haram border-l-haram",
  };
  return (
    <div className={`rounded-lg border border-hairline border-l-[3px] bg-surface-elevated px-3.5 py-3 ${colors[status]}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-medium text-foreground">{label}</div>
        {value && <span className="font-mono text-sm">{value}</span>}
      </div>
      <div className="mt-0.5 text-[11px] text-text-secondary">{note}</div>
    </div>
  );
}
