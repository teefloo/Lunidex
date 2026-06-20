# 🧠 PrimeDex Store Context

This directory manages the global state and persistence layer of the PrimeDex Gaming Dashboard using **Zustand** and **IndexedDB**.

## 🚀 Core Responsibilities
- **Persistence**: Managed via `zustand/middleware/persist` with a custom IndexedDB storage adapter (`idb-keyval`).
- **Data Governance**: Adheres to the "Primitive-Only" mandate. Only IDs and primitives (numbers, strings, booleans) are stored to ensure high performance and prevent synchronization overhead with the API layer.
- **State Domains**:
  - **Collection**: Favorites, Caught status, and Achievement Badges.
  - **Composition**: Team management (max 6) and Comparison lists (max 3).
  - **Filtering**: Extensive Pokémon search parameters (Types, Generations, Base Stats, Height/Weight ranges, etc.).
  - **Localization**: UI language and system-level locale mapping.
  - **Gaming**: High scores for multiple quiz modes.

## 🛠 Usage & Integration

### Store Access
The store is accessed via the `usePrimeDexStore` hook.
```typescript
import { usePrimeDexStore } from '@/store/primedex';

const favorites = usePrimeDexStore((state) => state.favorites);
const addFavorite = usePrimeDexStore((state) => state.addFavorite);
```

### Hydration
Since the store uses asynchronous storage (IndexedDB), always check `_hasHydrated` before rendering components that depend on persisted state to avoid UI flickers or mismatches.

## 📐 Engineering Standards
1. **No Large Blobs**: Never store full Pokémon objects. Use the PokéAPI (REST/GraphQL) to fetch details by ID.
2. **Atomic Updates**: Prefer atomic actions (e.g., `toggleCaught`) over manual array manipulation in components.
3. **Immutability**: Always use the Zustand `set` function with immutable updates.
4. **Validation**: Team and Comparison list sizes are strictly enforced within the store logic (6 and 3 respectively).

## 🧪 Quality Assurance
Tests live alongside the implementation and use **Vitest**.
- **Command**: `npx vitest src/store/primedex.test.ts`
- **Scope**: Verifies persistence logic, list limits, and filter reset functionality.
