# Shared core package guide

This guide supplements the repository guide for `packages/core/`. `@primedex/core` is the shared workspace package consumed by the Next.js web app and Expo mobile app. It contains API clients, domain types, the shared Zustand store, i18n data, pure helpers, Neon integrations, and compatibility sync modules.

## Package boundaries

- Keep domain logic, API normalization, types, and persistence contracts portable between browser and React Native. The Neon auth providers are explicit React integrations; keep unrelated shared helpers UI-independent.
- Use `packages/core/src/types` as the shared data-model source of truth. Coordinate deliberate type changes with both web and mobile consumers.
- Put external data access in `src/api`, pure calculations and normalization in `src/lib`, persistence/environment seams in `src/platform`, and Neon integrations in `src/neon`.
- `src/supabase` is a retained compatibility path for the user-state sync implementation and exports. Do not rename it or assume it represents the current authentication provider.
- Export public functionality through `src/index.ts`. Use deep imports only through the package export map (`@primedex/core/*`). Do not reach into an unsupported path.
- Keep paired web/native platform adapters contract-compatible. The platform-specific rules are in `src/platform/AGENTS.md`.
- Store compact IDs, primitives, and small user-owned records; do not persist complete remote API responses. Keep Zustand updates immutable.

## Verification

Run from the repository root:

```bash
npx tsc --project packages/core/tsconfig.json --noEmit
npx vitest run packages/core/src/api/tcg.test.ts
npm run test -- --run
```

Use a focused test while iterating. When changing an exported type, API client, platform adapter, store shape, or Neon contract, run the web and mobile type-checks that consume it as well:

```bash
npm run typecheck
npm run typecheck --workspace=@primedex/mobile
```

Do not add a second package manager or lockfile; the package uses the root `package-lock.json`.
