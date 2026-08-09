# TCG route guide

This guide applies to the Pokémon TCG routes under `src/app/tcg/` and supplements the App Router guide. Shared TCG components have an additional guide in `src/components/tcg/AGENTS.md`.

## Route/data boundaries

- The catalog page is a Server Component that provides an initial TCGdex catalog and localized labels, then hands interaction to `TCGResearchDesk`. It currently uses `revalidate = 3600` and a bounded server-side initial request; preserve the graceful empty catalog fallback.
- Client search, filters, sort, view mode, and comparison state are serialized into the URL by the existing TCG research helpers. Keep those query parameters stable and use `useLocaleHref` for internal links.
- Collection, wishlist, and deck-builder screens read user-owned state from the web store. Persist compact card/set IDs and small records only; remote card/set payloads belong in query/cache data.
- Use `@/lib/api/tcg` for TCGdex access and normalization. It resolves unsupported Chinese TCGdex requests to English and exposes limited-language behavior for Japanese/Korean; preserve those fallbacks and the localized image candidates.
- Dynamic set/card routes must keep their current validation, `notFound()` behavior, canonical/alternate metadata, and route-specific indexing policy. Do not make personalized collection pages publicly cacheable.

## Verification

When changing a TCG route, update focused tests for URL state, collection calculations, card rendering, or metadata as applicable. Useful checks from the repository root include:

```bash
npx vitest run src/lib/tcg-collection.test.ts
npx vitest run src/components/tcg/TCGResearchDesk.test.tsx
npm run lint
npm run typecheck
npm run test -- --run
```
