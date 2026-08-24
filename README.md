<!-- prettier-ignore -->
<div align="center">

<img src="./public/icon-512.png" alt="Lunidex logo" width="80" />

# Lunidex

**A focused Pokémon workspace for players, trainers, and TCG collectors.**

[![Live app](https://img.shields.io/badge/Live-lunidex.app-ef4440?style=flat-square&logo=vercel&logoColor=white)](https://lunidex.app)
[![CI](https://img.shields.io/github/actions/workflow/status/teefloo/Lunidex/ci.yml?style=flat-square&label=CI)](https://github.com/teefloo/Lunidex/actions/workflows/ci.yml)
[![Node.js 22](https://img.shields.io/badge/Node.js-22-3c873a?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19-149eca?style=flat-square&logo=react&logoColor=white)](https://react.dev/)
[![TypeScript 5](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Expo 57](https://img.shields.io/badge/Mobile-Expo%2057-000020?style=flat-square&logo=expo&logoColor=white)](./apps/mobile)

[Live app](https://lunidex.app) · [Repository](https://github.com/teefloo/Lunidex) · [Issues](https://github.com/teefloo/Lunidex/issues)

[Overview](#overview) · [Features](#features) · [Quick start](#quick-start) · [Configuration](#configuration) · [Architecture](#architecture) · [Deployment](#deployment)

<img src="./public/screenshot-desktop.png" alt="Lunidex desktop Pokédex and collection dashboard" width="840" />

</div>

<!-- README-I18N:START -->

**English** · [Français](./README.fr.md) · [Español](./README.es.md) · [Deutsch](./README.de.md) · [Italiano](./README.it.md) · [日本語](./README.ja.md) · [한국어](./README.ko.md) · [中文](./README.zh.md) · [Português](./README.pt.md)

<!-- README-I18N:END -->

## Overview

Lunidex is an independent, open-source npm-workspaces monorepo centered on Pokémon TCG collection tracking, with a Pokédex, team-building utilities, and an account-backed personal workspace.

The web app covers **1,025 Pokémon across nine generations** and supports eight interface locales: English, French, Spanish, German, Italian, Japanese, Korean, and Simplified Chinese. Portuguese is available as a translated repository README, but is not a web UI locale.

Public reference pages work without an account. The personal workspace—favorites, caught Pokémon, teams, quiz progress, TCG collections, wishlists, saved searches, notes, decks, and related features—uses Neon Auth and Neon PostgreSQL when configured and synchronized. Web display preferences use IndexedDB; the Expo app uses AsyncStorage.

> [!NOTE]
> Lunidex is an unofficial, non-commercial fan project. Pokémon data, names, characters, and imagery belong to Nintendo, Game Freak, Creatures, and The Pokémon Company. Lunidex is not affiliated with or endorsed by them.

<div align="center">
  <img src="./public/screenshot-mobile.png" alt="Lunidex mobile Pokédex view" width="280" />
</div>

## Features

| Area | What you can do |
| --- | --- |
| **Pokédex and reference** | Browse and filter all 1,025 Pokémon; inspect stats, types, abilities, moves, evolutions, forms, encounters, sprites, and localized species data. Search moves, abilities, and items. |
| **Team and battle lab** | Build teams of up to six, analyze type and move coverage, review synergy and roles, compare up to three Pokémon, use the 18-type chart, plan EVs and IVs, calculate breeding outcomes, and run a Gen 9 battle simulator. |
| **Progress and play** | Track favorites, caught Pokémon, Living Dex progress, activity, badges, and quiz statistics. Play three quiz challenges across three game modes, including daily runs, and track a Nuzlocke run. |
| **Sharing and social tools** | Import and export Showdown teams, share read-only team links, create public profiles, manage friends, view quiz leaderboards, and use account-backed battle rooms. |
| **Pokémon TCG workspace** | Browse cards and sets, filter the catalog, compare cards, track owned and wanted cards, review set progress, save searches and notes, build decks, and display upstream price fields when TCGdex provides them. |
| **PWA and persistence** | Install the web app as a PWA. The service worker caches the app shell and selected upstream resources for resilient repeat visits, while account data remains behind the server API. |
| **Mobile companion** | Use the Expo app on iOS, Android, or the web with shared API clients, types, Zustand state, persistence contracts, translations, and Neon helpers from `@primedex/core`. |

## Explore the app

Replace `en` with any supported locale: `en`, `fr`, `es`, `de`, `it`, `ja`, `ko`, or `zh`.

| Surface | Route |
| --- | --- |
| Home | [`/en`](https://lunidex.app/en) |
| Pokédex | [`/en/pokedex`](https://lunidex.app/en/pokedex) |
| Pokémon detail | [`/en/pokemon/pikachu`](https://lunidex.app/en/pokemon/pikachu) |
| Team builder | [`/en/team`](https://lunidex.app/en/team) |
| Type chart | [`/en/types`](https://lunidex.app/en/types) |
| Quiz | [`/en/quiz`](https://lunidex.app/en/quiz) |
| Battle simulator | [`/en/battle`](https://lunidex.app/en/battle) |
| TCG catalog | [`/en/tcg`](https://lunidex.app/en/tcg) |
| TCG collection | [`/en/tcg/collection`](https://lunidex.app/en/tcg/collection) |
| Dashboard | [`/en/dashboard`](https://lunidex.app/en/dashboard) |

Collection, dashboard, social, and other personal surfaces may require an authenticated sync session.

## Quick start

### Prerequisites

- [Node.js](https://nodejs.org/) 22
- npm and the committed `package-lock.json`
- [Git](https://git-scm.com/)

Clone the repository, install the workspaces, and start the web app:

```bash
git clone https://github.com/teefloo/Lunidex.git
cd Lunidex
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The locale proxy redirects an unprefixed URL to a supported locale such as `/en`, using the `primedex-lang` cookie or the browser language when available.

> [!IMPORTANT]
> Development and production builds intentionally use webpack: `npm run dev` runs `next dev --webpack`, and `npm run build` runs `next build --webpack`. Keep the flag even though the Next.js configuration also declares a Turbopack root.

## Mobile app

The Expo companion lives in [`apps/mobile`](./apps/mobile). It currently includes the Pokédex list, search, detail views, favorites, team, account, theme, and language settings. It is not yet at full web feature parity; the remaining web tools stay available in the Next.js app.

Start it from the repository root:

```bash
npm run start --workspace=@primedex/mobile
```

Use the Expo prompt to open iOS, Android, or a web preview. The package also exposes `android`, `ios`, and `web` scripts:

```bash
npm run android --workspace=@primedex/mobile
npm run ios --workspace=@primedex/mobile
npm run web --workspace=@primedex/mobile
```

For mobile-specific environment variables and architecture notes, see the [mobile README](./apps/mobile/README.md).

## Configuration

No environment variables are required for public reference browsing. Copy the template when enabling optional account, server, contact, push, or development integrations:

```bash
cp .env.example .env.local
```

For the Expo app, use `apps/mobile/.env.example` as the template:

```bash
cp apps/mobile/.env.example apps/mobile/.env
```

| Variable(s) | Scope | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | Web / public | Canonical site and API base URL. Defaults to `https://lunidex.app`. |
| `NEXT_PUBLIC_NEON_AUTH_URL` | Web / public | Neon Auth endpoint used by the browser client. |
| `NEON_AUTH_BASE_URL`, `NEON_AUTH_JWKS_URL` | Server-only | Neon Auth proxy and JWT verification endpoints. |
| `NEON_AUTH_COOKIE_SECRET`, `NEON_AUTH_JWT_ISSUER`, `NEON_AUTH_JWT_AUDIENCE` | Server-only | Auth cookie protection and JWT validation constraints. |
| `NEON_DATABASE_URL` / `DATABASE_URL` | Server-only | Neon PostgreSQL connection. Vercel's Neon integration supplies `DATABASE_URL`; local tooling can use `NEON_DATABASE_URL`. |
| `EXPO_PUBLIC_NEON_AUTH_URL`, `EXPO_PUBLIC_APP_URL` | Mobile / public | Neon Auth and deployed application endpoints used by Expo. |
| `NEXT_PUBLIC_GOOGLE_VERIFICATION` | Web / public | Optional Google Search Console verification value. |
| `NEXT_PUBLIC_ENABLE_AGENTATION` | Development | Enables the Agentation UI-review overlay when set to `true`. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Web / public | Optional browser push subscription key. |
| `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Server-only | Optional server-side push delivery configuration. |
| `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL` | Server-only | Optional contact-form email delivery through Resend. |
| `SUPABASE_DB_URL` | Migration-only | Source connection used by the retained Supabase-to-Neon export scripts; never a web or mobile runtime variable. |

> [!WARNING]
> Never expose connection strings, JWKS settings, cookie secrets, VAPID private material, Resend keys, or migration URLs through `NEXT_PUBLIC_*`, `EXPO_PUBLIC_*`, source files, logs, or commits.

<details>
<summary><strong>Enable Agentation during development</strong></summary>

Add this value to `.env.local` and restart the dev server:

```dotenv
NEXT_PUBLIC_ENABLE_AGENTATION=true
```

The development helper uses `http://localhost:4747`; its development origin and CSP support are already configured.

</details>

## Scripts

Run root commands from the repository root:

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Next.js development server. |
| `npm run build` | Create a production build. |
| `npm run start` | Serve the production build. |
| `npm run lint` | Lint web, core, and mobile sources. |
| `npm run typecheck` | Type-check the web workspace. |
| `npm run test -- --run` | Run the Vitest suite once. |
| `npx vitest run path/to/file.test.ts` | Run one focused test file. |
| `npx tsc --project packages/core/tsconfig.json --noEmit` | Type-check `@primedex/core`. |
| `npm run typecheck --workspace=@primedex/mobile` | Type-check the Expo app. |
| `npm run lint --workspace=@primedex/mobile` | Lint the Expo app. |
| `npm run db:neon:export` | Export the retained source data for migration. |
| `npm run db:neon:import` | Apply the Neon schema and import a prepared export. |
| `npm run db:neon:verify` | Compare the source and Neon migration result. |

> [!WARNING]
> The Neon import and verification commands access external databases. Read [`neon/AGENTS.md`](./neon/AGENTS.md) and [`scripts/neon/AGENTS.md`](./scripts/neon/AGENTS.md) first, and use an approved disposable or staging target.

The CI workflow in [`.github/workflows/ci.yml`](./.github/workflows/ci.yml) runs dependency installation, linting, web and core type-checks, tests, the production build, and the mobile type-check.

## Architecture

```text
.
├── src/                 Next.js 16 / React 19 web application
├── packages/core/       @primedex/core shared API clients, types, store, i18n, and helpers
├── apps/mobile/         @primedex/mobile Expo Router companion
├── neon/migrations/     Active Neon PostgreSQL application schema
├── supabase/            Retained source migrations and compatibility material
├── scripts/neon/        Controlled export, import, and verification scripts
├── public/              PWA icons, screenshots, card assets, and static files
└── docs/                Product, design, migration, audit, and implementation notes
```

```text
Web (Next.js App Router)
  ├── Server and client route components
  ├── TanStack Query ──▶ shared API clients ──▶ PokéAPI + TCGdex
  ├── Zustand ──▶ IndexedDB display preferences
  └── Route Handlers ──▶ Neon Auth + Neon PostgreSQL user workspace

Mobile (Expo Router)
  └── @primedex/core ──▶ AsyncStorage + Neon Auth/API when configured
```

Key boundaries:

- **Web:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Base UI, Framer Motion, TanStack Query, and the PWA layer.
- **Shared core:** platform-agnostic domain types, API clients, Zustand store, i18n bundles, Neon helpers, and pure utilities are shared by web and mobile.
- **Data access:** remote requests go through the centralized API façade in `src/lib/api` and `packages/core/src/api`; presentational components do not add ad hoc API clients.
- **Persistence:** web display preferences use IndexedDB with a browser fallback; native persistence uses AsyncStorage. Authenticated workspace data is synchronized through the Neon API and stored in `user_state`.
- **Platform seam:** matching `*.ts` and `*.native.ts` adapters keep browser and React Native storage/configuration separate without copying domain logic.
- **Localization:** locale-prefixed routes and translation bundles support `en`, `fr`, `es`, `de`, `it`, `ja`, `ko`, and `zh`.

> [!IMPORTANT]
> Lunidex is the visible product name, but `primedex`, `@primedex/core`, `@primedex/mobile`, `usePrimeDexStore`, storage keys, route slugs, Expo schemes, and bundle identifiers are compatibility-sensitive historical identifiers. Keep them unchanged unless a deliberate migration is part of the task.

## Data sources and attribution

| Source | Used for |
| --- | --- |
| [PokéAPI](https://pokeapi.co/) REST and GraphQL | Pokémon, species text, stats, types, moves, abilities, evolutions, encounters, and localized names. |
| [PokéAPI sprites](https://github.com/PokeAPI/sprites) | Pokémon and item sprites and related artwork assets. |
| [TCGdex](https://www.tcgdex.net/) | Pokémon TCG cards, sets, rarities, images, catalog fields, and price fields when supplied upstream. |
| [Neon](https://neon.com/) | Optional authentication, PostgreSQL user state, profiles, friends, leaderboards, battle rooms, and server-backed workspace features. |

Upstream availability, localized coverage, images, and price fields can change. Lunidex is not a card marketplace and does not guarantee market valuations or price-history coverage.

The source code is distributed under the MIT license in [`LICENSE`](./LICENSE). Pokémon intellectual property and third-party data remain subject to their respective owners and source terms.

## Deployment

Lunidex is configured for [Vercel](https://vercel.com/) and can also run on a host that supports the Next.js server runtime and image optimization.

```bash
npm run build
npm run start
```

For Vercel:

1. Import `teefloo/Lunidex` into a Vercel project.
2. Configure the Neon Auth values and server-only database connection in Preview and Production.
3. Use the standard Next.js build settings. The committed [`vercel.json`](./vercel.json) intentionally stays minimal.

The active web runtime uses Neon. The retained Supabase migrations and the controlled migration scripts exist for comparison, backup, and migration work; they are not the web application's authentication or database runtime.

See the [Neon migration runbook](./docs/neon-migration.md) for the schema, environment boundaries, and validation procedure.

## Related docs

- [Mobile setup and parity notes](./apps/mobile/README.md)
- [Product context](./PRODUCT.md)
- [Design system](./DESIGN.md)
- [Neon migration runbook](./docs/neon-migration.md)
- [GitHub issues](https://github.com/teefloo/Lunidex/issues)
