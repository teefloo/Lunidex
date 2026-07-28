# 🧠 PrimeDex Store Context

This directory manages the shared global state and persistence layer of the PrimeDex dashboard using **Zustand** and platform-specific storage adapters.

## 🚀 Core Responsibilities
- **Persistence**: Managed via `zustand/middleware/persist` and the local `platform/storage` adapter. The web adapter uses IndexedDB through `idb-keyval`; Expo resolves `platform/storage.native.ts` and uses AsyncStorage.
- **Data Governance**: Do not persist complete PokéAPI or TCG API responses. Store compact identifiers, primitives, and the small user-owned records required by the app (for example saved searches, notes, decks, and quiz sessions).
- **State Domains**:
  - **Collection**: Favorites, Caught status, and Achievement Badges.
  - **Composition**: Team management (max 6) and Comparison lists (max 3).
  - **Filtering**: Extensive Pokémon search parameters (Types, Generations, Base Stats, Height/Weight ranges, etc.).
  - **TCG and Nuzlocke**: Owned and wished-for cards, saved searches, decks, notes, and Nuzlocke runs.
  - **Localization and activity**: UI language, system-level locale mapping, quiz history, streaks, visits, and recent actions.
  - **Gaming**: High scores for classic, silhouette, stats, and time-attack quiz modes.

## 🛠 Usage & Integration

### Store Access
The shared store is exported from `@primedex/core` (or its store deep import). The web application also has its own web-specific store at `src/store/primedex.ts`.
```typescript
import { usePrimeDexStore } from '@primedex/core';

const favorites = usePrimeDexStore((state) => state.favorites);
const addFavorite = usePrimeDexStore((state) => state.addFavorite);
```

### Hydration
Since the store uses asynchronous storage (IndexedDB on web and AsyncStorage on Expo), always check `_hasHydrated` before rendering components that depend on persisted state to avoid UI flickers or mismatches.

## 📐 Engineering Standards
1. **No Large Blobs**: Never store full Pokémon objects. Use the PokéAPI (REST/GraphQL) to fetch details by ID.
2. **Atomic Updates**: Prefer atomic actions (e.g., `toggleCaught`) over manual array manipulation in components.
3. **Immutability**: Always use the Zustand `set` function with immutable updates.
4. **Validation**: Team and Comparison list sizes are strictly enforced within the store logic (6 and 3 respectively).

## 🧪 Quality Assurance
The repository uses **Vitest** for automated tests. There is currently no dedicated test file alongside this shared store; run the full suite from the repository root with:
```bash
npm run test -- --run
```
When adding store behavior, cover persistence, list limits, hydration, and filter-reset behavior with focused tests.
