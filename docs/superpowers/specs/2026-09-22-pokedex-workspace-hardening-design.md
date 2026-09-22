# Pokédex workspace hardening design

**Status:** Approved for implementation by the user on 2026-09-22

## Goal

Make the Lunidex Pokédex and Pokémon detail flow reliable, shareable, accessible, and coherent on mobile and desktop while preserving the existing cobalt field-console visual identity, localized routes, and compatibility-sensitive technical names.

## Problem statement

The audit found several failures across one user journey: list filters and search, catalogue feedback, personal actions, opening a Pokémon, navigating between detail tabs, and returning to the catalogue. The most important failures are the client-only Base UI slider warning, unnamed advanced range controls, stale detail action state, silent account-gated actions, incomplete URL state, loss of catalogue context on return, and a result summary that does not render its counts.

## Design decisions

### 1. Keep the current visual language and data ownership model

The implementation keeps the cobalt console surfaces, existing component primitives, localized copy system, Neon-backed ownership model, and anonymous public browsing. Personal collections remain account-backed; the UI must make that requirement explicit and offer the existing sign-in flow instead of pretending that an action succeeded or silently discarding it.

### 2. Make the catalogue the primary feedback surface

The list sequence becomes:

1. Hero and search.
2. Core and advanced filters.
3. A live, localized result summary.
4. The Pokémon catalogue and its loading/empty/error states.
5. Secondary resource links and Pokémon of the day.

The summary is rendered from explicit `shown` and `total` interpolation values in every supported locale. No automatic scroll is introduced while typing or filtering; the content order itself makes feedback nearby without stealing focus.

### 3. Make URL state a stable public contract

The Pokédex URL continues to use the existing short parameters for search, type, generation, sort, caught mode, and favorites. Advanced filters use compact, validated parameters for legendary/mythical flags, taxonomy selections, stat minimums, and height/weight ranges. Unknown or invalid values are ignored. Serialization is deterministic so share links and browser history remain stable.

Detail tabs use a validated `tab` parameter and replace the current URL when the user changes tabs. The selected tab survives reload and can be shared without changing canonical metadata.

### 4. Preserve catalogue context when opening a detail

Pokémon links carry a validated, same-origin catalogue return target containing the current locale path and query state. The detail back action first uses normal browser history when available and falls back to that return target, then to the locale Pokédex route. The target is never treated as an arbitrary external URL. The catalogue gives its cards stable anchors so the return flow can restore the relevant Pokémon region even when an exact browser scroll position cannot be restored.

### 5. Fix advanced filters as an accessible client boundary

The advanced filter sheet is rendered without the client-only slider pattern that currently causes React to report a script element during rendering. Base UI Slider composition follows the installed API: labelled root/control/track/indicator/thumb structure, explicit thumb indices, localized range labels, and localized value text. The controls remain live-applied, so the footer action is renamed to describe viewing the filtered results rather than implying staged changes.

### 6. Keep derived UI subscribed to derived state

The detail component subscribes to the boolean collection slices it renders (`favorites`, `caughtPokemon`, and `compareList`) in addition to actions. Stable action references are not used as a substitute for reactive state. The signed-out action path opens the existing authentication modal through the existing sync-access bridge, with one actionable notification only when the modal cannot be opened.

### 7. Make caught filtering complete and safe

Caught/uncaught modes use the complete summary catalogue rather than only the currently loaded infinite-page window. If the catalogue request fails, the UI shows the existing error state instead of presenting a false empty result. This keeps the result semantics truthful while preserving pagination for the unfiltered browsing path.

## Error and fallback behavior

- Invalid URL filter values are discarded without breaking the page.
- A malformed or cross-origin return target is ignored and falls back to the localized Pokédex.
- A failed summary request renders the existing retryable error state.
- A signed-out personal action never mutates local state; it opens sign-in or gives a concise sign-in explanation.
- Slider and dynamic-component loading states retain visible, localized status text and do not expose icon-only waiting states to assistive technology.

## Compatibility constraints

- Preserve `Lunidex` visible branding and the historical `primedex`/`@primedex/core` technical identifiers.
- Preserve all eight supported web locales and route prefix behavior.
- Do not introduce a new state library, package manager, lockfile, or network boundary.
- Do not expose Neon/Auth secrets or change authentication ownership semantics.
- Use existing `@/` imports, Base UI primitives, `cn()`, and centralized API access.
- Respect reduced-motion behavior and 44px minimum interactive targets on touch layouts.

## Verification contract

Automated tests will cover deterministic filter URL parsing/serialization, advanced filter validation, tab parsing, and same-origin return-target handling. Browser verification will cover 320px, 375px, 768px, and desktop layouts; search feedback; caught filtering; advanced-filter console cleanliness and labels; signed-out action feedback; detail tab reload/share state; return navigation; keyboard focus; reduced motion; and no horizontal overflow. The final pass will run lint, typecheck, the full Vitest suite, production build, the existing core/mobile checks required by CI, and the Impeccable detector on the changed UI targets.
