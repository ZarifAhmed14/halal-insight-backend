type Variant = "halal" | "verify" | "haram";

const config: Record<
  Variant,
  { label: string; color: string; bg: string; border: string }
> = {
  halal: {
    label: "HALAL",
    color: "text-halal",
    bg: "bg-halal/10",
    border: "border-l-halal",
  },
  verify: {
    label: "VERIFY",
    color: "text-verify",
    bg: "bg-verify/10",
    border: "border-l-verify",
  },
  haram: {
    label: "HARAM",
    color: "text-haram",
    bg: "bg-haram/10",
    border: "border-l-haram",
  },
};

export function StatusBadge({
  variant,
  glow = false,
}: {
  variant: Variant;
  glow?: boolean;
}) {
  const c = config[variant];
  return (
    <span
      className={`inline-flex items-center rounded-md border-l-[3px] px-2 py-0.5 text-[10px] font-semibold tracking-widest ${c.color} ${c.bg} ${c.border} ${
        glow && variant === "haram" ? "animate-haram-pulse" : ""
      }`}
    >
      {c.label}
    </span>
  );
}
