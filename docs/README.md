# Lunidex technical guides

This directory contains implementation notes and reusable engineering guides extracted from the real architecture of [Lunidex](https://lunidex.app), an open-source Pokémon workspace built with Next.js, PokéAPI, TCGdex, Neon, and shared web/mobile packages.

These guides are intentionally practical: they document decisions that are easy to get wrong when building Pokémon tools, especially around upstream API reliability, TCG image handling, localization, caching, and data normalization.

## Guides

- [Pokémon TCG data sources and integration notes](./pokemon-tcg-data-sources.md)
- [Integrating TCGdex with Next.js](./tcgdex-nextjs-integration.md)
- [Building a Pokédex with PokéAPI](./building-a-pokedex-with-pokeapi.md)
- [Internationalizing a Pokémon application](./pokemon-i18n-guide.md)

## Relevant Lunidex implementation

- [`src/lib/api/tcg.ts`](../src/lib/api/tcg.ts) — TCGdex client, filtering, normalization, retries, language fallbacks, and image handling.
- [`src/lib/api/client.ts`](../src/lib/api/client.ts) — PokéAPI REST and GraphQL clients.
- [`src/lib/i18n`](../src/lib/i18n) — web translations.
- [`packages/core/src`](../packages/core/src) — shared web/mobile contracts and API helpers.

## Project links

- Live app: https://lunidex.app
- Source: https://github.com/teefloo/Lunidex

Lunidex is an unofficial, non-commercial fan project and is not affiliated with or endorsed by Nintendo, Game Freak, Creatures, or The Pokémon Company.
