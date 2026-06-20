/**
 * Public surface of @primedex/core — the platform-agnostic business logic
 * shared by the web (Next.js) and mobile (Expo) apps.
 *
 * UI-free: data types, the Zustand store, API clients, the Supabase layer and
 * pure helpers. Persistence and Supabase credentials are injected through the
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

export * from './supabase/client';
export * from './supabase/sync-state';
export * from './supabase/useSupabaseSync';

export { default as apiClient, graphqlClient } from './api/client';
