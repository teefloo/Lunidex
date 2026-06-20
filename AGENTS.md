# AGENTS.md

PrimeDex — a Next.js 16 (App Router) + React 19 Pokédex dashboard with TanStack Query, Zustand (IndexedDB), and 9 locales. Monorepo with shared `@primedex/core` package and an Expo React Native mobile app.

## Quick Commands

```bash
npm install          # install all workspace deps
npm run dev          # next dev --webpack (NOT turbopack) — http://localhost:3000
npm run build        # next build (production)
npm run start        # next start (production server)
npm run lint         # eslint v9 flat config with eslint-config-next
npm run test         # vitest via ./node_modules/vitest/vitest.mjs (jsdom)
npm run typecheck    # tsc --noEmit
```

| Task | Command |
|------|---------|
| Typecheck one path | `npx tsc --noEmit` |
| Lint one file | `npx eslint path/to/file.tsx` |
| Run one test file | `npx vitest path/to/file.test.ts` |
| Run matching tests | `npx vitest run -t "<test name>"` |
| Test UI | `npx vitest --ui` |

## Project Structure

```
Poke/                            root (npm workspaces)
├── src/                         Next.js 16 web app
│   ├── app/                     App Router routes + layouts
│   ├── components/              ui/ (primitives), pokemon/, layout/, tcg/, auth/, dashboard/
│   ├── lib/                     utilities, i18n, API layer (api/)
│   ├── store/                   Zustand store (primedex.ts)
│   ├── types/                   domain types (pokemon.ts, tcg.ts, dashboard.ts)
│   ├── hooks/                   custom hooks
│   ├── styles/                  CSS overrides
│   └── test/                    Vitest setup (setup.ts)
├── packages/core/               @primedex/core — shared business logic (web + mobile)
│   └── src/                     api/, store/, types/, i18n/, lib/, supabase/, platform/
├── apps/mobile/                 @primedex/mobile — Expo React Native port
│   ├── app/                     Expo Router file-based routes
│   └── src/                     mobile-specific UI
└── supabase/migrations/         SQL migrations for Supabase
```

## Subtree Instructions (read closest first)

Per-directory `AGENT.md` files override the root for their subtree. Always read the closest one before editing:

- `src/AGENT.md` — scope and conventions for the src/ tree
- `src/app/AGENT.md` — route conventions, key files, RSC patterns
- `src/components/AGENT.md` — component organization
- `src/components/ui/AGENT.md` — presentational primitives
- `src/components/pokemon/AGENT.md` — domain component data flow
- `src/components/layout/AGENT.md` — cross-route UI conventions
- `src/lib/AGENT.md` — utility file inventory and conventions
- `src/lib/api/AGENT.md` — API layer file inventory, endpoints, conventions
- `src/store/AGENT.md` — state management conventions
- `src/types/AGENT.md` — type system conventions
- `src/hooks/AGENT.md` — hook conventions
- `public/AGENT.md` — static asset conventions

## Key Conventions

- **RSC by default.** Only add `"use client"` to leaves that need interactivity; per `src/app/AGENT.md`, `Header` is rendered per-page, not in the root layout.
- **Tailwind v4 only.** Uses `@import "tailwindcss"` in `src/app/globals.css`. No `tailwind.config.js` — do not create one.
- **Images:** always `next/image`; raw `<img>` is prohibited.
- **Imports:** use the `@/` alias (`tsconfig.json` paths → `src/`). Use named exports.
- **API:** all requests go through `@/lib/api/` barrel; never call `fetch`/`axios` directly in components. REST + GraphQL hit `https://pokeapi.co`; TCG hits `https://api.tcgdex.net`. Query keys are built from `@/lib/api/keys`.
- **Types:** `src/types/pokemon.ts` is the source of truth. No `any` or `Record<string, unknown>`. Prefer interfaces for object shapes, type aliases for unions.
- **i18n:** client code uses `@/lib/i18n` (lazy-loaded language bundles, English is the initial bundle); server code uses `@/lib/server-i18n` (all bundles baked in). User-facing strings go through `t()`.
- **State:** Zustand store in `src/store/primedex.ts` holds IDs/primitives only, persisted via `idb-keyval` (IndexedDB, **not** localStorage). Check `_hasHydrated` before trusting persisted state in effects. Use selectors to avoid re-renders.
- **Heavy components** (`EvolutionChain`, `AdvancedInfo`, etc.) are loaded via `next/dynamic`.
- **shadcn/ui style is `base-nova`;** some primitives come from `@base-ui/react` (see `components.json`).
- **Accessibility:** WCAG 2.2 AA; every icon-only control needs `aria-label`, every image an `alt`.
- **Utilities:** keep pure when possible. Reuse `cn()` for class joining (`@/lib/utils`).
- **Hooks:** one hook per file. Use `useMounted` when browser APIs would cause hydration mismatches. Prefer SSR-safe derived state.

## Routing & Architecture

- **Locale prefix is required.** `src/proxy.ts` rewrites `/<lang>/...` → `/...` and 308-redirects unprefixed paths based on the `primedex-lang` cookie or `Accept-Language`. Supported: `en, fr, es, de, it, ja, ko, zh, pt`. Use `useLocaleHref` to build internal links with the current prefix.
- **Routes** (under `src/app/`):

| Route | Description | Notes |
|-------|-------------|-------|
| `/` | Home / Pokedex listing | `revalidate = 3600` |
| `/pokemon/[name]` | Pokemon detail | `revalidate = 3600`, `generateStaticParams` (first 151) |
| `/team` | Team builder | |
| `/compare` | Comparison engine (up to 3) | |
| `/favorites` | Favorites list | |
| `/quiz` | Quiz game (6 modes) | |
| `/types` | Interactive type chart | |
| `/tcg` | TCG catalog, collection, wishlist | |
| `/moves` | Moves database | |
| `/dashboard` | User dashboard | |
| `/about`, `/faq`, `/cookies`, `/legal`, `/privacy`, `/terms` | Static pages | |

- **Providers** (`src/app/providers.tsx`): TanStack Query (staleTime 10 min, gcTime 60 min, retry 1, no refetchOnWindowFocus), theme via store + `next-themes`, i18n.
- **Data flow:** components consume TanStack Query hooks from `@/lib/api/`; persistent UI state (favorites, team, caught, filters, history, settings) from `@/store/primedex`.
- **API routes:** `/api/tcg/` proxies for TCGdex.
- **SEO:** dynamic sitemap with hreflang, JSON-LD (WebSite, Organization, FAQPage, etc.), `llms.txt`, `ai.txt`, `opensearch.xml`.

## Testing Instructions

Tests live next to the code they cover (e.g., `src/lib/auto-complete.test.ts`). The Vitest setup file `src/test/setup.ts` imports `@testing-library/jest-dom/vitest` — without it, `npm run test` fails to start.

```bash
npm run test                        # run all tests
npx vitest path/to/file.test.ts     # run one test file
npx vitest run -t "<test name>"     # run matching test name
npx vitest --ui                     # visual test UI
```

**Conventions:**
- Use `@testing-library/react` for component tests.
- Mock `next/navigation`, `next/image`, and UI primitives heavily in component tests.
- Add or update tests for the code you change, even if nobody asked.
- Fix any test or type errors until the whole suite is green.

**Existing test files:**
- `src/lib/utils.test.ts` — formatting helpers, `cn()`
- `src/lib/languages.test.ts` — locale maps, language resolution
- `src/lib/seo.test.ts` — JSON-LD, hreflang, locale hrefs
- `src/lib/pokemon-utils.test.ts` — type colors, gradients, rarity
- `src/lib/badges.test.ts` — unlock conditions, progress
- `src/lib/team-analysis.test.ts` — synergy scoring, type analysis
- `src/lib/auto-complete.test.ts` — autocomplete logic
- `src/components/ui/TypeBadge.test.tsx` — render + a11y
- `src/components/ui/ShinyIcon.test.tsx` — render + a11y
- `src/components/ui/badge.test.tsx` — render + a11y

## Code Style

- **TypeScript 5** strict mode. No `any`, no `Record<string, unknown>`.
- **ESLint v9** flat config with `eslint-config-next` (core-web-vitals + typescript). No Prettier configured.
- **Named exports** for all components and utilities.
- **File organization:** components in `src/components/{ui,pokemon,layout,tcg,auth,dashboard}/`; utilities in `src/lib/`; types in `src/types/`; hooks in `src/hooks/`.
- **Class joining:** use `cn()` from `@/lib/utils` (clsx + tailwind-merge).
- **Environment variables:** `NEXT_PUBLIC_*` for client, no server-only vars exposed. Never commit `.env.local`.

## Build & Deployment

- **Build:** `npm run build` → Next.js production build with `compress: true`.
- **Deploy:** Vercel (auto-deploys from Git). Deploy config lives in Vercel dashboard, not `vercel.json`.
- **Image optimization:** `sharp` for processing; images served via `next/image`.
- **Caching:** `/_next/static` immutable (1 year), images 1 day with stale-while-revalidate, TanStack Query staleTime 10 min.
- **Security headers:** X-Content-Type-Options: nosniff, X-Frame-Options: DENY, HSTS, strict CSP with explicit allowlists.
- **Mobile:** `apps/mobile/` uses Expo ~53 with Expo Router; `npm run dev --workspace=apps/mobile`.

## Monorepo

npm workspaces. Root `package.json` declares:
```json
"workspaces": ["packages/*", "apps/*"]
```

- **`@primedex/core`** (`packages/core/`): platform-agnostic business logic shared between web and mobile. Contains API clients, store, types, i18n bundles, Supabase layer, pure helpers. Uses platform adapters (`platform/storage.ts` for web, `platform/storage.native.ts` for mobile).
- **`@primedex/mobile`** (`apps/mobile/`): Expo React Native port. Uses `expo-router`, `expo-image`, `react-native-reanimated`.
- **Overrides:** `next.postcss` pinned to `8.5.14` in root `package.json`.

## Security

- Never commit secrets, API keys, or tokens. All secrets go in `.env.local` (gitignored).
- Environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` for Supabase.
- Supabase RLS policies enforce `auth.uid() = user_id` on all tables.
- Content-Security-Policy is strict — don't add domains to CSP manually; ask the maintainer.
- Agentation dev tool on port 4747 is pre-wired in CSP and `allowedDevOrigins`. Don't modify it.

## Repo-Specific Quirks

- **Dev uses webpack, not turbopack.** The `dev` script forces `--webpack`. `next.config.ts` still declares `turbopack.root`; leave it alone.
- **Agentation dev tool** runs on `http://localhost:4747` (CSP and `allowedDevOrigins` are pre-wired for it). Toggled via `NEXT_PUBLIC_ENABLE_AGENTATION=true` in `.env.local`. Don't add 4747 to CSP yourself.
- **Tests live next to the code they cover** (e.g., `src/lib/auto-complete.test.ts`). The Vitest setup file `src/test/setup.ts` exists and imports `@testing-library/jest-dom/vitest` — without it, `npm run test` fails to start.
- **No CI yet** — no `.github/` directory. `vercel.json` only has `{"name": "poke-app"}`; deploy config lives in the Vercel dashboard.
- **No project-level opencode config** — `.opencode/` is gitignored (has its own `node_modules`).
- **`GEMINI.md` is a separate mandate document** at the repo root and in some subtrees; treat its rules as authoritative when they overlap.
- **Local editor / agent artifacts** are gitignored: `.vscode/`, `.opencode/`, `*.local`, `header-*.png`, `tcg-*.png`, `tcgp-logo.webp`. Don't commit them.
- **No Prettier** — the project uses ESLint only. Don't add a Prettier config.
- **Next.js overrides** — `postcss` is pinned to `8.5.14` via `overrides` in root `package.json`.

## PR Guidelines

- Title format: `[component] Brief description` (e.g., `[pokemon] Add shiny toggle to card`)
- Always run `npm run lint` and `npm run test` before committing.
- Run `npm run typecheck` to verify no type regressions.
- Add or update tests for the code you change.
- Keep commits focused — one logical change per commit.
- Follow existing code patterns; don't introduce new libraries without discussion.

## Commit Attribution

AI-authored commits MUST include the trailer:

```
Co-authored-by: Gemini CLI <agent@gemini.google.com>
```
