<!-- prettier-ignore -->
<div align="center">

<img src="./public/icon.svg" alt="Lunidex logo" width="80" />

# Lunidex

**A local-first Pokémon companion for players, trainers, and TCG collectors.**

[![Live app](https://img.shields.io/badge/Live-lunidex.app-ef4440?style=flat-square&logo=vercel&logoColor=white)](https://lunidex.app)
[![CI](https://img.shields.io/github/actions/workflow/status/teefloo/Lunidex/ci.yml?style=flat-square&label=CI)](https://github.com/teefloo/Lunidex/actions/workflows/ci.yml)
[![Node.js 22](https://img.shields.io/badge/Node.js-22-3c873a?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19-149eca?style=flat-square&logo=react&logoColor=white)](https://react.dev/)
[![TypeScript 5](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Mobile](https://img.shields.io/badge/Mobile-Expo%2057-000020?style=flat-square&logo=expo&logoColor=white)](./apps/mobile)
[![GitHub stars](https://img.shields.io/github/stars/teefloo/Lunidex?style=flat-square)](https://github.com/teefloo/Lunidex/stargazers)

[Live app](https://lunidex.app) · [Repository](https://github.com/teefloo/Lunidex) · [Issues](https://github.com/teefloo/Lunidex/issues)

[Overview](#overview) · [Features](#features) · [Get started](#get-started) · [Architecture](#architecture) · [Configuration](#configuration) · [Deployment](#deployment)

<img src="./public/screenshot-desktop.png" alt="Lunidex desktop Pokédex and collection dashboard" width="840" />

</div>

<!-- README-I18N:START -->

**English** · [Français](./README.fr.md) · [Español](./README.es.md) · [Deutsch](./README.de.md) · [Italiano](./README.it.md) · [日本語](./README.ja.md) · [한국어](./README.ko.md) · [中文](./README.zh.md) · [Português](./README.pt.md)

<!-- README-I18N:END -->

## Overview

Lunidex is a free, open-source npm-workspaces monorepo that brings a complete Pokédex, team-building tools, Pokémon TCG collection tracking, and personal progress into one focused workspace.

The web app covers **1,025 Pokémon across nine generations** and supports eight interface languages: English, French, Spanish, German, Italian, Japanese, Korean, and Simplified Chinese. Portuguese is currently available as a README translation only.

It works without an account. Personal state is stored locally by default, while optional Neon Auth and Neon PostgreSQL integrations add accounts, cloud sync, public profiles, friends, leaderboards, battle rooms, and server-backed features.

> [!NOTE]
> Lunidex is an unofficial, non-commercial fan project. Pokémon data, names, characters, and imagery belong to Nintendo, Game Freak, Creatures, and The Pokémon Company. Lunidex is not affiliated with or endorsed by them.

<div align="center">
  <img src="./public/screenshot-mobile.png" alt="Lunidex mobile Pokédex view" width="280" />
</div>

## Features

| Area | What you can do |
| --- | --- |
| **Pokédex and reference** | Browse and filter all 1,025 Pokémon; inspect stats, types, abilities, moves, evolutions, forms, encounters, sprites, and localized species data. Search moves, abilities, and items. |
| **Team and battle lab** | Build teams of up to six, analyze type and move coverage, score team synergy, compare up to three Pokémon, explore the 18-type chart, plan EVs and IVs, calculate breeding outcomes, and simulate Gen 9 battles. |
| **Progress and play** | Track favorites, captures, Living Dex progress, activity, badges, and quiz statistics. Play six quiz modes, track a Nuzlocke run, share teams with read-only links, and import/export Showdown-compatible teams. |
| **Pokémon TCG workspace** | Browse cards and sets, track collection and wishlist progress, compare cards, save searches and notes, inspect set completion, research prices, and build 60-card decks. |
| **Local-first workflow** | Keep using the app without an account. Web state persists in IndexedDB, mobile state uses AsyncStorage, and the PWA caches its shell and selected upstream resources for resilient repeat visits. |
| **Mobile companion** | Run the Expo app on iOS, Android, or the web with shared API clients, types, Zustand state, persistence contracts, and translations from `@primedex/core`. |

## Explore the app

The locale prefix can be changed from `en` to any supported language.

| Surface | Route |
| --- | --- |
| Pokédex | [`/en/pokedex`](https://lunidex.app/en/pokedex) |
| Team builder | [`/en/team`](https://lunidex.app/en/team) |
| Type chart | [`/en/types`](https://lunidex.app/en/types) |
| Pokémon quiz | [`/en/quiz`](https://lunidex.app/en/quiz) |
| TCG catalog | [`/en/tcg`](https://lunidex.app/en/tcg) |
| TCG collection | [`/en/tcg/collection`](https://lunidex.app/en/tcg/collection) |
| Personal dashboard | [`/en/dashboard`](https://lunidex.app/en/dashboard) |

## Get started

### Prerequisites

- [Node.js](https://nodejs.org/) 22
- npm and the committed `package-lock.json`
- Git

Clone the repository, install the workspace dependencies, and start the web app:

```bash
git clone https://github.com/teefloo/Lunidex.git
cd Lunidex
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The locale proxy redirects an unprefixed URL to a supported locale such as `/en`, using the `primedex-lang` cookie or the browser language when available.

> [!IMPORTANT]
> Development and production builds intentionally use webpack: `npm run dev` runs `next dev --webpack`, and `npm run build` runs `next build --webpack`. Keep the flag even though the Next.js configuration also declares a Turbopack root.

### Common commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Next.js development server on port 3000. |
| `npm run build` | Create a production build. |
| `npm run start` | Serve the production build. |
| `npm run lint` | Lint the web, core, and mobile source files. |
| `npm run typecheck` | Type-check the web application without emitting files. |
| `npm run test -- --run` | Run the Vitest suite once. |
| `npx vitest run path/to/file.test.ts` | Run one focused test file. |
| `npx tsc --project packages/core/tsconfig.json --noEmit` | Type-check the shared core package. |
| `npm run typecheck --workspace=@primedex/mobile` | Type-check the Expo app. |

## Mobile app

The Expo companion lives in [`apps/mobile`](./apps/mobile). It consumes [`@primedex/core`](./packages/core) instead of duplicating API, domain, persistence, or localization logic.

```bash
npm run start --workspace=@primedex/mobile
```

Use the Expo prompt to open iOS, Android, a web preview, or Expo Go. Native development requires the relevant platform tooling; the app remains local-first when its optional Neon variables are absent.

See the [mobile README](./apps/mobile/README.md) for supported screens, platform adapters, and mobile-specific setup.

## Configuration

No environment variables are required to browse the Pokédex or use local collections. Copy [`.env.example`](./.env.example) to `.env.local` only when enabling an optional integration:

```bash
cp .env.example .env.local
```

| Variable | Scope | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | Web / public | Canonical site URL and the base URL used by shared clients. Defaults to `https://lunidex.app`. |
| `NEXT_PUBLIC_NEON_AUTH_URL` | Web / public | Public Neon Auth endpoint used by the browser client. |
| `NEON_AUTH_BASE_URL` | Server-only | Neon Auth base URL used by the `/api/auth` proxy. |
| `NEON_AUTH_JWKS_URL` | Server-only | JWKS endpoint used to verify Neon Auth tokens. |
| `NEON_AUTH_COOKIE_SECRET` | Server-only | Secret used to protect the server-side auth cookie. |
| `NEON_DATABASE_URL` / `DATABASE_URL` | Server-only | Neon PostgreSQL connection string. `DATABASE_URL` is supplied by the Vercel Neon integration; `NEON_DATABASE_URL` is useful locally. |
| `EXPO_PUBLIC_NEON_AUTH_URL` | Mobile / public | Public Neon Auth endpoint for the Expo app. |
| `EXPO_PUBLIC_APP_URL` | Mobile / public | Deployed Lunidex API URL used by the Expo app. |
| `NEXT_PUBLIC_GOOGLE_VERIFICATION` | Web / public | Optional Google Search Console verification value. |
| `NEXT_PUBLIC_ENABLE_AGENTATION` | Development | Enables the Agentation UI-review toolbar when set to `true`. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | Web push | Optional push-subscription configuration for TCG notifications; keep the private key and subject server-side. |

> [!TIP]
> Keep connection strings, JWKS configuration, cookie secrets, and VAPID private keys server-side. Never put them in `NEXT_PUBLIC_*`, `EXPO_PUBLIC_*`, source files, logs, or commits.

Without Neon configuration, favorites, captures, teams, filters, quiz progress, TCG state, and preferences stay on the device. The active runtime uses Neon; `SUPABASE_DB_URL` is retained only for the one-time migration scripts and is not an application runtime variable.

<details>
<summary><strong>Enable Agentation during development</strong></summary>

Add this value to `.env.local` and restart the dev server:

```dotenv
NEXT_PUBLIC_ENABLE_AGENTATION=true
```

The development helper runs on `http://localhost:4747`; its origin and CSP support are already configured.

</details>

## Architecture

```text
.
├── src/                 Next.js 16 / React 19 web application
├── packages/core/       @primedex/core: shared API clients, types, state, i18n, and helpers
├── apps/mobile/         Expo 57 / React Native companion
├── neon/migrations/     Active Neon PostgreSQL application schema
├── supabase/            Archived source migrations and compatibility material
├── scripts/neon/        Controlled export, import, and verification scripts
└── public/              PWA icons, screenshots, and static assets
```

```text
Web (Next.js App Router)
  ├── Server and client route components
  ├── TanStack Query ──▶ @primedex/core API clients ──▶ PokéAPI + TCGdex
  ├── Zustand ──▶ IndexedDB persistence
  └── Server API routes ──▶ Neon Auth + Neon PostgreSQL

Mobile (Expo Router)
  ├── Native screens and providers
  └── @primedex/core ──▶ AsyncStorage + the same domain logic
```

Key boundaries:

- **UI:** Next.js 16 App Router, React 19, TypeScript 5, Tailwind CSS 4, Base UI, and Framer Motion; Server Components are the default and interactive leaves opt into client rendering.
- **Shared core:** business logic, API clients, domain types, i18n bundles, Zustand state, and pure helpers are kept UI-free so web and mobile can share them.
- **Data access:** remote requests go through the centralized API façade and TanStack Query rather than ad hoc component fetches.
- **Persistence:** the web uses IndexedDB; native builds use AsyncStorage through platform adapters. Persisted state stores compact IDs and user-owned primitives, not full upstream API responses.
- **Localization:** locale-prefixed routes and lazy translation bundles support `en`, `fr`, `es`, `de`, `it`, `ja`, `ko`, and `zh`.
- **Compatibility:** Lunidex is the visible brand, while package names such as `@primedex/core` and storage keys retain their historical identifiers so existing data and mobile builds continue to work.

## Data sources and attribution

| Source | Used for |
| --- | --- |
| [PokéAPI](https://pokeapi.co/) REST and GraphQL | Pokémon, species text, stats, types, moves, abilities, evolutions, encounters, and localized names. |
| [TCGdex](https://www.tcgdex.net/) | Pokémon TCG cards, sets, rarities, catalog data, and card images. |
| [PokéAPI sprites](https://github.com/PokeAPI/sprites) | Pokémon and item sprites used throughout the interface. |
| [Neon](https://neon.com/) | Optional PostgreSQL storage, Neon Auth, cloud synchronization, profiles, social features, and server-side metrics. |

The application revalidates upstream catalog data and keeps the personal workspace separate from those public sources. Pokémon intellectual property is not covered by the repository's MIT license; see [`LICENSE`](./LICENSE) for the exact scope.

## Deployment

Lunidex is configured for [Vercel](https://vercel.com/) and can also run on a host that supports the Next.js server runtime and image optimization.

```bash
npm run build
npm run start
```

For Vercel:

1. Import `teefloo/Lunidex` into a Vercel project.
2. Configure the Neon Auth values and the server-side database connection in Preview and Production.
3. Deploy with the standard Next.js settings. The committed [`vercel.json`](./vercel.json) intentionally stays minimal.

For the migration history and the controlled Neon scripts, see [`docs/neon-migration.md`](./docs/neon-migration.md).

## Related docs

- [Mobile setup and parity notes](./apps/mobile/README.md)
- [Product direction](./PRODUCT.md)
- [Design system](./DESIGN.md)
- [Neon migration runbook](./docs/neon-migration.md)
