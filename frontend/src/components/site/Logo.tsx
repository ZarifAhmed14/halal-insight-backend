/**
 * HalalIQ wordmark — Playfair Display in antique gold,
 * with a small Islamic octagram geometric icon to the left.
 */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <svg
        viewBox="0 0 32 32"
        className="h-7 w-7 text-gold transition-transform duration-700 hover:rotate-45"
        aria-hidden
      >
        <g fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round">
          {/* Two squares rotated to form 8-point octagram */}
          <rect x="6" y="6" width="20" height="20" />
          <rect x="6" y="6" width="20" height="20" transform="rotate(45 16 16)" />
          <circle cx="16" cy="16" r="2.6" fill="currentColor" stroke="none" />
        </g>
      </svg>
      <span className="font-display text-xl tracking-tight text-gold">
        Halal<span className="italic">IQ</span>
      </span>
    </div>
  );
}
