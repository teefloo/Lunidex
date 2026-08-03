# Shared Core Package Guide

`@primedex/core` is Lunidex's platform-neutral workspace package, shared by the Next.js web app and the Expo mobile app. It contains API clients, domain types, the shared Zustand store, i18n data, pure helpers, and Supabase utilities.

Lunidex is the user-facing brand. Do not rename the historical package name `@primedex/core`, its import paths, or related `primedex-*` persistence identifiers without an explicit compatibility migration.

## Package boundaries

- Keep business logic UI-free and portable between browser and React Native. Do not add `Platform.OS` branches or React Native imports to shared domain modules.
- Export public functionality through `packages/core/src/index.ts`; use documented deep imports only when the export map supports them.
- Treat `packages/core/src/types` as the shared data-model source of truth. Coordinate deliberate type changes with both web and mobile consumers.
- External API access belongs in `src/api`; pure helpers belong in `src/lib`; persistence and environment differences belong only in `src/platform`.
- The default `platform/*.ts` adapters serve web builds. Metro resolves matching `platform/*.native.ts` adapters for Expo. Keep the adapter contracts equivalent.
- Shared state must not hold complete remote API blobs. Store IDs, primitives, and small user-owned records, and keep Zustand actions immutable.

## Dependencies and verification

- Use npm and the root `package-lock.json`; do not add another package manager or lockfile.
- Type-check the package with:

```bash
npx tsc --project packages/core/tsconfig.json --noEmit
```

- Package tests use the repository Vitest setup. Run focused tests while iterating and the full suite before handoff:

```bash
npx vitest run packages/core/src/path/to/file.test.ts
npm run test -- --run
```

- When changing an exported type, platform adapter, API client, or store shape, also run the web and mobile type-checks as applicable.
