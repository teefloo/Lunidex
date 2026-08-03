# Lunidex Agent Guide

## Project overview

Lunidex is a localized, local-first Pokémon dashboard for trainers and TCG collectors. It is an npm-workspaces monorepo with three main parts:

- `src/` — the Next.js 16 / React 19 web application, using the App Router, Tailwind CSS v4, TanStack Query, and Zustand.
- `packages/core/` — platform-neutral API clients, domain types, persistence adapters, Zustand state, i18n data, and Supabase utilities shared by the web and mobile apps.
- `apps/mobile/` — the Expo 53 / React Native app, which imports `@primedex/core` rather than duplicating business logic.

`supabase/migrations/` contains the database schema and row-level-security policies. The web app primarily uses PokéAPI (REST and GraphQL) and TCGdex; it is designed to work local-first when Supabase credentials are absent.

## Brand and technical identifiers

- **Lunidex** is the current product and user-facing brand. Use it in documentation, UI copy, metadata, and agent descriptions.
- Preserve historical technical identifiers unless an explicit migration is planned: `@primedex/core`, `@primedex/mobile`, `primedex-*` storage and cookie keys, `usePrimeDexStore`, `src/store/primedex.ts`, slugs, bundle identifiers, file paths, and existing deployment domains.
- Do not rename Supabase, Vercel, Expo, or local-storage identifiers merely as part of a visible rebrand; changing them can break deep links, persisted data, published mobile builds, or deployments.

## Instruction scope

- This file applies throughout the repository. Before editing a subtree, look for a closer `AGENTS.md`, `AGENT.md`, or `GEMINI.md`; the closest relevant instructions take precedence.
- Current tracked, local guidance exists in `packages/core/src/store/GEMINI.md` and in the Pokémon detail, quiz, team, and type-chart route directories under `src/app/`.
- User instructions override repository guidance. Preserve unrelated work already present in the working tree.

## Prerequisites and setup

CI uses Node.js 22. Use npm and the committed `package-lock.json`; do not introduce another package manager or lockfile.

```bash
npm ci                         # reproducible clean install (preferred in CI)
npm install                     # update the local workspace installation
cp .env.example .env.local      # optional web configuration
cp apps/mobile/.env.example apps/mobile/.env  # optional mobile configuration
```

The Supabase variables are optional. Without `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, the web app remains local-first with IndexedDB. Mobile uses the equivalent `EXPO_PUBLIC_*` variables and AsyncStorage. The supported web locales are English, French, Spanish, German, Italian, Japanese, Korean, and Chinese. Never commit `.env`, `.env.local`, credentials, or tokens.

Set `NEXT_PUBLIC_ENABLE_AGENTATION=true` only to enable the development overlay. It runs on port 4747, which is already allowed in development configuration; do not change CSP or `allowedDevOrigins` merely for that tool.

## Commands

Run commands from the repository root unless stated otherwise.

| Task | Command |
| --- | --- |
| Start the web app | `npm run dev` |
| Production web build | `npm run build` |
| Serve a production build | `npm run start` |
| Lint web, core, and mobile sources | `npm run lint` |
| Type-check the web app | `npm run typecheck` |
| Run the Vitest suite | `npm run test -- --run` |
| Run one test file | `npx vitest run src/lib/auto-complete.test.ts` |
| Run tests matching a name | `npx vitest run -t "<test name>"` |
| Lint one file | `npx eslint path/to/file.tsx` |
| Type-check shared core | `npx tsc --project packages/core/tsconfig.json --noEmit` |
| Start Expo | `npm run start --workspace=@primedex/mobile` |
| Type-check Expo | `npm run typecheck --workspace=@primedex/mobile` |

`npm run dev` intentionally uses `next dev --webpack`, not Turbopack. Keep that flag even though `next.config.ts` contains a `turbopack.root` setting.

The checked-in GitHub Actions workflow runs `npm ci`, `npm run lint`, `npm run typecheck`, and `npm run test` for pushes and pull requests targeting `master`. Run the relevant checks for every change; before a commit, run all three root quality checks plus any applicable workspace check.

## Tests

Vitest is configured for jsdom in `vitest.config.ts`; `src/test/setup.ts` loads `@testing-library/jest-dom/vitest`. Tests normally live alongside the code they cover, for example `src/lib/team-analysis.test.ts` or `src/components/ui/TypeBadge.test.tsx`.

- Add or update tests for behavioral changes, including changes to shared core logic.
- Use Testing Library for React component tests. Mock `next/navigation`, `next/image`, and complex UI primitives where that keeps the test focused.
- Prefer focused tests while iterating, then run the full suite. Fix related lint and type errors rather than leaving a known regression.

## Web architecture and data flow

- Prefer React Server Components. Add `"use client"` only to the interactive leaf that needs browser APIs, hooks, or local state. Render the header per page rather than adding it to the root layout.
- Routes live in `src/app/`; feature routes contain their `page.tsx`, route-specific layouts/errors, and client leaves. API handlers live below `src/app/api/` and must remain server-side.
- `src/app/providers.tsx` owns TanStack Query defaults, i18n, authentication/sync, theme, and shared client UI. Query defaults are a 10-minute stale time, 60-minute garbage-collection time, one retry, and no refetch on window focus.
- Web API exports are centralized in `src/lib/api.ts`; use that façade and the modules under `src/lib/api/` rather than making ad hoc client-side `fetch` or Axios requests. The mobile app uses the equivalent `@primedex/core` API modules.
- Web domain types live in `src/types/`; shared mobile/web types live in `packages/core/src/types/`. Keep type changes deliberate across both boundaries.
- Persistent web state belongs in `src/store/primedex.ts`. Store compact IDs and primitives, not complete API objects. It persists through IndexedDB, so check `_hasHydrated` before effects or UI decisions that rely on persisted data. Select individual Zustand slices to limit re-renders. The language preference is deliberately mirrored to a cookie and localStorage for server/client locale handoff.
- Shared core persistence uses platform adapters: web resolves `platform/*.ts`; Expo resolves `platform/*.native.ts` through Metro. Do not add `Platform.OS` conditionals to shared domain logic.

## Localization, routing, and SEO

- The supported locale prefixes are `en`, `fr`, `es`, `de`, `it`, `ja`, `ko`, and `zh`. Keep this list synchronized with `src/lib/languages.ts`, translation bundles, metadata, and tests.
- `src/proxy.ts` 308-redirects unprefixed web routes to a locale and rewrites prefixed routes internally. Build client-side internal URLs with `useLocaleHref` so the prefix remains intact.
- Client code uses `@/lib/i18n`, which starts in English and lazy-loads the other bundles. Server code uses `@/lib/server-i18n`. Put user-facing text behind `t()` / the established translation helpers.
- Preserve the existing sitemap, `hreflang`, JSON-LD, `llms.txt`, `ai.txt`, and OpenSearch outputs when altering routes or metadata.

## Code and UI conventions

- TypeScript is strict. Do not introduce `any` or broad `Record<string, unknown>` types. Prefer interfaces for object shapes and type aliases for unions.
- Use the `@/` import alias in the web app. Follow the local export style; new reusable components and utilities should normally use named exports.
- Keep utilities pure where practical, use `cn()` from `@/lib/utils` for class joining, and keep one custom hook per file.
- Use Tailwind v4 through `@import "tailwindcss"` in `src/app/globals.css`. Do not create a `tailwind.config.js` or add Prettier configuration.
- Web images must use `next/image` with meaningful `alt` text; mobile images use the established Expo image components. Every icon-only control needs an accessible name. Maintain WCAG 2.2 AA behavior.
- Load expensive interactive details with `next/dynamic` when the surrounding code already follows that pattern. Use `useMounted` or an SSR-safe derivation when browser state could create a hydration mismatch.
- The component library follows the `base-nova` shadcn style and may use `@base-ui/react`. Reuse existing primitives before adding a dependency.

## Security, deployment, and pull requests

- Supabase uses public client variables in browser code; authorization is enforced by RLS policies. `SUPABASE_SERVICE_ROLE_KEY` is server-only, configured through Vercel or the server environment, and must never enter client bundles, source control, logs, or chat.
- Security headers and CSP are intentionally strict in `next.config.ts`. Do not add remote domains or weaken a directive without maintainer approval.
- Deployments run on Vercel from Git. `npm run build` is the production build; Vercel settings live in the dashboard, while `vercel.json` only identifies the project.
- Keep commits focused and avoid committing generated output, editor settings, local agent artifacts, screenshots, or dependency caches. The repository has no Prettier setup.
- Pull request titles follow `[component] Brief description`, for example `[pokemon] Add shiny toggle to card`.
- AI-authored commits must include this trailer:

  ```text
  Co-authored-by: Gemini CLI <agent@gemini.google.com>
  ```
