# Web Application Source Guide

This directory contains the Next.js 16 / React 19 web application for PrimeDex. It uses the App Router, Tailwind CSS v4, TanStack Query, Zustand, and the shared locale-aware routing layer.

## Architecture

- Routes live under `src/app/`; API route handlers live under `src/app/api/` and remain server-side.
- Reusable UI belongs in `src/components/`; domain helpers and API clients belong in `src/lib/`.
- Web-persisted state belongs in `src/store/primedex.ts`; shared platform-neutral state belongs in `packages/core/`.
- Use the `@/` alias for web imports. Keep server-only code out of client components and add `'use client'` only at the smallest interactive boundary.

## Routing and localization

- Supported locale prefixes are `en`, `fr`, `es`, `de`, `it`, `ja`, `ko`, and `zh`.
- `src/proxy.ts` redirects unprefixed routes and rewrites locale-prefixed routes. Use `useLocaleHref` or the established locale helpers for client-side internal links.
- Put browser-visible strings behind `@/lib/i18n`; use `@/lib/server-i18n` in server components and metadata.
- Preserve canonical URLs, alternate-language metadata, sitemap output, JSON-LD, `llms.txt`, `ai.txt`, and OpenSearch output when changing routes.

## Data and state

- Use the façade in `src/lib/api.ts` and its API modules instead of ad hoc client-side requests.
- Store compact IDs and user primitives, not complete API response objects. Check `_hasHydrated` before using persisted state in rendering or effects.
- Select individual Zustand slices where possible to avoid unnecessary re-renders.
- Keep Supabase credentials and server-only clients out of browser bundles.

## Verification

Run these commands from the repository root after web changes:

```bash
npm run lint
npm run typecheck
npm run test -- --run
```

Tests use Vitest with jsdom and Testing Library. Colocate component tests with the code they cover and mock Next.js modules or complex UI primitives when needed.
