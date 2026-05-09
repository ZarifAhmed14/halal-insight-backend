export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <svg width="30" height="30" viewBox="0 0 32 32" fill="none" aria-hidden>
        <defs>
          <linearGradient id="logo-grad" x1="0" y1="0" x2="32" y2="32">
            <stop offset="0%" stopColor="oklch(0.72 0.14 160)" />
            <stop offset="100%" stopColor="oklch(0.78 0.12 75)" />
          </linearGradient>
        </defs>
        <g stroke="url(#logo-grad)" strokeWidth="1.35" fill="none" strokeLinejoin="round">
          <path d="M16 3.5 19.2 10.2 26.5 8 24.3 15.3 30 20 22.5 21.2 22 28.5 16 24.3 10 28.5 9.5 21.2 2 20 7.7 15.3 5.5 8 12.8 10.2 16 3.5Z" />
          <circle cx="16" cy="16" r="5.2" fill="url(#logo-grad)" opacity="0.16" />
          <circle cx="16" cy="16" r="2.3" fill="url(#logo-grad)" opacity="0.95" />
        </g>
      </svg>
      <span className="font-display text-[15px] font-medium tracking-tight text-foreground">
        Halal Intelligence
      </span>
    </div>
  );
}
