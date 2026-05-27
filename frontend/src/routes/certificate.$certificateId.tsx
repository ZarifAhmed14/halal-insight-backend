import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BadgeCheck, Download, FileWarning, ShieldCheck } from "lucide-react";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import {
  downloadCertificatePdf,
  loadCertificateRecord,
  type CertificateRecord,
} from "@/features/assistant/certificate";

export const Route = createFileRoute("/certificate/$certificateId")({
  head: () => ({
    meta: [
      { title: "Verify Export Readiness Certificate - Halal Intelligence" },
      {
        name: "description",
        content:
          "View an issued Halal Intelligence Export Readiness Certificate record on this device.",
      },
    ],
  }),
  component: CertificateVerificationPage,
});

function formatIssueDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(value));
}

function CertificateVerificationPage() {
  const { certificateId } = Route.useParams();
  const [certificate, setCertificate] = useState<CertificateRecord | null | undefined>(undefined);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    setCertificate(loadCertificateRecord(certificateId));
  }, [certificateId]);

  const downloadPdf = async () => {
    if (!certificate) return;

    setDownloadError(null);
    try {
      await downloadCertificatePdf(certificate);
    } catch (_error) {
      setDownloadError("Certificate download could not be completed. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px]"
        style={{ background: "var(--gradient-aurora)" }}
      />
      <Nav />
      <main className="relative mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
        {certificate === undefined ? (
          <div className="rounded-3xl border border-hairline bg-surface p-8 text-sm text-muted-foreground">
            Loading certificate record...
          </div>
        ) : certificate === null ? (
          <div className="rounded-3xl border border-hairline bg-surface p-7 shadow-elegant sm:p-9">
            <FileWarning className="h-8 w-8 text-verdict-mushbooh" />
            <h1 className="font-display mt-5 text-3xl font-light">
              Certificate record is not available on this device
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
              This demo stores issued certificate records in the browser that created them. Open the
              verification link on the issuing device, or generate a new qualifying certificate from
              the assistant.
            </p>
            <Link
              to="/assistant"
              className="mt-7 inline-flex rounded-xl bg-jade px-5 py-3 text-sm font-medium text-background"
            >
              Open assistant
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-[2rem] border border-hairline bg-surface shadow-elegant">
            <div className="border-b border-hairline p-6 sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div>
                  <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-jade">
                    <ShieldCheck className="h-4 w-4" />
                    Assessment record found on this device
                  </div>
                  <h1 className="font-display mt-4 text-3xl font-light sm:text-4xl">
                    Export Readiness Certificate
                  </h1>
                  <p className="mt-2 text-sm text-muted-foreground">{certificate.id}</p>
                </div>
                <div className="rounded-2xl border border-jade/30 bg-jade/10 px-4 py-3 text-jade">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest">
                    <BadgeCheck className="h-4 w-4" />
                    Ready
                  </div>
                  <div className="mt-1 text-sm">{certificate.readinessStatement}</div>
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-8">
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ["Manufacturer", certificate.manufacturerName],
                  ["Product", certificate.productName],
                  ["Domain", certificate.productDomain],
                  ["Country", certificate.country],
                  ["Confidence", `${certificate.confidenceScore}%`],
                  ["Issued", formatIssueDate(certificate.issuedAt)],
                  ["Batch/reference", certificate.batchReference ?? "Not provided"],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-xl border border-hairline bg-background/35 p-3.5"
                  >
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      {label}
                    </div>
                    <div className="mt-1 text-sm text-foreground">{value}</div>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-xl border border-hairline bg-background/35 p-4">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Evidence package
                </div>
                <div className="mt-3 space-y-2">
                  {certificate.evidence.map((item) => (
                    <div key={item.name} className="flex flex-wrap justify-between gap-2 text-sm">
                      <span>{item.name}</span>
                      <span className="text-muted-foreground">{item.status}</span>
                    </div>
                  ))}
                </div>
              </div>

              <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
                {certificate.disclaimer}
              </p>
              {downloadError && <p className="mt-3 text-xs text-verdict-haram">{downloadError}</p>}
              <button
                type="button"
                onClick={() => void downloadPdf()}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-jade px-5 py-3 text-sm font-medium text-background transition-colors hover:bg-jade-glow"
              >
                <Download className="h-4 w-4" />
                Download certificate PDF
              </button>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
