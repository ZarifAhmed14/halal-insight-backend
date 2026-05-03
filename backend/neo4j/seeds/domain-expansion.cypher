// HalalIQ domain expansion seed data.
// Run this after the base food graph exists.
// The script uses MERGE so it can be rerun safely during development.

CREATE CONSTRAINT domain_name IF NOT EXISTS
FOR (domain:Domain)
REQUIRE domain.name IS UNIQUE;

CREATE CONSTRAINT ingredient_name IF NOT EXISTS
FOR (ingredient:Ingredient)
REQUIRE ingredient.name IS UNIQUE;

CREATE CONSTRAINT market_name IF NOT EXISTS
FOR (market:Market)
REQUIRE market.name IS UNIQUE;

CREATE CONSTRAINT document_requirement_name IF NOT EXISTS
FOR (document:DocumentRequirement)
REQUIRE document.name IS UNIQUE;

UNWIND [
  { name: "food", label: "Food" },
  { name: "cosmetics", label: "Cosmetics & Personal Care" },
  { name: "export_compliance", label: "Export Compliance" },
  { name: "pharmaceuticals", label: "Pharmaceuticals" }
] AS domainRow
MERGE (domain:Domain { name: domainRow.name })
SET domain.label = domainRow.label;

UNWIND [
  { name: "Malaysia", authority: "JAKIM" },
  { name: "Indonesia", authority: "BPJPH" },
  { name: "UAE", authority: "ESMA / UAE halal requirements" },
  { name: "United Kingdom", authority: "HFA / HMC style market review" },
  { name: "European Union", authority: "EU-facing export documentation review" }
] AS marketRow
MERGE (market:Market { name: marketRow.name })
SET market.authority = marketRow.authority;

UNWIND [
  "Supplier declaration",
  "Animal-origin statement",
  "Alcohol content statement",
  "Vegan or plant-origin proof",
  "Halal certificate",
  "Target-market halal certificate",
  "Authority-specific checklist",
  "Label compliance evidence",
  "Importer or distributor declaration",
  "Ingredient specification sheet"
] AS documentName
MERGE (:DocumentRequirement { name: documentName });

UNWIND [
  {
    domain: "cosmetics",
    ingredient: "Alcohol",
    risk: "Medium",
    reason: "Alcohol in cosmetics may require technical review because source, concentration, and use case can affect halal acceptability.",
    documents: ["Alcohol content statement", "Supplier declaration"],
    markets: ["Malaysia", "Indonesia", "UAE"]
  },
  {
    domain: "cosmetics",
    ingredient: "Collagen",
    risk: "High",
    reason: "Collagen can be animal-derived, so halal readiness depends on verified animal source and halal processing evidence.",
    documents: ["Animal-origin statement", "Halal certificate", "Supplier declaration"],
    markets: ["Malaysia", "Indonesia", "UAE"]
  },
  {
    domain: "cosmetics",
    ingredient: "Glycerin",
    risk: "Medium",
    reason: "Glycerin may be plant-derived, synthetic, or animal-derived, so supplier origin evidence is required before certification review.",
    documents: ["Vegan or plant-origin proof", "Supplier declaration"],
    markets: ["Malaysia", "Indonesia", "UAE"]
  },
  {
    domain: "cosmetics",
    ingredient: "Keratin",
    risk: "High",
    reason: "Keratin is commonly animal-derived and should be treated as a blocker unless halal source documentation is available.",
    documents: ["Animal-origin statement", "Halal certificate"],
    markets: ["Malaysia", "Indonesia", "UAE"]
  },
  {
    domain: "cosmetics",
    ingredient: "Lanolin",
    risk: "Medium",
    reason: "Lanolin is sheep-derived and needs animal-origin and processing evidence for halal cosmetic review.",
    documents: ["Animal-origin statement", "Supplier declaration"],
    markets: ["Malaysia", "Indonesia", "UAE"]
  },
  {
    domain: "cosmetics",
    ingredient: "Carmine",
    risk: "Critical",
    reason: "Carmine is insect-derived and is a high-priority halal concern in cosmetics and personal care products.",
    documents: ["Animal-origin statement", "Halal certificate"],
    markets: ["Malaysia", "Indonesia", "UAE"]
  },
  {
    domain: "cosmetics",
    ingredient: "Fragrance",
    risk: "Medium",
    reason: "Fragrance blends can contain alcohol carriers or undisclosed animal-derived materials, so formulation disclosure is required.",
    documents: ["Alcohol content statement", "Supplier declaration", "Ingredient specification sheet"],
    markets: ["Malaysia", "Indonesia", "UAE"]
  },
  {
    domain: "export_compliance",
    ingredient: "E471",
    risk: "Medium",
    reason: "E471 may be acceptable only when origin and certification evidence meet the target export authority requirements.",
    documents: ["Target-market halal certificate", "Ingredient specification sheet", "Authority-specific checklist"],
    markets: ["Malaysia", "UAE", "United Kingdom", "European Union"]
  },
  {
    domain: "export_compliance",
    ingredient: "Gelatin",
    risk: "Critical",
    reason: "Gelatin is a major export-readiness blocker unless the species, slaughter status, and halal certification evidence are verified for the destination market.",
    documents: ["Target-market halal certificate", "Animal-origin statement", "Authority-specific checklist"],
    markets: ["Malaysia", "UAE", "United Kingdom", "European Union"]
  },
  {
    domain: "export_compliance",
    ingredient: "Natural Flavor",
    risk: "Medium",
    reason: "Natural flavors can contain carriers, alcohol, or animal-derived subcomponents that destination authorities may require manufacturers to disclose.",
    documents: ["Ingredient specification sheet", "Label compliance evidence", "Supplier declaration"],
    markets: ["Malaysia", "UAE", "United Kingdom", "European Union"]
  }
] AS riskRow
MATCH (domain:Domain { name: riskRow.domain })
MERGE (ingredient:Ingredient { name: riskRow.ingredient })
MERGE (risk:Risk { level: riskRow.risk, reason: riskRow.reason, domain: riskRow.domain })
MERGE (ingredient)-[:HAS_RISK]->(risk)
MERGE (risk)-[:APPLIES_TO_DOMAIN]->(domain)
WITH ingredient, riskRow
UNWIND riskRow.documents AS documentName
MATCH (document:DocumentRequirement { name: documentName })
MERGE (ingredient)-[:REQUIRES_DOCUMENT]->(document)
WITH ingredient, riskRow
UNWIND riskRow.markets AS marketName
MATCH (market:Market { name: marketName })
MERGE (ingredient)-[:AFFECTS_MARKET]->(market);
