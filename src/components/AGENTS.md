# Web components guide

This guide supplements `src/AGENTS.md` for reusable UI under `src/components/`. `src/components/tcg/AGENTS.md` adds rules for the TCG feature.

## Component boundaries

- Prefer Server Components for static composition. Add `'use client'` only to the component that needs hooks, browser APIs, event handlers, animations, or local state.
- Keep route orchestration in `src/app` and domain-heavy calculations/API normalization in `src/lib`; components should receive focused props or use established hooks.
- Reuse `src/components/ui`, the `base-nova` shadcn primitives, `cn()`, and the Tailwind 4 patterns in `src/app/globals.css` before adding a primitive or dependency.
- Use `next/image` with meaningful alt text and keep remote hosts in `next.config.ts`. Localize reusable UI through `@/lib/i18n`; do not add language-specific labels directly in a component.

## Interaction and performance

- Select individual Zustand values rather than subscribing to an entire store where practical. Fetch through TanStack Query and `@/lib/api`, not ad hoc requests in presentational components.
- Use `next/dynamic` for expensive browser-only charts, editors, or visualizations when the surrounding feature follows that pattern.
- Preserve SSR-safe initial output, visible keyboard focus, touch-sized controls, and meaningful error/loading states. New animation must be purposeful, interruptible, and reduced-motion aware.

## Verification

Run the web lint and type-check from the repository root after component changes:

```bash
npm run lint
npm run typecheck
```
