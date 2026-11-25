# Web library guide

This guide supplements `src/AGENTS.md` for the web API façade, pure helpers, localization, SEO, Supabase integration, and feature utilities under `src/lib/`.

## Boundaries

- Export web data access through `src/lib/api.ts` and the modules under `src/lib/api/`. Keep PokéAPI, GraphQL, TCGdex, and related external access centralized and normalized at the boundary.
- Keep calculations, parsers, serializers, scoring, filtering, collection logic, and feature engines deterministic and side-effect free where practical. Route components should orchestrate them rather than reimplementing them.
- Use `@/lib/i18n` in client code and `@/lib/server-i18n` in Server Components/metadata. Keep the eight locales synchronized with `src/lib/languages.ts`, core data, and translation bundles.
- Use the established SEO helpers for canonical URLs, alternates, breadcrumbs, JSON-LD, and Open Graph metadata.
- Keep `src/lib/supabase/database.ts` and `server-auth.ts` out of client imports. Browser authentication uses the Supabase SSR client; server APIs authenticate and enforce ownership explicitly because the server PostgreSQL role bypasses RLS.
- Import server-only profile/database helpers directly from Server Components or Route Handlers; never re-export them from the mixed client/server `src/lib/api.ts` façade.
- Treat `src/lib/supabase/sync-state.ts` as a stable data-contract path. Supabase Auth and PostgreSQL are the active web runtime.
- Validate external/user data at boundaries with explicit interfaces or unions. Do not introduce `any` or broad unstructured records.

## Verification

Run the focused Vitest file when changing a helper with existing coverage, then run the root lint and type checks as appropriate:

```bash
npx vitest run path/to/file.test.ts
npm run lint
npm run typecheck
```
