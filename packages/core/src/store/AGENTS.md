# Shared store guide

This guide applies only to the platform-neutral Zustand store in `packages/core/src/store/`. It supplements `packages/core/AGENTS.md`; the web-only store in `src/store/` has its own guide and must not be treated as the same shape.

## Persistence contract

- The store persists through `platform/storage`: IndexedDB via `idb-keyval` on the web and AsyncStorage on Expo. Keep storage details out of store actions.
- Persist only compact IDs, primitives, filters, and small user-owned records. Never persist full PokéAPI, TCGdex, GraphQL, or other remote response objects.
- `SYNCED_KEYS` defines the persisted/synchronized snapshot used by the core Neon sync path. Treat additions, removals, defaults, and serialized shapes as compatibility changes and coordinate consumers before changing them.
- `_hasHydrated` is asynchronous. Consumers must wait for it before making persisted-state UI or effect decisions.

## State invariants

- Use atomic store actions such as `toggleCaught`, `addToTeam`, and `resetFilters` instead of editing arrays in components.
- Keep updates immutable and preserve the existing limits: teams contain at most 6 Pokémon, the Pokémon comparison list at most 3 entries, and the TCG comparison list at most 4 cards.
- Keep the store independent of React Native APIs and remote caches. Fetch remote details through the API layer and store only the user-owned result needed for later rendering.
- Select individual slices in consumers where practical to avoid unrelated re-renders.

## Verification

When store behavior changes, add focused Vitest coverage for the affected persistence shape, hydration, limits, reset behavior, or action. From the repository root run:

```bash
npx tsc --project packages/core/tsconfig.json --noEmit
npm run test -- --run
```
