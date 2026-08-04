# Lunidex Mobile Guide

This directory contains the Lunidex Expo 53 / React Native mobile application. It owns mobile screens, navigation, native presentation, and platform configuration; it reuses `@primedex/core` for business logic instead of duplicating web behavior.

Lunidex is the visible product name. Keep `@primedex/core`, `@primedex/mobile`, Expo schemes, bundle identifiers, deep-link slugs, and other `primedex-*` identifiers unchanged unless an explicit migration covers published builds and persisted data.

## Architecture

- Screens and Expo Router routes live in `app/`; mobile UI components, hooks, providers, and theme code live in `src/`.
- Import shared APIs, types, store logic, Neon helpers, and i18n bundles from `@primedex/core`. Do not copy web utilities into mobile.
- `metro.config.js` watches the repository root and resolves hoisted workspace dependencies. Keep the workspace alias and core package imports working when adding files.
- Platform-specific seams live in `packages/core/src/platform`: `.ts` serves web and `.native.ts` serves Expo. Do not introduce platform checks into shared business logic.
- Mobile persistence uses AsyncStorage and Neon Auth uses the public `EXPO_PUBLIC_NEON_AUTH_URL` plus the public application URL. Secrets and database connection strings must never ship in the app.
- The shared i18n data supports the eight web locales: English, French, Spanish, German, Italian, Japanese, Korean, and Chinese.

## UI conventions

- Use the established Expo components (`expo-image`, `expo-status-bar`, safe-area handling) and the mobile theme providers.
- Keep screens responsive to small phones and large devices, preserve accessible labels, and use the shared locale and theme state.
- When a mobile feature is not yet at web parity, add the screen-specific UI here while keeping reusable data and domain logic in `packages/core`.

## Commands

Run from the repository root:

```bash
npm run start --workspace=@primedex/mobile
npm run typecheck --workspace=@primedex/mobile
npm run lint --workspace=@primedex/mobile
```

For accounts and cloud sync, copy `apps/mobile/.env.example` to `apps/mobile/.env` and provide only the public Neon Auth/application URLs. The app remains local-first when they are absent.
