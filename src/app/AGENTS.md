# App Router guide

This guide supplements `src/AGENTS.md` for routes under `src/app/`. Feature-specific guides in deeper directories take precedence for their routes.

## Route structure

- Prefer a Server Component for `page.tsx` and `layout.tsx`. Keep browser APIs, hooks, event handlers, animations, and interactive state in a focused `'use client'` leaf. A route may intentionally be client-rendered when its feature is an interactive tool.
- Keep a feature's page, layout, loading/error boundary, and client leaves close together. Use `layout.tsx` for route metadata/shared JSON-LD, `loading.tsx` for async boundaries, and `error.tsx` for recoverable failures.
- App Router `params` and `searchParams` are promises in this Next.js version; await them before use in server pages, metadata, and Route Handlers.
- Validate dynamic route parameters and use `notFound()` or the established error boundary for missing upstream data. Keep route-specific redirects and canonical slugs stable.

## Localization and SEO

- Use the eight supported locale prefixes and locale helpers from the parent guide. Never construct a new client-side internal path without preserving its locale.
- Use server translation helpers for metadata/JSON-LD and client translation hooks for UI. Preserve canonical URLs, `hreflang`, Open Graph/Twitter data, breadcrumbs, structured data, and route `robots` settings.

## Data and performance

- Fetch critical route data on the server when that is the established pattern, pass stable initial props to client leaves, and use TanStack Query for subsequent interactive data.
- Use `@/lib/api` and its modules rather than ad hoc browser requests. Dynamically load browser-only charts or expensive visualizations when the route already follows that pattern.
- Keep authenticated/personalized data out of public caches and preserve local-first fallbacks when Neon is unavailable.

## Verification

From the repository root:

```bash
npm run lint
npm run typecheck
npm run test -- --run
```
