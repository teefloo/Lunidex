# Pokémon TCG data sources and integration notes

Lunidex uses [TCGdex](https://tcgdex.dev/) as its primary Pokémon Trading Card Game data source. This note documents the integration choices that matter in practice when consuming public TCG data in a production web application.

The relevant implementation lives in [`src/lib/api/tcg.ts`](../src/lib/api/tcg.ts).

## Why normalize upstream data

A public API should be treated as an upstream dependency, not as your application's domain model.

Lunidex maps TCGdex responses into its own `TCGCard` and `TCGSet` types before rendering them. This gives the application one stable contract even when upstream fields differ between eras, languages, or endpoints.

Examples handled by Lunidex include:

- `effect`, `description`, and `flavorText` fallbacks;
- `retreat` versus `retreatCost`;
- ability and attack text normalization;
- category aliases such as localized Trainer/Energy values;
- set totals exposed through different shapes;
- image paths that may or may not include file extensions.

Keeping those compatibility rules in the API layer prevents UI components from accumulating one-off checks.

## Client configuration

Lunidex uses the TCGdex v2 API:

```ts
const tcgClient = axios.create({
  baseURL: 'https://api.tcgdex.net/v2',
  timeout: 30_000,
});
```

The client retries network/idempotent failures and HTTP `429` responses with exponential backoff.

```ts
axiosRetry(tcgClient, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) =>
    axiosRetry.isNetworkOrIdempotentRequestError(error) ||
    error.response?.status === 429,
});
```

The important part is not Axios specifically. The useful pattern is:

1. set a finite timeout;
2. retry only requests that are safe to retry;
3. handle rate limiting explicitly;
4. keep retry logic centralized.

## Pagination

Do not fetch an entire card catalog just to render one page.

Lunidex sends pagination and sort parameters upstream and requests one extra item (`limit + 1`) to determine whether another page exists without needing a separate count request.

That keeps the initial payload bounded and makes catalog pages scale better as the card database grows.

## Language support is not binary

A UI locale being supported does not guarantee that every upstream Pokémon TCG record exists in the same language.

Lunidex currently exposes these application locales:

```text
en, fr, es, de, it, ja, ko, zh
```

Its TCG layer treats Chinese as unavailable upstream and falls back to English, while Japanese and Korean are marked as limited because coverage can vary.

The general rule is to separate:

- **application locale** — menus, buttons, help text;
- **upstream content locale** — card names, sets, descriptions, images;
- **fallback locale** — what is shown when upstream localized data is missing.

Do not silently assume those three values are always identical.

## TCG image URLs need defensive handling

TCG APIs often expose artwork paths rather than conventional static file URLs.

Lunidex handles several cases:

- existing `.png`, `.jpg`, `.webp`, or `.svg` URLs are preserved;
- TCGdex card image paths can resolve without extensions;
- set logos and symbols may require `.png`;
- asset URLs can contain a language segment that needs localization;
- some legacy sets expose insufficient metadata to safely synthesize an image URL.

A key lesson: do not blindly append an image extension to every asset URL. Card artwork and set assets can follow different URL conventions.

## Abort work that is no longer needed

Catalog filters and searches can trigger overlapping requests. Lunidex accepts an `AbortSignal` in TCG operations and checks for cancellation before expensive follow-up work such as resolving missing images.

That matters when a user types quickly, changes a set filter, or navigates away before a request completes.

## Cache at the API boundary

Lunidex imports centralized cache helpers in its TCG API layer rather than letting every component invent its own caching strategy.

This makes it easier to reason about:

- freshness;
- retries;
- duplicated requests;
- server/client behavior;
- future changes to upstream APIs.

## Keep derived collection data separate

Upstream card metadata and user collection state are different concerns.

Lunidex keeps card normalization separate from collection-specific functions such as converting cards to collection entries and aggregating collection values. That avoids coupling an upstream API response to authentication or persistence logic.

## Recommended architecture

```text
TCGdex
  ↓
HTTP client
  ↓
retry / timeout / cancellation
  ↓
normalization + locale fallback
  ↓
application TCG types
  ↓
cache/query layer
  ↓
UI + collection features
```

This extra boundary looks like more code initially, but it removes a large amount of conditional logic from the rest of the application.

## See it in a real project

Lunidex uses this architecture in its live Pokémon TCG catalog and collection workspace:

- https://lunidex.app/en/tcg
- https://github.com/teefloo/Lunidex/blob/master/src/lib/api/tcg.ts

Lunidex is an independent, unofficial fan project. Pokémon names, trademarks, artwork, imagery, game data, and related intellectual property belong to their respective rights holders. Lunidex is not affiliated with, endorsed by, sponsored by, or officially connected with Nintendo, Creatures Inc., GAME FREAK inc., or The Pokémon Company.
