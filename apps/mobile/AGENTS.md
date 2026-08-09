# Mobile workspace guide

This guide supplements the repository guide for `apps/mobile/`. The app is an Expo 57 / React Native 0.86 workspace named `@primedex/mobile` and uses Expo Router. It shares business logic with the web app through `@primedex/core`.

## Boundaries

- Expo Router screens and routes live in `app/`; mobile components, hooks, providers, and theme code live in `src/`.
- Import shared API clients, types, store logic, platform-neutral helpers, Neon helpers, and i18n data from `@primedex/core`. Do not copy web utilities or create a second domain implementation in this app.
- `metro.config.js` watches the repository root and resolves both the app and hoisted workspace `node_modules`. Preserve that workspace resolution when changing Metro or Babel configuration.
- Platform differences belong in `packages/core/src/platform`. Metro resolves `*.native.ts` over the default `*.ts`; do not add `Platform.OS` branches to shared business logic or import a native adapter explicitly.

## Native compatibility and data

- Keep the `primedex` Expo slug and scheme, `com.primedex.app` bundle/package identifiers, deep-link paths, and `@primedex/*` package names unchanged unless the task includes a migration for published builds and persisted data.
- Persistence uses the shared store with AsyncStorage. Check `_hasHydrated` before rendering decisions that depend on persisted state.
- Neon Auth and cloud sync are optional. Only `EXPO_PUBLIC_NEON_AUTH_URL` and `EXPO_PUBLIC_APP_URL` are public app variables; secrets and database connection strings must never ship in the bundle. Without them, the app remains local-first.
- Keep the eight supported locales (`en`, `fr`, `es`, `de`, `it`, `ja`, `ko`, `zh`) aligned with the shared core bundles and the web locale list.

## UI conventions

- Use the established Expo components and providers, including `expo-image`, `expo-status-bar`, safe-area handling, theme, and locale state.
- Keep screens usable on small phones and larger devices. Preserve accessible labels, keyboard/switch behavior where applicable, and platform-appropriate touch targets.
- Add screen-specific UI here when a feature is not yet at web parity, but keep reusable data and domain logic in `packages/core`.

## Commands

Run workspace commands from the repository root:

```bash
npm run start --workspace=@primedex/mobile
npm run typecheck --workspace=@primedex/mobile
npm run lint --workspace=@primedex/mobile
```

The package also exposes `android`, `ios`, and `web` Expo scripts. Use them only for local device/simulator work; no mobile deployment command is part of this repository's scripts.
