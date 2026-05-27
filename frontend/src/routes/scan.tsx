import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Camera, ScanLine } from "lucide-react";

export const Route = createFileRoute("/scan")({
  head: () => ({
    meta: [
      { title: "Scan Product - Halal Intelligence" },
      {
        name: "description",
        content:
          "Open the mobile scanner for QR codes and product barcodes, then continue into Halal Intelligence review.",
      },
    ],
  }),
  component: ScanEntryPage,
});

function isMobileScannerDevice(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const mobileMediaMatch = window.matchMedia?.("(max-width: 900px)")?.matches ?? false;
  const touchMediaMatch = window.matchMedia?.("(pointer: coarse)")?.matches ?? false;
  const userAgent = window.navigator.userAgent.toLowerCase();
  const mobileUserAgent =
    /android|iphone|ipad|ipod|mobile|windows phone/i.test(userAgent);

  return mobileMediaMatch || touchMediaMatch || mobileUserAgent;
}

function ScanEntryPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const nextTarget = "/assistant?scan=1";
    const timeoutMs = isMobileScannerDevice() ? 140 : 260;

    const timeoutId = window.setTimeout(() => {
      void navigate({ href: nextTarget, replace: true });
    }, timeoutMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [navigate]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px]"
        style={{ background: "var(--gradient-aurora)" }}
      />
      <div className="relative w-full max-w-md rounded-[2rem] border border-hairline bg-surface/90 p-6 text-center shadow-elegant backdrop-blur">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-jade/10 text-jade">
          <Camera className="h-6 w-6" />
        </div>
        <h1 className="font-display mt-5 text-3xl font-light text-foreground">
          Opening scanner
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          On mobile, Halal Intelligence will open the camera so you can scan a QR code or product
          barcode and continue straight into review.
        </p>
        <div className="mt-6 grid gap-3">
          <Link
            to="/assistant"
            search={{ scan: "1" }}
            replace
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-jade/25 bg-jade/10 px-5 py-3 text-sm font-medium text-jade transition-colors hover:bg-jade/15"
          >
            <ScanLine className="h-4 w-4" />
            Open scanner now
          </Link>
          <Link
            to="/assistant"
            className="inline-flex items-center justify-center rounded-2xl border border-hairline bg-background/50 px-5 py-3 text-sm text-foreground transition-colors hover:bg-background"
          >
            Continue to assistant
          </Link>
        </div>
      </div>
    </div>
  );
}
