export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden>
        <defs>
          <linearGradient id="logo-grad" x1="0" y1="0" x2="32" y2="32">
            <stop offset="0%" stopColor="oklch(0.72 0.14 160)" />
            <stop offset="100%" stopColor="oklch(0.78 0.12 75)" />
          </linearGradient>
        </defs>
        {/* 8-fold geometric star — Islamic proportional harmony, no clichés */}
        <g stroke="url(#logo-grad)" strokeWidth="1.4" fill="none" strokeLinejoin="round">
          <rect x="6" y="6" width="20" height="20" transform="rotate(0 16 16)" />
          <rect x="6" y="6" width="20" height="20" transform="rotate(45 16 16)" />
          <circle cx="16" cy="16" r="4" fill="url(#logo-grad)" opacity="0.9" />
        </g>
      </svg>
      <span className="font-display text-[15px] font-medium tracking-tight text-foreground">
        Halal<span className="text-muted-foreground">·</span>Intelligence
      </span>
    </div>
  );
}
