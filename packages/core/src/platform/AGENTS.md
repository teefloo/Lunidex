# Core platform adapters

This directory is the only platform-specific seam for the shared core package. Each browser adapter has a matching native adapter that Metro resolves for Expo.

## Rules

- Keep the public exports and behavior contracts of `*.ts` and `*.native.ts` pairs equivalent. The web variants use browser APIs such as IndexedDB and `NEXT_PUBLIC_*` environment variables; native variants use AsyncStorage and `EXPO_PUBLIC_*` variables where applicable.
- Do not import React Native or branch on `Platform.OS` in shared domain, API, or store logic. Put a platform difference in a paired adapter instead.
- Preserve the filenames and extension-based resolution. Do not import `.native` files explicitly from shared code, and do not remove an adapter because the web compiler does not use it.
- Keep adapters small and dependency direction clear: platform code may implement a shared contract, but domain code must not depend on a concrete platform.

## Verification

After changing an adapter or its contract, run both consumers from the repository root:

```bash
npx tsc --project packages/core/tsconfig.json --noEmit
npm run typecheck
npm run typecheck --workspace=@primedex/mobile
```
