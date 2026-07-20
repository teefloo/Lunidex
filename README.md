<!-- prettier-ignore -->
<div align="center">

<img src="./public/icon.svg" alt="PrimeDex logo" width="80" />

# PrimeDex

**A fast, local-first Pokédex and Pokémon TCG workspace for trainers, collectors, and curious fans.**

[![Live](https://img.shields.io/badge/Live-primedex.vercel.app-ef4440?style=flat-square&logo=vercel&logoColor=white)](https://primedex.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-149eca?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Expo](https://img.shields.io/badge/Mobile-Expo-000020?style=flat-square&logo=expo&logoColor=white)](./apps/mobile)
[![GitHub stars](https://img.shields.io/github/stars/teefloo/Poke?style=flat-square)](https://github.com/teefloo/Poke/stargazers)

[Overview](#overview) · [Get started](#get-started) · [Features](#features) · [Architecture](#architecture) · [Configuration](#configuration) · [Deployment](#deployment)

<img src="./public/screenshot-desktop.png" alt="PrimeDex desktop Pokédex dashboard" width="840" />

</div>

<!-- README-I18N:START -->

**English** · [Français](./README.fr.md) · [Español](./README.es.md) · [Deutsch](./README.de.md) · [Italiano](./README.it.md) · [日本語](./README.ja.md) · [한국어](./README.ko.md) · [中文](./README.zh.md) · [Português](./README.pt.md)

<!-- README-I18N:END -->

## Overview

PrimeDex is an open-source monorepo built around a Next.js web app, a shared TypeScript core package, and an Expo mobile companion. It brings together the full National Pokédex, competitive training tools, Pokémon TCG collection tools, and personal progress tracking without making an account a requirement.

The web experience covers **1,025 Pokémon across nine generations**. It is available in English, French, Spanish, German, Italian, Japanese, Korean, and Simplified Chinese; this repository also provides a Portuguese README translation.

> [!NOTE]
> PrimeDex is a non-commercial fan project. Pokémon data, names, and imagery belong to Nintendo, Game Freak, Creatures, and The Pokémon Company. PrimeDex is not affiliated with or endorsed by them.

<div align="center">
  <img src="./public/screenshot-mobile.png" alt="PrimeDex mobile view" width="280" />
</div>

## Features

| Area | What you can do |
| --- | --- |
| **Pokédex** | Browse and filter all 1,025 Pokémon; inspect stats, abilities, moves, evolutions, forms, encounters, sprites, and competitive information. |
| **Training tools** | Build six-Pokémon teams with coverage analysis, compare Pokémon side by side, explore the type chart, plan EVs and IVs, calculate breeding odds, and simulate Gen 9 battles. |
| **Reference library** | Search moves, abilities, and items, then use helpers such as move-coverage checks and counter suggestions. |
| **Personal progress** | Keep favorites, a Living Dex, teams, recent views, quiz statistics, and settings in persistent local storage; export or import this state as JSON. |
| **Play modes** | Take the six-mode quiz, track a Nuzlocke run, and share teams through a read-only link. |
| **TCG workspace** | Discover cards and sets, filter the catalog, manage a collection and wishlist, compare cards, follow price history and alerts, and build 60-card decks. |
| **Offline-ready** | Install the web app as a PWA. Its shell and previously used resources are cached for resilient repeat visits. |
| **Mobile companion** | The Expo app currently includes Pokédex browsing, detail, favorites, teams, account, theme, and locale settings while sharing the same core logic. |

## Get started

### Prerequisites

- [Node.js](https://nodejs.org/) 20 or later
- npm 10 or later

```bash
git clone https://github.com/teefloo/Poke.git
cd Poke
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). PrimeDex redirects an unprefixed URL to a locale path such as `/en`, using the `primedex-lang` cookie or the browser's `Accept-Language` header.

> [!IMPORTANT]
> Development intentionally uses webpack: `npm run dev` runs `next dev --webpack`. Keep this command even though the Next configuration also declares a Turbopack root.

### Common commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Next.js development server on port 3000. |
| `npm run build` | Create a production build. |
| `npm run start` | Serve the production build. |
| `npm run lint` | Run ESLint 9 with the flat configuration. |
| `npm run typecheck` | Run TypeScript without emitting files. |
| `npm run test` | Run the Vitest test suite in jsdom. |
| `npx vitest path/to/file.test.ts` | Run one test file. |

### Mobile app

The Expo companion lives in [`apps/mobile`](./apps/mobile) and consumes the shared [`@primedex/core`](./packages/core) package.

```bash
cd apps/mobile
npx expo start
```

Use the Expo prompt to open iOS, Android, web, or Expo Go. See the [mobile README](./apps/mobile/README.md) for the currently supported mobile screens.

## Configuration

No environment variables are required to browse the Pokédex locally. Create an uncommitted `.env.local` only when enabling an optional integration.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | Overrides the canonical public URL; defaults to `https://primedex.vercel.app`. |
| `NEXT_PUBLIC_SUPABASE_URL` | Enables optional Supabase authentication and cloud state sync. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anonymous key paired with the Supabase URL. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Enables browser push subscriptions for TCG price alerts. |
| `NEXT_PUBLIC_GOOGLE_VERIFICATION` | Adds Google Search Console verification metadata. |
| `NEXT_PUBLIC_ENABLE_AGENTATION` | Enables the Agentation UI-review toolbar during development. |

> [!TIP]
> Without Supabase configuration, PrimeDex remains fully usable in local-first mode: favorites, teams, captures, filters, and TCG progress remain in browser storage. For the mobile app, use `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in `apps/mobile/.env` instead.

<details>
<summary><strong>Enable Agentation in development</strong></summary>

Add this value to `.env.local` and restart the dev server:

```bash
NEXT_PUBLIC_ENABLE_AGENTATION=true
```

The helper runs on `http://localhost:4747`; its development-origin and CSP support are already configured.

</details>

## Architecture

```text
Poke/
├── src/                 Next.js 16 App Router web application
├── packages/core/       @primedex/core: API, state, types, i18n, helpers, Supabase
├── apps/mobile/         Expo / React Native companion
├── supabase/migrations/ Optional Supabase schema migrations
└── public/              PWA icons, screenshots, and static assets
```

```text
React Server and Client Components
  ├── TanStack Query hooks (@/lib/api) ──▶ PokéAPI REST + GraphQL, TCGdex
  └── Zustand selectors (@/store/primedex) ──▶ IndexedDB on web / AsyncStorage on mobile
```

- **Rendering and UI:** Next.js 16 App Router, React 19, TypeScript 5, Tailwind CSS 4, Base UI, and Framer Motion. Server Components are the default; interactive leaves opt into client rendering.
- **Data:** Centralized API clients use Axios with retries. TanStack Query supplies cache-aware server and client data access, while query keys live in one place for predictable invalidation.
- **State:** Zustand stores IDs and primitives for durable personal state. Its platform adapters use IndexedDB on the web and AsyncStorage on native devices.
- **Localization:** Client bundles load lazily through i18next; server translations are available for static and server rendering. The locale proxy maintains shareable locale-prefixed URLs and `hreflang` metadata.
- **Resilience:** The PWA caches its shell plus selected PokéAPI, TCGdex, image, and Next static resources. Remote data remains available online through the API clients.

## Data sources

| Source | Used for |
| --- | --- |
| [PokéAPI](https://pokeapi.co/) REST and GraphQL | Pokémon, species text, moves, abilities, types, evolution data, and encounters. |
| [TCGdex](https://www.tcgdex.net/) | Pokémon TCG cards, sets, images, rarities, and catalog information. |
| [Supabase](https://supabase.com/) | Optional authentication, cloud synchronization, public profiles, game data, and TCG-price alert support. |

The web client talks to these services through the project API layer rather than fetching directly from components.

## Deployment

PrimeDex is configured for Vercel and can run on any host that supports a Next.js server runtime and Image Optimization.

```bash
npm run build
npm run start
```

For Vercel, import the repository, keep the standard Next.js build settings, and configure any optional public environment variables in the project dashboard. The committed [`vercel.json`](./vercel.json) intentionally stays minimal.

## Acknowledgements

PrimeDex is made possible by [PokéAPI](https://pokeapi.co/), [TCGdex](https://www.tcgdex.net/), [Vercel](https://vercel.com/), and the open-source projects used throughout the application.

Pokémon and all related names, characters, and properties are trademarks of their respective owners. This is an unofficial, non-commercial fan project.
