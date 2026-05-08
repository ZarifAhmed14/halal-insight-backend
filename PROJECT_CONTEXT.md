# HalalIQ Project Context

This file is a quick handoff note for future Codex sessions working on HalalIQ or related BuildFest projects.

## Working Style

- Follow the AI Development Workflow and recommended BuildFest approach: build step by step, test each layer, and avoid jumping ahead into unrelated features.
- Prefer clean, understandable implementation over clever code.
- Keep backend logic modular: validation, normalization, query logic, business logic, report generation, persistence, and AI/OCR should stay separated.
- Keep AI as an assistant to extraction and explanation, not the final halal/haram authority.
- Use deterministic rules, Neo4j data, market requirements, and saved evidence as the source of compliance decisions.
- For image input, use OCR-first: extract label text, let the user review/edit ingredients, then run the normal compliance scan.
- Visual recognition may warn, for example "likely pork/ham detected," but should not make a final ruling from appearance alone.
- Preserve secrets carefully. Never commit `.env.local`, API keys, service role keys, Neo4j passwords, or Supabase secrets.

## Storage Rule

- Future projects should be created and worked on under `D:\` whenever possible because the `C:\` drive has limited space.
- If an existing repo is already on `C:\`, only keep using it when moving it would create unnecessary risk or interrupt the current workflow.
- For new projects, prefer a path like `D:\Projects\<project-name>` or another clear folder on the `D:\` drive.

## Current HalalIQ Architecture

- Frontend: React/TanStack app in `frontend`.
- Backend: Supabase Edge Functions in `backend/supabase/functions`.
- Main compliance function: `analyze-food`.
- Image extraction function: `extract-ingredients-from-image`.
- Database: Supabase tables for products, submissions, and reports.
- Graph logic: Neo4j ingredient/domain/market risk data.
- AI provider currently used for image extraction: Gemini through Supabase Edge Function secrets.

## MVP Product Rules

- Manual scan should always continue working even if image extraction fails.
- Image scan should always require user review before compliance analysis.
- Domain selector should support food, cosmetics, export compliance, and pharmaceuticals.
- The MVP may run cosmetics/export/pharma through the same compliance pipeline, but richer results require matching Neo4j domain data.
- Product history should remain connected to saved submissions and reports.

## Backend Comment Rule

- Supabase Edge Function code has been written with educational comments on every non-empty line because that was a project requirement.
- If editing Edge Function files, preserve that style unless the requirement is explicitly removed.

## Suggested Next Steps

- Do final UI copy polish and demo-flow cleanup.
- Run manual scan, image extraction scan, and report-history smoke tests.
- Confirm Supabase secrets are configured before live demos.
- Confirm Neo4j has enough sample data for food, cosmetics, export compliance, and pharmaceuticals.
- Prepare a short demo script that explains: input, OCR review, compliance result, evidence requirements, and saved history.
