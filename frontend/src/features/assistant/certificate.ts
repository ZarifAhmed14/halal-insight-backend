import type { EvidencePackItem, ReadinessBrief } from "./report-logic";

const CERTIFICATE_STORAGE_KEY = "halal-intelligence:export-readiness-certificates";
const CERTIFICATE_DISCLAIMER =
  "This document supports preparation for certifier and export review. It is not a final halal certification, fatwa, or legal export approval.";

export type CertificateRecord = {
  id: string;
  assessmentSignature: string;
  issuedAt: string;
  manufacturerName: string;
  batchReference?: string;
  productName: string;
  productDomain: string;
  country: string;
  readinessDecision: "Low Risk";
  readinessStatement: "Export Preparation Ready";
  confidenceScore: number;
  evidence: EvidencePackItem[];
  disclaimer: string;
};

type IssueCertificateInput = {
  brief: ReadinessBrief;
  manufacturerName: string;
  batchReference?: string;
};

function readStoredCertificates(): CertificateRecord[] {
  if (typeof window === "undefined") return [];

  try {
    const value = window.localStorage.getItem(CERTIFICATE_STORAGE_KEY);
    const records = value ? (JSON.parse(value) as unknown) : [];

    return Array.isArray(records) ? (records as CertificateRecord[]) : [];
  } catch (_error) {
    return [];
  }
}

function createCertificateId(issuedAt: Date): string {
  const datePart = issuedAt.toISOString().slice(0, 10).replaceAll("-", "");
  const randomBytes = new Uint32Array(1);

  if (typeof window !== "undefined" && window.crypto) {
    window.crypto.getRandomValues(randomBytes);
  } else {
    randomBytes[0] = Math.floor(Math.random() * 0xffffff);
  }

  const suffix = randomBytes[0].toString(36).toUpperCase().padStart(6, "0").slice(0, 6);
  return `HI-ERC-${datePart}-${suffix}`;
}

export function isCertificateEligible(brief: ReadinessBrief): boolean {
  return brief.readinessDecision === "Low Risk";
}

export function issueCertificate({
  brief,
  manufacturerName,
  batchReference,
}: IssueCertificateInput): CertificateRecord {
  if (!isCertificateEligible(brief)) {
    throw new Error("Only low-risk products qualify for an Export Readiness Certificate.");
  }

  const trimmedManufacturerName = manufacturerName.trim();
  if (!trimmedManufacturerName) {
    throw new Error("Manufacturer name is required before issuing a certificate.");
  }

  const issuedAt = new Date();
  const record: CertificateRecord = {
    id: createCertificateId(issuedAt),
    assessmentSignature: brief.assessmentSignature,
    issuedAt: issuedAt.toISOString(),
    manufacturerName: trimmedManufacturerName,
    batchReference: batchReference?.trim() || undefined,
    productName: brief.productName,
    productDomain: brief.productDomain,
    country: brief.selectedCountry,
    readinessDecision: "Low Risk",
    readinessStatement: "Export Preparation Ready",
    confidenceScore: brief.confidenceScore,
    evidence: brief.requiredEvidence,
    disclaimer: CERTIFICATE_DISCLAIMER,
  };

  if (typeof window !== "undefined") {
    const existing = readStoredCertificates();
    window.localStorage.setItem(
      CERTIFICATE_STORAGE_KEY,
      JSON.stringify([record, ...existing].slice(0, 50)),
    );
  }

  return record;
}

export function loadCertificateRecord(certificateId: string): CertificateRecord | null {
  return readStoredCertificates().find((record) => record.id === certificateId) ?? null;
}

export function findCertificateForBrief(brief: ReadinessBrief): CertificateRecord | null {
  return (
    readStoredCertificates().find(
      (record) =>
        record.assessmentSignature === brief.assessmentSignature &&
        record.productName === brief.productName &&
        record.productDomain === brief.productDomain &&
        record.country === brief.selectedCountry,
    ) ?? null
  );
}

export function getCertificateVerificationUrl(certificateId: string): string {
  if (typeof window === "undefined") {
    return `/certificate/${encodeURIComponent(certificateId)}`;
  }

  return `${window.location.origin}/certificate/${encodeURIComponent(certificateId)}`;
}

function formatIssueDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "long",
  }).format(new Date(value));
}

export async function downloadCertificatePdf(record: CertificateRecord): Promise<void> {
  const [{ jsPDF }, qrCodeModule] = await Promise.all([import("jspdf"), import("qrcode")]);
  const QRCode = qrCodeModule.default;
  const verificationUrl = getCertificateVerificationUrl(record.id);
  const qrImage = await QRCode.toDataURL(verificationUrl, {
    width: 240,
    margin: 1,
    color: { dark: "#12382F", light: "#FFFFFF" },
  });

  const document = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageWidth = document.internal.pageSize.getWidth();
  const left = 22;
  const right = pageWidth - 22;

  document.setFillColor(247, 244, 236);
  document.rect(0, 0, pageWidth, 297, "F");
  document.setDrawColor(20, 92, 74);
  document.setLineWidth(0.7);
  document.rect(13, 13, pageWidth - 26, 271);
  document.setDrawColor(190, 157, 82);
  document.setLineWidth(0.25);
  document.rect(16, 16, pageWidth - 32, 265);

  document.setTextColor(20, 92, 74);
  document.setFont("times", "bold");
  document.setFontSize(19);
  document.text("HALAL INTELLIGENCE", pageWidth / 2, 30, { align: "center" });
  document.setFont("helvetica", "normal");
  document.setFontSize(9);
  document.text("EVIDENCE-FIRST EXPORT READINESS", pageWidth / 2, 36, { align: "center" });

  document.setDrawColor(190, 157, 82);
  document.line(left, 43, right, 43);

  document.setTextColor(25, 32, 29);
  document.setFont("times", "bold");
  document.setFontSize(26);
  document.text("Export Readiness Certificate", pageWidth / 2, 57, { align: "center" });
  document.setFont("helvetica", "normal");
  document.setFontSize(9);
  document.setTextColor(79, 89, 84);
  document.text(`Certificate reference: ${record.id}`, pageWidth / 2, 64, { align: "center" });

  document.setFillColor(225, 242, 234);
  document.roundedRect(left, 72, right - left, 18, 3, 3, "F");
  document.setTextColor(20, 92, 74);
  document.setFont("helvetica", "bold");
  document.setFontSize(14);
  document.text(record.readinessStatement.toUpperCase(), pageWidth / 2, 83.5, { align: "center" });

  const details = [
    ["Manufacturer", record.manufacturerName],
    ["Product", record.productName],
    ["Product domain", record.productDomain],
    ["Target country", record.country],
    ["Confidence score", `${record.confidenceScore}%`],
    ["Issue date", formatIssueDate(record.issuedAt)],
    ["Batch/reference", record.batchReference ?? "Not provided"],
  ];

  let y = 104;
  document.setFontSize(10);
  for (const [label, value] of details) {
    document.setFont("helvetica", "bold");
    document.setTextColor(79, 89, 84);
    document.text(label.toUpperCase(), left, y);
    document.setFont("helvetica", "normal");
    document.setTextColor(25, 32, 29);
    const safeValue = document.splitTextToSize(value, 92);
    document.text(safeValue, 59, y);
    y += Math.max(9, safeValue.length * 5);
  }

  document.setDrawColor(215, 207, 188);
  document.line(left, 168, right, 168);
  document.setFont("helvetica", "bold");
  document.setTextColor(20, 92, 74);
  document.setFontSize(10);
  document.text("EVIDENCE PACKAGE FOR REVIEW", left, 178);
  document.setFont("helvetica", "normal");
  document.setTextColor(25, 32, 29);
  document.setFontSize(9);

  const evidenceLines = record.evidence.slice(0, 5).map((item) => {
    const trigger =
      item.relatedIngredients.length > 0
        ? ` - triggered by ${item.relatedIngredients.join(", ")}`
        : "";
    return `${item.status}: ${item.name}${trigger}`;
  });
  document.text(
    document.splitTextToSize(evidenceLines.map((line) => `- ${line}`).join("\n"), 112),
    left,
    187,
  );

  document.setDrawColor(20, 92, 74);
  document.setLineWidth(0.5);
  document.circle(162, 116, 22);
  document.setFont("times", "bold");
  document.setTextColor(20, 92, 74);
  document.setFontSize(13);
  document.text("READY", 162, 114, { align: "center" });
  document.setFont("helvetica", "normal");
  document.setFontSize(7);
  document.text("PRE-CERTIFICATION", 162, 121, { align: "center" });

  document.addImage(qrImage, "PNG", 143, 181, 38, 38);
  document.setFontSize(7);
  document.setTextColor(79, 89, 84);
  document.text("Scan to view this local", 162, 223, { align: "center" });
  document.text("assessment record", 162, 227, { align: "center" });

  document.setDrawColor(215, 207, 188);
  document.line(left, 242, right, 242);
  document.setFontSize(8);
  document.setTextColor(79, 89, 84);
  const disclaimerLines = document.splitTextToSize(record.disclaimer, right - left);
  document.text(disclaimerLines, left, 250);
  document.setFont("helvetica", "bold");
  document.text("Verification is available on the issuing device for this demo.", left, 265);

  document.save(`${record.id}-export-readiness-certificate.pdf`);
}
