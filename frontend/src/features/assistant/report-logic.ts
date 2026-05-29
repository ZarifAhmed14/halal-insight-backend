import type {
  ComplianceDomain,
  ComplianceEntry,
  ComplianceReport,
  OverallStatus,
} from "@/lib/halaliq-api";
import {
  DOMAIN_INGREDIENT_RULES,
  DOMAIN_OPTIONS,
  MARKET_OPTIONS,
  MARKET_PROFILES,
  type DomainIngredientRule,
  type MarketProfile,
} from "./config";

export type EvidenceDocumentStatus = "Required now" | "Review soon" | "Prepare";

export type EvidencePackItem = {
  name: string;
  status: EvidenceDocumentStatus;
  relatedIngredients: string[];
  countryNote: string;
};

export type ReadinessBrief = {
  title: "Pre-Certification Readiness Brief";
  assessmentSignature: string;
  productName: string;
  selectedCountry: string;
  productDomain: string;
  readinessDecision: OverallStatus;
  confidenceScore: number;
  scanDate: string;
  blockerSummary: string;
  reviewSummary: string;
  requiredEvidence: EvidencePackItem[];
  recommendedNextStep: string;
  disclaimer: string;
};

export type ReplacementAlternative = {
  name: string;
  reason: string;
};

export type ReplacementScenario = {
  ingredient: string;
  lane: "blocker" | "warning";
  alternatives: ReplacementAlternative[];
  projectedStatus: OverallStatus;
  projectedConfidence: number;
  projectedBlockers: number;
  projectedWarnings: number;
  impactSummary: string;
};

// Backward-compat alias while assistant UI moves to the new naming.
export type EvidenceDocumentItem = EvidencePackItem;

export function getDomainLabel(domain: ComplianceDomain | undefined): string {
  return DOMAIN_OPTIONS.find((option) => option.value === domain)?.label ?? "Food";
}

export function getMarketLabel(market: string): string {
  return MARKET_OPTIONS.find((option) => option.value === market)?.label ?? market;
}

function getRiskPriority(risk: string): number {
  const normalizedRisk = risk.trim().toLowerCase();
  if (normalizedRisk === "critical") return 4;
  if (normalizedRisk === "high") return 3;
  if (normalizedRisk === "medium") return 2;
  if (normalizedRisk === "low") return 1;
  return 0;
}

function findDomainIngredientRule(
  domain: ComplianceDomain,
  ingredient: string,
): DomainIngredientRule | null {
  const normalizedIngredient = ingredient.trim().toLowerCase();
  return (
    DOMAIN_INGREDIENT_RULES.find(
      (rule) =>
        rule.domains.includes(domain) &&
        rule.matchers.some((matcher) => normalizedIngredient.includes(matcher)),
    ) ?? null
  );
}

export function getMarketProfile(market: string): MarketProfile {
  return (
    MARKET_PROFILES[market] ?? {
      label: market,
      confidenceAdjustment: -4,
      warningNote: `Needs market-specific evidence for ${market}`,
      readinessSummary: {
        "Low Risk": `Ready for ${market} review`,
        "Needs Review": `Needs more evidence for ${market} review`,
        "Not Ready": `Not ready for ${market} submission`,
      },
      defaultDocuments: ["Ingredient source proof", "Supplier documents", "Traceability record"],
      strictBlockerIngredients: [],
      strictReviewIngredients: ["flavor", "gelatin"],
    }
  );
}

function mergeUniqueStrings(left: string[], right: string[]): string[] {
  return Array.from(new Set([...left, ...right]));
}

function applyDomainRuleToEntry(entry: ComplianceEntry, domain: ComplianceDomain): ComplianceEntry {
  const matchingRule = findDomainIngredientRule(domain, entry.ingredient);

  if (!matchingRule) {
    return entry;
  }

  return {
    ...entry,
    risk: matchingRule.risk,
    reasoning: matchingRule.reasoning,
    required_documents: mergeUniqueStrings(
      entry.required_documents,
      matchingRule.requiredDocuments,
    ),
  };
}

export function applyDomainKnowledgeToReport(
  report: ComplianceReport,
  domain: ComplianceDomain,
): ComplianceReport {
  const nextEntries = [...report.blockers, ...report.warnings, ...report.safe].map((entry) =>
    applyDomainRuleToEntry(entry, domain),
  );

  const blockers = nextEntries.filter((entry) => getRiskPriority(entry.risk) >= 4);
  const warnings = nextEntries.filter((entry) => getRiskPriority(entry.risk) === 3);
  const safe = nextEntries.filter((entry) => getRiskPriority(entry.risk) <= 2);
  const overallStatus: OverallStatus =
    blockers.length > 0 ? "Not Ready" : warnings.length > 0 ? "Needs Review" : "Low Risk";

  return {
    ...report,
    domain,
    overall_status: overallStatus,
    blockers,
    warnings,
    safe,
    summary: {
      ...report.summary,
      blockers_count: blockers.length,
      warnings_count: warnings.length,
      human_readable: `${report.product_name} was analyzed for ${getDomainLabel(domain)} across ${report.summary.total_ingredients} ingredient(s): ${blockers.length} blocker(s), ${warnings.length} warning(s), and ${safe.length} low-risk ingredient(s). Overall status: ${overallStatus}.`,
    },
  };
}

export function buildInternalProductName({
  productName,
  domain,
  market,
  ingredients,
}: {
  productName: string;
  domain: ComplianceDomain;
  market: string;
  ingredients: string[];
}): string {
  if (productName.trim().length > 0) {
    return productName.trim();
  }

  const ingredientCount = ingredients.length || 1;
  return `${getDomainLabel(domain)} scan with ${ingredientCount} ingredient${ingredientCount === 1 ? "" : "s"} for ${getMarketLabel(market)}`;
}

function getDisplayProductName(productName: string): string {
  const trimmedProductName = productName.trim();
  const internalFallbackPattern =
    /^(Food|Cosmetics|Pharmaceuticals|Export Compliance) scan with \d+ ingredients? for .+$/i;

  if (!trimmedProductName || internalFallbackPattern.test(trimmedProductName)) {
    return "Not provided";
  }

  return trimmedProductName;
}

function matchesMarketIngredient(entry: ComplianceEntry, matchers: string[]): boolean {
  const ingredient = entry.ingredient.toLowerCase();
  return matchers.some((matcher) => ingredient.includes(matcher));
}

function mergeRequiredDocuments(existingDocuments: string[], market: string): string[] {
  const defaults = getMarketProfile(market).defaultDocuments;
  return Array.from(new Set([...existingDocuments, ...defaults]));
}

function applyMarketRulesToEntry(
  entry: ComplianceEntry,
  market: string,
  lane: "blockers" | "warnings" | "safe",
): ComplianceEntry {
  const profile = getMarketProfile(market);
  const laneMessage =
    lane === "blockers"
      ? `${profile.warningNote}. This item should stay blocked until the country-specific evidence is complete.`
      : lane === "warnings"
        ? `${profile.warningNote}. Review the country-specific evidence before submission.`
        : `Low-risk for now, but ${profile.warningNote.toLowerCase()}.`;

  return {
    ...entry,
    risk:
      lane === "blockers"
        ? `Blocked for ${profile.label}`
        : lane === "warnings"
          ? `Review for ${profile.label}`
          : `Low risk for ${profile.label}`,
    reasoning: `${simplifyReasoning(entry)} ${laneMessage}`,
    required_documents: mergeRequiredDocuments(entry.required_documents, market),
    affected_markets: Array.from(new Set([profile.label, ...entry.affected_markets])),
  };
}

export function applyMarketRulesToReport(
  report: ComplianceReport,
  market: string,
): ComplianceReport {
  const profile = getMarketProfile(market);
  const nextBlockers = report.blockers.map((entry) =>
    applyMarketRulesToEntry(entry, market, "blockers"),
  );
  const strictWarnings = report.warnings.map((entry) =>
    applyMarketRulesToEntry(entry, market, "warnings"),
  );
  const strictSafe = report.safe.map((entry) => applyMarketRulesToEntry(entry, market, "safe"));

  const promotedWarnings = strictWarnings.filter((entry) =>
    matchesMarketIngredient(entry, profile.strictBlockerIngredients),
  );
  const remainingWarnings = strictWarnings.filter(
    (entry) => !matchesMarketIngredient(entry, profile.strictBlockerIngredients),
  );
  const promotedSafe = strictSafe.filter((entry) =>
    matchesMarketIngredient(entry, profile.strictReviewIngredients),
  );
  const remainingSafe = strictSafe.filter(
    (entry) => !matchesMarketIngredient(entry, profile.strictReviewIngredients),
  );

  const blockers = [...nextBlockers, ...promotedWarnings].map((entry) => ({
    ...entry,
    risk: `Blocked for ${profile.label}`,
  }));
  const warnings = [...remainingWarnings, ...promotedSafe].map((entry) => ({
    ...entry,
    risk: `Review for ${profile.label}`,
  }));
  const safe = remainingSafe;
  const overallStatus: OverallStatus =
    blockers.length > 0 ? "Not Ready" : warnings.length > 0 ? "Needs Review" : "Low Risk";

  return {
    ...report,
    market,
    blockers,
    warnings,
    safe,
    overall_status: overallStatus,
    summary: {
      ...report.summary,
      blockers_count: blockers.length,
      warnings_count: warnings.length,
      human_readable: profile.readinessSummary[overallStatus],
    },
  };
}

export function getMarketChecklist(report: ComplianceReport, market: string) {
  const hasBlockers = report.blockers.length > 0;
  const hasWarnings = report.warnings.length > 0;

  return [
    {
      label: "Ingredient review",
      state: hasBlockers ? "Required" : hasWarnings ? "Review" : "Ready",
    },
    {
      label: "Supplier documents",
      state: report.blockers.length + report.warnings.length > 0 ? "Required" : "Ready",
    },
    {
      label: "Traceability",
      state:
        market === "Thailand" || market === "European Union"
          ? "Required"
          : hasWarnings
            ? "Review"
            : "Ready",
    },
    {
      label: "Labeling",
      state: hasWarnings ? "Review" : "Ready",
    },
    {
      label: "Export pack readiness",
      state: hasBlockers ? "Blocked" : hasWarnings ? "Review" : "Ready",
    },
  ];
}

function getEvidenceStatusPriority(status: EvidenceDocumentStatus) {
  if (status === "Required now") return 3;
  if (status === "Review soon") return 2;
  return 1;
}

export function collectEvidenceDocuments(
  report: ComplianceReport,
  market: string,
): EvidencePackItem[] {
  const evidenceMap = new Map<string, EvidencePackItem>();
  const countryNote = getMarketProfile(market).warningNote;
  const upsertDocument = (name: string, status: EvidenceDocumentStatus, ingredient?: string) => {
    const normalizedName = name.trim();
    if (!normalizedName) return;

    const currentItem = evidenceMap.get(normalizedName);
    if (!currentItem) {
      evidenceMap.set(normalizedName, {
        name: normalizedName,
        status,
        relatedIngredients: ingredient ? [ingredient] : [],
        countryNote,
      });
      return;
    }

    if (getEvidenceStatusPriority(status) > getEvidenceStatusPriority(currentItem.status)) {
      currentItem.status = status;
    }

    if (ingredient && !currentItem.relatedIngredients.includes(ingredient)) {
      currentItem.relatedIngredients.push(ingredient);
    }
  };

  for (const entry of report.blockers) {
    for (const document of entry.required_documents) {
      upsertDocument(document, "Required now", entry.ingredient);
    }
  }

  for (const entry of report.warnings) {
    for (const document of entry.required_documents) {
      upsertDocument(document, "Review soon", entry.ingredient);
    }
  }

  for (const document of getMarketProfile(market).defaultDocuments) {
    upsertDocument(document, "Prepare");
  }

  return Array.from(evidenceMap.values()).sort((left, right) => {
    const statusDifference =
      getEvidenceStatusPriority(right.status) - getEvidenceStatusPriority(left.status);

    if (statusDifference !== 0) {
      return statusDifference;
    }

    return left.name.localeCompare(right.name);
  });
}

function formatScanDate(scanDateIso: string): string {
  const parsedDate = new Date(scanDateIso);
  if (Number.isNaN(parsedDate.getTime())) {
    return scanDateIso;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsedDate);
}

function summarizeLane(count: number, singular: string, plural: string): string {
  if (count === 0) {
    return `No ${plural} found in this scan`;
  }

  if (count === 1) {
    return `1 ${singular} needs action`;
  }

  return `${count} ${plural} need action`;
}

export function buildReadinessBrief({
  report,
  domain,
  market,
  scanDateIso,
}: {
  report: ComplianceReport;
  domain: ComplianceDomain;
  market: string;
  scanDateIso: string;
}): ReadinessBrief {
  const normalizedMarket = report.market ?? market;
  const confidenceScore = getReadinessConfidence(report.overall_status, normalizedMarket);
  const readinessCopy = getReadinessCopy(report.overall_status, normalizedMarket);
  const requiredEvidence = collectEvidenceDocuments(report, normalizedMarket);
  const assessmentSignature = [
    report.product_name.trim().toLowerCase(),
    normalizedMarket.trim().toLowerCase(),
    getDomainLabel(report.domain ?? domain).toLowerCase(),
    report.overall_status.toLowerCase(),
    ...[...report.blockers, ...report.warnings, ...report.safe]
      .map((entry) => entry.ingredient.trim().toLowerCase())
      .sort(),
  ].join("|");

  return {
    title: "Pre-Certification Readiness Brief",
    assessmentSignature,
    productName: getDisplayProductName(report.product_name),
    selectedCountry: getMarketLabel(normalizedMarket),
    productDomain: getDomainLabel(report.domain ?? domain),
    readinessDecision: report.overall_status,
    confidenceScore,
    scanDate: formatScanDate(scanDateIso),
    blockerSummary: summarizeLane(report.blockers.length, "blocker", "blockers"),
    reviewSummary: summarizeLane(report.warnings.length, "review item", "review items"),
    requiredEvidence,
    recommendedNextStep: readinessCopy.action,
    disclaimer:
      "This brief is a preparation document for certifier and export review. It is not a final religious or legal certification.",
  };
}

const REPLACEMENT_KNOWLEDGE: Array<{
  matchers: string[];
  alternatives: ReplacementAlternative[];
}> = [
  {
    matchers: ["gelatin", "gelatine"],
    alternatives: [
      {
        name: "Fish gelatin",
        reason: "Usually easier to clear when source documents are complete.",
      },
      {
        name: "Halal-certified bovine gelatin",
        reason: "Accepted when halal slaughter and supplier evidence are provided.",
      },
    ],
  },
  {
    matchers: ["carmine", "cochineal", "e120"],
    alternatives: [
      {
        name: "Beetroot color",
        reason: "Plant-based color option with simpler review.",
      },
      {
        name: "Paprika extract",
        reason: "Common plant-source replacement for red tones.",
      },
    ],
  },
  {
    matchers: ["alcohol", "ethanol", "ethyl alcohol", "wine", "beer", "spirit", "liquor"],
    alternatives: [
      {
        name: "Alcohol-free flavor carrier",
        reason: "Avoids intoxicant-based carrier concerns in review.",
      },
      {
        name: "Encapsulated dry flavor system",
        reason: "Can remove solvent concerns when correctly documented.",
      },
    ],
  },
  {
    matchers: ["shellac", "confectioner's glaze", "confectioners glaze", "e904"],
    alternatives: [
      {
        name: "Plant-based glaze",
        reason: "Removes insect-source uncertainty for certifier review.",
      },
      {
        name: "Carnauba wax coating",
        reason: "Common non-animal finishing alternative with clearer evidence path.",
      },
    ],
  },
];

function getReplacementAlternatives(ingredient: string): ReplacementAlternative[] {
  const normalizedIngredient = ingredient.trim().toLowerCase();
  const knowledgeItem = REPLACEMENT_KNOWLEDGE.find((item) =>
    item.matchers.some((matcher) => normalizedIngredient.includes(matcher)),
  );

  return knowledgeItem?.alternatives ?? [];
}

function getProjectedStatusForReplacement({
  report,
  lane,
}: {
  report: ComplianceReport;
  lane: "blocker" | "warning";
}): {
  status: OverallStatus;
  blockers: number;
  warnings: number;
} {
  const blockers =
    lane === "blocker" ? Math.max(0, report.blockers.length - 1) : report.blockers.length;
  const warnings =
    lane === "warning" ? Math.max(0, report.warnings.length - 1) : report.warnings.length;
  const status: OverallStatus =
    blockers > 0 ? "Not Ready" : warnings > 0 ? "Needs Review" : "Low Risk";

  return { status, blockers, warnings };
}

export function buildReplacementScenarios(
  report: ComplianceReport,
  market: string,
): ReplacementScenario[] {
  const scenarios: ReplacementScenario[] = [];

  const pushScenario = (entry: ComplianceEntry, lane: "blocker" | "warning") => {
    const alternatives = getReplacementAlternatives(entry.ingredient);
    if (alternatives.length === 0) return;

    const projected = getProjectedStatusForReplacement({ report, lane });
    const currentConfidence = getReadinessConfidence(report.overall_status, market);
    const projectedConfidence = Math.min(
      98,
      Math.max(currentConfidence, getReadinessConfidence(projected.status, market) + 3),
    );
    const improvesStatus = projected.status !== report.overall_status;

    scenarios.push({
      ingredient: entry.ingredient,
      lane,
      alternatives,
      projectedStatus: projected.status,
      projectedConfidence,
      projectedBlockers: projected.blockers,
      projectedWarnings: projected.warnings,
      impactSummary: improvesStatus
        ? `Replacing this ingredient would move the decision toward ${projected.status}.`
        : "Replacing this ingredient lowers risk pressure and improves document readiness.",
    });
  };

  for (const entry of report.blockers) {
    pushScenario(entry, "blocker");
  }
  for (const entry of report.warnings) {
    pushScenario(entry, "warning");
  }

  const uniqueByIngredient = new Map<string, ReplacementScenario>();
  for (const scenario of scenarios) {
    const key = scenario.ingredient.toLowerCase();
    const existing = uniqueByIngredient.get(key);
    if (!existing || (existing.lane === "warning" && scenario.lane === "blocker")) {
      uniqueByIngredient.set(key, scenario);
    }
  }

  return Array.from(uniqueByIngredient.values());
}

export function statusToVerdict(status: OverallStatus): "halal" | "haram" | "mushbooh" {
  if (status === "Not Ready") return "haram";
  if (status === "Needs Review") return "mushbooh";
  return "halal";
}

export function getReadinessConfidence(status: OverallStatus, market: string): number {
  const baseConfidence = status === "Not Ready" ? 88 : status === "Needs Review" ? 75 : 92;
  return Math.max(52, Math.min(98, baseConfidence + getMarketProfile(market).confidenceAdjustment));
}

export function simplifyReasoning(entry: ComplianceEntry): string {
  const ingredient = entry.ingredient.toLowerCase();
  const matchingRule =
    DOMAIN_INGREDIENT_RULES.find((rule) =>
      rule.matchers.some((matcher) => ingredient.includes(matcher)),
    ) ?? null;

  if (matchingRule) return matchingRule.reasoning;
  if (ingredient.includes("gelatin")) {
    return "Gelatin is usually animal-derived, so the source and halal certificate must be checked.";
  }
  if (ingredient.includes("collagen")) {
    return "Collagen often comes from animals, so the source needs to be confirmed before approval.";
  }
  if (ingredient.includes("carmine")) {
    return "Carmine is an insect-derived color, so it needs special review and evidence.";
  }

  return entry.reasoning;
}

export function getReadinessCopy(
  status: OverallStatus,
  market: string,
): {
  title: string;
  description: string;
  action: string;
} {
  const profile = getMarketProfile(market);

  if (status === "Not Ready") {
    return {
      title: profile.readinessSummary["Not Ready"],
      description:
        "This market still has blocker ingredients or stricter evidence expectations that should be resolved before submission.",
      action: `Complete the ${profile.label} evidence pack before moving forward.`,
    };
  }

  if (status === "Needs Review") {
    return {
      title: profile.readinessSummary["Needs Review"],
      description:
        "No hard blocker is stopping the product, but this market still expects additional review evidence before submission.",
      action: `Collect the ${profile.label} review documents and close the open evidence items.`,
    };
  }

  return {
    title: profile.readinessSummary["Low Risk"],
    description:
      "No blocker or warning ingredients were found after applying the current market rules and evidence checks.",
    action: `Keep the ${profile.label} documents ready and continue with the next review step.`,
  };
}

export function getToneStyles(tone: "blocker" | "warning" | "safe") {
  if (tone === "blocker") {
    return {
      card: "border-verdict-haram/25 bg-verdict-haram/5",
      badge: "border-verdict-haram/30 bg-verdict-haram/10 text-verdict-haram",
      icon: "text-verdict-haram",
      action: "Resolve before submission",
    };
  }

  if (tone === "warning") {
    return {
      card: "border-verdict-mushbooh/25 bg-verdict-mushbooh/5",
      badge: "border-verdict-mushbooh/30 bg-verdict-mushbooh/10 text-verdict-mushbooh",
      icon: "text-verdict-mushbooh",
      action: "Review supporting evidence",
    };
  }

  return {
    card: "border-verdict-halal/35 bg-verdict-halal/10",
    badge: "border-verdict-halal/40 bg-verdict-halal/15 text-verdict-halal",
    icon: "text-verdict-halal",
    action: "Ready for the next review step",
  };
}
