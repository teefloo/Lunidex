# Shared domain package guide

This guide supplements the repository guide for `packages/core/`. `@primedex/core` is a private workspace package consumed by the web application for portable domain types and pure helpers, including TCG collection rules and the sealed-product ledger.

## Package boundaries

- Keep domain types, normalization, and pure business rules independent of web UI and server integrations.
- Web routes, API clients, persistence, authentication, and UI belong under `src/`.
- Export reusable package functionality through `src/index.ts` or the supported deep-import export map (`@primedex/core/*`). Do not reach into unsupported paths.
- Keep persisted identifiers and serialized data contracts deliberate; changes may affect the web app's IndexedDB or server-backed user state.

## Verification

Run from the repository root after changing this package:

```bash
npx tsc --project packages/core/tsconfig.json --noEmit
npm run typecheck
npx vitest run packages/core/src
```

Do not add a second package manager or lockfile; the package uses the root `package-lock.json`.
