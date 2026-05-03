# HalalIQ Supabase Edge Function

This folder contains the Supabase Edge Function setup for the HalalIQ product-level compliance analyzer.

## Files

- `config.toml`: Points the Supabase CLI to your project reference.
- `functions/analyze-food/index.ts`: Validates input, normalizes ingredients, queries Neo4j, saves reports, and returns scan history.
- `functions/extract-ingredients-from-image/index.ts`: Extracts label text and editable ingredient candidates from an uploaded image.
- `functions/halal-compliance-validator/index.ts`: Legacy copy kept for compatibility while the deployed Supabase function name is `analyze-food`.

## Expected Input

```json
{
  "product_name": "Chocolate Wafer Biscuit",
  "ingredients": ["E471", "Gelatin"],
  "market": "Malaysia",
  "domain": "food"
}
```

## What The Function Does Right Now

- Accepts browser `OPTIONS` preflight requests
- Accepts `POST` scan requests
- Validates `product_name`, `ingredients`, and `market`
- Normalizes ingredients
- Queries Neo4j for ingredient-level risk
- Supports domain-aware Neo4j risks through optional `Risk` to `Domain` relationships
- Builds a product-level report
- Saves submissions and reports into Supabase
- Returns previous scan history for the product
- Accepts optional `domain`, defaulting to `food`
- Uses `extract-ingredients-from-image` for OCR-first label photo extraction before the user runs a scan

## Neo4j Domain Seeds

Optional domain expansion seed data lives at:

```text
../neo4j/seeds/domain-expansion.cypher
```

The current expansion order is Cosmetics & Personal Care first, Export Compliance second, and Pharmaceuticals third.

## Image Extraction Secrets

Set these Supabase Edge Function secrets before deploying `extract-ingredients-from-image`:

```powershell
supabase secrets set OPENAI_API_KEY="your-openai-api-key"
supabase secrets set OPENAI_VISION_MODEL="gpt-4.1-mini"
```

If you do not have an AI API key yet, the frontend still includes a `Use demo OCR` button so the label-photo review flow can be demonstrated without calling OpenAI.

## Deploy

Run these commands from `D:\HalalCompliance\supabase` after installing the Supabase CLI:

```powershell
supabase login
supabase functions deploy analyze-food
supabase functions deploy extract-ingredients-from-image
```

## Local Serve

```powershell
supabase functions serve analyze-food
```

## Example Request

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri "http://127.0.0.1:54321/functions/v1/analyze-food" `
  -ContentType "application/json" `
  -Body '{"product_name":"Chocolate Wafer Biscuit","ingredients":["E471","Gelatin"],"market":"Malaysia"}'
```
