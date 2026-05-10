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
          <path d="M16 4.5 25.5 8.5V15c0 6.1-4 10.8-9.5 12.5C10.5 25.8 6.5 21.1 6.5 15V8.5L16 4.5Z" />
          <path d="M11 16.3 14.1 19.2 21 12.4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M16 8.2V12.4" strokeLinecap="round" />
        </g>
      </svg>
      <span className="font-display text-[15px] font-medium tracking-tight text-foreground">
        Halal Intelligence
      </span>
    </div>
  );
}
