# TCG component guide

This guide applies only to `src/components/tcg/` and supplements `src/components/` and `src/app/tcg/`.

- Keep API access in `@/lib/api/tcg` and feature calculations in `@/lib/tcg-*`; presentational components should receive focused props or use the established query/store hooks.
- `TCGResearchDesk` owns URL-synchronized filters and infinite catalog queries. Preserve server-provided initial data, mounted/hydration guards, locale-aware query keys, and ownership/wishlist filtering when changing it.
- TCG ownership, wishlist, saved searches, notes, decks, and comparisons use compact web-store identifiers. Use store actions and individual selectors; do not put hydrated card responses into persistence.
- Keep card/image fallback behavior through `getTCGCardImageCandidates` and `next/image`. Do not add a remote image host without updating the deliberate Next.js image/CSP configuration.
- Reuse `TCGCardItem`, `TCGHolographicCard`, existing UI primitives, `cn()`, and `useTranslation`. Keep every card action keyboard/touch accessible and every icon-only control named.
- Preserve `next/dynamic` boundaries for the card detail modal and filters when they are browser-only or expensive. New animation must remain non-critical and respect reduced motion.

Run the root web checks after changing these components:

```bash
npm run lint
npm run typecheck
```
