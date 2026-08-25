# Building a Pokédex with PokéAPI

Lunidex uses PokéAPI as its main source for Pokémon reference data. This guide summarizes the patterns that have proven useful in a production Pokédex rather than a small demo.

The transport layer is implemented in [`src/lib/api/client.ts`](../src/lib/api/client.ts).

## Use one REST client and one GraphQL client

Lunidex keeps both PokéAPI interfaces available:

```ts
export const REST_API_BASE = 'https://pokeapi.co/api/v2';
export const GRAPHQL_API_BASE = 'https://beta.pokeapi.co/graphql/v1beta';
```

REST is convenient for canonical resource endpoints and individual entities. GraphQL is useful when a screen needs a more targeted shape or when reducing several related lookups matters.

Do not force every feature through one interface simply for architectural purity.

## Set finite timeouts

A public dependency can become slow or temporarily unavailable.

Lunidex configures finite timeouts rather than letting requests hang indefinitely:

```ts
const apiClient = axios.create({
  baseURL: REST_API_BASE,
  timeout: 10_000,
});

const graphqlClient = axios.create({
  baseURL: 'https://beta.pokeapi.co',
  timeout: 60_000,
});
```

The GraphQL timeout is intentionally more permissive because query complexity can be higher.

## Retry carefully

Retries are useful for transient network failures and rate limiting, but aggressive retry loops can make an outage worse.

Lunidex uses a small retry budget:

```ts
axiosRetry(apiClient, {
  retries: 1,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) =>
    axiosRetry.isNetworkOrIdempotentRequestError(error) ||
    error.response?.status === 429,
});
```

The practical rule is to retry safe reads, not arbitrary mutations, and always cap the number of attempts.

## Separate provider data from UI models

PokéAPI is rich, but its resource graph is not the same thing as your UI model.

A Pokémon detail screen may combine:

- base Pokémon data;
- species data;
- localized names and flavor text;
- evolution chains;
- abilities;
- moves;
- encounter data;
- sprites/forms;
- derived type information.

Instead of passing raw responses through every component, create a data layer that composes and normalizes the fields needed by the application.

## Avoid accidental N+1 request patterns

A common Pokédex mistake is:

1. fetch a list of 100 Pokémon;
2. make 100 detail requests;
3. make another request for every species;
4. make more requests for abilities or forms.

That becomes slow very quickly and can create unnecessary load on a public API.

Prefer one of these strategies:

- fetch only the fields required for the current list view;
- defer detail-only data until a Pokémon page is opened;
- use GraphQL where it materially reduces request fan-out;
- cache stable reference data;
- batch independent work with a sensible concurrency limit instead of unlimited `Promise.all`.

## Distinguish Pokémon and species

PokéAPI models a `pokemon` resource and a `pokemon-species` resource separately.

That distinction matters for forms and localization. Species-level information is generally the right place for concepts such as localized names, genera, flavor text, evolution chains, and generation metadata, while the Pokémon resource represents battle/form-specific data such as stats and types.

Flattening both concepts into one object too early often causes bugs around regional and alternate forms.

## Keep form identity explicit

A production Pokédex should not assume that a display name uniquely identifies the canonical species.

Preserve IDs and provider slugs internally, then derive presentation labels separately. This is especially useful for:

- Mega Evolutions;
- regional forms;
- gendered forms;
- Gigantamax or special forms;
- form-specific stats/types;
- localized names.

URLs can still be human-readable, but data joins should rely on stable identifiers when possible.

## Cache stable reference data

Most Pokédex reference data changes infrequently.

That makes it a strong candidate for caching, but cache at a deliberate boundary. Useful candidates include:

- Pokémon lists;
- type data;
- abilities;
- evolution chains;
- species localization;
- static sprites/assets.

User state such as favorites, caught status, teams, or notes should not share the same cache policy as public reference data.

## Build localization as a data concern too

Translating interface labels is not enough. Pokémon names, genera, move names, abilities, and flavor text can come from localized upstream records.

A robust localization pipeline should define:

1. the requested application locale;
2. the upstream locale code;
3. a fallback locale;
4. what happens when a localized field does not exist.

See [Internationalizing a Pokémon application](./pokemon-i18n-guide.md) for the approach used by Lunidex.

## SEO and canonical pages

A Pokédex can generate a large number of indexable pages. Avoid treating this as permission to generate thin pages.

Each Pokémon detail route should provide genuine reference value and stable metadata. A useful page can combine:

- canonical Pokémon name and number;
- types and stats;
- abilities;
- evolution context;
- forms;
- moves or encounters where useful;
- localized metadata;
- structured internal links to related tools.

Lunidex exposes individual Pokémon routes such as:

- https://lunidex.app/en/pokemon/pikachu
- https://lunidex.app/fr/pokemon/pikachu

## Recommended architecture

```text
PokéAPI REST / GraphQL
        ↓
central HTTP clients
        ↓
retry + timeout + cancellation
        ↓
resource fetchers
        ↓
normalization/composition
        ↓
cache/query layer
        ↓
Pokédex UI
```

The important part is the normalization boundary. It prevents API-specific quirks from leaking into hundreds of components.

## Real implementation

- [`src/lib/api/client.ts`](../src/lib/api/client.ts)
- [`src/lib/api`](../src/lib/api)
- Live Pokédex: https://lunidex.app/en/pokedex
- Source: https://github.com/teefloo/Lunidex

Lunidex is an unofficial, non-commercial fan project and is not affiliated with or endorsed by Nintendo, Game Freak, Creatures, or The Pokémon Company.
