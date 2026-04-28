import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { Menu, X, ScanLine } from "lucide-react";
import { useEffect, useState } from "react";

const NAV_ITEMS = [
  { to: "/", label: "Certification" },
  { to: "/assistant", label: "Assistant" },
  { to: "/finance", label: "Finance" },
] as const;

export function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 animate-slide-down">
      <div className="mx-auto mt-3 max-w-7xl px-3 sm:px-4">
        <div
          className={`relative flex h-14 items-center justify-between rounded-2xl border px-3 transition-all duration-500 sm:h-16 sm:px-5 ${
            scrolled
              ? "glass-nav-scrolled border-gold/30 shadow-elegant"
              : "glass-nav border-gold/15"
          }`}
        >
          <Logo />

          <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 md:flex">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="group relative rounded-lg px-3.5 py-2 text-sm text-text-secondary transition-colors hover:text-foreground"
                activeProps={{ className: "text-foreground" }}
                activeOptions={{ exact: true }}
              >
                {({ isActive }) => (
                  <>
                    <span>{item.label}</span>
                    <span
                      aria-hidden
                      className={`absolute inset-x-3 -bottom-0.5 h-px origin-left bg-gold transition-transform duration-300 ${
                        isActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                      }`}
                    />
                  </>
                )}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="btn-gold hidden items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium sm:inline-flex"
            >
              <ScanLine className="h-3.5 w-3.5" strokeWidth={2.25} />
              Scan Your Product
            </Link>
            <button
              type="button"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gold/25 text-foreground md:hidden"
            >
              {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="md:hidden">
            <div className="mt-2 rounded-2xl glass-nav-scrolled border border-gold/20 p-3 animate-fade-up">
              <nav className="flex flex-col gap-1">
                {NAV_ITEMS.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-3 py-3 text-base text-foreground/85 transition-colors hover:bg-surface"
                    activeProps={{ className: "bg-surface text-gold" }}
                    activeOptions={{ exact: true }}
                  >
                    {item.label}
                  </Link>
                ))}
                <Link
                  to="/"
                  onClick={() => setOpen(false)}
                  className="btn-gold mt-2 inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-3 text-sm font-medium sm:hidden"
                >
                  <ScanLine className="h-4 w-4" strokeWidth={2.25} />
                  Scan Your Product
                </Link>
              </nav>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
