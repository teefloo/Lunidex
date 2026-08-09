# Type chart route guide

This guide supplements the App Router guides for `src/app/types/`.

- `page.tsx` is intentionally a client component. It queries `getTypeRelations` through the API façade and `getPokemonDetailedByType` through the GraphQL module, then derives the six emblematic Pokémon locally.
- Preserve the selected-type state, loading skeleton, accessible controls, and the dynamically loaded `src/components/pokemon/TypeChart` (`ssr: false`) boundary.
- Keep type names and all visible copy behind `useTranslation`; use locale-aware links for Pokémon detail navigation.
- Keep `layout.tsx` metadata and JSON-LD synchronized with the route. Do not move the interactive chart into server-only code without replacing its loading/error behavior.

Run focused component coverage when changing the chart and then the root web checks:

```bash
npx vitest run src/components/pokemon/TypeChart.test.tsx
npm run lint
npm run typecheck
npm run test -- --run
```
