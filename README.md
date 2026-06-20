<!-- prettier-ignore -->
<div align="center">

<img src="./public/icon.svg" alt="PrimeDex logo" width="80" />

# PrimeDex

**The most complete online Pokédex — built for trainers who care about speed, data, and design.**

[![Live](https://img.shields.io/badge/Live-primedex.vercel.app-ef4440?style=flat-square&logo=vercel&logoColor=white)](https://primedex.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-149eca?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![License](https://img.shields.io/badge/License-MIT-22c55e?style=flat-square)](./LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/teefloo/Poke?style=flat-square)](https://github.com/teefloo/Poke/stargazers)

A high-performance Next.js 16 + React 19 dashboard for the entire National Pokédex: stats, types, evolutions, team building, TCG cards, and a quiz — all in 9 languages.

[Overview](#overview) · [Features](#features) · [Quick start](#quick-start) · [Routes](#routes) · [Architecture](#architecture) · [Data sources](#data-sources) · [Deployment](#deployment)

![PrimeDex — desktop preview](./public/screenshot-desktop.png)

</div>

<!-- README-I18N:START -->

**English** · [Français](./README.fr.md) · [Español](./README.es.md) · [Deutsch](./README.de.md) · [Italiano](./README.it.md) · [日本語](./README.ja.md) · [한국어](./README.ko.md) · [汉语](./README.zh.md) · [Português](./README.pt.md)

<!-- README-I18N:END -->

## Overview

PrimeDex is an open-source Pokédex dashboard for competitive players, TCG collectors, and curious fans. It covers all **1,025 Pokémon** across 9 generations, with localized names, side-by-side stat comparisons, a type-coverage team builder, and a 25k+ card TCG catalog.

Built on [PokéAPI](https://pokeapi.co) (REST + GraphQL) and [TCGdex](https://www.tcgdex.net), with TanStack Query for caching, Zustand for persistent UI state via IndexedDB, and Next.js App Router for server components and per-route static generation.

> [!NOTE]
> This is a non-commercial fan project. Pokémon data, names, and imagery are © Nintendo, Game Freak, and The Pokémon Company.

## Features

| Feature | Description |
|:---|:---|
| **Complete National Pokédex** | All 1,025 Pokémon, every form, every generation, with localized names and flavor text. |
| **Team Builder** | Build a squad of 6, get live type-coverage analysis, shared weakness detection, and a synergy score. |
| **Comparison Engine** | Side-by-side analysis of up to 3 Pokémon with interactive radar charts and base-stat breakdowns. |
| **Type Chart** | Interactive coverage of all 18 types with strengths, weaknesses, resistances, and immunities. |
| **Moves Database** | Filterable list with power, accuracy, PP, type, damage class, and detailed effect descriptions. |
| **TCG Catalog** | 25k+ cards searchable by set, rarity, type, stage, and HP, with collection and wishlist tracking. |
| **Quiz** | 6 game modes: Classic, Silhouette, Stats, Time Attack, Survival, and Marathon. |
| **Living Dex Tracker** | Persistent capture management, fully offline, stored locally in your browser. |
| **9 Languages** | English, French, German, Spanish, Italian, Japanese, Korean, Simplified Chinese, Brazilian Portuguese. |
| **Advanced Search** | Multi-dimensional filtering by generation, type, BST, egg groups, and special status. |
| **SEO & AEO Ready** | JSON-LD schemas, `hreflang` alternates, `llms.txt` / `ai.txt`, and a generated sitemap. |

## Quick start

### Prerequisites

- [Node.js](https://nodejs.org) 20+
- npm 10+ (bundled with Node.js)

### Install and run

```bash
git clone https://github.com/teefloo/Poke.git
cd Poke
npm install
npm run dev
```

The app runs at **http://localhost:3000**. The middleware redirects `/` to your preferred locale based on the `primedex-lang` cookie or your browser's `Accept-Language` header.

> [!IMPORTANT]
> `npm run dev` is pinned to `next dev --webpack` for stable HMR with the App Router and `next/dynamic` boundaries. Do not switch to Turbopack — the `next.config.ts` declaration of `turbopack.root` is intentional and must stay.

<details>
<summary><strong>Optional: Agentation dev tool</strong></summary>

PrimeDex ships with [Agentation](https://github.com/tldraw/agentation) for AI-assisted UI review. Enable it by adding this to `.env.local`:

```bash
NEXT_PUBLIC_ENABLE_AGENTATION=true
```

The toolbar will be served at http://localhost:4747 (CSP and `allowedDevOrigins` are pre-wired).

</details>

## Tech stack

| Layer | Tools |
|:---|:---|
| Framework | [Next.js 16](https://nextjs.org) (App Router), [React 19](https://react.dev) |
| Language | [TypeScript 5](https://www.typescriptlang.org) (strict, 100% type-safe) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com), [`tw-animate-css`](https://github.com/Wombosvideo/tw-animate-css) |
| UI primitives | [`@base-ui/react`](https://base-ui.com), `shadcn/ui` (`base-nova` preset) |
| Animation | [Framer Motion](https://www.framer.com/motion/) |
| Data fetching | [TanStack Query v5](https://tanstack.com/query) |
| Client state | [Zustand](https://zustand.docs.pmnd.rs/) + [`idb-keyval`](https://github.com/jakearchibald/idb-keyval) (IndexedDB) |
| Charts | [Recharts](https://recharts.org) |
| i18n | [i18next](https://www.i18next.com/) + `react-i18next` |
| HTTP | [Axios](https://axios-http.com) + `axios-retry` (exponential backoff) |
| Tooling | ESLint v9 (flat config), Vitest + Testing Library, Puppeteer (visual QA) |

## Routes

All routes are locale-prefixed (`/en`, `/fr`, `/ja`…). The middleware handles 308-redirects and rewrites transparently.

| Path | Description |
|:---|:---|
| `/` | Home with hero, featured Pokémon, and the full Pokédex grid. |
| `/pokemon/[name]` | Detail page with stats, types, evolutions, abilities, moves, and builds. |
| `/team` | 6-slot team builder with live type coverage and synergy score. |
| `/compare` | Side-by-side comparison of up to 3 Pokémon. |
| `/favorites` | Personal list of favorited Pokémon. |
| `/quiz` | "Who's That Pokémon?" with 6 game modes. |
| `/types` | Interactive type chart for all 18 types. |
| `/moves` | Searchable moves database. |
| `/tcg` | Pokémon TCG catalog with set, rarity, type, and HP filters. |
| `/tcg/cards/[id]` | Individual TCG card detail. |
| `/tcg/collection` | Personal card collection tracker. |
| `/tcg/wishlist` | TCG wishlist. |
| `/about` | Mission, data sources, and contact info. |
| `/faq` | Frequently asked questions. |
| `/cookies` `/legal` `/privacy` `/terms` | Legal pages. |

The dynamic `/pokemon/[name]` page uses `generateStaticParams` for the first 151 Pokémon and `revalidate = 3600` for incremental static regeneration.

## Architecture

### Data flow

```
Components ──▶ TanStack Query hooks (@/lib/api) ──▶ PokéAPI REST + GraphQL
              └─ Zustand selectors (@/store/primedex) ──▶ IndexedDB (idb-keyval)
```

- All HTTP calls go through the `@/lib/api` barrel — components never use `fetch` or `axios` directly.
- Query keys are centralized in `@/lib/api/keys` for stable invalidation.
- The Zustand store holds IDs and primitives only (favorites, team, caught, filters, history, settings) and is persisted in IndexedDB — not `localStorage`.
- Heavy components (`EvolutionChain`, `AdvancedInfo`, `PokemonCards`) are loaded via `next/dynamic` to keep first-paint small.

### Internationalization

- **Supported locales:** `en`, `fr`, `es`, `de`, `it`, `ja`, `ko`, `zh`, `pt`.
- Client code uses `@/lib/i18n` with lazy-loaded language bundles; English is the initial bundle.
- Server code uses `@/lib/server-i18n` with all bundles baked in for SSG/SSR.
- Each page declares `hreflang` alternates and an `x-default` pointing to `/en`.
- The `primedex-lang` cookie persists the user's preference for 1 year.

### Performance

- Server Components by default — `"use client"` is reserved for interactive leaves only.
- `next/image` for all images (AVIF + WebP), with a strict `remotePatterns` allowlist.
- Static generation for `/pokemon/[name]` (first 151) + ISR every hour.
- Immutable caching for `/_next/static`, 1-day cache for images, 1-hour cache for `sitemap.xml` and `llms.txt`.
- TanStack Query defaults: `staleTime` 10 min, `gcTime` 60 min, `retry` 1, no `refetchOnWindowFocus`.

### Security

- Hardened headers on every route: `X-Content-Type-Options`, `X-Frame-Options: DENY`, HSTS with `preload`, strict `Referrer-Policy`, locked-down `Permissions-Policy`.
- Strict Content-Security-Policy — see `next.config.ts` for the full source.
- Axios retries handle transient network errors and HTTP 429 with exponential backoff.

## Data sources

| Source | Used for |
|:---|:---|
| [PokéAPI](https://pokeapi.co) (REST) | Pokémon, moves, abilities, types, encounters |
| [PokéAPI GraphQL](https://beta.pokeapi.co/graphql) | Localized species names and flavor text |
| [TCGdex](https://www.tcgdex.net) | Pokémon TCG cards, sets, and rarities |
| [PokeAPI sprites](https://github.com/PokeAPI/sprites) | Official artwork and animated sprites |

All data is fetched server-side and revalidated every 3,600 seconds. Source attribution is rendered on every Pokémon page.

## Configuration

The app reads a small number of environment variables. **None are required for local development.**

| Variable | Default | Purpose |
|:---|:---|:---|
| `NEXT_PUBLIC_APP_URL` | `https://primedex.vercel.app` | Canonical site URL |
| `NEXT_PUBLIC_ENABLE_AGENTATION` | _(unset)_ | Toggle the Agentation dev toolbar |
| `NEXT_PUBLIC_SUPABASE_URL` | _(unset)_ | Supabase project URL (auth + cloud sync) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | _(unset)_ | Supabase public anon key |

> [!TIP]
> Copy `.env.example` to `.env.local` and fill in values as needed. When Supabase variables are empty the app runs fully local-first (IndexedDB), with no account UI.

## Scripts

| Command | Description |
|:---|:---|
| `npm run dev` | Start the dev server with webpack on `:3000`. |
| `npm run build` | Production build. |
| `npm run start` | Run the production build. |
| `npm run lint` | ESLint v9 with the project's flat config. |
| `npm run typecheck` | `tsc --noEmit` over the whole project. |
| `npm run test` | Vitest (jsdom) — see `vitest.config.ts`. |
| `npx vitest path/to/file.test.ts` | Run a single test file. |
| `npx vitest --ui` | Launch the Vitest UI. |

> [!NOTE]
> The Vitest setup file `src/test/setup.ts` imports `@testing-library/jest-dom/vitest`. Without it, `npm run test` will fail to start.

## Project layout

```
src/
├── app/                # Next.js App Router — routes live here
│   ├── api/            # Route handlers (TCG)
│   ├── [locale]        # Locale-prefixed routes
│   ├── layout.tsx      # Root layout (RSC)
│   ├── providers.tsx   # TanStack Query, theme, i18n providers
│   └── ...
├── components/         # Reusable UI (pokemon/, team/, tcg/, layout/, ui/)
├── lib/                # Pure TS helpers + API barrel
│   ├── api/            # REST + GraphQL + TCG clients
│   ├── i18n/           # Language bundles (lazy on the client)
│   ├── server-i18n.ts  # Server-side translations
│   └── ...
├── store/primedex.ts   # Zustand store (IDs and primitives only)
├── types/pokemon.ts    # Single source of truth for domain types
├── hooks/              # Custom React hooks
└── middleware.ts       # Locale 308-redirects and rewrites

public/                 # Static assets (icons, screenshots, sprite fallbacks)
```

## Deployment

PrimeDex is a standard Next.js 16 app and deploys to any platform that supports the Next.js standalone output.

### Vercel (recommended)

The repo includes a minimal `vercel.json`. Import the project on Vercel, accept the framework defaults, and the production build runs out of the box. The `revalidate = 3600` setting on `/pokemon/[name]` is honored automatically.

### Other platforms

```bash
npm run build
npm run start  # production server on :3000
```

Make sure the host supports the Next.js Image Optimization API (or pre-render images to a CDN).

## Acknowledgments

- [PokéAPI](https://pokeapi.co) — the canonical open data source for the franchise.
- [TCGdex](https://www.tcgdex.net) — the open TCG catalog used in the card browser.
- [Vercel](https://vercel.com) — hosting and edge network.
- [shadcn/ui](https://ui.shadcn.com) — the `base-nova` preset that anchors the design system.

## Contact

- Issues: https://github.com/teefloo/Poke/issues
- Security disclosure: see [`.well-known/security.txt`](./public/.well-known/security.txt)
- Author: Esteban Deloge (<contact@primedex.app>)

## Trademarks

Pokémon, Pokémon character names, and related properties are trademarks of Nintendo, Game Freak, and The Pokémon Company. PrimeDex is an unofficial fan project for educational and entertainment purposes only and is not affiliated with, endorsed by, or sponsored by any of these entities.
