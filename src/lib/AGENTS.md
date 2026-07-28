# Web Library Guide

This directory contains the web application's API façade, pure domain helpers, localization, SEO, Supabase integration, and feature utilities.

## Boundaries

- Export web API access through `src/lib/api.ts` and the modules under `src/lib/api/`. Keep PokéAPI, GraphQL, TCGdex, and public-profile access centralized.
- Keep pure calculations deterministic and side-effect free where possible. Feature logic such as team analysis, battle, breeding, filtering, badges, and TCG collection belongs here rather than inside route components.
- Use `@/lib/i18n` in client code and `@/lib/server-i18n` in server code. Keep the eight supported locales synchronized with `src/lib/languages.ts` and translation bundles.
- Use the established SEO helpers for canonical URLs, alternate languages, breadcrumbs, JSON-LD, and Open Graph metadata.
- Keep `src/lib/supabase/server.ts` and other server-only helpers out of client imports. Browser Supabase access must use the public client and RLS-backed operations.
- Validate external data at boundaries and use explicit interfaces or unions. Do not introduce `any` or broad `Record<string, unknown>` types.

## Testing

- Add or update focused Vitest tests for behavioral changes. Tests live beside the utility or under a nearby `__tests__` directory.
- Prefer pure-function tests for parsers, scoring, URL serialization, localization, collection calculations, and API response normalization.
- Run a focused test while iterating, then run the full suite from the repository root:

```bash
npx vitest run path/to/file.test.ts
npm run test -- --run
```
