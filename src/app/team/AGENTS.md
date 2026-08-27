# Team Builder route guide

This guide supplements the App Router guides for `src/app/team/`.

- `page.tsx` is an interactive client route backed by the web `usePrimeDexStore`. Keep the team capped at 6 Pokémon and use store actions rather than mutating arrays in components.
- Keep type coverage, defensive/offensive analysis, and synergy calculations in `@/lib/team-analysis` or other focused helpers. Use the established API façade/TanStack Query patterns for Pokémon details and type relations.
- Preserve the parallel detail queries, responsive analysis panels, accessible controls, and existing animation behavior when changing the UI. Keep share/import/export logic separate from visual composition.
- `share/page.tsx` sanitizes the team code, emits localized no-index metadata, and redirects humans to `/team?code=...`; preserve that boundary and locale-aware URLs.
- Keep `layout.tsx` metadata, breadcrumbs, JSON-LD, and the historical `usePrimeDexStore`/persistence identifiers aligned with the route.

Also run the root web checks after behavioral or route changes.
