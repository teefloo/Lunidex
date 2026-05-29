# Code Conventions

## Tailwind CSS

- **v4 only**: Use `@import "tailwindcss"`, `@theme`, and `@custom-variant dark`.
- Do not use v3 `tailwind.config.js`.

## Imports

- Use `@/` for internal imports (maps to `src/`).
- All API calls go through `@/lib/api/` barrel export.

## i18n

- User-facing strings come from `t()` in `@/lib/i18n`.
- Server code uses `server-i18n.ts`; client code uses `i18n.ts`.

## State Management

- Zustand stores IDs and primitives only; persisted via `idb-keyval`.
