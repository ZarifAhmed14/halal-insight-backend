import readExcelFile from "read-excel-file/browser";
import { lookupBarcodeProduct, type ComplianceDomain } from "@/lib/halaliq-api";
import { DEMO_BARCODE_LOOKUPS, MAX_IMPORTED_FILE_ROWS } from "./config";

export type CodePayload = {
  ingredients: string[];
  productName?: string;
  market?: string;
  domain?: ComplianceDomain;
  sourceLabel: string;
};

export type ParsedCodeOutcome =
  | {
      kind: "payload";
      payload: CodePayload;
    }
  | {
      kind: "barcode";
      rawValue: string;
    };

export function parseIngredients(value: string): string[] {
  return value
    .split(/\r?\n|,/)
    .map((ingredient) => ingredient.trim())
    .filter(Boolean);
}

function extractIngredientsFromText(rawValue: string): string[] {
  const normalized = rawValue.replace(/\|/g, "\n");
  const matchedIngredients = normalized.match(/ingredients?\s*[:=-]\s*([\s\S]+)/i);

  if (matchedIngredients?.[1]) {
    return parseIngredients(matchedIngredients[1]);
  }

  return parseIngredients(normalized);
}

export function shouldAutoOpenScannerOnThisDevice(): boolean {
  if (typeof window === "undefined") return false;

  const mobileMediaMatch = window.matchMedia?.("(max-width: 900px)")?.matches ?? false;
  const touchMediaMatch = window.matchMedia?.("(pointer: coarse)")?.matches ?? false;
  const userAgent = window.navigator.userAgent.toLowerCase();
  const mobileUserAgent = /android|iphone|ipad|ipod|mobile|windows phone/i.test(userAgent);

  return mobileMediaMatch || touchMediaMatch || mobileUserAgent;
}

function extractBarcodeFromUrl(value: string): string | null {
  try {
    const parsedUrl = new URL(value);
    const fromSearchParams = [
      parsedUrl.searchParams.get("code"),
      parsedUrl.searchParams.get("barcode"),
      parsedUrl.searchParams.get("gtin"),
      parsedUrl.searchParams.get("ean"),
      parsedUrl.searchParams.get("upc"),
    ].find((item) => item && /^\d{8,14}$/.test(item.trim()));

    if (fromSearchParams) {
      return fromSearchParams.trim();
    }

    const pathSegments = parsedUrl.pathname
      .split("/")
      .map((segment) => segment.trim())
      .filter(Boolean);
    const fromPath = [...pathSegments].reverse().find((segment) => /^\d{8,14}$/.test(segment));

    return fromPath ?? null;
  } catch (_error) {
    return null;
  }
}

export function parseCodePayload(rawValue: string): ParsedCodeOutcome | null {
  const trimmedValue = rawValue.trim();
  if (!trimmedValue) return null;

  try {
    const parsedUrl = new URL(trimmedValue);
    const urlIngredients = parseIngredients(
      parsedUrl.searchParams.get("ingredients") ??
        parsedUrl.searchParams.get("ingredient_list") ??
        parsedUrl.searchParams.get("items") ??
        "",
    );

    if (urlIngredients.length > 0) {
      const nextDomain = parsedUrl.searchParams.get("domain");

      return {
        kind: "payload",
        payload: {
          ingredients: urlIngredients,
          productName: parsedUrl.searchParams.get("product_name") ?? undefined,
          market: parsedUrl.searchParams.get("market") ?? undefined,
          domain: isComplianceDomain(nextDomain) ? nextDomain : undefined,
          sourceLabel: "QR code",
        },
      };
    }

    const barcodeFromUrl = extractBarcodeFromUrl(trimmedValue);
    if (barcodeFromUrl) {
      return { kind: "barcode", rawValue: barcodeFromUrl };
    }
  } catch (_error) {
    // Ignore non-URL values and keep checking other payload shapes.
  }

  try {
    const parsedJson = JSON.parse(trimmedValue) as Record<string, unknown>;
    const rawIngredients =
      parsedJson.ingredients ??
      parsedJson.ingredient_list ??
      parsedJson.items ??
      parsedJson.ingredients_text;

    const ingredients = Array.isArray(rawIngredients)
      ? rawIngredients
          .filter((value): value is string => typeof value === "string")
          .flatMap((value) => parseIngredients(value))
      : typeof rawIngredients === "string"
        ? parseIngredients(rawIngredients)
        : [];

    if (ingredients.length > 0) {
      const nextDomain = typeof parsedJson.domain === "string" ? parsedJson.domain : undefined;

      return {
        kind: "payload",
        payload: {
          ingredients,
          productName:
            typeof parsedJson.product_name === "string" ? parsedJson.product_name : undefined,
          market: typeof parsedJson.market === "string" ? parsedJson.market : undefined,
          domain: isComplianceDomain(nextDomain) ? nextDomain : undefined,
          sourceLabel: "QR code",
        },
      };
    }
  } catch (_error) {
    // Ignore non-JSON values and try plain text extraction.
  }

  const ingredients = extractIngredientsFromText(trimmedValue);
  const looksLikeIngredientText =
    /ingredients?\s*[:=-]/i.test(trimmedValue) || /[,;\n]/.test(trimmedValue);

  if (ingredients.length > 0 && looksLikeIngredientText) {
    return {
      kind: "payload",
      payload: {
        ingredients,
        sourceLabel: "QR code",
      },
    };
  }

  if (/^\d{8,14}$/.test(trimmedValue)) {
    return {
      kind: "barcode",
      rawValue: trimmedValue,
    };
  }

  return null;
}

function formatBarcodeSourceLabel(code: string, sourceLabel: string, brand?: string): string {
  const trimmedBrand = brand?.trim();
  return trimmedBrand && trimmedBrand.length > 0
    ? `${sourceLabel} (${trimmedBrand} • ${code})`
    : `${sourceLabel} (${code})`;
}

export async function resolveBarcodePayload(
  code: string,
  domain: ComplianceDomain,
): Promise<CodePayload | null> {
  const demoLookup = DEMO_BARCODE_LOOKUPS[code];

  if (demoLookup) {
    const demoIngredients = parseIngredients(demoLookup.ingredients_text);

    if (demoIngredients.length > 0) {
      return {
        ingredients: demoIngredients,
        productName: demoLookup.product_name,
        sourceLabel: formatBarcodeSourceLabel(code, "Retail barcode lookup", demoLookup.brand),
      };
    }
  }

  const lookupResult = await lookupBarcodeProduct(code, domain);
  if (!lookupResult) return null;

  const ingredients = parseIngredients(lookupResult.ingredients_text);
  if (ingredients.length === 0) return null;

  return {
    ingredients,
    productName: lookupResult.product_name,
    sourceLabel: formatBarcodeSourceLabel(code, lookupResult.source_label, lookupResult.brand),
  };
}

export function isComplianceDomain(value: string | null | undefined): value is ComplianceDomain {
  return (
    value === "food" ||
    value === "cosmetics" ||
    value === "export_compliance" ||
    value === "pharmaceuticals"
  );
}

function isImportHeader(value: string): boolean {
  return ["ingredient", "ingredients", "item", "items"].includes(value.trim().toLowerCase());
}

function normalizeCellText(cell: unknown): string {
  if (cell === null || cell === undefined) {
    return "";
  }

  return String(cell).trim();
}

function isSummarySheetName(name: string): boolean {
  return /summary|meta|readme|notes/i.test(name);
}

function getIngredientColumnIndexes(headerRow: unknown[]): number[] {
  const exactMatches = new Set([
    "ingredient",
    "ingredients",
    "ingredient primary",
    "ingredient secondary",
    "ingredient_primary",
    "ingredient_secondary",
    "item",
    "items",
  ]);

  return headerRow.reduce<number[]>((matches, cell, index) => {
    const normalized = normalizeCellText(cell).toLowerCase();
    if (!normalized) return matches;

    if (exactMatches.has(normalized) || normalized.includes("ingredient")) {
      matches.push(index);
    }

    return matches;
  }, []);
}

function looksLikeMetadataRow(row: string[]): boolean {
  const joined = row.join(" ").toLowerCase();
  return (
    joined.includes("summary") ||
    joined.includes("demo sample") ||
    joined.includes("product rows") ||
    joined.includes("ingredient columns") ||
    joined.includes("countries") ||
    joined.includes("categories")
  );
}

function dedupeIngredients(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function extractIngredientsFromSheetRows(rows: unknown[][]): string[] {
  if (!rows.length) return [];

  const headerRow =
    rows.find((row) => row.some((cell) => normalizeCellText(cell).length > 0)) ?? [];
  const ingredientColumnIndexes = getIngredientColumnIndexes(headerRow);

  if (ingredientColumnIndexes.length > 0) {
    return dedupeIngredients(
      rows
        .slice(rows.indexOf(headerRow) + 1)
        .flatMap((row) =>
          ingredientColumnIndexes.flatMap((columnIndex) =>
            parseIngredients(normalizeCellText(row[columnIndex])),
          ),
        )
        .filter((cell) => cell.length > 0 && !isImportHeader(cell)),
    ).slice(0, MAX_IMPORTED_FILE_ROWS);
  }

  const cdColumnIngredients = dedupeIngredients(
    rows
      .flatMap((row) => [normalizeCellText(row[2]), normalizeCellText(row[3])])
      .filter((cell) => cell.length > 0 && !isImportHeader(cell))
      .flatMap((cell) => parseIngredients(cell)),
  ).filter((cell) => !looksLikeMetadataRow([cell]));

  if (cdColumnIngredients.length > 0) {
    return cdColumnIngredients.slice(0, MAX_IMPORTED_FILE_ROWS);
  }

  return dedupeIngredients(
    rows
      .flatMap((row) => row.map((cell) => normalizeCellText(cell)))
      .filter((cell) => cell.length > 0 && !isImportHeader(cell))
      .flatMap((cell) => parseIngredients(cell)),
  ).slice(0, MAX_IMPORTED_FILE_ROWS);
}

function extractIngredientsFromWorkbookSheets(workbook: unknown): string[] {
  const sheets = Array.isArray(workbook)
    ? workbook
        .map((entry) => {
          if (
            entry &&
            typeof entry === "object" &&
            "data" in entry &&
            Array.isArray((entry as { data?: unknown }).data)
          ) {
            const sheetEntry = entry as { sheet?: string; data: unknown[][] };
            return { sheet: sheetEntry.sheet ?? "", data: sheetEntry.data };
          }

          if (Array.isArray(entry)) {
            return { sheet: "", data: entry as unknown[][] };
          }

          return null;
        })
        .filter((entry): entry is { sheet: string; data: unknown[][] } => Boolean(entry))
    : [];

  const candidateSheets = sheets.filter(
    (sheet) => sheet.data.length > 0 && !isSummarySheetName(sheet.sheet),
  );

  const prioritizedSheet =
    candidateSheets.find((sheet) =>
      sheet.data.some((row) => getIngredientColumnIndexes(row).length > 0),
    ) ?? candidateSheets[0] ?? sheets.find((sheet) => sheet.data.length > 0);

  if (!prioritizedSheet) {
    return [];
  }

  return extractIngredientsFromSheetRows(prioritizedSheet.data);
}

export function sanitizeExtractedIngredients(ingredients: unknown): string[] {
  const ingredientList = Array.isArray(ingredients) ? ingredients : [];

  return Array.from(
    new Set(
      ingredientList
        .filter((ingredient): ingredient is string => typeof ingredient === "string")
        .map((ingredient) => ingredient.trim())
        .filter(Boolean),
    ),
  );
}

export async function readIngredientsFromFile(file: File): Promise<string[]> {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";

  if (["txt", "csv", "tsv"].includes(extension)) {
    const text = await file.text();
    const firstLines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !isImportHeader(line))
      .slice(0, MAX_IMPORTED_FILE_ROWS)
      .join("\n");

    return parseIngredients(firstLines);
  }

  if (extension === "xlsx") {
    const workbook = await readExcelFile(file);
    const ingredients = extractIngredientsFromWorkbookSheets(workbook);

    if (ingredients.length > 0) {
      return ingredients;
    }

    throw new Error("No ingredient columns were found in this Excel file.");
  }

  if (extension === "docx") {
    const mammoth = await import("mammoth");
    const result = await mammoth.default.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    const firstLines = result.value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !isImportHeader(line))
      .slice(0, MAX_IMPORTED_FILE_ROWS)
      .join("\n");

    return parseIngredients(firstLines);
  }

  throw new Error("Supported files: Excel (.xlsx), Word (.docx), CSV, TSV, and TXT.");
}

export function readImageAsBase64(
  file: File,
): Promise<{ image_base64: string; mime_type: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const [, base64 = ""] = result.split(",");

      if (!base64) {
        reject(new Error("Could not read the selected image."));
        return;
      }

      resolve({ image_base64: base64, mime_type: file.type || "image/jpeg" });
    };

    reader.onerror = () => reject(new Error("Could not read the selected image."));
    reader.readAsDataURL(file);
  });
}
