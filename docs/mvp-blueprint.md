# Groceries Tracker MVP Blueprint

## Product Scope
- Shared household grocery list with roles: `owner`, `member`, `helper`.
- Baseline staples list (milk, bread, eggs, etc.) with one-tap add to active grocery list.
- Recipe ingestion from URL and photos (meal or recipe page).
- Mandatory review before save for parsed recipes.
- Recipe servings scaling when adding ingredients to groceries.
- Ingredient merge + quantity summation with unit conversion.
- Provenance tracking (which recipes/baseline entries contributed to each grocery line).

## Stack
- Next.js 16 (App Router, TypeScript)
- Supabase (Postgres, Auth, Storage, RLS)
- OpenAI + Anthropic provider abstraction for extraction
- Vercel hosting

## Data Model (Implemented)
- `profiles`
- `households`
- `household_members`
- `household_invites`
- `baseline_items`
- `recipes`
- `recipe_ingredients`
- `recipe_import_logs`
- `grocery_items`
- `grocery_item_sources`

Migration file: `supabase/migrations/20260221095000_init.sql`

## Security
- Row Level Security enabled on all app tables.
- Access enforced by `is_household_member()` and `is_household_owner()` functions.
- Invite join flow uses RPC: `accept_household_invite(input_code text)`.
- Storage bucket `recipe-images` created with authenticated policies.

## Core Flows
1. Sign in using email magic link or Google.
2. Auto-bootstrap a household at first sign-in.
3. Add baseline staples and manual grocery lines.
4. Import recipe from URL or image and review extracted fields.
5. Save recipe + ingredients + extraction log.
6. Add recipe ingredients to grocery list with servings scaling.
7. Merge and sum quantities with unit conversion when compatible.

## Unit Conversion Rules (MVP)
- Supported dimensions: `volume`, `weight`, `count`.
- Supported conversion examples:
  - `tsp` <-> `tbsp` <-> `cup` <-> `ml` <-> `l` <-> `fl oz`
  - `g` <-> `kg` <-> `oz` <-> `lb`
- Count units merge only when equivalent (or one side is generic `unit`).
- Unknown units merge only on exact unit match.

## Known MVP Limitations
- Invite flow currently uses shareable codes (no email invite sending).
- Storage policies are authenticated-bucket level for simplicity (can be tightened by household path rules later).
- AI extraction quality depends on source page/image quality and model output.

## Suggested Next Iterations
1. Household switcher for users in multiple households.
2. Density-aware weight/volume conversions for common ingredients.
3. Conflict resolution UI for ambiguous unit merges.
4. Push notifications and reminder cadence.
5. Better recipe URL scraping with schema.org microdata prioritization.
