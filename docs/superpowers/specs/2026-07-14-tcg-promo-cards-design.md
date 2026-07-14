# TCG promo card visibility

## Goal

Make Pokémon TCG promo cards discoverable in both the cards shown on Pokémon detail pages and the main TCG catalog. Promo cards must remain normal catalog cards, with the existing `Promo` rarity filter and `wPromo` variant semantics preserved.

## Approach

Fix the shared web TCG API layer rather than adding display-specific logic:

- paginate Pokémon-name searches until TCGdex has no further results, so promo cards are not lost after the first 100 results;
- keep promo-capable cards when normalizing card results and expose `Promo` in set rarity options when the set contains a promo variant;
- keep catalog filtering local and canonicalized through the existing rarity helpers;
- mirror the API behavior in `packages/core` so web and mobile share the same data contract.

## Data flow

`PokemonCards` calls `getPokemonCards`, which will fetch every matching Pokémon card page, normalize the cards, and hydrate their details. `TCGResearchDesk` continues to call `searchCards`; selecting a promo-capable set or the `Promo` rarity will use the same normalized card data and local rarity matcher.

## Testing

Add pure regression coverage for pagination termination and promo rarity matching. Keep the tests independent of the live TCGdex service; network behavior is represented by deterministic page fixtures.

## Error handling and compatibility

Existing cache keys will be versioned so stale truncated results are not reused. Existing abort, retry, language fallback, and empty-result behavior remain unchanged. No component-level filtering or new dependency is required.
