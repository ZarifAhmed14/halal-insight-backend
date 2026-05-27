import type { BarcodeLookupResult, ComplianceDomain, OverallStatus } from "@/lib/halaliq-api";

export const SAMPLE_SCANS = [
  {
    productName: "Chocolate Wafer Biscuit",
    ingredients: "Palm Oil\nGelatin\nVanilla Flavor",
    market: "Malaysia",
    domain: "food" as ComplianceDomain,
  },
  {
    productName: "Brightening Face Cream",
    ingredients: "Collagen\nGlycerin\nFragrance\nCarmine",
    market: "Malaysia",
    domain: "cosmetics" as ComplianceDomain,
  },
  {
    productName: "Export Compliance Demo",
    ingredients: "Palm Oil\nGelatin\nNatural Flavor\nMixed Emulsifier\nChocolate Flavor",
    market: "Thailand",
    domain: "export_compliance" as ComplianceDomain,
  },
  {
    productName: "Softgel Supplement",
    ingredients: "Gelatin\nGlycerin\nMagnesium Stearate",
    market: "Malaysia",
    domain: "pharmaceuticals" as ComplianceDomain,
  },
];

export const DEMO_BARCODE_LOOKUPS: Record<
  string,
  Pick<BarcodeLookupResult, "product_name" | "ingredients_text"> & {
    brand?: string;
  }
> = {
  "3017620422003": {
    product_name: "Nutella",
    brand: "Nutella",
    ingredients_text:
      "sugar, palm oil, hazelnuts, low-fat cocoa, skimmed milk powder, whey powder, soy lecithin, vanillin",
  },
};

export const DOMAIN_OPTIONS: Array<{
  value: ComplianceDomain;
  label: string;
  helper: string;
}> = [
  { value: "food", label: "Food", helper: "Ingredient halal readiness" },
  { value: "cosmetics", label: "Cosmetics", helper: "Personal care ingredients" },
  { value: "export_compliance", label: "Export Compliance", helper: "Market readiness checklist" },
  { value: "pharmaceuticals", label: "Pharmaceuticals", helper: "Excipients and capsules" },
];

export const MAX_IMPORTED_FILE_ROWS = 10;

export const MARKET_OPTIONS = [
  {
    value: "Malaysia",
    label: "Malaysia",
    authority: "Malaysia halal market",
    coverage: 92,
    focus: "Local halal certification readiness",
  },
  {
    value: "Thailand",
    label: "Thailand",
    authority: "Thailand halal export market",
    coverage: 82,
    focus: "Muslim-minority export and certifier readiness",
  },
  {
    value: "United Kingdom",
    label: "United Kingdom",
    authority: "HFA / HMC style review",
    coverage: 68,
    focus: "Importer and certifier review support",
  },
  {
    value: "European Union",
    label: "European Union",
    authority: "EU-facing export pack",
    coverage: 58,
    focus: "Traceability and evidence checklist",
  },
];

export type MarketProfile = {
  label: string;
  confidenceAdjustment: number;
  warningNote: string;
  readinessSummary: Record<OverallStatus, string>;
  defaultDocuments: string[];
  strictBlockerIngredients: string[];
  strictReviewIngredients: string[];
};

export const MARKET_PROFILES: Record<string, MarketProfile> = {
  Malaysia: {
    label: "Malaysia",
    confidenceAdjustment: 4,
    warningNote: "Accepted with supplier proof in Malaysia",
    readinessSummary: {
      "Low Risk": "Ready for Malaysia review",
      "Needs Review": "Needs more evidence for Malaysia review",
      "Not Ready": "Not ready for Malaysia review",
    },
    defaultDocuments: ["Halal certificate", "Supplier declaration", "Ingredient origin proof"],
    strictBlockerIngredients: [],
    strictReviewIngredients: ["flavor", "emulsifier"],
  },
  Thailand: {
    label: "Thailand",
    confidenceAdjustment: -3,
    warningNote: "Needs certifier and export evidence for Thailand",
    readinessSummary: {
      "Low Risk": "Ready for Thailand export review",
      "Needs Review": "Needs more evidence for Thailand export review",
      "Not Ready": "Not ready for Thailand export submission",
    },
    defaultDocuments: [
      "Ingredient source proof",
      "Supplier declaration",
      "Export-ready evidence pack",
      "Batch traceability",
    ],
    strictBlockerIngredients: ["gelatin", "collagen"],
    strictReviewIngredients: ["flavor", "glycerin"],
  },
  "United Kingdom": {
    label: "United Kingdom",
    confidenceAdjustment: -6,
    warningNote: "Requires certifier review for UK",
    readinessSummary: {
      "Low Risk": "Ready for UK certifier review",
      "Needs Review": "Needs more evidence for UK certifier review",
      "Not Ready": "Not ready for UK certifier review",
    },
    defaultDocuments: ["Ingredient origin proof", "Certifier-ready evidence pack"],
    strictBlockerIngredients: [],
    strictReviewIngredients: ["collagen", "carmine", "gelatin"],
  },
  "European Union": {
    label: "European Union",
    confidenceAdjustment: -10,
    warningNote: "Needs broader export evidence for EU review",
    readinessSummary: {
      "Low Risk": "Ready for EU export review",
      "Needs Review": "Needs more evidence for EU export review",
      "Not Ready": "Not ready for EU export submission",
    },
    defaultDocuments: ["Ingredient source proof", "Traceability record", "Export pack readiness"],
    strictBlockerIngredients: [],
    strictReviewIngredients: ["gelatin", "collagen", "flavor"],
  },
};

export type DomainIngredientRule = {
  domains: ComplianceDomain[];
  matchers: string[];
  risk: "Critical" | "High" | "Medium" | "Low";
  reasoning: string;
  requiredDocuments: string[];
};

export const DOMAIN_INGREDIENT_RULES: DomainIngredientRule[] = [
  {
    domains: ["food", "cosmetics", "export_compliance", "pharmaceuticals"],
    matchers: [
      "pork",
      "swine",
      "ham",
      "bacon",
      "lard",
      "pepperoni",
      "prosciutto",
      "pork rinds",
      "carnitas",
      "porcine",
      "pigskin",
      "boar bristle",
    ],
    risk: "Critical",
    reasoning:
      "This ingredient is directly linked to pork or swine, so it is a hard blocker and should not be cleared for halal review.",
    requiredDocuments: ["Ingredient replacement evidence", "Supplier declaration"],
  },
  {
    domains: ["food", "cosmetics", "export_compliance", "pharmaceuticals"],
    matchers: ["pork gelatin", "porcine enzyme", "porcine enzymes"],
    risk: "Critical",
    reasoning:
      "This is a pork-derived ingredient or processing aid, so it is a hard blocker for halal readiness.",
    requiredDocuments: ["Ingredient replacement evidence", "Supplier declaration"],
  },
  {
    domains: ["food", "export_compliance"],
    matchers: [
      "alcohol",
      "ethanol",
      "ethyl alcohol",
      "wine",
      "beer",
      "spirits",
      "liquor",
      "liquor-filled",
      "vodka",
      "rum",
      "whiskey",
      "whisky",
      "brandy",
    ],
    risk: "Critical",
    reasoning:
      "This ingredient is an intoxicant or consumption alcohol, so it is a hard blocker for halal readiness.",
    requiredDocuments: ["Alcohol-free formulation proof", "Supplier declaration"],
  },
  {
    domains: ["food", "export_compliance"],
    matchers: ["blood sausage", "black pudding", "flowing blood", "liquid blood"],
    risk: "Critical",
    reasoning: "Flowing or liquid blood is a hard blocker for halal readiness.",
    requiredDocuments: ["Ingredient replacement evidence", "Supplier declaration"],
  },
  {
    domains: ["food", "export_compliance"],
    matchers: ["carrion", "dead animal", "died naturally", "strangled animal", "gored animal"],
    risk: "Critical",
    reasoning:
      "Meat from an animal that died before proper slaughter is a hard blocker for halal readiness.",
    requiredDocuments: ["Slaughter certificate", "Supplier declaration"],
  },
  {
    domains: ["food", "export_compliance"],
    matchers: [
      "non-zabiha",
      "non zabiha",
      "non halal meat",
      "non-halal meat",
      "not halal slaughtered",
    ],
    risk: "Critical",
    reasoning:
      "Meat that is not confirmed as zabiha or halal-slaughtered is a hard blocker until replaced or proven halal.",
    requiredDocuments: ["Halal slaughter certificate", "Supplier declaration"],
  },
  {
    domains: ["food", "export_compliance"],
    matchers: ["lion", "dog meat", "wolf", "falcon", "vulture", "bird of prey"],
    risk: "Critical",
    reasoning: "Fanged predators and birds of prey are hard blockers for halal readiness.",
    requiredDocuments: ["Ingredient replacement evidence", "Supplier declaration"],
  },
  {
    domains: ["food", "cosmetics", "export_compliance", "pharmaceuticals"],
    matchers: ["gelatin", "gelatine"],
    risk: "High",
    reasoning:
      "Gelatin needs source confirmation because it may be pork-derived, non-zabiha animal-derived, fish-derived, or halal-certified.",
    requiredDocuments: ["Gelatin source certificate", "Halal certificate", "Supplier declaration"],
  },
  {
    domains: ["food", "cosmetics", "export_compliance", "pharmaceuticals"],
    matchers: ["mono- and diglycerides", "monoglyceride", "diglyceride", "e471"],
    risk: "Medium",
    reasoning:
      "Mono- and diglycerides can come from vegetable oils or animal fat, so source proof is needed before clearance.",
    requiredDocuments: ["Ingredient origin proof", "Supplier declaration", "Halal certificate"],
  },
  {
    domains: ["food", "export_compliance", "pharmaceuticals"],
    matchers: ["enzyme", "enzymes", "rennet"],
    risk: "Medium",
    reasoning:
      "Enzymes and rennet can be microbial or animal-derived, so the source and slaughter status must be verified.",
    requiredDocuments: ["Enzyme source statement", "Supplier declaration", "Halal certificate"],
  },
  {
    domains: ["food", "cosmetics", "export_compliance", "pharmaceuticals"],
    matchers: [
      "natural flavor",
      "natural flavour",
      "artificial flavor",
      "artificial flavour",
      "flavoring",
      "flavouring",
    ],
    risk: "Medium",
    reasoning:
      "Flavor ingredients can hide alcohol carriers or animal-derived subcomponents, so formulation disclosure is needed.",
    requiredDocuments: [
      "Ingredient specification sheet",
      "Alcohol-free carrier statement",
      "Supplier declaration",
    ],
  },
  {
    domains: ["food", "export_compliance"],
    matchers: ["whey"],
    risk: "Medium",
    reasoning:
      "Whey depends on the enzymes used in cheese-making, so the enzyme source must be confirmed.",
    requiredDocuments: ["Enzyme source statement", "Supplier declaration", "Halal certificate"],
  },
  {
    domains: ["food", "cosmetics", "export_compliance", "pharmaceuticals"],
    matchers: ["l-cysteine", "l cysteine", "cysteine"],
    risk: "Medium",
    reasoning:
      "L-cysteine can come from human hair, feathers, synthetic, or microbial sources, so source evidence is required.",
    requiredDocuments: ["Ingredient origin proof", "Supplier declaration"],
  },
  {
    domains: ["food", "export_compliance"],
    matchers: ["vanilla extract"],
    risk: "Medium",
    reasoning:
      "Vanilla extract often contains ethanol, so alcohol-free proof or formulation evidence is needed.",
    requiredDocuments: [
      "Alcohol-free formulation proof",
      "Ingredient specification sheet",
      "Supplier declaration",
    ],
  },
  {
    domains: ["food", "cosmetics", "export_compliance", "pharmaceuticals"],
    matchers: ["confectioner's glaze", "confectioners glaze", "shellac", "e904"],
    risk: "High",
    reasoning:
      "Confectioner's glaze and shellac are insect-derived and should stay under review until the certifier accepts the source.",
    requiredDocuments: ["Ingredient origin proof", "Certifier review note", "Supplier declaration"],
  },
  {
    domains: ["food", "cosmetics", "export_compliance", "pharmaceuticals"],
    matchers: ["stearic acid", "glycerin", "glycerol"],
    risk: "Medium",
    reasoning:
      "Stearic acid and glycerin can be plant-based, synthetic, or animal-derived, so source confirmation is required.",
    requiredDocuments: ["Vegan or plant-origin proof", "Supplier declaration"],
  },
  {
    domains: ["food", "cosmetics", "export_compliance", "pharmaceuticals"],
    matchers: ["carmine", "cochineal", "e120"],
    risk: "High",
    reasoning:
      "Carmine is made from cochineal insects and is prohibited or disputed by many reviewers, so it should stay blocked or under strict certifier review.",
    requiredDocuments: [
      "Ingredient replacement evidence",
      "Certifier review note",
      "Supplier declaration",
    ],
  },
  {
    domains: ["food", "export_compliance"],
    matchers: [
      "water",
      "salt",
      "sea salt",
      "sugar",
      "cane sugar",
      "sucrose",
      "soybean oil",
      "soy oil",
      "palm oil",
      "sunflower oil",
      "canola oil",
      "olive oil",
      "wheat flour",
      "rice flour",
      "corn flour",
      "corn starch",
      "maize starch",
      "tapioca starch",
      "cocoa powder",
      "cocoa mass",
      "hazelnut",
      "milk powder",
      "skimmed milk powder",
      "whole milk powder",
      "soy lecithin",
      "sunflower lecithin",
    ],
    risk: "Low",
    reasoning:
      "This is a common baseline food ingredient with no direct halal red flag by name, so it can stay low risk unless supplier evidence says otherwise.",
    requiredDocuments: [],
  },
  {
    domains: ["food", "export_compliance"],
    matchers: [
      "glucose syrup",
      "dextrose",
      "maltodextrin",
      "cocoa butter",
      "rice",
      "almond",
      "peanut",
      "pea protein",
      "potato starch",
    ],
    risk: "Low",
    reasoning:
      "This ingredient is commonly treated as low risk by name and usually does not need special halal escalation unless the supplier specification says otherwise.",
    requiredDocuments: [],
  },
  {
    domains: ["cosmetics", "pharmaceuticals"],
    matchers: ["water", "aqua", "purified water", "cellulose", "microcrystalline cellulose"],
    risk: "Low",
    reasoning:
      "This ingredient is commonly treated as low risk by name and usually does not need special halal escalation unless the supplier specification says otherwise.",
    requiredDocuments: [],
  },
  {
    domains: ["pharmaceuticals"],
    matchers: [
      "hypromellose",
      "hydroxypropyl methylcellulose",
      "povidone",
      "silicon dioxide",
      "colloidal silicon dioxide",
      "citric acid",
    ],
    risk: "Low",
    reasoning:
      "This excipient is usually treated as low risk by name and can stay low risk unless supplier evidence introduces a source concern.",
    requiredDocuments: [],
  },
  {
    domains: ["cosmetics"],
    matchers: ["alcohol", "ethanol", "isopropyl alcohol", "benzyl alcohol"],
    risk: "Medium",
    reasoning:
      "Alcohol in cosmetics needs source and formulation review before approval because concentration and use can change the halal decision.",
    requiredDocuments: ["Alcohol content statement", "Supplier declaration"],
  },
  {
    domains: ["cosmetics", "pharmaceuticals"],
    matchers: ["collagen"],
    risk: "High",
    reasoning:
      "Collagen is often animal-derived, so halal review depends on verified species, source, and processing evidence.",
    requiredDocuments: ["Animal-origin statement", "Halal certificate", "Supplier declaration"],
  },
  {
    domains: ["cosmetics", "pharmaceuticals"],
    matchers: ["glycerin", "glycerol"],
    risk: "Medium",
    reasoning:
      "Glycerin may be plant, synthetic, or animal-derived, so the source must be confirmed before it can be cleared.",
    requiredDocuments: ["Vegan or plant-origin proof", "Supplier declaration"],
  },
  {
    domains: ["cosmetics"],
    matchers: ["keratin"],
    risk: "High",
    reasoning:
      "Keratin is commonly animal-derived, so it should stay under strict review until halal source evidence is available.",
    requiredDocuments: ["Animal-origin statement", "Halal certificate"],
  },
  {
    domains: ["cosmetics"],
    matchers: ["lanolin"],
    risk: "Medium",
    reasoning:
      "Lanolin comes from sheep wool, so the animal-source and processing route should be documented for halal cosmetic review.",
    requiredDocuments: ["Animal-origin statement", "Supplier declaration"],
  },
  {
    domains: ["cosmetics"],
    matchers: ["carmine", "cochineal"],
    risk: "Critical",
    reasoning:
      "Carmine is insect-derived, so it is a strong halal concern and should not be cleared without careful review.",
    requiredDocuments: ["Animal-origin statement", "Halal certificate"],
  },
  {
    domains: ["cosmetics"],
    matchers: ["fragrance", "parfum", "perfume"],
    risk: "Medium",
    reasoning:
      "Fragrance blends can hide alcohol carriers or animal-derived subcomponents, so formulation disclosure is needed before halal review.",
    requiredDocuments: [
      "Alcohol content statement",
      "Supplier declaration",
      "Ingredient specification sheet",
    ],
  },
  {
    domains: ["cosmetics", "pharmaceuticals"],
    matchers: ["beeswax", "cera alba", "propolis"],
    risk: "Medium",
    reasoning:
      "Bee-derived ingredients can be acceptable or debated depending on the certifier, so they should stay under documented review.",
    requiredDocuments: ["Ingredient origin proof", "Certifier review note", "Supplier declaration"],
  },
  {
    domains: ["cosmetics", "pharmaceuticals"],
    matchers: ["stearic acid"],
    risk: "Medium",
    reasoning:
      "Stearic acid can come from plant or animal fat, so halal review depends on clear source documentation.",
    requiredDocuments: [
      "Animal-origin statement",
      "Vegan or plant-origin proof",
      "Supplier declaration",
    ],
  },
  {
    domains: ["cosmetics"],
    matchers: ["cetearyl alcohol", "cetyl alcohol", "stearyl alcohol"],
    risk: "Medium",
    reasoning:
      "Fatty alcohols such as cetearyl alcohol can be plant- or animal-derived, so source evidence is needed before approval.",
    requiredDocuments: ["Vegan or plant-origin proof", "Supplier declaration"],
  },
  {
    domains: ["cosmetics", "pharmaceuticals"],
    matchers: ["polysorbate", "sorbitan monostearate", "sorbitan tristearate"],
    risk: "Medium",
    reasoning:
      "Polysorbates and related emulsifiers may involve fatty-acid feedstocks that need source confirmation during halal review.",
    requiredDocuments: [
      "Ingredient specification sheet",
      "Supplier declaration",
      "Vegan or plant-origin proof",
    ],
  },
  {
    domains: ["cosmetics", "pharmaceuticals"],
    matchers: ["shellac"],
    risk: "High",
    reasoning:
      "Shellac is insect-derived, so it should be treated as a strong halal concern until reviewed carefully.",
    requiredDocuments: ["Animal-origin statement", "Halal certificate"],
  },
  {
    domains: ["pharmaceuticals"],
    matchers: ["gelatin", "gelatine"],
    risk: "Critical",
    reasoning:
      "Gelatin in capsules or excipients is a major halal concern because species and halal processing must be verified clearly.",
    requiredDocuments: [
      "Gelatin source certificate",
      "Capsule shell declaration",
      "Halal certificate",
    ],
  },
  {
    domains: ["pharmaceuticals"],
    matchers: ["magnesium stearate"],
    risk: "Medium",
    reasoning:
      "Magnesium stearate is a common excipient, but its fatty-acid source should be verified before halal review can treat it as low risk.",
    requiredDocuments: ["Excipient origin statement", "Supplier declaration"],
  },
  {
    domains: ["pharmaceuticals"],
    matchers: ["pepsin", "trypsin"],
    risk: "High",
    reasoning:
      "Enzymes such as pepsin and trypsin can come from animal sources, so halal review depends on verified origin and processing evidence.",
    requiredDocuments: [
      "Animal-origin statement",
      "Halal certificate",
      "Scholar or technical review note",
    ],
  },
  {
    domains: ["pharmaceuticals"],
    matchers: ["capsule shell", "softgel", "soft gel", "hard capsule", "capsule material"],
    risk: "High",
    reasoning:
      "Capsule shell materials often require dedicated halal review because they may contain gelatin or other animal-derived inputs.",
    requiredDocuments: [
      "Capsule shell declaration",
      "Gelatin source certificate",
      "Halal certificate",
    ],
  },
];
