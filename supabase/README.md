# Halal Compliance Supabase Edge Function

This folder contains a minimal Supabase Edge Function setup for your Halal compliance validator.

## Files

- `config.toml`: Points the Supabase CLI to your project reference.
- `functions/halal-compliance-validator/index.ts`: Validates input and returns cleaned data.

## Expected Input

```json
{
  "ingredients": ["E471", "Gelatin"],
  "market": "Malaysia"
}
```

## What The Function Does Right Now

- Accepts `POST` requests only
- Parses JSON safely
- Validates `ingredients`
- Validates `market`
- Returns HTTP `400` on invalid input
- Returns validated data on success

## Deploy

Run these commands from `D:\HalalCompliance\supabase` after installing the Supabase CLI:

```powershell
supabase login
supabase functions deploy halal-compliance-validator
```

## Local Serve

```powershell
supabase functions serve halal-compliance-validator
```

## Example Request

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri "http://127.0.0.1:54321/functions/v1/halal-compliance-validator" `
  -ContentType "application/json" `
  -Body '{"ingredients":["E471","Gelatin"],"market":"Malaysia"}'
```
