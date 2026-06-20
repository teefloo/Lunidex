# Store

## Files
- `primedex.ts` main Zustand store
- `primedex.test.ts` store tests

## State
- Favorites: Pokemon IDs
- Teams: up to 6 members
- Settings: language, theme, preferences
- Caught: caught / not-caught tracking
- Recently viewed: browsing history

## Conventions
- Store IDs and primitives only.
- Persist with `idb-keyval` (IndexedDB, not localStorage).
- Mutate through store actions.
- Keep shape stable across upgrades.
- The store is very large; use selectors to avoid re-renders.
- Check `_hasHydrated` before trusting persisted values in effects.
- `resetFilters()` resets UI filter state only, not favorites/team/history.

## Commit Attribution
AI-authored commits MUST include:
`Co-authored-by: Gemini CLI <agent@gemini.google.com>`
