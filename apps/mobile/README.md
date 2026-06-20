# PrimeDex Mobile (Expo / React Native)

Native iOS & Android port of PrimeDex. It reuses the **exact** business logic of
the web app through the shared [`@primedex/core`](../../packages/core) workspace
package — API clients, the Zustand store, types, the Supabase layer and the i18n
bundles are imported, never duplicated. Only the UI is written from scratch for
mobile.

## Architecture

```
Poke/                      (npm workspaces root)
├── src/                   web app (Next.js)   ── consumes @primedex/core via @/… aliases
├── packages/core/         shared business logic (platform-agnostic TypeScript)
│   └── src/
│       ├── api/           PokeAPI + TCGdex clients (axios)
│       ├── store/         Zustand store (favorites, team, caught, filters, TCG, quiz…)
│       ├── supabase/      auth provider + cloud sync (user_state JSONB)
│       ├── types/         data models (source of truth)
│       ├── i18n/          9-locale translation bundles
│       ├── lib/           pure helpers (languages, team-analysis, badges…)
│       └── platform/      ← platform adapters (see below)
└── apps/mobile/           this Expo app   ── consumes @primedex/core via metro/babel alias
```

### Platform adapters (how one store works on web and native)

`packages/core/src/platform/` holds the only platform-specific seams. Metro
automatically resolves the `*.native.ts` variant on React Native, while the web
build uses the default `.ts`:

| Concern         | Web (`*.ts`)            | Native (`*.native.ts`)        |
| --------------- | ----------------------- | ----------------------------- |
| Store persist   | IndexedDB (idb-keyval)  | AsyncStorage                  |
| Supabase config | `NEXT_PUBLIC_*` env     | `EXPO_PUBLIC_*` + AsyncStorage|

No `if (Platform.OS)` branching leaks into the business logic.

## Features in this build

- **Pokédex** — paginated infinite list, search, two-column grid.
- **Detail** — type-tinted hero, base-stat bars, abilities, height/weight.
- **Favorites & Team** — backed by the shared store (so they cloud-sync when
  signed in), team capped at 6.
- **Account** — email/password auth (Supabase), sign out.
- **Settings** — light/dark/system theme + the 9 locales, all persisted and synced.

## Run it

From the **repo root** (workspaces install hoists everything):

```bash
npm install
cd apps/mobile
npx expo start          # press i (iOS sim), a (Android), or scan with Expo Go
```

Type-check just this app:

```bash
cd apps/mobile && npm run typecheck
```

### Optional: accounts + cloud sync

Copy `.env.example` to `.env` and fill in your Supabase project keys
(`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`). Without them the
app runs fully local against AsyncStorage and the Account tab shows a local-only
notice — same graceful-degradation contract as the web app. The Supabase schema
lives in [`../../supabase/migrations`](../../supabase/migrations).

## Roadmap (parity with web, not yet ported)

Compare, Quiz, Types chart, Moves, Dashboard, and the full **TCG** module
(collection, wishlist, card detail, research desk). Their data/logic already
live in `@primedex/core`; only mobile screens remain to be built.
```
