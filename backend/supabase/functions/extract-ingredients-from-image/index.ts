import { serve } from "https://deno.land/std@0.168.0/http/server.ts"; // This imports Supabase's HTTP server helper so the Edge Function can receive requests.
type ComplianceDomain = "food" | "cosmetics" | "export_compliance" | "pharmaceuticals"; // This type keeps supported domains explicit so image extraction can pass domain context safely.
type ExtractionRequest = { // This type describes the trusted request shape after validation succeeds.
  image_base64: string; // This field stores the base64 image bytes because browser uploads are sent as JSON to the Edge Function.
  mime_type: string; // This field stores the image MIME type so the function can build a valid data URL for the vision model.
  product_name?: string; // This optional field gives the model product context when the frontend already has it.
  market?: string; // This optional field gives the model market context when the frontend already has it.
  domain: ComplianceDomain; // This field stores the validated domain so extraction can mention the right review context.
}; // This line closes the ExtractionRequest type definition so TypeScript knows the validated shape.
type ExtractionResult = { // This type describes the JSON response returned to the frontend.
  raw_text: string; // This field stores all readable label text extracted from the image.
  ingredients: string[]; // This field stores parsed ingredient names that the user can review before scanning.
  confidence: number; // This field stores a 0-to-1 confidence estimate so the frontend can decide how cautious to be.
  warnings: string[]; // This field stores extraction warnings such as blur, partial labels, or missing ingredient panels.
  needs_review: boolean; // This field tells the frontend whether human review is required before scanning.
  visual_warning: string | null; // This field stores a non-final visual warning, such as likely pork or ham, without making a halal ruling.
}; // This line closes the ExtractionResult type definition so the response shape is explicit.
const allowedDomains: ComplianceDomain[] = ["food", "cosmetics", "export_compliance", "pharmaceuticals"]; // This array lists valid domains so validation can reject unknown values.
const corsHeaders = { // This object stores CORS headers so the browser frontend can call this Edge Function.
  "Access-Control-Allow-Origin": "*", // This allows local and hosted frontends to call the function during development and deployment.
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", // This allows Supabase auth headers and JSON content headers through preflight checks.
  "Access-Control-Allow-Methods": "POST, OPTIONS", // This allows browser preflight requests and the actual POST extraction request.
}; // This line closes the CORS header object so response helpers can reuse it.
function createJsonResponse(body: unknown, status = 200): Response { // This helper creates consistent JSON responses in one place.
  return new Response(JSON.stringify(body), { // This serializes the response body into JSON text for the client.
    status, // This sets the HTTP status code so the frontend can tell success from failure.
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" }, // This marks the response as JSON and includes browser CORS headers.
  }); // This line closes the Response constructor options.
} // This line closes the createJsonResponse helper so the handler can reuse it.
function isPlainObject(value: unknown): value is Record<string, unknown> { // This helper checks whether a raw JSON value is a normal object.
  return typeof value === "object" && value !== null && !Array.isArray(value); // This returns true only for object values that are safe for property access.
} // This line closes the isPlainObject helper so validation can reuse it.
function isComplianceDomain(value: string): value is ComplianceDomain { // This helper checks whether a string is a supported HalalIQ domain.
  return allowedDomains.includes(value as ComplianceDomain); // This returns true only when the domain appears in the allowed domain list.
} // This line closes the isComplianceDomain helper so validation stays readable.
function getOptionalTrimmedString(value: unknown): string | undefined { // This helper cleans optional string fields without making them required.
  if (typeof value !== "string") { // This checks whether the optional value is not text.
    return undefined; // This returns undefined because missing optional context should not fail extraction.
  } // This line closes the non-string guard so string cleanup can happen safely.
  const trimmedValue = value.trim(); // This removes surrounding whitespace because context fields should be clean.
  return trimmedValue.length > 0 ? trimmedValue : undefined; // This returns meaningful text and drops empty strings.
} // This line closes the getOptionalTrimmedString helper so validation can reuse it.
function stripDataUrlPrefix(imageBase64: string): string { // This helper accepts either raw base64 or a full data URL from a browser.
  const commaIndex = imageBase64.indexOf(","); // This finds the comma that separates a data URL header from its base64 bytes.
  if (imageBase64.startsWith("data:") && commaIndex >= 0) { // This checks whether the input looks like a full data URL.
    return imageBase64.slice(commaIndex + 1).trim(); // This returns only the base64 payload because the MIME type is handled separately.
  } // This line closes the data URL branch so raw base64 can pass through.
  return imageBase64.trim(); // This returns trimmed raw base64 when no data URL prefix is present.
} // This line closes the stripDataUrlPrefix helper so validation can reuse it.
function validateRequestBody(body: unknown): { success: true; data: ExtractionRequest } | { success: false; error: string } { // This helper validates the untrusted JSON request body.
  if (!isPlainObject(body)) { // This checks whether the request body is not an object.
    return { success: false, error: "Request body must be a JSON object." }; // This returns a clear 400 error for unusable request shapes.
  } // This line closes the body-shape guard so field validation can continue.
  const rawImageBase64 = body.image_base64; // This reads the image_base64 field from the untrusted request body.
  if (typeof rawImageBase64 !== "string") { // This checks whether the image payload is missing or not text.
    return { success: false, error: "`image_base64` must be a non-empty base64 string." }; // This returns a clear error because the OCR step needs image bytes.
  } // This line closes the image-type guard so cleanup can happen safely.
  const imageBase64 = stripDataUrlPrefix(rawImageBase64); // This normalizes raw base64 and data URLs into one base64 payload format.
  if (imageBase64.length === 0) { // This checks whether the image payload is empty after cleanup.
    return { success: false, error: "`image_base64` must be a non-empty base64 string." }; // This returns a clear error because empty images cannot be processed.
  } // This line closes the empty-image guard so MIME validation can continue.
  if (imageBase64.length > 18_000_000) { // This checks for oversized base64 payloads before sending them to the AI provider.
    return { success: false, error: "Image is too large. Please upload a smaller label photo." }; // This returns a friendly error so users can retry with a smaller image.
  } // This line closes the size guard so normal images can continue.
  const rawMimeType = body.mime_type; // This reads the MIME type field from the untrusted request body.
  if (typeof rawMimeType !== "string") { // This checks whether the MIME type is missing or not text.
    return { success: false, error: "`mime_type` must be an image MIME type such as image/jpeg or image/png." }; // This returns a clear error because the data URL needs a valid image type.
  } // This line closes the MIME-type guard so trimming can happen safely.
  const mimeType = rawMimeType.trim().toLowerCase(); // This normalizes the MIME type for consistent validation and data URL creation.
  if (!mimeType.startsWith("image/")) { // This checks whether the uploaded file is actually an image.
    return { success: false, error: "`mime_type` must be an image MIME type such as image/jpeg or image/png." }; // This returns a clear error for non-image uploads.
  } // This line closes the image MIME guard so optional context can be validated next.
  const rawDomain = body.domain; // This reads the optional domain field from the request body.
  const domainCandidate = rawDomain === undefined ? "food" : rawDomain; // This defaults missing domain values to food so older frontend calls stay compatible.
  if (typeof domainCandidate !== "string") { // This checks whether the domain value is not text.
    return { success: false, error: "`domain` must be one of: food, cosmetics, export_compliance, pharmaceuticals." }; // This returns a clear error for invalid domain types.
  } // This line closes the domain-type guard so trimming can happen safely.
  const domain = domainCandidate.trim(); // This removes surrounding whitespace from the domain value.
  if (!isComplianceDomain(domain)) { // This checks whether the domain is supported by HalalIQ.
    return { success: false, error: "`domain` must be one of: food, cosmetics, export_compliance, pharmaceuticals." }; // This returns a clear error for unknown domains.
  } // This line closes the supported-domain guard so the validated request can be returned.
  return { success: true, data: { image_base64: imageBase64, mime_type: mimeType, product_name: getOptionalTrimmedString(body.product_name), market: getOptionalTrimmedString(body.market), domain } }; // This returns cleaned image data plus optional context for the extraction model.
} // This line closes the validateRequestBody helper so the handler can use it before any AI call.
function normalizeIngredientName(value: string): string { // This helper normalizes one extracted ingredient for a cleaner editable list.
  const collapsedValue = value.trim().replace(/\s+/g, " "); // This removes surrounding whitespace and collapses repeated inner spaces.
  if (collapsedValue.length === 0) { // This checks whether the ingredient became empty after cleanup.
    return ""; // This returns an empty string so the caller can remove unusable values.
  } // This line closes the empty-value guard so code and name normalization can continue.
  const eNumberMatch = collapsedValue.match(/^e\s*(\d+[a-z]?)$/i); // This checks whether the ingredient looks like an E-number such as e471.
  if (eNumberMatch) { // This branch handles E-number additives differently from normal words.
    return `E${eNumberMatch[1].toUpperCase()}`; // This returns a stable uppercase additive code such as E471.
  } // This line closes the E-number branch so ordinary names can be title-cased.
  return collapsedValue.split(" ").map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(" "); // This title-cases ordinary ingredient names for easier review.
} // This line closes the normalizeIngredientName helper so parsing can reuse it.
function parseIngredientsFromText(rawText: string): string[] { // This helper extracts a basic ingredient list from raw OCR text when AI JSON is incomplete.
  const ingredientSection = rawText.replace(/\r?\n/g, " ").replace(/^.*?ingredients?\s*[:\-]/i, ""); // This tries to focus on text after an Ingredients label when one exists.
  const candidates = ingredientSection.split(/[,;•]/); // This splits common label separators into candidate ingredient names.
  const uniqueIngredients = new Set<string>(); // This set removes duplicates while keeping the first readable order.
  for (const candidate of candidates) { // This loops through each candidate text chunk from the label.
    const normalizedCandidate = normalizeIngredientName(candidate); // This cleans one candidate into the same format used by the compliance scan.
    if (normalizedCandidate.length > 1 && normalizedCandidate.length < 80) { // This keeps plausible ingredient names and avoids huge OCR fragments.
      uniqueIngredients.add(normalizedCandidate); // This adds the cleaned candidate and automatically ignores duplicates.
    } // This line closes the plausible-candidate guard so the loop can continue.
  } // This line closes the candidate loop after all chunks have been reviewed.
  return Array.from(uniqueIngredients); // This returns a clean editable ingredient list for the frontend.
} // This line closes the parseIngredientsFromText helper so extraction fallback stays separate.
function extractJsonText(value: unknown): string | null { // This helper finds model output text inside the Responses API payload.
  if (isPlainObject(value) && typeof value.output_text === "string") { // This checks the convenient output_text property first.
    return value.output_text; // This returns the direct output_text value when the API provides it.
  } // This line closes the direct-output branch so nested output can be searched next.
  if (isPlainObject(value) && value.type === "output_text" && typeof value.text === "string") { // This checks the nested output_text item shape used inside Responses API output arrays.
    return value.text; // This returns the nested model text without accidentally returning IDs or status strings.
  } // This line closes the nested output_text branch so arrays and other objects can be searched.
  if (Array.isArray(value)) { // This checks whether the current value is an array.
    for (const item of value) { // This loops through nested array items looking for text.
      const nestedText = extractJsonText(item); // This recursively searches the nested item for text output.
      if (nestedText) { // This checks whether nested text was found.
        return nestedText; // This returns the first text value found in the response tree.
      } // This line closes the nested-text guard so the loop can continue when nothing was found.
    } // This line closes the array loop after every item has been searched.
  } // This line closes the array branch so object values can be searched.
  if (isPlainObject(value)) { // This checks whether the current value is an object.
    for (const nestedValue of Object.values(value)) { // This loops through object values looking for text.
      const nestedText = extractJsonText(nestedValue); // This recursively searches the nested value for text output.
      if (nestedText) { // This checks whether nested text was found.
        return nestedText; // This returns the first nested text value found.
      } // This line closes the nested-text guard so the loop can continue.
    } // This line closes the object-value loop after every value has been searched.
  } // This line closes the object branch so the null fallback can run.
  return null; // This returns null when no text output exists in the response payload.
} // This line closes the extractJsonText helper so OpenAI response parsing stays defensive.
function parseModelJson(text: string): ExtractionResult | null { // This helper parses the model's JSON output into the extraction result shape.
  const trimmedText = text.trim(); // This removes leading and trailing whitespace around the model output.
  const jsonStart = trimmedText.indexOf("{"); // This finds the first JSON object brace in case the model added extra text.
  const jsonEnd = trimmedText.lastIndexOf("}"); // This finds the last JSON object brace in case the model added extra text.
  if (jsonStart < 0 || jsonEnd < jsonStart) { // This checks whether a JSON object is visible in the output.
    return null; // This returns null so the caller can fall back to raw text parsing.
  } // This line closes the JSON-boundary guard so parsing can proceed.
  try { // This try block catches invalid JSON without crashing the request.
    const parsedValue = JSON.parse(trimmedText.slice(jsonStart, jsonEnd + 1)); // This parses the visible JSON object from the model output.
    if (!isPlainObject(parsedValue)) { // This checks whether the parsed JSON is not an object.
      return null; // This returns null because the response shape is unusable.
    } // This line closes the parsed-object guard so fields can be read safely.
    const rawText = typeof parsedValue.raw_text === "string" ? parsedValue.raw_text : ""; // This reads raw_text only when it is a string.
    const ingredients = Array.isArray(parsedValue.ingredients) ? parsedValue.ingredients.filter((item): item is string => typeof item === "string").map(normalizeIngredientName).filter(Boolean) : []; // This reads, normalizes, and cleans ingredients from the model JSON.
    const confidence = typeof parsedValue.confidence === "number" ? Math.min(Math.max(parsedValue.confidence, 0), 1) : 0.4; // This clamps confidence into a safe 0-to-1 range.
    const warnings = Array.isArray(parsedValue.warnings) ? parsedValue.warnings.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : []; // This reads warning strings and removes unusable values.
    const needsReview = typeof parsedValue.needs_review === "boolean" ? parsedValue.needs_review : confidence < 0.75; // This uses the model flag when present and otherwise falls back to confidence.
    const visualWarning = typeof parsedValue.visual_warning === "string" && parsedValue.visual_warning.trim().length > 0 ? parsedValue.visual_warning.trim() : null; // This reads an optional visual warning without forcing one to exist.
    return { raw_text: rawText, ingredients: Array.from(new Set(ingredients)), confidence, warnings, needs_review: needsReview, visual_warning: visualWarning }; // This returns the normalized extraction result in the API response shape.
  } catch (_error) { // This catch block handles invalid JSON from the model.
    return null; // This returns null so the caller can use fallback parsing instead.
  } // This line closes the JSON parsing try/catch block.
} // This line closes the parseModelJson helper so AI parsing stays isolated.
function buildExtractionPrompt(input: ExtractionRequest): string { // This helper builds the vision prompt in one place so the model's job stays narrow.
  const productText = input.product_name ? `Product name: ${input.product_name}.` : "Product name: unknown."; // This gives the model product context when the user provided it.
  const marketText = input.market ? `Target market: ${input.market}.` : "Target market: unknown."; // This gives the model market context when the user provided it.
  return `${productText} ${marketText} Domain: ${input.domain}. Extract readable label text and parse only the ingredient list from this image. Return strict JSON with keys raw_text, ingredients, confidence, warnings, needs_review, visual_warning. Use confidence from 0 to 1. If the image is blurry, incomplete, or no ingredient label is visible, set needs_review true and explain in warnings. If the image visually appears to show pork, ham, bacon, alcohol, or another obvious concern, set visual_warning to a cautious warning such as "Likely pork/ham detected. Please verify label or product source." Do not make a final halal or haram ruling from appearance alone.`; // This instructs the model to extract OCR data and warnings only, not final compliance decisions.
} // This line closes the buildExtractionPrompt helper so the AI call stays readable.
async function callOpenAiVision(input: ExtractionRequest): Promise<ExtractionResult> { // This helper calls OpenAI vision through the Responses API.
  const apiKey = Deno.env.get("OPENAI_API_KEY"); // This reads the OpenAI API key from Supabase Edge Function secrets.
  if (!apiKey) { // This checks whether the function has been configured with an OpenAI key.
    throw new Error("Image extraction is not configured. Add OPENAI_API_KEY to the Edge Function secrets."); // This gives a clear setup error instead of failing mysteriously.
  } // This line closes the missing-key guard so the API call only happens when configured.
  const model = Deno.env.get("OPENAI_VISION_MODEL") || "gpt-4.1-mini"; // This reads an optional model override and uses a cost-conscious vision-capable default.
  const imageUrl = `data:${input.mime_type};base64,${input.image_base64}`; // This builds the data URL format accepted by OpenAI image input.
  const response = await fetch("https://api.openai.com/v1/responses", { // This sends the extraction request to the OpenAI Responses API.
    method: "POST", // This uses POST because the Responses API creates a new model response.
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, // This sends authentication and JSON headers required by the API.
    body: JSON.stringify({ model, input: [{ role: "user", content: [{ type: "input_text", text: buildExtractionPrompt(input) }, { type: "input_image", image_url: imageUrl, detail: "auto" }] }] }), // This sends the prompt plus image as multimodal input.
  }); // This line closes the fetch call options.
  const responsePayload = await response.json().catch(() => null); // This parses the API response defensively because error payloads may vary.
  if (!response.ok) { // This checks whether OpenAI returned a non-success HTTP status.
    const errorMessage = isPlainObject(responsePayload) && isPlainObject(responsePayload.error) && typeof responsePayload.error.message === "string" ? responsePayload.error.message : "OpenAI image extraction failed."; // This extracts the provider error message when available.
    throw new Error(errorMessage); // This throws a clear error so the handler can return a controlled 500 response.
  } // This line closes the provider-error guard so successful output can be parsed.
  const outputText = extractJsonText(responsePayload) || ""; // This extracts the model output text from the Responses payload.
  const parsedResult = parseModelJson(outputText); // This tries to parse the model output as the strict JSON we requested.
  if (parsedResult) { // This checks whether JSON parsing succeeded.
    return parsedResult; // This returns the structured extraction result from the model.
  } // This line closes the parsed-result branch so fallback parsing can run.
  const fallbackIngredients = parseIngredientsFromText(outputText); // This extracts ingredient candidates from raw text when model JSON is missing.
  return { raw_text: outputText, ingredients: fallbackIngredients, confidence: fallbackIngredients.length > 0 ? 0.45 : 0.2, warnings: ["Extraction output was not structured, so HalalIQ used fallback parsing. Please review carefully."], needs_review: true, visual_warning: null }; // This returns a cautious fallback response that always asks for review.
} // This line closes the callOpenAiVision helper so the handler can call one extraction function.
serve(async (req: Request): Promise<Response> => { // This starts the Supabase Edge Function request handler.
  if (req.method === "OPTIONS") { // This checks whether the browser is sending a CORS preflight request.
    return new Response(null, { status: 204, headers: corsHeaders }); // This returns an empty success response so the browser allows the real POST.
  } // This line closes the OPTIONS branch so normal request handling can continue.
  if (req.method !== "POST") { // This checks whether the caller used the wrong HTTP method.
    return createJsonResponse({ error: "Method not allowed. Use POST." }, 405); // This returns a clear method error for non-POST requests.
  } // This line closes the method guard so only POST requests continue.
  let body: unknown; // This variable stores the parsed JSON body in an untrusted form.
  try { // This try block catches malformed JSON from the client.
    body = await req.json(); // This parses the request body as JSON.
  } catch (_error) { // This catch block handles invalid JSON syntax.
    return createJsonResponse({ error: "Request body must contain valid JSON." }, 400); // This returns a clear client error for malformed JSON.
  } // This line closes the JSON parsing try/catch block.
  try { // This try block handles validation and AI extraction.
    const validationResult = validateRequestBody(body); // This validates the body before any provider call is made.
    if (!validationResult.success) { // This checks whether request validation failed.
      return createJsonResponse({ error: validationResult.error }, 400); // This returns a client error because the request payload is invalid.
    } // This line closes the validation-failure branch so only valid input reaches AI.
    const extractionResult = await callOpenAiVision(validationResult.data); // This extracts raw text, ingredient candidates, and review warnings from the label photo.
    return createJsonResponse(extractionResult, 200); // This returns the extraction result for frontend review and editing.
  } catch (error) { // This catch block handles provider and unexpected server errors.
    const message = error instanceof Error ? error.message : "Image extraction failed."; // This safely converts unknown errors into readable text.
    return createJsonResponse({ error: message }, 500); // This returns a controlled server error response to the frontend.
  } // This line closes the main try/catch block so request handling is complete.
}); // This line closes the Edge Function module handler.
