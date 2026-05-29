import { Link, useRouterState } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { useState } from "react";

const NAV_ITEMS = [
  { to: "/assistant", label: "Assistant" },
  { to: "/methodology", label: "Methodology" },
  { to: "/how-ai-works", label: "How AI works" },
] as const;

export function Nav() {
  const [open, setOpen] = useState(false);
  const currentPathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const isLandingPage = currentPathname === "/";
  const visibleNavItems = NAV_ITEMS;

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="absolute inset-0 glass border-b border-hairline" />
      <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center" onClick={() => setOpen(false)}>
          <Logo />
        </Link>
        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 md:flex">
          {visibleNavItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
              activeProps={{
                className:
                  "border border-jade/35 bg-jade/10 text-jade shadow-[0_0_20px_rgba(16,185,129,0.16)]",
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          {!isLandingPage && (
            <Link
              to="/assistant"
              className="group hidden items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-all hover:bg-foreground/90 sm:inline-flex"
            >
              Try the assistant
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          )}
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-hairline bg-surface/60 text-foreground backdrop-blur md:hidden"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="relative md:hidden">
          <div className="absolute inset-x-0 top-0 glass border-b border-hairline">
            <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
              <nav className="flex flex-col gap-1">
                {visibleNavItems.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setOpen(false)}
                    className="rounded-xl px-3 py-3 text-base text-foreground/85 transition-colors hover:bg-surface"
                    activeProps={{
                      className: "border border-jade/35 bg-jade/10 text-jade",
                    }}
                  >
                    {item.label}
                  </Link>
                ))}
                {!isLandingPage && (
                  <Link
                    to="/assistant"
                    onClick={() => setOpen(false)}
                    className="mt-2 inline-flex items-center justify-center gap-1.5 rounded-full bg-foreground px-4 py-3 text-sm font-medium text-background sm:hidden"
                  >
                    Try the assistant
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </nav>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
