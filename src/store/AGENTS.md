# Web Store Guide

This directory contains the web-specific Zustand store used by the Next.js application. It is intentionally separate from the platform-neutral store in `packages/core/src/store`.

## Persistence and synchronization

- `src/store/primedex.ts` uses Zustand `persist` with the web IndexedDB adapter from `idb-keyval`.
- Persist only compact user state: IDs, primitives, filters, and small user-owned records. Never persist full PokéAPI, TCGdex, or GraphQL response objects.
- `SYNCED_KEYS` is the contract shared by local persistence and `src/lib/supabase/sync-state.ts` (a compatibility path for the Neon sync layer). Add a new synchronized field deliberately and keep its default, hydration, and server representation aligned.
- `_hasHydrated` becomes true after asynchronous rehydration. Do not make persisted-state decisions before it is available, and use stable SSR-safe output to avoid hydration mismatches.
- Prefer store actions such as `toggleCaught`, `addToTeam`, and `resetFilters` over array manipulation in components. Keep updates immutable and preserve the team limit of 6 and comparison limit of 3.

## Usage

- Select individual state slices with `usePrimeDexStore(selector)` to limit re-renders.
- Keep API fetching in TanStack Query and `@/lib/api`; the store should hold user choices and compact results, not remote cache data.
- Treat authentication and cloud sync as best-effort. The web app must remain usable with no Neon variables and local IndexedDB only.

## Verification

When changing store behavior, add or update focused Vitest coverage for limits, reset behavior, persistence shape, and hydration. From the repository root run:

```bash
npm run lint
npm run typecheck
npm run test -- --run
```
