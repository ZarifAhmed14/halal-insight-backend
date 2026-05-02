import { Check, AlertTriangle, X, GitBranch } from "lucide-react";

type Verdict = "halal" | "haram" | "mushbooh" | "ikhtilaf";

const config: Record<
  Verdict,
  { label: string; sub: string; color: string; bg: string; border: string; icon: typeof Check }
> = {
  halal: {
    label: "Halal",
    sub: "Permissible",
    color: "text-verdict-halal",
    bg: "bg-verdict-halal/10",
    border: "border-verdict-halal/30",
    icon: Check,
  },
  haram: {
    label: "Haram",
    sub: "Impermissible",
    color: "text-verdict-haram",
    bg: "bg-verdict-haram/10",
    border: "border-verdict-haram/30",
    icon: X,
  },
  mushbooh: {
    label: "Mushbooh",
    sub: "Requires review",
    color: "text-verdict-mushbooh",
    bg: "bg-verdict-mushbooh/10",
    border: "border-verdict-mushbooh/30",
    icon: AlertTriangle,
  },
  ikhtilaf: {
    label: "Ikhtilāf",
    sub: "Scholars differ",
    color: "text-verdict-ikhtilaf",
    bg: "bg-verdict-ikhtilaf/10",
    border: "border-verdict-ikhtilaf/30",
    icon: GitBranch,
  },
};

export function VerdictBadge({ verdict, size = "md" }: { verdict: Verdict; size?: "sm" | "md" | "lg" }) {
  const c = config[verdict];
  const Icon = c.icon;
  const sizing =
    size === "lg"
      ? "px-4 py-2 text-sm gap-2.5"
      : size === "sm"
        ? "px-2.5 py-1 text-xs gap-1.5"
        : "px-3 py-1.5 text-xs gap-2";
  return (
    <div className={`inline-flex items-center rounded-full border ${c.border} ${c.bg} ${c.color} ${sizing} font-medium`}>
      <Icon className={size === "lg" ? "h-4 w-4" : "h-3 w-3"} strokeWidth={2.5} />
      <span>{c.label}</span>
      {size === "lg" && <span className="text-foreground/40">·</span>}
      {size === "lg" && <span className="text-muted-foreground font-normal">{c.sub}</span>}
    </div>
  );
}
