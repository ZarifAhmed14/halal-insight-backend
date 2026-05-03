# Halal Insight

Monorepo for the HalalIQ / Halal Insight project.

## Structure

- `frontend/` contains the Vite/TanStack React frontend.
- `backend/` contains the Supabase Edge Function backend and Neo4j seed scripts.

## Backend

The main Supabase Edge Function lives at:

```text
backend/supabase/functions/analyze-food/index.ts
```

The image extraction Edge Function lives at:

```text
backend/supabase/functions/extract-ingredients-from-image/index.ts
```

Neo4j domain expansion seed data lives at:

```text
backend/neo4j/seeds/domain-expansion.cypher
```

The frontend includes demo OCR mode, so the label-photo workflow can be presented before an OpenAI API key is connected.

## Frontend

Run frontend commands from:

```powershell
cd frontend
npm install
npm run dev
```

## Safety

Do not commit `.env`, service-role keys, Neo4j passwords, Supabase secrets, or local deployment credentials.
