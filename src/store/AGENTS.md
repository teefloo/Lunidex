# Web store guide

This guide applies to the web-only Zustand store in `src/store/primedex.ts`. It is separate from the platform-neutral store in `packages/core/src/store/`.

## Persistence and synchronization

- Persistence uses Zustand `persist` with the IndexedDB adapter from `idb-keyval`. Keep browser storage details in this module and do not make the shared core store depend on them.
- Persist only IDs, primitives, filters, and small user-owned records. Never persist full PokéAPI, TCGdex, GraphQL, or other remote responses.
- `SYNCED_KEYS` is the compatibility contract for local persistence and the Neon sync implementation reached through `src/lib/supabase/sync-state.ts`. When changing a synchronized field, align its default, hydration, server representation, and the corresponding core consumer deliberately; the web and core store shapes are not identical.
- `_hasHydrated` becomes true after asynchronous rehydration. Do not make persisted-state decisions before it is available, and keep the initial render SSR-safe.

## Usage and invariants

- Prefer actions such as `toggleCaught`, `addToTeam`, and `resetFilters` over array manipulation in components. Keep updates immutable.
- Preserve the existing limits: teams contain at most 6 Pokémon, the Pokémon comparison list at most 3 entries, and the TCG comparison list at most 4 cards.
- Keep API fetching in TanStack Query and `@/lib/api`; the store holds user choices and compact user-owned results, not the remote cache.
- Auth and cloud sync are best-effort. The web app must remain usable with no Neon variables and local IndexedDB only.

## Verification

When store behavior changes, run:

```bash
npm run lint
npm run typecheck
```
