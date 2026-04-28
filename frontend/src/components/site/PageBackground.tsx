/**
 * Page chrome shared by all three modules.
 * Renders the rotating tessellation, noise overlay, and mesh aurora.
 */
export function PageBackground({ aurora = true }: { aurora?: boolean }) {
  return (
    <>
      {/* Tessellation, slowly rotating */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-tessellation opacity-[0.04] animate-slow-rotate"
      />
      {/* Noise grain */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-noise opacity-[0.06] mix-blend-overlay"
      />
      {/* Hero aurora — gold light from top right */}
      {aurora && (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[700px]"
          style={{ background: "var(--gradient-aurora)" }}
        />
      )}
    </>
  );
}
