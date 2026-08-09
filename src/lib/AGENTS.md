# Web library guide

This guide supplements `src/AGENTS.md` for the web API façade, pure helpers, localization, SEO, Neon integration, and feature utilities under `src/lib/`.

## Boundaries

- Export web data access through `src/lib/api.ts` and the modules under `src/lib/api/`. Keep PokéAPI, GraphQL, TCGdex, and related external access centralized and normalized at the boundary.
- Keep calculations, parsers, serializers, scoring, filtering, collection logic, and feature engines deterministic and side-effect free where practical. Route components should orchestrate them rather than reimplementing them.
- Use `@/lib/i18n` in client code and `@/lib/server-i18n` in Server Components/metadata. Keep the eight locales synchronized with `src/lib/languages.ts`, core data, and translation bundles.
- Use the established SEO helpers for canonical URLs, alternates, breadcrumbs, JSON-LD, and Open Graph metadata.
- Keep `src/lib/neon/server.ts`, `server-auth.ts`, and other server-only helpers out of client imports. Browser authentication uses the Neon Auth client; server APIs authenticate and enforce ownership.
- Treat `src/lib/supabase` as a compatibility path for sync/leaderboard clients, not as permission to introduce Supabase runtime assumptions.
- Validate external/user data at boundaries with explicit interfaces or unions. Do not introduce `any` or broad unstructured records.

## Testing

Add or update focused Vitest tests for behavior changes, especially parsers, scoring, URL serialization, localization, collection calculations, API normalization, rate limits, and server-boundary fallbacks. Tests live beside utilities or in a nearby `__tests__` directory.

```bash
npx vitest run src/lib/team-analysis.test.ts
npm run test -- --run
```
