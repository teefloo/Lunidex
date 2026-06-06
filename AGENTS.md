# Agent Instructions

PrimeDex — a Next.js 16 (App Router) + React 19 Pokédex dashboard with TanStack Query, Zustand (IndexedDB), and 9 locales.

## Quick Commands

```bash
npm install
npm run dev      # next dev --webpack (NOT turbopack) — http://localhost:3000
npm run build
npm run lint     # eslint v9 flat config with eslint-config-next
npm run test     # vitest via ./node_modules/vitest/vitest.mjs (jsdom)
npm run typecheck
```

| Task | Command |
|------|---------|
| Typecheck one path | `npx tsc --noEmit` |
| Lint one path | `npx eslint path/to/file.tsx` |
| Run one test | `npx vitest path/to/file.test.ts` |
| Test UI | `npx vitest --ui` |

## Subtree Instructions (read closest first)

Per-directory `AGENT.md` files override the root for their subtree. Always read the closest one before editing:
- `src/AGENT.md`, `src/app/AGENT.md`, `src/components/AGENT.md`
- `src/components/ui/AGENT.md`, `src/components/pokemon/AGENT.md`, `src/components/layout/AGENT.md`
- `src/lib/AGENT.md`, `src/lib/api/AGENT.md`
- `src/store/AGENT.md`, `src/types/AGENT.md`, `src/hooks/AGENT.md`
- `public/AGENT.md`

## Key Conventions

- **RSC by default.** Only add `"use client"` to leaves that need interactivity; per `src/app/AGENT.md`, `Header` is rendered per-page, not in the root layout.
- **Tailwind v4 only.** Uses `@import "tailwindcss"` in `src/app/globals.css`. No `tailwind.config.js` — do not create one.
- **Images:** always `next/image`; raw `<img>` is prohibited.
- **Imports:** use the `@/` alias (`tsconfig.json` paths → `src/`).
- **API:** all requests go through `@/lib/api/` barrel; never call `fetch`/`axios` directly in components. REST + GraphQL hit `https://pokeapi.co`; TCG hits `https://api.tcgdex.net`. Query keys are built from `@/lib/api/keys`.
- **Types:** `src/types/pokemon.ts` is the source of truth. No `any` or `Record<string, unknown>`.
- **i18n:** client code uses `@/lib/i18n` (lazy-loaded language bundles, English is the initial bundle); server code uses `@/lib/server-i18n` (all bundles baked in). User-facing strings go through `t()`.
- **State:** Zustand store in `src/store/primedex.ts` holds IDs/primitives only, persisted via `idb-keyval` (IndexedDB, **not** localStorage). Check `_hasHydrated` before trusting persisted state in effects. Use selectors to avoid re-renders.
- **Heavy components** (`EvolutionChain`, `AdvancedInfo`, etc.) are loaded via `next/dynamic`.
- **shadcn/ui style is `base-nova`; some primitives come from `@base-ui/react` (see `components.json`).**
- **Accessibility:** WCAG 2.2 AA; every icon-only control needs `aria-label`, every image an `alt`.

## Routing & Architecture

- **Locale prefix is required.** `src/middleware.ts` rewrites `/<lang>/...` → `/...` and 308-redirects unprefixed paths based on the `primedex-lang` cookie or `Accept-Language`. Supported: `en, fr, es, de, it, ja, ko, zh, pt`. Use `useLocaleHref` to build internal links with the current prefix.
- **Routes** (under `src/app/`): `/` (listing), `/pokemon/[name]`, `/team`, `/compare`, `/favorites`, `/quiz`, `/types`, `/tcg`, `/about`, `/cookies`, `/legal`, `/privacy`, `/terms`. `revalidate = 3600` and `generateStaticParams` (first 151) are set on the dynamic `[name]` page.
- **Providers** (`src/app/providers.tsx`): TanStack Query (staleTime 10 min, gcTime 60 min, retry 1, no refetchOnWindowFocus), theme via store + `next-themes`, i18n.
- **Data flow:** components consume TanStack Query hooks from `@/lib/api/`; persistent UI state (favorites, team, caught, filters, history, settings) from `@/store/primedex`.

## Repo-Specific Quirks

- **Dev uses webpack, not turbopack.** The `dev` script forces `--webpack`. `next.config.ts` still declares `turbopack.root`; leave it alone.
- **Agentation dev tool** runs on `http://localhost:4747` (CSP and `allowedDevOrigins` are pre-wired for it). Toggled via `NEXT_PUBLIC_ENABLE_AGENTATION=true` in `.env.local`. Don't add 4747 to CSP yourself.
- **`src/test/setup.ts` is missing.** `vitest.config.ts` points `setupFiles` to it. Create that file before adding tests, or `npm run test` / `npx vitest` will fail to start.
- **No CI yet** — no `.github/` directory. `vercel.json` only has `{"name": "poke-app"}`; deploy config lives in the Vercel dashboard.
- **No project-level opencode config** — `.opencode/` is gitignored (has its own `node_modules`).
- **`GEMINI.md` is a separate mandate document** at the repo root and in some subtrees; treat its rules as authoritative when they overlap.
- **Local editor / agent artifacts** are gitignored: `.vscode/`, `.opencode/`, `*.local`, `header-*.png`, `tcg-*.png`, `tcgp-logo.webp`. Don't commit them.

## Commit Attribution

AI-authored commits MUST include the trailer:

```
Co-authored-by: Gemini CLI <agent@gemini.google.com>
```

## Detailed Instructions

- [Architecture](docs/agent-instructions/architecture.md)
- [Code Conventions](docs/agent-instructions/conventions.md)
