# HalalIQ Supabase Edge Function

This folder contains the Supabase Edge Function setup for the HalalIQ product-level compliance analyzer.

## Files

- `config.toml`: Points the Supabase CLI to your project reference.
- `functions/analyze-food/index.ts`: Validates input, normalizes ingredients, queries Neo4j, saves reports, and returns scan history.
- `functions/halal-compliance-validator/index.ts`: Legacy copy kept for compatibility while the deployed Supabase function name is `analyze-food`.

## Expected Input

```json
{
  "product_name": "Chocolate Wafer Biscuit",
  "ingredients": ["E471", "Gelatin"],
  "market": "Malaysia"
}
```

## What The Function Does Right Now

- Accepts browser `OPTIONS` preflight requests
- Accepts `POST` scan requests
- Validates `product_name`, `ingredients`, and `market`
- Normalizes ingredients
- Queries Neo4j for ingredient-level risk
- Builds a product-level report
- Saves submissions and reports into Supabase
- Returns previous scan history for the product

## Deploy

Run these commands from `D:\HalalCompliance\supabase` after installing the Supabase CLI:

```powershell
supabase login
supabase functions deploy analyze-food
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
