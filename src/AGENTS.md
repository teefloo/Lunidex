# Web application source guide

This guide supplements the repository guide for `src/`, the Next.js 16 / React 19 web application.

## Boundaries

- Routes live in `src/app/`; server-only Route Handlers live in `src/app/api/` and follow that directory's guide.
- Reusable UI belongs in `src/components/`. API clients, pure helpers, localization, SEO, and feature calculations belong in `src/lib/`. Web-persisted Zustand state belongs in `src/store/primedex.ts`.
- Portable domain rules and data models used by the web app belong in `packages/core`. Keep web UI state, persistence, API access, and server integrations in their `src/` modules.
- Prefer Server Components and add `'use client'` only at the smallest interactive boundary. Keep server-only Neon clients, connection strings, auth secrets, and database operations out of client bundles.
- Use the `@/` alias for web imports, the centralized `@/lib/api` façade for remote data, and the existing named-export style for new reusable modules.

## Locale-aware web behavior

- Supported locale prefixes are `en`, `fr`, `es`, `de`, `it`, `ja`, `ko`, and `zh`.
- `src/proxy.ts` redirects unprefixed paths and rewrites prefixed paths. Use `useLocaleHref` or the established locale helpers for internal client links.
- Use `@/lib/i18n` / `useTranslation` in client code and `@/lib/server-i18n` / server helpers in Server Components and metadata. Keep user-facing strings out of new hard-coded component text.
- Preserve canonical/alternate metadata, JSON-LD, sitemap, `llms.txt`, `ai.txt`, and OpenSearch behavior when changing routes.

## State and data

- `src/store/primedex.ts` is the web application's Zustand store and uses IndexedDB persistence. Store IDs, primitives, filters, and small user-owned records, not API response blobs.
- Wait for `_hasHydrated` before persisted-state decisions and use individual Zustand selectors where practical.
- The app is local-first. Neon Auth, sync, profiles, leaderboard, price alerts, and other server-backed features must retain their existing unavailable behavior when Neon is not configured.
- Keep `SYNCED_KEYS` and `src/lib/supabase/sync-state.ts` deliberate when changing synchronized fields; the `supabase` path is a compatibility identifier.

## Web verification

Run from the repository root after web changes:

```bash
npm run lint
npm run typecheck
```

The full CI also runs the production build and core type-check documented at the root.
