# Lunidex Agent Guide

## Scope and hierarchy

This file applies to the repository unless a closer `AGENTS.md` adds more specific rules. Before editing a subtree, check for the nearest guide with:

```bash
rg --files -g 'AGENTS.md' -g 'AGENT.md' -g 'GEMINI.md'
```

The nearest applicable guide supplements this one; it should describe only the local constraints that differ. User instructions take precedence. Preserve unrelated work already present in the working tree.

## Project overview

Lunidex is a localized, local-first Pokémon dashboard and Pokémon TCG workspace. This private npm-workspaces monorepo contains:

- `src/`: the Next.js 16 / React 19 web application.
- `packages/core/`: the shared TypeScript API clients, domain types, Zustand store, i18n data, pure helpers, Neon helpers, and compatibility sync modules.
- `apps/mobile/`: the Expo 57 / React Native companion, which consumes `@primedex/core`.
- `neon/migrations/`: the application schema used by the Neon-backed runtime.
- `supabase/`: an archived Deno Edge Function and historical security material; it is not the web application's runtime authentication/database path.

The web and mobile apps remain usable without cloud configuration. The web uses IndexedDB and the mobile app uses AsyncStorage for local persistence. Remote Pokémon data comes from PokéAPI and Pokémon TCG data from TCGdex through the centralized API layers.

## Compatibility-sensitive names

Use `Lunidex` for visible product copy, documentation, metadata, and agent descriptions. Preserve these historical technical identifiers unless a deliberate compatibility migration is part of the task:

- `primedex`, `@primedex/core`, `@primedex/mobile` and their import paths;
- `usePrimeDexStore`, `src/store/primedex.ts`, `primedex-*` storage/cookie keys, route slugs, Expo schemes, bundle identifiers, and existing public domains.

Do not rename those identifiers as part of a visible rebrand. Deep links, persisted data, published mobile builds, and deployments depend on them.

## Setup and environment

- Use Node.js 22 and npm with the committed `package-lock.json`. Do not add a second package manager or lockfile.
- Install reproducibly with `npm ci`; use `npm install` only when intentionally updating the local workspace installation.
- Copy `.env.example` to `.env.local` for optional web configuration. Copy `apps/mobile/.env.example` to `apps/mobile/.env` for optional mobile configuration. These files are ignored and must never be committed.
- The web runtime uses Neon variables: `NEXT_PUBLIC_NEON_AUTH_URL` is public; `NEON_AUTH_BASE_URL`, `NEON_AUTH_JWKS_URL`, `NEON_AUTH_COOKIE_SECRET`, `NEON_DATABASE_URL`, and Vercel's server-only `DATABASE_URL` are not public. Mobile uses `EXPO_PUBLIC_NEON_AUTH_URL` and `EXPO_PUBLIC_APP_URL`.
- `SUPABASE_DB_URL` is only for the Neon migration tooling. `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, VAPID private material/subject, and `CRON_SECRET` belong only to the separately deployed Supabase Edge Function. The browser-facing `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, when configured, is public by design. Do not add Supabase runtime credentials to web or mobile bundles.
- Without Neon configuration, authentication, cloud sync, and server-backed features degrade to their established unavailable/local-first behavior.
- Set `NEXT_PUBLIC_ENABLE_AGENTATION=true` only for the development overlay. Its local port is 4747 and the required development origins/CSP entries already exist; do not weaken production security headers for it.

## Commands

Run root commands from the repository root:

| Purpose | Command |
| --- | --- |
| Web development | `npm run dev` |
| Production build | `npm run build` |
| Serve a production build | `npm run start` |
| Lint web, core, and mobile sources | `npm run lint` |
| Type-check the web workspace | `npm run typecheck` |
| Type-check shared core | `npx tsc --project packages/core/tsconfig.json --noEmit` |
| Start Expo | `npm run start --workspace=@primedex/mobile` |
| Type-check Expo | `npm run typecheck --workspace=@primedex/mobile` |
| Lint Expo | `npm run lint --workspace=@primedex/mobile` |
| Export source data for Neon migration | `npm run db:neon:export` |
| Import the prepared export into Neon | `npm run db:neon:import` |
| Compare source and Neon after migration | `npm run db:neon:verify` |

`npm run dev` and `npm run build` intentionally pass `--webpack`; keep that flag even though `next.config.ts` also declares a Turbopack root. The Neon migration commands require PostgreSQL client binaries and the environment described in `scripts/neon/AGENTS.md`; the import command changes a target database and is never a casual validation step.

## Verification and CI

The checked-in workflow `.github/workflows/ci.yml` runs, in order, `npm ci`, `npm run lint`, `npm run typecheck`, `npm run build`, the core TypeScript check, and the mobile type-check. Run the checks relevant to the change; for a broad handoff, use the same sequence as CI.

- Fix related lint and type failures instead of documenting them as expected regressions.
- Schema, migration, Edge Function, and Neon-specific validation is described by the closest database guide; do not substitute a web-only check for a database safety check.

## Application architecture

- Prefer React Server Components. Add `'use client'` only at the smallest leaf that needs hooks, browser APIs, event handlers, animation, or local state. Route pages may be client components when the feature itself is interactive.
- Web routes live in `src/app/`; server-only Route Handlers live under `src/app/api/`. Reusable UI belongs in `src/components/`, pure/domain helpers and API modules in `src/lib/`, and web persistence in `src/store/primedex.ts`.
- Use the `@/` alias for web imports. Use `@primedex/core` and its supported export-map deep imports for shared logic. Do not copy web business logic into mobile.
- `src/app/providers.tsx` owns shared client providers and TanStack Query defaults: 10-minute stale time, 60-minute garbage-collection time, one retry, and no refetch on window focus.
- API access is centralized in `src/lib/api.ts` and its modules. Do not add ad hoc client-side `fetch` or Axios calls in presentational components.
- Persist only IDs, primitives, filters, and small user-owned records. Never put complete PokéAPI, TCGdex, GraphQL, or other remote response objects in Zustand persistence. Check `_hasHydrated` before making UI/effect decisions based on persisted state and select individual store slices where practical.
- `packages/core/src/platform/*.ts` and matching `*.native.ts` files are the platform seam. Keep their contracts equivalent and keep React Native dependencies out of shared domain logic.

## Routing, localization, SEO, and UI

- The supported web locales are `en`, `fr`, `es`, `de`, `it`, `ja`, `ko`, and `zh`. Keep `src/lib/languages.ts`, core language data, translation bundles, proxy routing, metadata, sitemap, and alternate-language links synchronized.
- `src/proxy.ts` redirects unprefixed routes and rewrites locale-prefixed routes. Build client-side internal URLs with `useLocaleHref` or the established locale helper so the locale prefix is retained.
- Use `@/lib/i18n` / `useTranslation` in client code and `@/lib/server-i18n` / server translation helpers in server components and metadata. Do not hard-code new user-facing language strings.
- Preserve canonical URLs, `hreflang`, JSON-LD, Open Graph output, `llms.txt`, `ai.txt`, OpenSearch output, and established route `robots` behavior when changing routes or metadata.
- TypeScript is strict. Avoid `any` and broad unstructured records; use explicit interfaces, unions, and validated boundary data. Follow the existing export style and use named exports for new reusable code.
- Tailwind CSS 4 is loaded through `@import "tailwindcss"` in `src/app/globals.css`. Reuse the `base-nova` component primitives and `cn()` before adding dependencies. Do not add `tailwind.config.js` or Prettier configuration.
- Use `next/image` with meaningful alt text on the web and the established Expo image components on mobile. Icon-only controls need accessible names, visible keyboard focus, and touch-sized targets. Preserve SSR-safe output and reduced-motion behavior when adding interaction or animation.

## Security and data boundaries

- Neon connection strings, auth cookie/JWKS secrets, service-role keys, VAPID private keys, cron credentials, and local database URLs are server/operation secrets. Never commit, log, expose, or place them in `NEXT_PUBLIC_*` or `EXPO_PUBLIC_*` variables.
- The application authenticates through Neon Auth and enforces ownership in server/API code. The historical `src/lib/supabase` and `packages/core/src/supabase` paths are compatibility names; do not infer that the web runtime uses Supabase Auth or Supabase RLS.
- Keep security headers and CSP in `next.config.ts` strict. Add a remote origin or weaken a directive only when the project requirement is explicit and the complete impact is reviewed.
- Treat authenticated, personalized, and mutation responses as non-public. Apply the established validation, authentication, rate limiting, and unavailable responses in Route Handlers.
- Generated PWA files such as `public/sw.js`, `public/workbox-*.js`, and `public/fallback-*.js` come from the build; edit their source/configuration instead of hand-editing generated output.

## Delivery rules

- Do not push, merge, force-push, deploy, apply a production migration, or invoke another consequential external action without explicit confirmation.
- Keep commits focused. Pull request titles use `[component] Brief description`, for example `[pokemon] Add shiny toggle to card`.
- AI-authored commits must include:

  ```text
  Co-authored-by: Gemini CLI <agent@gemini.google.com>
  ```
