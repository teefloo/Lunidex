# Pokémon detail route guide

This guide supplements the App Router guides for `src/app/pokemon/[name]/`.

- `page.tsx` resolves the dynamic name and locale, fetches the critical Pokémon, species, localized data, and encounters on the server, then passes them as initial props to `PokemonDetailClient`.
- Keep follow-up detail, abilities, and type-relation requests on the centralized `@/lib/api` / TanStack Query path. Do not move server-only data fetching into the client leaf without preserving the current hydration behavior.
- Preserve the non-canonical-name redirect, `notFound()` behavior, and the request-time language resolution used by the page.
- `layout.tsx` and the page metadata must stay aligned with the route's canonical locale URL, eight-language alternates, breadcrumbs, JSON-LD, and Pokémon Open Graph image routes.
- Keep user-facing strings behind the established i18n helpers and internal links locale-aware.

When changing this route, run the root web checks from `src/AGENTS.md`; no route-local test command is declared here.
