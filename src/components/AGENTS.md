# Web Components Guide

This directory contains reusable Lunidex UI, feature components, layout primitives, and client interaction leaves.

## Component boundaries

- Prefer server components for static composition. Add `'use client'` only to the component that needs hooks, browser APIs, animations, or local state.
- Reuse the existing `src/components/ui` primitives and the `base-nova` shadcn style before introducing a new primitive or dependency.
- Keep domain-heavy calculations in `src/lib` and keep route orchestration in `src/app`; components should receive focused props or use the established hooks.
- Use `cn()` for class composition and follow the existing Tailwind v4 patterns in `src/app/globals.css`.
- Use `next/image` for web images with meaningful alt text. Every icon-only button or control needs an accessible name and visible keyboard behavior.
- Keep user-facing text localized through `@/lib/i18n`; do not hard-code a new language-specific label in a reusable component.

## Interaction and performance

- Select individual Zustand values rather than subscribing to an entire store when practical.
- Use TanStack Query defaults and the centralized API façade. Do not add ad hoc `fetch` calls to presentational components.
- Load expensive charts, editors, and browser-only visualizations with `next/dynamic` when the surrounding feature follows that pattern.
- Preserve SSR-safe initial output. Use `useMounted` or a stable derivation when browser state could cause a hydration mismatch.
- Keep animations purposeful, interruptible, and accessible. Respect reduced-motion behavior when adding custom motion.

## Tests

Place component tests beside the implementation or in a nearby `__tests__` directory. Use Testing Library, mock `next/navigation`, `next/image`, and complex UI primitives when that keeps the test focused, then run:

```bash
npm run test -- --run
```
