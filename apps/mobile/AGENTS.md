# PrimeDex Mobile Guide

This directory contains the Expo 53 / React Native mobile application. It owns mobile screens, navigation, native presentation, and platform configuration; it reuses `@primedex/core` for business logic instead of duplicating web behavior.

## Architecture

- Screens and Expo Router routes live in `app/`; mobile UI components, hooks, providers, and theme code live in `src/`.
- Import shared APIs, types, store logic, Supabase helpers, and i18n bundles from `@primedex/core`. Do not copy web utilities into mobile.
- `metro.config.js` watches the repository root and resolves hoisted workspace dependencies. Keep the workspace alias and core package imports working when adding files.
- Platform-specific seams live in `packages/core/src/platform`: `.ts` serves web and `.native.ts` serves Expo. Do not introduce platform checks into shared business logic.
- Mobile persistence uses AsyncStorage and Supabase variables use `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Secrets and service-role keys must never ship in the app.

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

For accounts and cloud sync, copy `apps/mobile/.env.example` to `apps/mobile/.env` and provide only the public Expo Supabase variables. The app remains local-first when they are absent.
