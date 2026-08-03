# App Router Guide

This directory contains Lunidex's Next.js App Router routes. Each feature route should keep its page, layout, loading/error boundaries, and client leaves close to the route that owns them.

Use Lunidex in visible route copy and metadata. Keep historical technical names, locale-independent slugs, and existing domains stable unless an explicit migration is included.

## Route structure

- Prefer server components for `page.tsx` and `layout.tsx`; isolate browser APIs, hooks, event handlers, and interactive state in a focused `'use client'` leaf.
- API handlers belong under `src/app/api/` and follow that directory's server-only rules. Do not place server secrets or database writes in a client route component.
- Use `layout.tsx` for route metadata and shared JSON-LD, `error.tsx` for recoverable route failures, and `loading.tsx` or a local skeleton for asynchronous boundaries.
- Check for a closer route-specific `AGENTS.md` before changing Pokémon detail, quiz, team, or type-chart code. Those local guides take precedence over this file.

## Localization and SEO

- The proxy supplies locale-aware routing for `en`, `fr`, `es`, `de`, `it`, `ja`, `ko`, and `zh`. Keep internal client links locale-prefixed with `useLocaleHref`.
- Use `getServerT` / `getServerLanguage` for server metadata and `useTranslation` for client UI. Do not hard-code user-facing route text.
- Preserve canonical and alternate-language URLs, Open Graph/Twitter metadata, breadcrumbs, JSON-LD, and route-specific `robots` behavior when changing a page.
- Dynamic routes must validate route parameters and use `notFound()` or the established error boundary for missing upstream data.

## Data and performance

- Fetch initial route data on the server when it improves first render, then pass it to client components as stable initial props. Use TanStack Query for follow-up interactive data.
- Use `@/lib/api` rather than ad hoc browser requests and keep remote response objects out of Zustand persistence.
- Dynamically load browser-only charts and expensive visualizations when they are not needed for the server render.

## Verification

From the repository root:

```bash
npm run lint
npm run typecheck
npm run test -- --run
```
