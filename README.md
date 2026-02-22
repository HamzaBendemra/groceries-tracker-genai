# HomeCart AI

Personal app leveraging GenAI to manage a family's meal plan: support for staples, recipes, and one-tap list building.

## Features
- Shared household list with member roles (`owner`, `member`, `helper`)
- Auth with email magic link or Google OAuth (Supabase Auth)
- Baseline staples list + one-tap add to groceries
- AI-powered baseline staple recommendations (prioritized essentials, up to 40 items)
- Baseline staple delete support
- Recipe import from URL, meal photo, or recipe-page photo
- Manual review/edit before saving imported recipe
- Saved recipe ingredient management (add/edit/delete)
- Autosave ingredient edits (no explicit save click)
- Recipe servings scaling
- Ingredient merge with unit conversion
- Source provenance on grocery lines (recipe/baseline links)
- Revisitable recipe sources:
  - `Open original recipe` (when URL exists)
  - `View source image` (when imported from photo)
- Progress feedback + UX polish:
  - Pending button states (`Importing...`, `Saving...`, `Adding...`)
  - Top-right non-blocking toast after adding recipe ingredients to groceries
  - Mobile-optimized touch targets and whole-row tap to check/uncheck groceries
- Title Case normalization for ingredient names across groceries/staples/recipes
- Recipe import logging (history/audit)

## Tech Stack
- Next.js 16 + TypeScript
- Supabase (Postgres, Auth, Storage, RLS)
- OpenAI / Anthropic extraction provider abstraction
- Vercel deployment

## Local Setup
1. Install dependencies:
```bash
npm install
```

2. Create `.env.local` from `.env.example` and fill values:
```bash
cp .env.example .env.local
```

Required:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

AI:
- `AI_PROVIDER=openai` or `anthropic`
- `OPENAI_API_KEY` and/or `ANTHROPIC_API_KEY`

3. Run the SQL migration in Supabase SQL Editor:
- File: `supabase/migrations/20260221095000_init.sql`

4. In Supabase Auth settings:
- Enable Email OTP login
- Enable Google provider
- Add redirect URL:
  - Local: `http://localhost:3000/auth/callback`
  - Prod: `https://<your-domain>/auth/callback`

5. Start dev server:
```bash
npm run dev
```

## Build Checks
```bash
npm run lint
npm run build
npm test
```

## CI
- GitHub Actions workflow: `.github/workflows/ci.yml`
- Runs on push to `main` and all pull requests.
- Executes:
  - `npm ci`
  - `npm run lint`
  - `npm test`
  - `npm run build`
- Recommended repo setting: require `CI / checks` status before merge.

## Test Coverage (MVP Guardrails)
- Baseline recommendation normalization:
  - Quantity sanitization (including large/string quantities)
  - Deduplication and max-item cap enforcement
  - File: `src/lib/baseline/suggest.test.ts`
- Recipe add fallback path:
  - Uses RPC result when available
  - Falls back to ingredient merge flow if RPC fails
  - File: `src/lib/groceries/add-recipe-to-groceries.test.ts`

## Deployment
1. Push repo to GitHub (`homecart-ai`).
2. Import project in Vercel.
3. Configure env vars in Vercel (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, AI keys).
4. Ensure Supabase Auth redirect includes production callback URL.
5. Deploy.

## Important Paths
- App pages: `src/app/(app)`
- Server actions: `src/app/(app)/actions.ts`
- Recipe import APIs: `src/app/api/recipes/*`
- Extraction logic: `src/lib/recipes/extract.ts`
- Merge + conversions: `src/lib/ingredients/*`
- Database/RLS migration: `supabase/migrations/20260221095000_init.sql`
- MVP blueprint: `docs/mvp-blueprint.md`
