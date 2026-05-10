import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="border-t border-hairline">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="grid gap-10 sm:gap-12 sm:grid-cols-2 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              A halal-aware intelligence layer for the modern world. Grounded in evidence,
              transparent by design.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-hairline bg-surface px-3 py-1.5 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-jade animate-pulse" />
              Demo system ready
            </div>
          </div>
          {[
            {
              title: "Product",
              links: [
                { to: "/assistant", label: "Assistant" },
                { to: "/transparency", label: "Transparency" },
                { to: "/enterprise", label: "Enterprise" },
              ],
            },
            {
              title: "Knowledge",
              links: [
                { to: "/transparency", label: "Methodology" },
                { to: "/transparency", label: "Safety principles", hash: "safety" },
              ],
            },
            {
              title: "Company",
              links: [
                { to: "/enterprise", label: "About" },
                { to: "/transparency", label: "Privacy", hash: "safety" },
                { to: "/enterprise", label: "Contact", hash: "contact" },
              ],
            },
          ].map((col) => (
            <div key={col.title}>
              <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                {col.title}
              </div>
              <ul className="mt-4 space-y-3">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      to={l.to}
                      hash={("hash" in l ? l.hash : undefined) as string | undefined}
                      className="text-sm text-foreground/80 hover:text-foreground"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-hairline pt-8 text-xs text-muted-foreground sm:mt-16 md:flex-row md:items-center">
          <div>Copyright {new Date().getFullYear()} Halal Intelligence</div>
          <div className="font-display italic">"My Lord, increase me in knowledge." - 20:114</div>
        </div>
      </div>
    </footer>
  );
}
