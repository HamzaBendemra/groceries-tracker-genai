# AGENTS.md

Project guidance for coding agents working in this repository.

## Product Summary
- Mobile-first shared groceries app for a household.
- Core domains:
  - Groceries list (check/uncheck, inline edits, reset modes).
  - Baseline staples list.
  - Recipe import (URL/photo), ingredient editing, and add-to-groceries.
- Data layer: Supabase (Auth + Postgres + Storage + RLS).

## Current Version
- Source of truth: `src/lib/version.ts`
- Current: `v0.6.1`

## Mandatory Version Rule
- Every time you prepare a commit that will be pushed, bump `APP_VERSION` in `src/lib/version.ts`.
- Use semantic versioning:
  - `PATCH` for fixes/small UI changes.
  - `MINOR` for new features/endpoints/flows.
  - `MAJOR` for breaking changes.
- Keep footers in sync by importing `APP_VERSION` (do not hardcode version text in UI files).

## Build and Validation
- Run before commit:
  - `npm run lint`
  - `npm run build`
- Do not push with failing lint/build.

## Architecture Notes
- Next.js App Router.
- Server actions in `src/app/(app)/actions.ts`.
- APIs in `src/app/api/**`.
- Shared UI components in `src/components/**`.
- Ingredient utilities in `src/lib/ingredients/**`.

## UX Conventions
- Prioritize iPhone touch ergonomics:
  - Large tap targets (`min-h-11` pattern).
  - `touch-manipulation` for tappable controls.
- Provide clear pending states for long-running actions (`Importing...`, `Saving...`, `Adding...`).
- Non-blocking feedback should use subtle toasts.

## Data and Formatting Rules
- Ingredient names are Title Case in UI and write paths.
- Preserve normalized names for merge logic (`normalizeIngredientName`).
- Unit normalization/conversion should continue to use existing helpers.

## Recipe Source Revisit Rules
- If recipe has `source_url`, show "Open original recipe".
- If recipe has `source_image_path`, show "View source image" via signed URL.

## Security and Access
- Keep RLS assumptions intact: household-scoped access only.
- Any new write API must verify authenticated user + household ownership/membership.

## Deployment Notes
- Production stack: Vercel + Supabase.
- Ensure Auth redirect URLs include:
  - `/auth/callback` for local and production domains.
