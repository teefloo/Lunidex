# Integrating TCGdex with Next.js

This guide extracts the production patterns used by [Lunidex](https://lunidex.app) to consume TCGdex from a Next.js application.

It is not a wrapper library. The goal is to show the boundary you usually need around a public Pokémon TCG API: retries, cancellation, pagination, normalization, localization, and defensive image handling.

## 1. Create one upstream client

Keep the TCGdex base URL and transport policy in one module.

```ts
import axios from 'axios';
import axiosRetry from 'axios-retry';

const tcgClient = axios.create({
  baseURL: 'https://api.tcgdex.net/v2',
  timeout: 30_000,
});

axiosRetry(tcgClient, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) =>
    axiosRetry.isNetworkOrIdempotentRequestError(error) ||
    error.response?.status === 429,
});
```

Centralizing this avoids different pages choosing different timeouts or retry behavior.

## 2. Use application types, not raw responses everywhere

Create types that describe what your UI needs and translate raw API responses once.

```ts
type Card = {
  id: string;
  name: string;
  category?: 'Pokemon' | 'Trainer' | 'Energy' | string;
  image?: string;
  description?: string;
  retreatCost?: number;
};
```

Then normalize raw values:

```ts
function normalizeCategory(value?: string) {
  const category = value?.trim().toLowerCase();

  if (category === 'pokemon') return 'Pokemon';
  if (category === 'trainer' || category === 'dresseur') return 'Trainer';
  if (category === 'energy' || category === 'energie') return 'Energy';

  return value;
}
```

This is preferable to teaching every React component about upstream aliases.

## 3. Push filtering and pagination upstream

For a large TCG catalog, avoid downloading thousands of records and filtering them in the browser.

A simplified pattern used by Lunidex is:

```ts
const params = new URLSearchParams();

params.set('pagination:page', String(page));
params.set('pagination:itemsPerPage', String(limit + 1));
params.set('sort:field', 'id');
params.set('sort:order', 'ASC');

if (searchTerm) params.set('name', `like:${searchTerm}`);
if (setId) params.set('set.id', setId);
```

Requesting `limit + 1` lets the application infer `hasNextPage` without another request.

## 4. Pass `AbortSignal` through the data layer

Users can change filters faster than a remote API responds.

```ts
function getWithOptionalSignal<T>(url: string, signal?: AbortSignal) {
  return signal
    ? tcgClient.get<T>(url, { signal })
    : tcgClient.get<T>(url);
}
```

Cancellation prevents obsolete searches from continuing expensive follow-up work.

## 5. Treat localization as a fallback chain

Lunidex supports several UI languages while TCGdex coverage differs by locale.

A simplified resolver:

```ts
const supported = ['en', 'fr', 'es', 'de', 'it', 'ja', 'ko', 'zh'] as const;
const unavailableForTcg = new Set(['zh']);

function resolveTcgLocale(locale: string) {
  const normalized = supported.includes(locale as any) ? locale : 'en';
  return unavailableForTcg.has(normalized) ? 'en' : normalized;
}
```

Do not couple application translation support to data-provider coverage.

## 6. Be careful with image paths

TCGdex artwork and set assets can use different conventions.

A defensive implementation should distinguish card images from set logos/symbols instead of globally appending `.png`.

```ts
function normalizeAssetUrl(url?: string) {
  if (!url) return undefined;

  if (/\.(png|jpg|webp|svg)$/.test(url)) return url;

  if (url.endsWith('/logo') || url.endsWith('/symbol')) {
    return `${url}.png`;
  }

  return url;
}
```

For legacy data, prefer showing a placeholder over synthesizing a URL when the metadata is not sufficient to know that the asset exists.

## 7. Normalize variant fields once

Different card generations can expose semantically similar data under different fields.

Lunidex handles examples such as:

```ts
const normalized = {
  ...card,
  effect: card.effect ?? card.flavorText ?? card.description,
  description: card.description ?? card.flavorText,
  retreat: card.retreat ?? card.retreatCost,
  retreatCost: card.retreatCost ?? card.retreat,
};
```

This makes the rest of the application work against one predictable shape.

## 8. Keep collection state out of the provider model

A card from TCGdex is public reference data. Whether the current user owns it, wants it, has notes on it, or added it to a deck is application state.

Keep those layers separate:

```text
TCGdex card metadata
        ↓
normalized Card
        ↓
collection/deck projection
        ↓
user persistence
```

That separation makes it possible to swap or supplement data providers later without rewriting user-state code.

## 9. Cache deliberately

There are several valid cache layers in a Next.js app:

- HTTP/provider cache headers;
- server-side request caching;
- TanStack Query/SWR on the client;
- an application cache for expensive normalized results.

Choose ownership explicitly. Avoid stacking caches with unrelated TTLs until nobody knows why stale data is appearing.

Lunidex centralizes its TCG cache behavior near the API layer and uses query tooling above it for UI request state.

## 10. Recommended folder boundary

```text
src/
  lib/
    api/
      tcg.ts          # TCGdex client and requests
    tcg-images.ts     # image-specific helpers
    tcg-rarity.ts     # domain normalization
  types/
    tcg.ts            # application contracts
  components/
    tcg/              # rendering only
```

The exact filenames do not matter. The separation does.

## Real implementation

The complete Lunidex implementation is available here:

- [`src/lib/api/tcg.ts`](../src/lib/api/tcg.ts)
- [`src/types/tcg.ts`](../src/types/tcg.ts)
- [`src/lib/tcg-images.ts`](../src/lib/tcg-images.ts)
- Live catalog: https://lunidex.app/en/tcg

Lunidex is an unofficial, non-commercial fan project and is not affiliated with or endorsed by Nintendo, Game Freak, Creatures, or The Pokémon Company.
