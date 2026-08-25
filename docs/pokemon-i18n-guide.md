# Internationalizing a Pokémon application

Pokémon applications have two localization problems at once: translating the interface and selecting localized data from upstream providers. Treating those as the same concern usually creates gaps and inconsistent fallbacks.

Lunidex currently exposes web UI locales for English, French, Spanish, German, Italian, Japanese, Korean, and Simplified Chinese.

## Separate UI locale from data-provider locale

A user can request a French UI while a specific upstream resource is only available in English.

Model these values separately:

```ts
type LocaleContext = {
  uiLocale: string;
  pokemonDataLocale: string;
  tcgDataLocale: string;
  fallbackLocale: string;
};
```

This makes fallback behavior explicit instead of hiding it inside components.

## Use stable locale-prefixed routes

Lunidex uses locale-prefixed routes such as:

```text
/en/pokedex
/fr/pokedex
/es/pokedex
/de/pokedex
```

This has several advantages:

- a URL has one deterministic language;
- users can share localized pages;
- canonical and alternate-language metadata can be generated predictably;
- server rendering does not need to depend solely on browser language.

An unprefixed entry URL can still redirect to a preferred locale, but the final content URL should remain explicit.

## Keep translations typed and centralized

UI strings should live in locale modules rather than being spread through components.

A useful pattern is to make the default language define the expected shape and require other locales to satisfy it.

```ts
const en = {
  navigation: {
    pokedex: 'Pokédex',
    collection: 'Collection',
  },
};

type Messages = typeof en;
```

Then each locale exports the same `Messages` contract.

This catches missing translation keys during development instead of at runtime.

## Pokémon names are data, not UI copy

Do not hard-code translated Pokémon names in general-purpose UI dictionaries.

PokéAPI species data already distinguishes localized names. Fetch or normalize the provider's localized species names, then apply your fallback policy if a locale is missing.

The same principle applies to:

- genera;
- flavor text;
- abilities;
- moves;
- locations;
- other provider-owned reference data.

UI dictionaries should contain product language such as "Add to collection", not the Pokémon database itself.

## TCG localization needs its own fallback policy

Lunidex consumes TCGdex, whose language coverage does not map one-to-one with the application's UI locales.

The TCG layer therefore resolves its own locale independently. In the current implementation, Chinese TCG content falls back to English, while Japanese and Korean are treated as limited-coverage languages.

The important pattern is:

```text
requested UI locale
      ↓
provider-specific resolver
      ↓
available provider locale
      ↓
English fallback when necessary
```

Do not disable an entire translated interface just because one upstream provider has incomplete coverage.

## Localize asset URLs only when the provider supports it

Some providers encode language in image paths. Lunidex rewrites the language segment only for known TCGdex asset hosts and only when the path structure matches the expected format.

Avoid generic string replacement such as:

```ts
url.replace('/en/', `/${locale}/`)
```

That can modify unrelated URLs or produce paths that do not exist.

Validate the hostname and path shape first.

## Normalize accented and localized filter values

Upstream data can expose category names in different languages or with accents. Search/filter normalization should account for that at the data layer.

For example, an Energy category may appear as `Energy` or a localized equivalent. Normalize it to one domain value before it reaches the UI.

This keeps filters stable when the language changes.

## Design fallbacks deliberately

A localization fallback should answer four questions:

1. What happens when a UI translation key is missing?
2. What happens when PokéAPI lacks the localized field?
3. What happens when TCGdex lacks the requested locale?
4. What happens when an image exists only for another language?

A sensible default for a multilingual reference application is usually:

```text
requested locale → English → neutral/empty state
```

Avoid displaying raw translation keys to users.

## SEO: localized pages need explicit relationships

For public localized pages, generate metadata consistently:

- a canonical URL for the current locale;
- alternate URLs for supported locales;
- localized title and description where possible;
- stable slugs or a reliable mapping strategy;
- no duplicate indexable fallback pages masquerading as separate translations.

If the visible data falls back to English inside a French page, that does not necessarily require redirecting the whole page to English. It is often better to preserve the French application shell and clearly use fallback data for the missing field.

## Web and mobile should share domain language decisions

Lunidex is a monorepo with a Next.js web application and an Expo companion. Shared types and translation/domain contracts live under `packages/core` where possible.

That avoids two platforms independently deciding:

- how locales are named;
- what fallback language to use;
- how upstream data is normalized;
- which translation keys exist.

Platform-specific UI strings can still be separate when the experiences differ.

## Recommended boundary

```text
route locale
   ↓
UI messages -----------------------┐
   ↓                               │
product interface                  │
                                   │
route locale                       │
   ↓                               │
PokéAPI locale resolver            │
TCGdex locale resolver             │
   ↓                               │
normalized localized domain data --┘
```

## Real implementation

- [`src/lib/i18n`](../src/lib/i18n)
- [`packages/core/src/i18n`](../packages/core/src/i18n)
- [`src/lib/api/tcg.ts`](../src/lib/api/tcg.ts)
- [`src/proxy.ts`](../src/proxy.ts)
- Live French Pokédex: https://lunidex.app/fr/pokedex
- Source: https://github.com/teefloo/Lunidex

Lunidex is an independent, unofficial fan project. Pokémon names, trademarks, artwork, imagery, game data, and related intellectual property belong to their respective rights holders. Lunidex is not affiliated with, endorsed by, sponsored by, or officially connected with Nintendo, Creatures Inc., GAME FREAK inc., or The Pokémon Company.
