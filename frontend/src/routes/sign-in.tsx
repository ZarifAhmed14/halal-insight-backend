import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, LockKeyhole, ShieldCheck } from "lucide-react";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/sign-in")({
  head: () => ({
    meta: [
      { title: "Sign In - Halal Intelligence" },
      {
        name: "description",
        content: "Sign in placeholder for Halal Intelligence enterprise workspaces and demo access",
      },
    ],
  }),
  component: SignInPage,
});

function SignInPage() {
  return (
    <div className="min-h-screen bg-background">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[560px]"
        style={{ background: "var(--gradient-aurora)" }}
      />
      <Nav />
      <main className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center px-4 py-16 sm:px-6">
        <div className="grid w-full gap-6 md:grid-cols-[0.95fr_1.05fr] md:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-hairline bg-surface/60 px-3.5 py-1.5 text-xs text-muted-foreground backdrop-blur">
              <ShieldCheck className="h-3.5 w-3.5 text-jade" />
              Secure workspace access
            </div>
            <h1 className="font-display mt-6 text-balance text-4xl font-light leading-tight sm:text-5xl">
              Sign in to your{" "}
              <span className="italic text-gradient-jade">compliance workspace</span>
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Authentication is prepared for the product flow. For the MVP demo, continue to the
              assistant or contact the enterprise team for workspace access.
            </p>
          </div>

          <section className="rounded-[2rem] border border-hairline bg-surface p-5 shadow-elegant sm:p-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-jade/10 text-jade">
              <LockKeyhole className="h-5 w-5" />
            </div>
            <h2 className="font-display mt-5 text-2xl font-light">Workspace sign in</h2>
            <div className="mt-5 space-y-3">
              <input
                type="email"
                placeholder="work@email.com"
                className="w-full rounded-2xl border border-hairline bg-background/50 px-4 py-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-jade/50"
              />
              <button
                type="button"
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-hairline bg-background/60 px-5 py-3 text-sm font-medium transition-colors hover:bg-background"
              >
                Request access link
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <Link
                to="/assistant"
                className="inline-flex items-center justify-center rounded-xl border border-jade/25 bg-jade/5 px-4 py-2.5 text-sm text-jade transition-colors hover:bg-jade/10"
              >
                Continue demo
              </Link>
              <a
                href="/enterprise#contact"
                className="inline-flex items-center justify-center rounded-xl border border-hairline bg-background/60 px-4 py-2.5 text-sm transition-colors hover:bg-background"
              >
                Contact team
              </a>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
