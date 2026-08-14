/**
 * Public surface of @primedex/core — the platform-agnostic business logic
 * shared by the web (Next.js) and mobile (Expo) apps.
 *
 * UI-free: data types, the Zustand store, API clients, Neon Auth helpers and
 * pure helpers. Persistence and Neon endpoints are injected through the
 * `./platform/*` adapters (a `.native.ts` variant is resolved by Metro on
 * React Native).
 *
 * Deep imports (e.g. `@primedex/core/api/rest`, `@primedex/core/lib/badges`)
 * remain available for tree-shaking; this barrel only re-exports the
 * collision-free essentials.
 */
export * from './types/pokemon';
export * from './types/tcg';
export * from './types/dashboard';

export * from './store/primedex';
export * from './store/sync-access';

// Historical path retained so existing consumers keep their persisted-state contract.
export * from './supabase/sync-state';
export * from './neon/client';
export * from './neon/useNeonSync';

export { default as apiClient, graphqlClient } from './api/client';
