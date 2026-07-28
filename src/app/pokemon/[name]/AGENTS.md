@../../../../AGENTS.md

# app/pokemon/[name]/

Dynamic App Router route for detailed Pokémon profiles, including stats, evolutions, forms, moves, locations, and interactive collection actions.

## Key Files
- `page.tsx`: Main entry for the dynamic Pokémon detail page.
- `PokemonDetailClient.tsx`: Client-side component for interactive elements like toggles and tabs.
- `layout.tsx`: Route-level metadata and JSON-LD for the Pokémon profile.
- `opengraph-image.tsx`: Dynamically generated Open Graph images for each Pokémon.
- `error.tsx`: Client-side error state for failed route rendering.

## Rules
- **Data and hydration:** Fetch the critical Pokémon, species, localized, and encounter data in the server `page.tsx`, then pass it as initial data to `PokemonDetailClient` to avoid hydration mismatches.
- **Client data:** Use the centralized exports from `@/lib/api` and TanStack Query for follow-up detail, type-relation, and ability requests.
- **SEO:** Keep the dynamic `generateMetadata`, canonical locale URLs, JSON-LD, and per-Pokémon Open Graph image aligned when the route changes.
- **Localization:** Keep user-facing strings behind the established i18n helpers and preserve locale-aware internal links.
