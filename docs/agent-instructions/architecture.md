# Architecture Guidelines

## Next.js Patterns

- **App Router** with RSC by default. Use `"use client"` only at interaction leaves.
- `src/*/AGENT.md` files override the root AGENTS.md for their subtree.
- `Header` is rendered per-page, not in the root layout.
- Heavy components (`EvolutionChain`, `AdvancedInfo`) use `next/dynamic`.
- Keep SSR and client markup stable; use `useMounted` for browser-only branching.
- Use `next/image`; no `<img>`.

## Domain Types

`src/types/pokemon.ts` is the source of truth for all domain types.

## Component Libraries

- shadcn/ui style is `base-nova`; some primitives come from `@base-ui/react`.
- Agentation dev tool runs on port 4747 (enabled via `NEXT_PUBLIC_ENABLE_AGENTATION`).
