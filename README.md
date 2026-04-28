# Halal Insight

Monorepo for the HalalIQ / Halal Insight project.

## Structure

- `frontend/` contains the Vite/TanStack React frontend.
- `backend/` contains the Supabase Edge Function backend.

## Backend

The main Supabase Edge Function lives at:

```text
backend/supabase/functions/halal-compliance-validator/index.ts
```

## Frontend

Run frontend commands from:

```powershell
cd frontend
npm install
npm run dev
```

## Safety

Do not commit `.env`, service-role keys, Neo4j passwords, Supabase secrets, or local deployment credentials.
