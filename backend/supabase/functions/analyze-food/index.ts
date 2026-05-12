import { serve } from "https://deno.land/std@0.168.0/http/server.ts"; // This imports the HTTP server helper because Supabase Edge Functions use it to receive and answer requests.
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2"; // This imports the Supabase client because we need to save submissions and reports into Supabase tables.
import neo4j from "npm:neo4j-driver@6"; // This imports the Neo4j driver because the function queries halal risk data from Neo4j.
type OverallStatus = "Not Ready" | "Needs Review" | "Low Risk"; // This type keeps the allowed product-level statuses explicit so the API response stays predictable.
type ComplianceDomain = "food" | "cosmetics" | "export_compliance" | "pharmaceuticals"; // This type lists the product domains HalalIQ understands so the API can grow beyond food safely.
type ValidatedInput = { // This type describes the safe request shape that exists after validation succeeds.
  product_name: string; // This field stores the validated product name because the report now needs product-level output.
  ingredients: string[]; // This field stores the original validated ingredient strings so normalization can happen after validation.
  market: string; // This field stores the cleaned market string because later layers depend on a real market value.
  domain: ComplianceDomain; // This field stores the validated compliance domain so food, cosmetics, export, and pharma scans stay explicit.
}; // This line closes the ValidatedInput type definition so TypeScript knows the shape is complete.
type ValidationSuccess = { // This type describes the shape of a successful validation result.
  success: true; // This flag tells the rest of the code that validation passed and the data is safe to use.
  data: ValidatedInput; // This field carries the validated request payload into the next layer of the function.
}; // This line closes the ValidationSuccess type definition so the success result is fully described.
type ValidationFailure = { // This type describes the shape of a failed validation result.
  success: false; // This flag tells the rest of the code that validation failed and processing should stop.
  error: string; // This field stores a clear message that we can return to the client in a 400 response.
}; // This line closes the ValidationFailure type definition so the failure result is fully described.
type ValidationResult = ValidationSuccess | ValidationFailure; // This union lets one validator return either a success result or a failure result in a type-safe way.
type QueriedIngredientRisk = { // This type describes one row returned from the Neo4j query layer.
  ingredient: string; // This field stores the ingredient name returned by the graph query.
  risk: string; // This field stores the risk level connected to the ingredient.
  reasoning_source: string; // This field stores any explanatory text returned from the risk node when available.
  required_documents: string[]; // This field stores the document requirements returned by the graph query.
  affected_markets: string[]; // This field stores the markets affected by the ingredient according to the graph.
}; // This line closes the QueriedIngredientRisk type definition so the query-layer shape is explicit.
type ComplianceEntry = { // This type describes one final business-logic entry that the frontend will consume.
  ingredient: string; // This field stores the ingredient name in the final response.
  risk: string; // This field stores the final risk label that determines whether the ingredient is a blocker, warning, or safe.
  reasoning: string; // This field stores the human-readable explanation for why the ingredient belongs in its category.
  required_documents: string[]; // This field stores the unique supporting document names for the ingredient.
  affected_markets: string[]; // This field stores the unique affected markets for the ingredient.
}; // This line closes the ComplianceEntry type definition so the final entry shape is explicit.
type ComplianceSummary = { // This type describes the grouped business-logic result before we build the final report wrapper.
  blockers: ComplianceEntry[]; // This field stores ingredients with High or Critical risk.
  warnings: ComplianceEntry[]; // This field stores ingredients with Medium risk.
  safe: ComplianceEntry[]; // This field stores ingredients with Low risk.
}; // This line closes the ComplianceSummary type definition so the grouped output is explicit.
type ReportSummary = { // This type describes the compact summary block returned to the frontend.
  total_ingredients: number; // This field stores how many normalized ingredients were processed.
  blockers_count: number; // This field stores how many blocker entries were found.
  warnings_count: number; // This field stores how many warning entries were found.
  human_readable: string; // This field stores a short sentence that the frontend can show directly to a user.
}; // This line closes the ReportSummary type definition so the summary shape is explicit.
type ComplianceReport = { // This type describes the final API response format returned by the function.
  product_name: string; // This field stores the product name because the response now supports product-level analysis.
  domain: ComplianceDomain; // This field stores the product domain because the frontend and stored report need domain context.
  overall_status: OverallStatus; // This field stores the computed overall product status derived from blocker and warning counts.
  summary: ReportSummary; // This field stores the top-level summary block that helps the frontend render quickly.
  blockers: ComplianceEntry[]; // This field stores blocker entries in a stable array.
  warnings: ComplianceEntry[]; // This field stores warning entries in a stable array.
  safe: ComplianceEntry[]; // This field stores safe entries in a stable array.
}; // This line closes the ComplianceReport type definition so the final response shape is explicit.
type PersistedReportRecord = { // This type describes the database IDs returned after saving the submission and report.
  submission_id: string | number; // This field stores the inserted submission record ID so the write result is traceable.
  report_id: string | number; // This field stores the inserted report record ID so the saved report is traceable.
}; // This line closes the PersistedReportRecord type definition so the persistence result is explicit.
type AggregatedComplianceEntry = { // This type describes the temporary aggregation shape used while merging duplicate query rows.
  ingredient: string; // This field stores the unique ingredient name that is being aggregated.
  risk: string; // This field stores the highest-priority risk label found for the ingredient.
  risk_priority: number; // This field stores the numeric severity so comparing risk levels stays simple and reliable.
  reasoning_parts: Set<string>; // This field stores unique reasoning snippets before they are joined into one final explanation.
  required_documents: Set<string>; // This field stores unique required documents before they are converted back into an array.
  affected_markets: Set<string>; // This field stores unique affected markets before they are converted back into an array.
}; // This line closes the AggregatedComplianceEntry type definition so the aggregation shape is explicit.
type IngredientKnowledgeRule = { // This type describes one local fallback knowledge rule used when graph coverage is incomplete.
  domains: ComplianceDomain[]; // This field stores which product domains should use the rule.
  matchers: string[]; // This field stores lowercase ingredient fragments that should trigger the rule.
  risk: "Critical" | "High" | "Medium" | "Low"; // This field stores the fallback severity for matching ingredients.
  reasoning: string; // This field stores the plain-language explanation returned when the rule matches.
  documents: string[]; // This field stores the evidence list returned with the fallback rule.
}; // This line closes the IngredientKnowledgeRule type definition so local fallback knowledge stays explicit.
let cachedDriver: neo4j.Driver | null = null; // This variable stores a reusable Neo4j driver so we do not reconnect on every request.
let cachedSupabaseClient: SupabaseClient | null = null; // This variable stores a reusable Supabase client so we do not recreate it on every request.
const allowedDomains: ComplianceDomain[] = ["food", "cosmetics", "export_compliance", "pharmaceuticals"]; // This array defines the domain rollout order, with export compliance intentionally second after cosmetics.
const ingredientKnowledgeRules: IngredientKnowledgeRule[] = [ // This local knowledge map keeps obvious blockers and source-dependent ingredients useful before every ingredient exists in Neo4j.
  {
    domains: ["food", "cosmetics", "export_compliance", "pharmaceuticals"],
    matchers: ["pork", "swine", "ham", "bacon", "lard", "pepperoni", "prosciutto", "pork rinds", "carnitas", "porcine", "pigskin", "boar bristle"],
    risk: "Critical",
    reasoning:
      "This ingredient is directly linked to pork or swine, so it is a hard blocker and should not be cleared for halal review.",
    documents: ["Ingredient replacement evidence", "Supplier declaration"],
  },
  {
    domains: ["food", "cosmetics", "export_compliance", "pharmaceuticals"],
    matchers: ["pork gelatin", "porcine enzyme", "porcine enzymes"],
    risk: "Critical",
    reasoning:
      "This is a pork-derived ingredient or processing aid, so it is a hard blocker for halal readiness.",
    documents: ["Ingredient replacement evidence", "Supplier declaration"],
  },
  {
    domains: ["food", "export_compliance"],
    matchers: ["alcohol", "ethanol", "ethyl alcohol", "wine", "beer", "spirits", "liquor", "liquor-filled", "vodka", "rum", "whiskey", "whisky", "brandy"],
    risk: "Critical",
    reasoning:
      "This ingredient is an intoxicant or consumption alcohol, so it is a hard blocker for halal readiness.",
    documents: ["Alcohol-free formulation proof", "Supplier declaration"],
  },
  {
    domains: ["food", "export_compliance"],
    matchers: ["blood sausage", "black pudding", "flowing blood", "liquid blood"],
    risk: "Critical",
    reasoning:
      "Flowing or liquid blood is a hard blocker for halal readiness.",
    documents: ["Ingredient replacement evidence", "Supplier declaration"],
  },
  {
    domains: ["food", "export_compliance"],
    matchers: ["carrion", "dead animal", "died naturally", "strangled animal", "gored animal"],
    risk: "Critical",
    reasoning:
      "Meat from an animal that died before proper slaughter is a hard blocker for halal readiness.",
    documents: ["Slaughter certificate", "Supplier declaration"],
  },
  {
    domains: ["food", "export_compliance"],
    matchers: ["non-zabiha", "non zabiha", "non halal meat", "non-halal meat", "not halal slaughtered"],
    risk: "Critical",
    reasoning:
      "Meat that is not confirmed as zabiha or halal-slaughtered is a hard blocker until replaced or proven halal.",
    documents: ["Halal slaughter certificate", "Supplier declaration"],
  },
  {
    domains: ["food", "export_compliance"],
    matchers: ["lion", "dog meat", "wolf", "falcon", "vulture", "bird of prey"],
    risk: "Critical",
    reasoning:
      "Fanged predators and birds of prey are hard blockers for halal readiness.",
    documents: ["Ingredient replacement evidence", "Supplier declaration"],
  },
  {
    domains: ["food", "cosmetics", "export_compliance", "pharmaceuticals"],
    matchers: ["gelatin", "gelatine"],
    risk: "High",
    reasoning:
      "Gelatin needs source confirmation because it may be pork-derived, non-zabiha animal-derived, fish-derived, or halal-certified.",
    documents: ["Gelatin source certificate", "Halal certificate", "Supplier declaration"],
  },
  {
    domains: ["food", "cosmetics", "export_compliance", "pharmaceuticals"],
    matchers: ["mono- and diglycerides", "monoglyceride", "diglyceride", "e471"],
    risk: "Medium",
    reasoning:
      "Mono- and diglycerides can come from vegetable oils or animal fat, so source proof is needed before clearance.",
    documents: ["Ingredient origin proof", "Supplier declaration", "Halal certificate"],
  },
  {
    domains: ["food", "export_compliance", "pharmaceuticals"],
    matchers: ["enzyme", "enzymes", "rennet"],
    risk: "Medium",
    reasoning:
      "Enzymes and rennet can be microbial or animal-derived, so the source and slaughter status must be verified.",
    documents: ["Enzyme source statement", "Supplier declaration", "Halal certificate"],
  },
  {
    domains: ["food", "cosmetics", "export_compliance", "pharmaceuticals"],
    matchers: ["natural flavor", "natural flavour", "artificial flavor", "artificial flavour", "flavoring", "flavouring"],
    risk: "Medium",
    reasoning:
      "Flavor ingredients can hide alcohol carriers or animal-derived subcomponents, so formulation disclosure is needed.",
    documents: ["Ingredient specification sheet", "Alcohol-free carrier statement", "Supplier declaration"],
  },
  {
    domains: ["food", "export_compliance"],
    matchers: ["whey"],
    risk: "Medium",
    reasoning:
      "Whey depends on the enzymes used in cheese-making, so the enzyme source must be confirmed.",
    documents: ["Enzyme source statement", "Supplier declaration", "Halal certificate"],
  },
  {
    domains: ["food", "cosmetics", "export_compliance", "pharmaceuticals"],
    matchers: ["l-cysteine", "l cysteine", "cysteine"],
    risk: "Medium",
    reasoning:
      "L-cysteine can come from human hair, feathers, synthetic, or microbial sources, so source evidence is required.",
    documents: ["Ingredient origin proof", "Supplier declaration"],
  },
  {
    domains: ["food", "export_compliance"],
    matchers: ["vanilla extract"],
    risk: "Medium",
    reasoning:
      "Vanilla extract often contains ethanol, so alcohol-free proof or formulation evidence is needed.",
    documents: ["Alcohol-free formulation proof", "Ingredient specification sheet", "Supplier declaration"],
  },
  {
    domains: ["food", "cosmetics", "export_compliance", "pharmaceuticals"],
    matchers: ["confectioner's glaze", "confectioners glaze", "shellac", "e904"],
    risk: "High",
    reasoning:
      "Confectioner's glaze and shellac are insect-derived and should stay under review until the certifier accepts the source.",
    documents: ["Ingredient origin proof", "Certifier review note", "Supplier declaration"],
  },
  {
    domains: ["food", "cosmetics", "export_compliance", "pharmaceuticals"],
    matchers: ["stearic acid", "glycerin", "glycerol"],
    risk: "Medium",
    reasoning:
      "Stearic acid and glycerin can be plant-based, synthetic, or animal-derived, so source confirmation is required.",
    documents: ["Vegan or plant-origin proof", "Supplier declaration"],
  },
  {
    domains: ["food", "cosmetics", "export_compliance", "pharmaceuticals"],
    matchers: ["carmine", "cochineal", "e120"],
    risk: "High",
    reasoning:
      "Carmine is made from cochineal insects and is prohibited or disputed by many reviewers, so it should stay blocked or under strict certifier review.",
    documents: ["Ingredient replacement evidence", "Certifier review note", "Supplier declaration"],
  },
  {
    domains: ["cosmetics"],
    matchers: ["alcohol", "ethanol", "isopropyl alcohol", "benzyl alcohol"],
    risk: "Medium",
    reasoning:
      "Alcohol in cosmetics can be acceptable or problematic depending on source, concentration, and function, so supplier evidence is needed before approval.",
    documents: ["Alcohol content statement", "Supplier declaration"],
  },
  {
    domains: ["cosmetics", "pharmaceuticals"],
    matchers: ["collagen"],
    risk: "High",
    reasoning:
      "Collagen is often animal-derived, so halal readiness depends on verified species, source, and processing evidence.",
    documents: ["Animal-origin statement", "Halal certificate", "Supplier declaration"],
  },
  {
    domains: ["cosmetics", "pharmaceuticals"],
    matchers: ["glycerin", "glycerol"],
    risk: "Medium",
    reasoning:
      "Glycerin may be plant, synthetic, or animal-derived, so the manufacturer needs origin evidence before halal review can clear it.",
    documents: ["Vegan or plant-origin proof", "Supplier declaration"],
  },
  {
    domains: ["cosmetics"],
    matchers: ["keratin"],
    risk: "High",
    reasoning:
      "Keratin is commonly sourced from animal material, so it should stay under strict review until halal source evidence is available.",
    documents: ["Animal-origin statement", "Halal certificate"],
  },
  {
    domains: ["cosmetics"],
    matchers: ["lanolin"],
    risk: "Medium",
    reasoning:
      "Lanolin comes from sheep wool, so the animal-source and processing route should be documented for halal cosmetic review.",
    documents: ["Animal-origin statement", "Supplier declaration"],
  },
  {
    domains: ["cosmetics"],
    matchers: ["carmine", "cochineal"],
    risk: "Critical",
    reasoning:
      "Carmine is insect-derived, so it is a high-priority halal concern and should not be cleared without strong review evidence.",
    documents: ["Animal-origin statement", "Halal certificate"],
  },
  {
    domains: ["cosmetics"],
    matchers: ["fragrance", "parfum", "perfume"],
    risk: "Medium",
    reasoning:
      "Fragrance blends can hide alcohol carriers or animal-derived subcomponents, so formulation disclosure is needed before halal review.",
    documents: ["Alcohol content statement", "Supplier declaration", "Ingredient specification sheet"],
  },
  {
    domains: ["cosmetics", "pharmaceuticals"],
    matchers: ["stearic acid"],
    risk: "Medium",
    reasoning:
      "Stearic acid can come from plant or animal fat, so halal review depends on clear source documentation.",
    documents: ["Animal-origin statement", "Vegan or plant-origin proof", "Supplier declaration"],
  },
  {
    domains: ["cosmetics"],
    matchers: ["cetearyl alcohol", "cetyl alcohol", "stearyl alcohol"],
    risk: "Medium",
    reasoning:
      "Fatty alcohols such as cetearyl alcohol can be plant- or animal-derived, so source evidence is needed before approval.",
    documents: ["Vegan or plant-origin proof", "Supplier declaration"],
  },
  {
    domains: ["cosmetics", "pharmaceuticals"],
    matchers: ["polysorbate", "sorbitan monostearate", "sorbitan tristearate"],
    risk: "Medium",
    reasoning:
      "Polysorbates and related emulsifiers may involve fatty-acid feedstocks that need source confirmation during halal review.",
    documents: ["Ingredient specification sheet", "Supplier declaration", "Vegan or plant-origin proof"],
  },
  {
    domains: ["cosmetics", "pharmaceuticals"],
    matchers: ["shellac"],
    risk: "High",
    reasoning:
      "Shellac is insect-derived, so it should be treated as a strong halal concern until reviewed carefully.",
    documents: ["Animal-origin statement", "Halal certificate"],
  },
  {
    domains: ["pharmaceuticals"],
    matchers: ["gelatin", "gelatine"],
    risk: "Critical",
    reasoning:
      "Gelatin in capsules or excipients is a major halal concern because species and halal processing must be verified clearly.",
    documents: ["Gelatin source certificate", "Capsule shell declaration", "Halal certificate"],
  },
  {
    domains: ["pharmaceuticals"],
    matchers: ["magnesium stearate"],
    risk: "Medium",
    reasoning:
      "Magnesium stearate is a common excipient, but its fatty-acid source should be verified before halal review can treat it as low risk.",
    documents: ["Excipient origin statement", "Supplier declaration"],
  },
  {
    domains: ["pharmaceuticals"],
    matchers: ["pepsin", "trypsin"],
    risk: "High",
    reasoning:
      "Enzymes such as pepsin and trypsin can come from animal sources, so halal review depends on verified origin and processing evidence.",
    documents: ["Animal-origin statement", "Halal certificate", "Scholar or technical review note"],
  },
  {
    domains: ["pharmaceuticals"],
    matchers: ["capsule shell", "softgel", "soft gel", "hard capsule", "capsule material"],
    risk: "High",
    reasoning:
      "Capsule shell materials often require dedicated halal review because they may contain gelatin or other animal-derived inputs.",
    documents: ["Capsule shell declaration", "Gelatin source certificate", "Halal certificate"],
  },
]; // This line closes the local ingredient knowledge map so domain fallback logic can reuse it.
const corsHeaders = { // This object stores CORS headers so browser-based frontends are allowed to call this Edge Function.
  "Access-Control-Allow-Origin": "*", // This allows any frontend origin to call the function, which is useful while the app is still moving between local and hosted URLs.
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", // This allows Supabase auth headers and JSON headers to pass through browser preflight checks.
  "Access-Control-Allow-Methods": "POST, OPTIONS", // This allows the real POST request and the browser's OPTIONS preflight request.
}; // This line closes the reusable CORS header object so response helpers can include it consistently.
function createJsonResponse(body: unknown, status = 200): Response { // This helper creates JSON responses in one place so the handler stays clean and consistent.
  return new Response(JSON.stringify(body), { // This builds an HTTP response and serializes the given value into JSON text.
    status, // This sets the HTTP status code so the client can tell whether the request succeeded or failed.
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" }, // This tells the client that the body is JSON and includes CORS headers for browser calls.
  }); // This line closes the response options object passed into the Response constructor.
} // This line closes the createJsonResponse helper so the rest of the file can reuse it.
function isPlainObject(value: unknown): value is Record<string, unknown> { // This helper checks that the request body is a normal object before we read properties from it.
  return typeof value === "object" && value !== null && !Array.isArray(value); // This returns true only for non-null objects that are not arrays, which protects later property access.
} // This line closes the isPlainObject helper so validation can reuse it.
function isComplianceDomain(value: string): value is ComplianceDomain { // This helper checks whether a string is one of the supported compliance domains.
  return allowedDomains.includes(value as ComplianceDomain); // This returns true only for allowed domains so invalid domain names cannot enter the workflow.
} // This line closes the isComplianceDomain helper so validation can reuse it.
function getDomainLabel(domain: ComplianceDomain): string { // This helper converts internal domain codes into friendly labels for report text.
  if (domain === "food") { // This checks whether the scan is using the original food compliance workflow.
    return "Food"; // This returns the human-readable label for the food domain.
  } // This line closes the food label branch so other domains can be checked.
  if (domain === "cosmetics") { // This checks whether the scan is for cosmetics and personal care products.
    return "Cosmetics & Personal Care"; // This returns the human-readable label for the cosmetics domain.
  } // This line closes the cosmetics label branch so export compliance can be checked next.
  if (domain === "export_compliance") { // This checks whether the scan is for export-readiness requirements.
    return "Export Compliance"; // This returns the human-readable label for the export compliance domain.
  } // This line closes the export compliance label branch so the pharmaceutical fallback can run.
  return "Pharmaceuticals"; // This returns the human-readable label for the pharmaceutical domain.
} // This line closes the getDomainLabel helper so summary and fallback logic can reuse it.
function getRequiredEnv(name: string): string { // This helper reads an environment variable and fails fast when the configuration is incomplete.
  const value = Deno.env.get(name); // This reads the environment variable from the Edge Function runtime.
  if (!value) { // This checks whether the environment variable is missing or empty.
    throw new Error(`Missing required environment variable: ${name}`); // This stops execution early with a clear configuration error message.
  } // This line closes the missing-environment-variable guard so the next line only runs for valid values.
  return value; // This returns the environment variable once we know it exists.
} // This line closes the getRequiredEnv helper so other helpers can reuse it.
function getNeo4jDriver(): neo4j.Driver { // This helper creates the Neo4j driver once and then reuses it across later requests.
  if (cachedDriver) { // This checks whether a reusable Neo4j driver already exists in memory.
    return cachedDriver; // This returns the existing driver so we avoid unnecessary reconnect overhead.
  } // This line closes the cached-driver branch so driver creation only happens once.
  const uri = getRequiredEnv("NEO4J_URI"); // This reads the Neo4j connection URI from the environment.
  const username = getRequiredEnv("NEO4J_USERNAME"); // This reads the Neo4j username from the environment.
  const password = getRequiredEnv("NEO4J_PASSWORD"); // This reads the Neo4j password from the environment.
  cachedDriver = neo4j.driver(uri, neo4j.auth.basic(username, password)); // This creates the driver and stores it so future requests can reuse it.
  return cachedDriver; // This returns the newly created reusable Neo4j driver.
} // This line closes the getNeo4jDriver helper so query logic can call it.
function getSupabaseClient(): SupabaseClient { // This helper creates the Supabase client once and then reuses it across later requests.
  if (cachedSupabaseClient) { // This checks whether a reusable Supabase client already exists in memory.
    return cachedSupabaseClient; // This returns the existing client so we avoid unnecessary setup overhead.
  } // This line closes the cached-client branch so client creation only happens once.
  const supabaseUrl = getRequiredEnv("SUPABASE_URL"); // This reads the Supabase project URL from the environment.
  const supabaseServiceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"); // This reads the service role key because the function needs permission to write rows.
  cachedSupabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } }); // This creates a server-side Supabase client with auth persistence disabled because edge functions are stateless.
  return cachedSupabaseClient; // This returns the newly created reusable Supabase client.
} // This line closes the getSupabaseClient helper so persistence logic can call it.
function validateInput(body: unknown): ValidationResult { // This helper validates the raw request body and keeps validation separate from normalization.
  if (!isPlainObject(body)) { // This guard prevents property access on invalid top-level JSON values such as null, arrays, or strings.
    return { success: false, error: "Request body must be a JSON object." }; // This returns a clear client-facing error because the body shape is unusable.
  } // This line closes the top-level object guard so the next lines can safely inspect fields.
  const rawProductName = body.product_name; // This reads the untrusted product_name field from the request body.
  if (typeof rawProductName !== "string") { // This checks that product_name is a string because the product-level report requires real text.
    return { success: false, error: "`product_name` must be a non-empty string." }; // This returns a clear error when product_name has the wrong type.
  } // This line closes the product-name type guard so trimming becomes safe.
  const productName = rawProductName.trim(); // This trims the product name because surrounding whitespace should not affect display or storage.
  if (productName.length === 0) { // This checks that the trimmed product name still contains real text after whitespace is removed.
    return { success: false, error: "`product_name` must be a non-empty string." }; // This returns a clear error because a blank product name is unusable.
  } // This line closes the blank-product-name guard so the validated payload always has a meaningful product name.
  const rawIngredients = body.ingredients; // This reads the untrusted ingredients field from the request body.
  if (!Array.isArray(rawIngredients)) { // This checks that ingredients is an array because normalization expects a list of strings.
    return { success: false, error: "`ingredients` must be an array." }; // This returns a clear error when the field has the wrong type.
  } // This line closes the ingredients-array guard so the next lines can safely inspect items.
  if (rawIngredients.length === 0) { // This checks that the client actually sent at least one ingredient entry.
    return { success: false, error: "`ingredients` must not be empty." }; // This returns a clear error because an empty list is not useful for downstream processing.
  } // This line closes the empty-list guard so the next loop only runs when the array has items.
  const validatedIngredients: string[] = []; // This array collects ingredient values that pass the basic type checks.
  for (const rawIngredient of rawIngredients) { // This loops through each ingredient so we can validate every item individually.
    if (typeof rawIngredient !== "string") { // This ensures every ingredient is a string because the normalization helper only works with text.
      return { success: false, error: "Each item in `ingredients` must be a string." }; // This returns a clear error immediately when an invalid item type is found.
    } // This line closes the per-item type guard so only valid strings continue forward.
    validatedIngredients.push(rawIngredient); // This keeps the original string unchanged because normalization happens in its own dedicated layer.
  } // This line closes the ingredient validation loop after every item has been checked.
  const rawMarket = body.market; // This reads the untrusted market field from the request body.
  if (typeof rawMarket !== "string") { // This checks that market is a string because later query logic expects text.
    return { success: false, error: "`market` must be a non-empty string." }; // This returns a clear error when market has the wrong type.
  } // This line closes the market-type guard so trimming becomes safe.
  const market = rawMarket.trim(); // This trims the market string because surrounding whitespace should not affect matching.
  if (market.length === 0) { // This checks that the trimmed market still contains real text after whitespace is removed.
    return { success: false, error: "`market` must be a non-empty string." }; // This returns a clear error because a blank market is unusable.
  } // This line closes the blank-market guard so the validated payload always has a meaningful market.
  const rawDomain = body.domain; // This reads the optional domain field so old clients can keep working while new domain-aware clients can be explicit.
  const domainCandidate = rawDomain === undefined ? "food" : rawDomain; // This defaults missing domain values to food so existing frontend and API calls remain backward-compatible.
  if (typeof domainCandidate !== "string") { // This checks that the domain value is text because domain names are represented as strings.
    return { success: false, error: "`domain` must be one of: food, cosmetics, export_compliance, pharmaceuticals." }; // This returns a clear error when domain has the wrong type.
  } // This line closes the domain-type guard so trimming becomes safe.
  const domain = domainCandidate.trim(); // This trims the domain string because surrounding whitespace should not affect validation.
  if (!isComplianceDomain(domain)) { // This checks whether the domain is one of the domains supported by HalalIQ.
    return { success: false, error: "`domain` must be one of: food, cosmetics, export_compliance, pharmaceuticals." }; // This returns a clear error when the domain is unsupported.
  } // This line closes the supported-domain guard so the validated payload can include a safe domain value.
  return { success: true, data: { product_name: productName, ingredients: validatedIngredients, market, domain } }; // This returns the validated data so the next layer can normalize it safely.
} // This line closes the validateInput helper so the handler can reuse it cleanly.
function toTitleCaseWord(word: string): string { // This helper converts one word into title case so ordinary ingredient names become consistent.
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(); // This uppercases the first letter and lowercases the rest so GELATIN becomes Gelatin.
} // This line closes the toTitleCaseWord helper so normalization can reuse it for each word.
function normalizeIngredientName(ingredient: string): string { // This helper normalizes one ingredient string without doing validation because validation already happened earlier.
  const trimmedIngredient = ingredient.trim(); // This removes leading and trailing whitespace because extra surrounding spaces should never affect matching.
  const collapsedIngredient = trimmedIngredient.replace(/\s+/g, " "); // This collapses repeated inner spaces to a single space so similar inputs normalize to the same value.
  if (collapsedIngredient.length === 0) { // This checks whether the ingredient became empty after trimming and collapsing spaces.
    return ""; // This returns an empty string so the list-level normalizer can remove unusable values cleanly.
  } // This line closes the empty-normalized-string guard so the next logic only handles real text.
  const eNumberMatch = collapsedIngredient.match(/^e\s*(\d+[a-z]?)$/i); // This checks whether the value looks like an E-number code such as e471 or E 471.
  if (eNumberMatch) { // This branch runs only when the ingredient is an E-number that needs code-style normalization.
    return `E${eNumberMatch[1].toUpperCase()}`; // This rebuilds the code in a stable uppercase format so e471 and E 471 both become E471.
  } // This line closes the E-number branch so ordinary ingredient names fall through to title-case normalization.
  return collapsedIngredient.split(" ").map((word) => toTitleCaseWord(word)).join(" "); // This converts ordinary ingredient names into title case while preserving single spaces between words.
} // This line closes the normalizeIngredientName helper so the rest of the file can reuse it.
function normalizeIngredients(ingredients: string[]): string[] { // This helper normalizes the full ingredient list and removes duplicates in a dedicated layer.
  const uniqueIngredients = new Set<string>(); // This set stores normalized ingredient names and automatically removes duplicates while preserving insertion order.
  for (const ingredient of ingredients) { // This loops through every validated ingredient so we can normalize them one by one.
    const normalizedIngredient = normalizeIngredientName(ingredient); // This normalizes the current ingredient using the single-item helper.
    if (normalizedIngredient.length === 0) { // This checks whether the normalized ingredient became empty after cleanup.
      continue; // This skips empty values because later query logic should only receive meaningful ingredient names.
    } // This line closes the empty-normalized-value guard so only usable values are added to the set.
    uniqueIngredients.add(normalizedIngredient); // This adds the cleaned ingredient to the set and automatically ignores duplicates.
  } // This line closes the list-normalization loop after every ingredient has been processed.
  return Array.from(uniqueIngredients); // This converts the set back into a regular array because arrays are easier to return and query with.
} // This line closes the normalizeIngredients helper so the main flow can reuse it.
function toUniqueStringArray(value: unknown): string[] { // This helper converts unknown values into clean string arrays because graph data can contain nulls or duplicates.
  if (!Array.isArray(value)) { // This checks that the incoming value is an array before we attempt to loop through it.
    return []; // This returns an empty array when the value is missing or not an array so later code stays simple.
  } // This line closes the non-array guard so the next lines only handle array values.
  const uniqueValues = new Set<string>(); // This set stores cleaned strings while automatically removing duplicates.
  for (const item of value) { // This loops through each item returned by Neo4j so we can clean every value safely.
    if (typeof item !== "string") { // This ensures we only keep string values because non-strings are not useful in the JSON response.
      continue; // This skips invalid items instead of failing the whole request.
    } // This line closes the non-string guard so the next lines only handle strings.
    const trimmedItem = item.trim(); // This removes accidental surrounding whitespace from the returned string value.
    if (trimmedItem.length === 0) { // This checks whether the string became empty after trimming.
      continue; // This skips blank values because they add noise and no useful information.
    } // This line closes the blank-string guard so only meaningful values enter the set.
    uniqueValues.add(trimmedItem); // This adds the cleaned value to the set and automatically ignores duplicates.
  } // This line closes the array-cleanup loop after every item has been processed.
  return Array.from(uniqueValues); // This converts the set back into an array because arrays are easier to work with in JSON.
} // This line closes the toUniqueStringArray helper so query mapping can reuse it.
function normalizeRiskLabel(risk: string): string { // This helper converts risk labels into a stable title-cased format so later comparisons stay reliable.
  const normalizedRisk = risk.trim().toUpperCase(); // This normalizes the raw risk text to a consistent uppercase form before comparison.
  if (normalizedRisk === "CRITICAL") { // This checks whether the risk label represents the highest severity level.
    return "Critical"; // This returns the stable Critical label used by the business layer.
  } // This line closes the Critical branch so other labels can be checked next.
  if (normalizedRisk === "HIGH") { // This checks whether the risk label represents a high severity level.
    return "High"; // This returns the stable High label used by the business layer.
  } // This line closes the High branch so other labels can be checked next.
  if (normalizedRisk === "MEDIUM") { // This checks whether the risk label represents a medium severity level.
    return "Medium"; // This returns the stable Medium label used by the business layer.
  } // This line closes the Medium branch so other labels can be checked next.
  if (normalizedRisk === "LOW") { // This checks whether the risk label represents a low severity level.
    return "Low"; // This returns the stable Low label used by the business layer.
  } // This line closes the Low branch so the fallback can handle unexpected labels.
  return risk.trim(); // This returns the trimmed original value when the label is unexpected so we do not silently hide data.
} // This line closes the normalizeRiskLabel helper so the business layer can reuse it.
function getRiskPriority(risk: string): number { // This helper converts risk labels into numeric priorities so comparing severity is easy.
  const normalizedRisk = normalizeRiskLabel(risk); // This normalizes the label first so the comparison logic stays consistent.
  if (normalizedRisk === "Critical") { // This checks whether the risk should be treated as the highest priority.
    return 4; // This returns the highest numeric priority for Critical risk.
  } // This line closes the Critical-priority branch so lower levels can be checked next.
  if (normalizedRisk === "High") { // This checks whether the risk should be treated as blocker severity.
    return 3; // This returns the numeric priority for High risk.
  } // This line closes the High-priority branch so lower levels can be checked next.
  if (normalizedRisk === "Medium") { // This checks whether the risk should be treated as warning severity.
    return 2; // This returns the numeric priority for Medium risk.
  } // This line closes the Medium-priority branch so lower levels can be checked next.
  if (normalizedRisk === "Low") { // This checks whether the risk should be treated as safe severity.
    return 1; // This returns the numeric priority for Low risk.
  } // This line closes the Low-priority branch so the fallback can handle unexpected labels.
  return 0; // This returns zero for unknown labels so unsupported values can be ignored safely.
} // This line closes the getRiskPriority helper so the business layer can reuse it.
function buildReasoning(row: QueriedIngredientRisk, market: string): string { // This helper builds the final human-readable reasoning for one ingredient row.
  const explicitReasoning = row.reasoning_source.trim(); // This reads any direct explanation returned by Neo4j and removes accidental surrounding whitespace.
  if (explicitReasoning.length > 0) { // This checks whether Neo4j already gave us a useful explanation.
    return explicitReasoning; // This returns the explicit explanation directly because graph-sourced reasoning is usually the best source.
  } // This line closes the explicit-reasoning branch so the fallback explanation can run when needed.
  const documentText = row.required_documents.length > 0 ? ` Required documents: ${row.required_documents.join(", ")}.` : ""; // This builds optional document context so users can see what paperwork may be required.
  const marketText = row.affected_markets.length > 0 ? ` Affected markets: ${row.affected_markets.join(", ")}.` : ` Market context: ${market}.`; // This builds optional market context so the explanation stays specific and useful.
  return `${row.ingredient} is classified as ${normalizeRiskLabel(row.risk)} risk for ${market}.${documentText}${marketText}`; // This creates a fallback explanation when Neo4j does not provide one directly.
} // This line closes the buildReasoning helper so the business layer can reuse it.
async function queryIngredientCompliance(input: ValidatedInput): Promise<QueriedIngredientRisk[]> { // This helper contains all Neo4j query logic so database access stays separate from business logic.
  const driver = getNeo4jDriver(); // This gets the reusable Neo4j driver for the current request.
  const session = driver.session({ defaultAccessMode: neo4j.session.READ }); // This opens a read-only Neo4j session because this function only queries data.
  try { // This try block ensures the session is always closed even if the query fails.
    const query = [ // This array builds the Cypher query in a readable way so each clause is easy to inspect.
      "UNWIND $ingredients AS requestedIngredient", // This starts from the exact submitted ingredient list so the graph cannot return unrelated ingredients.
      "MATCH (i:Ingredient { name: requestedIngredient })", // This matches only ingredient nodes whose name equals one submitted normalized ingredient.
      "MATCH (i)-[:HAS_RISK]->(r:Risk)", // This finds risk relationships only for the already matched submitted ingredient.
      "MATCH (i)-[:AFFECTS_MARKET]->(selectedMarket:Market { name: $market })", // This restricts results to submitted ingredients that affect the requested market.
      "OPTIONAL MATCH (r)-[:APPLIES_TO_DOMAIN]->(riskDomain:Domain)", // This reads an optional domain relationship so new domain-aware risk data can coexist with legacy graph rows.
      "WITH i, r, selectedMarket, riskDomain", // This carries only the matched submitted ingredient, its risk, market, and optional domain into the filter step.
      "WHERE riskDomain IS NULL OR riskDomain.name = $domain", // This keeps legacy risks when no domain exists and filters domain-aware risks to the requested domain.
      "OPTIONAL MATCH (i)-[:REQUIRES_DOCUMENT]->(d:DocumentRequirement)", // This fetches any required documents linked to the ingredient.
      "OPTIONAL MATCH (i)-[:AFFECTS_MARKET]->(affectedMarket:Market)", // This fetches every affected market so the response can show broader impact.
      "RETURN", // This starts the return section of the Cypher query.
      "  i.name AS ingredient,", // This returns the ingredient name so we know which node each row belongs to.
      "  r.level AS risk,", // This returns the risk level so the business layer can categorize it.
      '  coalesce(r.reason, r.description, r.explanation, r.name, "") AS reasoning_source,', // This returns the best available reasoning text from the risk node so we can explain the result.
      "  collect(DISTINCT d.name) AS required_documents,", // This returns unique required document names for the ingredient.
      "  collect(DISTINCT affectedMarket.name) AS affected_markets", // This returns unique affected market names for the ingredient.
      "ORDER BY ingredient, risk", // This keeps the raw query output stable and predictable.
    ].join("\n"); // This joins the query lines into one Cypher string that Neo4j can execute.
    const parameters = { ingredients: input.ingredients, market: input.market, domain: input.domain }; // This builds the parameter object so the query remains fully parameterized and safe.
    const result = await session.run(query, parameters); // This executes the Cypher query with the normalized ingredients and market.
    const uniqueResults = new Map<string, QueriedIngredientRisk>(); // This map removes duplicate rows while keeping the query-layer output clean.
    for (const record of result.records) { // This loops through each Neo4j record so we can map it into plain JSON-friendly data.
      const ingredientValue = record.get("ingredient"); // This reads the ingredient field from the current Neo4j record.
      const riskValue = record.get("risk"); // This reads the risk field from the current Neo4j record.
      const reasoningSourceValue = record.get("reasoning_source"); // This reads the reasoning field from the current Neo4j record.
      const ingredient = typeof ingredientValue === "string" ? ingredientValue.trim() : ""; // This safely converts the ingredient field into a clean string.
      const risk = typeof riskValue === "string" ? normalizeRiskLabel(riskValue) : ""; // This safely converts the risk field into a clean normalized label.
      const reasoning_source = typeof reasoningSourceValue === "string" ? reasoningSourceValue.trim() : ""; // This safely converts the reasoning source into a clean string.
      if (ingredient.length === 0 || risk.length === 0) { // This checks whether the essential query fields are missing or unusable.
        continue; // This skips malformed rows so broken graph data does not pollute the business layer.
      } // This line closes the malformed-row guard so only usable rows are mapped.
      const mappedResult: QueriedIngredientRisk = { // This object maps the Neo4j record into the query-layer result shape.
        ingredient, // This stores the cleaned ingredient name.
        risk, // This stores the cleaned normalized risk label.
        reasoning_source, // This stores the raw reasoning text returned by Neo4j when present.
        required_documents: toUniqueStringArray(record.get("required_documents")), // This stores unique required documents as a clean array.
        affected_markets: toUniqueStringArray(record.get("affected_markets")), // This stores unique affected markets as a clean array.
      }; // This line closes the mapped query result object so the row shape is complete.
      const uniqueKey = `${mappedResult.ingredient}::${mappedResult.risk}::${mappedResult.reasoning_source}`; // This builds a stable deduplication key for each distinct query row.
      uniqueResults.set(uniqueKey, mappedResult); // This stores the mapped row and automatically replaces identical duplicates.
    } // This line closes the query-mapping loop after every record has been processed.
    return Array.from(uniqueResults.values()); // This returns the deduplicated query results so the business layer receives a clean array.
  } finally { // This finally block runs whether the query succeeds or fails.
    await session.close(); // This closes the Neo4j session promptly so connections are managed efficiently.
  } // This line closes the try/finally block for the query helper.
} // This line closes the queryIngredientCompliance helper so the handler can call it cleanly.
function findIngredientKnowledgeRule(domain: ComplianceDomain, ingredient: string): IngredientKnowledgeRule | null { // This helper searches the local fallback knowledge map for a matching ingredient.
  const normalizedIngredient = ingredient.trim().toLowerCase(); // This normalizes the ingredient to lowercase so matching stays simple and predictable.
  for (const rule of ingredientKnowledgeRules) { // This loops through each local rule so the first relevant match can be returned quickly.
    if (!rule.domains.includes(domain)) { // This checks whether the rule is relevant to the selected product domain.
      continue; // This skips rules that belong to other domains.
    } // This line closes the domain guard so matcher checks only run for relevant rules.
    if (rule.matchers.some((matcher) => normalizedIngredient.includes(matcher))) { // This checks whether the ingredient contains any matcher fragment from the rule.
      return rule; // This returns the first matching rule so fallback behavior stays deterministic.
    } // This line closes the matcher branch so the next rule can be checked when no match is found.
  } // This line closes the rule loop after every relevant rule has been checked.
  return null; // This returns null when no local rule matches the ingredient.
} // This line closes the findIngredientKnowledgeRule helper so domain fallback logic can reuse it.
function getDomainFallbackDocuments(domain: ComplianceDomain): string[] { // This helper returns baseline evidence requirements when the graph does not yet have domain-specific data.
  if (domain === "cosmetics") { // This checks whether the scan is in the first expansion domain, cosmetics and personal care.
    return ["Supplier declaration", "Animal-origin statement", "Alcohol content statement", "Vegan or plant-origin proof", "Halal certificate"]; // This returns cosmetic-focused documents that help reviewers validate ingredients such as alcohol, collagen, lanolin, carmine, and fragrance solvents.
  } // This line closes the cosmetics document branch so export compliance can be checked next.
  if (domain === "export_compliance") { // This checks whether the scan is for export-readiness requirements instead of pure ingredient risk.
    return ["Target-market halal certificate", "Authority-specific checklist", "Label compliance evidence", "Importer or distributor declaration", "Ingredient specification sheet"]; // This returns export-focused documents for market readiness checks such as JAKIM, ESMA, HFA, and EU-facing exports.
  } // This line closes the export compliance document branch so pharmaceutical documents can be checked next.
  if (domain === "pharmaceuticals") { // This checks whether the scan is for medicine, supplement, or pharmaceutical inputs.
    return ["Excipient origin statement", "Capsule shell declaration", "Alcohol solvent statement", "Gelatin source certificate", "Scholar or technical review note"]; // This returns pharma-focused documents because excipients and medical necessity often need stronger review.
  } // This line closes the pharmaceutical document branch so the food fallback can run.
  return ["Supplier declaration", "Halal certificate"]; // This returns a minimal food evidence fallback even though food usually relies on graph data first.
} // This line closes the getDomainFallbackDocuments helper so domain fallback rows can reuse it.
function buildDomainFallbackReasoning(ingredient: string, input: ValidatedInput): string { // This helper explains why a domain fallback warning exists when graph data is not yet complete.
  const domainLabel = getDomainLabel(input.domain); // This converts the domain code into a friendly label for the explanation.
  if (input.domain === "export_compliance") { // This checks whether the fallback is for market-readiness rather than ingredient-only halal risk.
    return `${ingredient} needs export-compliance review for ${input.market} because market readiness depends on authority-specific documents, labeling, and certification evidence, not ingredient matching alone.`; // This returns export-specific reasoning so users understand the warning is a checklist gap, not a final haram ruling.
  } // This line closes the export-specific reasoning branch so ingredient-domain reasoning can run.
  return `${ingredient} needs ${domainLabel} halal review because this domain is not yet fully covered by the Neo4j knowledge graph, so HalalIQ is asking for evidence instead of marking it low risk automatically.`; // This returns safe fallback reasoning so incomplete graph coverage does not produce false confidence.
} // This line closes the buildDomainFallbackReasoning helper so fallback rows remain readable and reusable.
function addDomainReviewFallbackRows(input: ValidatedInput, rows: QueriedIngredientRisk[]): QueriedIngredientRisk[] { // This helper adds local safety rows when Neo4j does not return enough ingredient data.
  const matchedIngredients = new Set(rows.map((row) => row.ingredient)); // This records which ingredients already had graph data so we do not duplicate them.
  const fallbackRows: QueriedIngredientRisk[] = []; // This array collects synthetic review rows for unmatched expansion-domain ingredients.
  for (const ingredient of input.ingredients) { // This loops through every normalized ingredient so missing graph coverage can be handled defensively.
    const knowledgeRule = findIngredientKnowledgeRule(input.domain, ingredient); // This checks whether local domain knowledge can provide a smarter fallback than the generic review rule.
    if (knowledgeRule) { // This checks whether a local rule matched, including hard blockers such as pork, ham, bacon, or lard.
      fallbackRows.push({ // This adds the local safety row even when graph data exists so the stricter rule can win during aggregation.
        ingredient, // This stores the normalized ingredient name from the request.
        risk: knowledgeRule.risk, // This uses the local rule severity so hard blockers stay hard blockers.
        reasoning_source: knowledgeRule.reasoning, // This returns the specific explanation tied to the matched rule.
        required_documents: knowledgeRule.documents, // This returns the evidence or replacement documents tied to the matched rule.
        affected_markets: [input.market], // This keeps the warning tied to the requested market so the frontend has market context.
      }); // This line closes the local safety row object so it can be added to the fallback rows.
      continue; // This skips the generic fallback because the specific rule already handled this ingredient.
    } // This line closes the local rule branch so generic fallback logic can run when needed.
    if (input.domain === "food") { // This checks whether a food ingredient lacked both graph data and a local safety rule.
      continue; // This avoids generic warnings for normal food ingredients while still allowing hard blockers to work.
    } // This line closes the food guard so only expansion domains receive generic fallback warnings.
    if (matchedIngredients.has(ingredient)) { // This checks whether Neo4j already returned data for the ingredient.
      continue; // This skips ingredients that already have graph-backed risk data.
    } // This line closes the matched-ingredient guard so only missing ingredients become review warnings.
    fallbackRows.push({ // This adds one domain-aware Medium warning row for the unmatched ingredient.
      ingredient, // This stores the normalized ingredient name from the request.
      risk: "Medium", // This stays conservative with a warning when no specific local rule exists.
      reasoning_source: buildDomainFallbackReasoning(ingredient, input), // This uses the generic domain-specific explanation.
      required_documents: getDomainFallbackDocuments(input.domain), // This uses baseline evidence requirements for the selected domain.
      affected_markets: [input.market], // This keeps the warning tied to the requested market so the frontend has market context.
    }); // This line closes the fallback row object so it can be added to the array.
  } // This line closes the unmatched ingredient loop after every ingredient has been checked.
  return [...rows, ...fallbackRows]; // This returns graph-backed rows first and fallback review rows second so no data is lost.
} // This line closes the addDomainReviewFallbackRows helper so the handler can apply expansion-domain safety rules.
function buildComplianceSummary(rows: QueriedIngredientRisk[], market: string): ComplianceSummary { // This helper contains the business logic layer that groups query rows into categories.
  const aggregatedResults = new Map<string, AggregatedComplianceEntry>(); // This map groups rows by ingredient so duplicates can be merged safely.
  for (const row of rows) { // This loops through each query-layer row so the business rules can process it.
    const riskPriority = getRiskPriority(row.risk); // This converts the row risk into a numeric priority so severity comparison is easy.
    if (riskPriority === 0) { // This checks whether the risk label is unsupported by the current business rules.
      continue; // This skips unknown risk labels so the grouped output remains predictable.
    } // This line closes the unsupported-risk guard so only supported risks are aggregated.
    const ingredientKey = row.ingredient; // This uses the ingredient name as the aggregation key because duplicate rows should merge by ingredient.
    const existingEntry = aggregatedResults.get(ingredientKey); // This reads any previously aggregated entry for the same ingredient.
    if (!existingEntry) { // This checks whether the ingredient has not been seen before in the aggregation map.
      aggregatedResults.set(ingredientKey, { // This creates a brand-new aggregate entry for the ingredient.
        ingredient: row.ingredient, // This stores the ingredient name in the aggregate entry.
        risk: normalizeRiskLabel(row.risk), // This stores the current row risk as the best-known risk so far.
        risk_priority: riskPriority, // This stores the numeric severity so future rows can compare against it.
        reasoning_parts: new Set<string>([buildReasoning(row, market)]), // This seeds the reasoning set with the explanation for the current row.
        required_documents: new Set<string>(row.required_documents), // This seeds the document set with the current row documents.
        affected_markets: new Set<string>(row.affected_markets), // This seeds the market set with the current row markets.
      }); // This line closes the new aggregate object so the first row for this ingredient is fully stored.
      continue; // This skips the merge logic because a brand-new entry does not need merging yet.
    } // This line closes the first-seen branch so later rows for the same ingredient can be merged.
    if (riskPriority > existingEntry.risk_priority) { // This checks whether the current row is more severe than the previously stored risk.
      existingEntry.risk = normalizeRiskLabel(row.risk); // This updates the ingredient to its highest-severity risk label.
      existingEntry.risk_priority = riskPriority; // This updates the stored numeric priority so future comparisons remain correct.
    } // This line closes the higher-severity branch so other fields can still be merged.
    existingEntry.reasoning_parts.add(buildReasoning(row, market)); // This adds the current row explanation to the unique reasoning set.
    for (const document of row.required_documents) { // This loops through required documents so the aggregate entry can keep a unique set.
      existingEntry.required_documents.add(document); // This adds the document and automatically ignores duplicates.
    } // This line closes the document-merge loop so market merging can happen next.
    for (const affectedMarket of row.affected_markets) { // This loops through affected markets so the aggregate entry can keep a unique set.
      existingEntry.affected_markets.add(affectedMarket); // This adds the affected market and automatically ignores duplicates.
    } // This line closes the market-merge loop after every market has been processed.
  } // This line closes the aggregation loop after every query row has been handled.
  const summary: ComplianceSummary = { blockers: [], warnings: [], safe: [] }; // This creates the grouped result object requested by the business rules.
  for (const aggregate of aggregatedResults.values()) { // This loops through each aggregated ingredient so we can build final response entries.
    const entry: ComplianceEntry = { // This object converts the internal aggregate into the final entry shape returned to the frontend.
      ingredient: aggregate.ingredient, // This stores the ingredient name in the final entry.
      risk: aggregate.risk, // This stores the highest-severity risk label in the final entry.
      reasoning: Array.from(aggregate.reasoning_parts).join(" "), // This joins unique reasoning snippets into one readable explanation string.
      required_documents: Array.from(aggregate.required_documents).sort((left, right) => left.localeCompare(right)), // This converts the document set into a sorted array for stable output.
      affected_markets: Array.from(aggregate.affected_markets).sort((left, right) => left.localeCompare(right)), // This converts the market set into a sorted array for stable output.
    }; // This line closes the final entry object so categorization can happen next.
    if (aggregate.risk_priority >= 3) { // This checks whether the ingredient belongs in the blockers category.
      summary.blockers.push(entry); // This adds High and Critical ingredients to the blockers list.
      continue; // This skips the other category checks because the correct category is already known.
    } // This line closes the blockers branch so lower-severity categories can be checked next.
    if (aggregate.risk_priority === 2) { // This checks whether the ingredient belongs in the warnings category.
      summary.warnings.push(entry); // This adds Medium ingredients to the warnings list.
      continue; // This skips the safe check because the correct category is already known.
    } // This line closes the warnings branch so the safe category can be checked next.
    if (aggregate.risk_priority === 1) { // This checks whether the ingredient belongs in the safe category.
      summary.safe.push(entry); // This adds Low ingredients to the safe list.
    } // This line closes the safe branch after the entry has been categorized.
  } // This line closes the grouping loop after every aggregate entry has been categorized.
  summary.blockers.sort((left, right) => left.ingredient.localeCompare(right.ingredient)); // This sorts blockers by ingredient name so the response stays stable and readable.
  summary.warnings.sort((left, right) => left.ingredient.localeCompare(right.ingredient)); // This sorts warnings by ingredient name so the response stays stable and readable.
  summary.safe.sort((left, right) => left.ingredient.localeCompare(right.ingredient)); // This sorts safe entries by ingredient name so the response stays stable and readable.
  return summary; // This returns the grouped business-logic result so the report layer can wrap it.
} // This line closes the buildComplianceSummary helper so the handler can reuse it.
function buildOverallStatus(groupedSummary: ComplianceSummary): OverallStatus { // This helper converts ingredient-level counts into one overall product-level status.
  if (groupedSummary.blockers.length > 0) { // This checks whether any blocker exists because blockers mean the product is not ready.
    return "Not Ready"; // This returns the strictest status because at least one blocker requires action before readiness.
  } // This line closes the blocker-status branch so warning logic can run when no blockers exist.
  if (groupedSummary.warnings.length > 0) { // This checks whether warnings exist because warnings mean the product still needs review.
    return "Needs Review"; // This returns the middle status because the product has concerns but no blockers.
  } // This line closes the warning-status branch so the low-risk fallback can run when no warnings exist.
  return "Low Risk"; // This returns the lowest-risk status because the product has no blockers and no warnings.
} // This line closes the buildOverallStatus helper so the report layer can reuse it.
function buildHumanReadableSummary(groupedSummary: ComplianceSummary, totalIngredients: number, productName: string, overallStatus: OverallStatus, domain: ComplianceDomain): string { // This helper creates a short sentence that the frontend can display directly to users.
  const blockersCount = groupedSummary.blockers.length; // This reads the number of blocker entries from the grouped result.
  const warningsCount = groupedSummary.warnings.length; // This reads the number of warning entries from the grouped result.
  const safeCount = groupedSummary.safe.length; // This reads the number of safe entries from the grouped result.
  return `${productName} was analyzed for ${getDomainLabel(domain)} across ${totalIngredients} ingredient(s): ${blockersCount} blocker(s), ${warningsCount} warning(s), and ${safeCount} safe ingredient(s). Overall status: ${overallStatus}.`; // This returns a concise readable summary sentence that includes product name, domain, and overall status.
} // This line closes the buildHumanReadableSummary helper so the report layer can reuse it.
function buildComplianceReport(groupedSummary: ComplianceSummary, totalIngredients: number, productName: string, domain: ComplianceDomain): ComplianceReport { // This helper converts grouped results into the final API response format.
  const overallStatus = buildOverallStatus(groupedSummary); // This computes the product-level overall status from the grouped blocker and warning counts.
  const summary: ReportSummary = { // This object builds the summary block required by the final response contract.
    total_ingredients: totalIngredients, // This stores how many normalized ingredients were processed.
    blockers_count: groupedSummary.blockers.length, // This stores how many blockers were found.
    warnings_count: groupedSummary.warnings.length, // This stores how many warnings were found.
    human_readable: buildHumanReadableSummary(groupedSummary, totalIngredients, productName, overallStatus, domain), // This stores the friendly summary sentence for frontend display.
  }; // This line closes the summary object so it can be returned with the grouped arrays.
  return { // This returns the final report object in one consistent frontend-friendly shape.
    product_name: productName, // This includes the product name at the top level because the frontend needs product-level context.
    domain, // This includes the compliance domain at the top level so saved reports and frontend views keep the domain context.
    overall_status: overallStatus, // This includes the product-level overall status derived from the grouped results.
    summary, // This includes the top-level summary block.
    blockers: groupedSummary.blockers, // This includes the blockers array exactly as built by the business layer.
    warnings: groupedSummary.warnings, // This includes the warnings array exactly as built by the business layer.
    safe: groupedSummary.safe, // This includes the safe array exactly as built by the business layer.
  }; // This line closes the final report object so the response shape is complete.
} // This line closes the buildComplianceReport helper so the handler can reuse it.
function extractInsertedId(row: Record<string, unknown>, tableName: string): string | number { // This helper reads an inserted record ID defensively because database responses should be validated too.
  const id = row.id; // This reads the generic id field from the inserted row returned by Supabase.
  if (typeof id === "string" || typeof id === "number") { // This checks that the inserted ID is a usable primitive value.
    return id; // This returns the inserted ID once we know it is valid.
  } // This line closes the valid-ID guard so the fallback can raise a clear error.
  throw new Error(`Inserted ${tableName} row is missing a valid id.`); // This throws a clear error when the database response shape is not what we expected.
} // This line closes the extractInsertedId helper so persistence logic can reuse it.
async function insertSubmission(supabase: SupabaseClient, productId: string | number, serializedIngredients: string, targetMarkets: string[]): Promise<Record<string, unknown>> { // This helper inserts a submission only after duplicate detection decides a new row is needed.
  const submissionInsert = await supabase.from("submissions").insert({ product_id: productId, ingredients: serializedIngredients, target_markets: targetMarkets }).select("id").single(); // This inserts the real saved product ID plus JSON-stringified ingredients and target markets, then asks Supabase to return the new row id.
  if (submissionInsert.error) { // This checks whether the submission insert failed.
    throw new Error(`Failed to save submission: ${submissionInsert.error.message}`); // This throws a clear error so the handler can return a server error response.
  } // This line closes the submission insert error guard so the returned row can be inspected next.
  const submissionData = submissionInsert.data as Record<string, unknown> | null; // This treats the returned submission row as a generic object so we can inspect it safely.
  if (!submissionData) { // This checks whether Supabase returned an inserted submission row at all.
    throw new Error("Failed to save submission: no row was returned."); // This throws a clear error when the insert response is unexpectedly empty.
  } // This line closes the missing submission row guard so the inserted row can be returned next.
  return submissionData; // This returns the inserted submission row so the caller can extract and reuse its id.
} // This line closes the insertSubmission helper so saveComplianceReport can keep duplicate detection separate from insertion.
async function saveComplianceReport(supabase: SupabaseClient, productId: string | number, ingredients: string[], targetMarkets: string[], report: ComplianceReport): Promise<PersistedReportRecord> { // This helper contains the submission and report writes while receiving a real product ID from the product creation step.
  // ------------------------- // This separator makes it obvious that the next block inserts into the submissions table first.
  // INSERT INTO submissions // This label teaches the reader that the next few lines save the normalized input payload.
  // ------------------------- // This separator visually groups the submission insert logic so the function is easier to scan.
  const serializedIngredients = JSON.stringify(ingredients); // This converts the normalized ingredients array into JSON text because Supabase JSONB comparisons and writes need a serialized JSON value here.
  const existingSubmissionLookup = await supabase.from("submissions").select("id").eq("product_id", productId).contains("ingredients", serializedIngredients).containedBy("ingredients", serializedIngredients).contains("target_markets", targetMarkets).containedBy("target_markets", targetMarkets).limit(1).maybeSingle(); // This checks for an existing submission with the same product, JSON-stringified ingredients, and text-array target markets before inserting.
  if (existingSubmissionLookup.error) { // This checks whether the duplicate-submission lookup failed.
    throw new Error(`Failed to search submission: ${existingSubmissionLookup.error.message}`); // This stops execution with a clear lookup error before any write happens.
  } // This line closes the lookup error guard so the lookup result can be inspected safely.
  const existingSubmissionData = existingSubmissionLookup.data as Record<string, unknown> | null; // This treats the optional existing submission row as a generic object so we can validate its id.
  const submissionId = existingSubmissionData ? extractInsertedId(existingSubmissionData, "submissions") : null; // This reuses the existing submission id when a duplicate submission already exists.
  const finalSubmissionId = submissionId ?? extractInsertedId(await insertSubmission(supabase, productId, serializedIngredients, targetMarkets), "submissions"); // This inserts only when no duplicate submission exists, then stores the id that reports should reference.
  // ------------------------- // This separator makes it obvious that the next block inserts into the reports table second.
  // INSERT INTO reports // This label teaches the reader that the next few lines save the generated analysis result.
  // ------------------------- // This separator visually groups the report insert logic so the function is easier to scan.
  const reportInsert = await supabase.from("reports").insert({ submission_id: finalSubmissionId, result: report }).select("id").single(); // This inserts the linked report row and stores the full compliance report JSON in the result column.
  if (reportInsert.error) { // This checks whether the report insert failed.
    throw new Error(`Failed to save report: ${reportInsert.error.message}`); // This throws a clear error so the handler can return a server error response.
  } // This line closes the report insert error guard so the returned row can be inspected next.
  const reportData = reportInsert.data as Record<string, unknown> | null; // This treats the returned report row as a generic object so we can inspect it safely.
  if (!reportData) { // This checks whether Supabase returned an inserted report row at all.
    throw new Error("Failed to save report: no row was returned."); // This throws a clear error when the report insert response is unexpectedly empty.
  } // This line closes the missing report row guard so the id can be extracted next.
  const reportId = extractInsertedId(reportData, "reports"); // This extracts the report ID in a defensive and reusable way.
  return { submission_id: finalSubmissionId, report_id: reportId }; // This returns the reused or inserted submission ID plus the inserted report ID for traceability.
} // This line closes the saveComplianceReport helper so the handler can reuse it.
serve(async (req: Request): Promise<Response> => { // This starts the Edge Function and handles each incoming HTTP request.
  if (req.method === "OPTIONS") { // This handles the browser preflight request before the real POST request is sent.
    return new Response(null, { status: 204, headers: corsHeaders }); // This returns an empty successful preflight response so the browser allows the POST request.
  } // This line closes the OPTIONS branch so normal request handling can continue for non-preflight requests.
  if (req.method !== "POST") { // This guard ensures the function is only used with POST requests because the endpoint expects a JSON body.
    return createJsonResponse({ error: "Method not allowed. Use POST." }, 405); // This returns a clear error when the caller uses the wrong HTTP method.
  } // This line closes the method guard so the rest of the handler only runs for POST requests.
  let body: unknown; // This variable will hold the parsed request body in an intentionally untrusted form.
  try { // This try block safely handles JSON parsing because malformed JSON should return a controlled error.
    body = await req.json(); // This reads the request body and parses it into a JavaScript value.
  } catch (_error) { // This catch block handles malformed JSON without leaking unnecessary internal details.
    return createJsonResponse({ error: "Request body must contain valid JSON." }, 400); // This returns a clear client-facing error when the JSON body is invalid.
  } // This line closes the JSON-parsing try/catch block so later logic only runs when parsing succeeded.
  try { // This try block handles validation, normalization, querying, business logic, reporting, and persistence.
    const validationResult = validateInput(body); // This runs the validation layer first so later layers only receive safe input.
    if (!validationResult.success) { // This checks whether validation found any client-side input problem.
      return createJsonResponse({ error: validationResult.error }, 400); // This returns a 400 response because invalid input is a client error.
    } // This line closes the validation-failure branch so the next code only runs for valid input.
    const normalizedIngredients = normalizeIngredients(validationResult.data.ingredients); // This runs the dedicated normalization layer after validation succeeds.
    if (normalizedIngredients.length === 0) { // This checks whether normalization removed every ingredient and left nothing usable.
      return createJsonResponse({ error: "`ingredients` must contain at least one non-empty value after normalization." }, 400); // This returns a clear error because later query logic needs at least one normalized ingredient.
    } // This line closes the post-normalization empty guard so the next lines only run when normalized data exists.
    const normalizedData: ValidatedInput = { product_name: validationResult.data.product_name, ingredients: normalizedIngredients, market: validationResult.data.market, domain: validationResult.data.domain }; // This replaces the raw ingredients with the normalized array while preserving the validated product name, market, and domain.
    const queriedRows = await queryIngredientCompliance(normalizedData); // This runs the Neo4j query layer using the normalized ingredients and validated market.
    const domainAwareRows = addDomainReviewFallbackRows(normalizedData, queriedRows); // This adds safe review warnings for expansion domains when Neo4j does not yet contain matching domain data.
    const complianceSummary = buildComplianceSummary(domainAwareRows, normalizedData.market); // This runs the business logic layer on top of the graph results plus any domain fallback rows.
    const complianceReport = buildComplianceReport(complianceSummary, normalizedData.ingredients.length, normalizedData.product_name, normalizedData.domain); // This builds the final frontend-friendly report object from the grouped result, product name, and domain.
    const supabase = getSupabaseClient(); // This gets the reusable Supabase client before product and report persistence so both writes use the same client setup.
    const product_name = normalizedData.product_name; // This creates the local product_name variable used by the product lookup block exactly where persistence happens.
    const ingredients = normalizedData.ingredients; // This creates the local ingredients variable used by the save call so the final persistence arguments stay clear.
    const targetMarkets = [normalizedData.market]; // This creates the local targetMarkets array because submissions.target_markets stores markets as an array.
    const { data: product, error: productError } = await supabase.from("products").upsert({ name: product_name }, { onConflict: "name", ignoreDuplicates: false }).select("id").single(); // This safely creates or reuses a product by relying on the database unique constraint for products.name.
    if (productError) { // This checks whether the conflict-safe product upsert failed.
      console.error("Product upsert failed:", productError); // This logs the full product upsert error so database issues are easier to debug.
      throw productError; // This stops execution because saving a submission without a real product id would break referential integrity.
    } // This line closes the product upsert error guard so the returned row can be inspected next.
    if (!product) { // This checks whether Supabase returned the created or existing product row.
      throw new Error("Failed to resolve product id."); // This stops execution with a clear message instead of saving a submission with a null product_id.
    } // This line closes the missing-product guard so the id can be extracted safely.
    const productId = extractInsertedId(product as Record<string, unknown>, "products"); // This extracts the final product id returned by the upsert so submissions always link to the correct product row.
    const { data: previousSubmissions } = await supabase.from("submissions").select("id, created_at, reports ( result, created_at )").eq("product_id", productId).order("created_at", { ascending: false }); // This loads previous submissions for the same product, including linked report results, so the API can return scan history.
    await saveComplianceReport(supabase, productId, ingredients, targetMarkets, complianceReport); // This keeps the existing save call using the resolved product id, ingredients, target markets, and full compliance report.
    return createJsonResponse({ ...complianceReport, history: previousSubmissions || [] }, 200); // This returns the current report plus the product's previous submission history in one frontend-friendly JSON response.
  } catch (error) { // This catch block handles unexpected runtime, Neo4j, or Supabase errors.
    const message = error instanceof Error ? error.message : "Internal server error."; // This safely extracts a readable error message for the response body.
    return createJsonResponse({ error: message }, 500); // This returns a 500 response because the request was valid but the server failed internally.
  } // This line closes the main handler try/catch block so the request flow is complete.
}); // This line closes the Edge Function handler so the module is complete.
