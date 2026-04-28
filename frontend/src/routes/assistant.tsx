import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Send, BookOpen, ChevronDown, Sparkles } from "lucide-react";
import { Nav } from "@/components/site/Nav";
import { PageBackground } from "@/components/site/PageBackground";
import { SiteFooter } from "./index";

export const Route = createFileRoute("/assistant")({
  head: () => ({
    meta: [
      { title: "HalalIQ Assistant — Source-traced halal answers" },
      {
        name: "description",
        content:
          "Ask any halal compliance question. Every answer is sourced and traceable to scholarly authorities.",
      },
      { property: "og:title", content: "HalalIQ Assistant" },
      {
        property: "og:description",
        content: "Sourced, traceable answers to halal compliance questions.",
      },
    ],
  }),
  component: AssistantPage,
});

type Message = {
  role: "user" | "ai";
  text: string;
  sources?: { label: string; ref: string }[];
  confidence?: number;
};

const PROMPTS = [
  {
    q: "Is E471 halal?",
    a: "E471 (mono- and diglycerides of fatty acids) is conditional. When derived from plant oils such as soy or palm, it is permissible across all major schools. When derived from animal fats, halal status depends on slaughter method (zabihah). Always request a source declaration from the supplier.",
    confidence: 88,
    sources: [
      { label: "JAKIM Manual Procedure for Malaysia Halal Certification", ref: "MPPHM 2020 §5.3" },
      { label: "AAOIFI Standard 21", ref: "§4.1" },
    ],
  },
  {
    q: "Can I export to Malaysia without JAKIM?",
    a: "JAKIM certification is required only if you intend to display the JAKIM halal logo on packaging. Products without the logo may still enter Malaysia legally, but will face commercial disadvantage in the Muslim consumer segment and cannot be sold in JAKIM-only retail channels. For institutional buyers, JAKIM or a JAKIM-recognized foreign halal body is typically mandatory.",
    confidence: 95,
    sources: [
      { label: "Trade Description (Definition of Halal) Order 2011", ref: "§3" },
      { label: "JAKIM Recognized Foreign Halal Bodies", ref: "List 2024" },
    ],
  },
  {
    q: "What makes gelatin haram?",
    a: "Gelatin is derived from collagen extracted from animal bones and skin. It is haram when sourced from pork (categorically prohibited) or from non-zabihah cattle. It is halal when derived from zabihah-slaughtered cattle, fish (universally accepted), or plant alternatives such as agar-agar or carrageenan.",
    confidence: 96,
    sources: [
      { label: "European Council for Fatwa and Research", ref: "Resolution 5/8" },
      { label: "Islamic Fiqh Academy (OIC)", ref: "Resolution 23 (11/3)" },
    ],
  },
];

function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "ai",
      text: "Salām. I'm the HalalIQ Assistant. Ask any halal compliance question — I'll trace every answer to its scholarly source.",
    },
  ]);
  const [input, setInput] = useState("");

  const ask = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const match = PROMPTS.find((p) => p.q.toLowerCase() === trimmed.toLowerCase());
    setMessages((m) => [...m, { role: "user", text: trimmed }]);
    setInput("");
    setTimeout(() => {
      setMessages((m) => [
        ...m,
        match
          ? {
              role: "ai",
              text: match.a,
              sources: match.sources,
              confidence: match.confidence,
            }
          : {
              role: "ai",
              text: "I don't have a verified scholarly source for that question yet. Try one of the suggested prompts below for a fully traced answer.",
              confidence: 42,
            },
      ]);
    }, 400);
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      <PageBackground aurora={false} />
      <Nav />

      <main className="relative mx-auto max-w-3xl px-4 pb-32 pt-28 sm:px-6 sm:pt-32">
        <div className="animate-fade-up">
          <div className="font-mono text-[10px] uppercase tracking-widest text-gold">
            Module · Q&amp;A
          </div>
          <h1 className="font-display mt-2 text-4xl text-foreground sm:text-5xl">
            Halal Assistant
          </h1>
          <p className="mt-3 max-w-xl text-pretty text-sm text-text-secondary sm:text-base">
            Ask any halal compliance question. Every answer is sourced and traceable.
          </p>
        </div>

        {/* Chat history */}
        <div className="mt-8 space-y-4">
          {messages.map((m, i) => (
            <ChatMessage key={i} message={m} />
          ))}
        </div>

        {/* Suggested prompts */}
        <div className="mt-8">
          <div className="font-mono text-[10px] uppercase tracking-widest text-text-secondary">
            Suggested
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {PROMPTS.map((p) => (
              <button
                key={p.q}
                type="button"
                onClick={() => ask(p.q)}
                className="rounded-full border border-gold/25 bg-surface/60 px-3.5 py-1.5 text-xs text-foreground/85 backdrop-blur transition-colors hover:border-gold/50 hover:text-gold"
              >
                {p.q}
              </button>
            ))}
          </div>
        </div>

        {/* Input bar */}
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gold/15 bg-ink/85 px-4 py-4 backdrop-blur-md">
          <div className="mx-auto flex max-w-3xl items-center gap-2 rounded-xl border border-gold/20 bg-surface px-3 py-2 shadow-elegant focus-within:border-gold/50">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && ask(input)}
              placeholder="Ask a halal compliance question..."
              className="flex-1 bg-transparent px-2 py-1.5 text-sm text-foreground placeholder:text-text-secondary/60 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => ask(input)}
              className="btn-gold inline-flex h-9 w-9 items-center justify-center rounded-lg"
              aria-label="Send"
            >
              <Send className="h-4 w-4" strokeWidth={2.25} />
            </button>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

function ChatMessage({ message }: { message: Message }) {
  const [openSources, setOpenSources] = useState(false);
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end animate-fade-up">
        <div className="max-w-[85%] rounded-2xl rounded-br-md border border-gold/30 bg-gold/[0.08] px-4 py-2.5 text-sm text-foreground">
          {message.text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start animate-fade-up">
      <div className="w-full max-w-[92%] rounded-2xl rounded-bl-md border border-hairline border-l-2 border-l-gold/60 bg-surface px-4 py-3.5 text-sm text-foreground/90 sm:px-5 sm:py-4">
        <div className="leading-relaxed">{message.text}</div>

        {(message.sources || message.confidence !== undefined) && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-3">
            {message.sources && (
              <button
                type="button"
                onClick={() => setOpenSources((v) => !v)}
                className="inline-flex items-center gap-1.5 text-xs text-gold hover:underline"
              >
                <BookOpen className="h-3 w-3" strokeWidth={2} />
                Sources ({message.sources.length})
                <ChevronDown
                  className={`h-3 w-3 transition-transform ${openSources ? "rotate-180" : ""}`}
                />
              </button>
            )}
            {message.confidence !== undefined && (
              <div className="ml-auto inline-flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-gold" strokeWidth={2} />
                <span className="font-mono text-[11px] text-text-secondary">
                  Confidence{" "}
                  <span className="text-gold">{message.confidence}%</span>
                </span>
              </div>
            )}
          </div>
        )}

        {openSources && message.sources && (
          <ul className="mt-3 space-y-1.5 animate-fade-in">
            {message.sources.map((s) => (
              <li
                key={s.label}
                className="flex items-start gap-2 rounded-md border border-hairline bg-ink/40 px-2.5 py-1.5"
              >
                <BookOpen className="mt-0.5 h-3 w-3 text-gold" strokeWidth={2} />
                <div className="flex-1 text-[11px]">
                  <div className="text-foreground/85">{s.label}</div>
                  <div className="font-mono text-text-secondary">{s.ref}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
