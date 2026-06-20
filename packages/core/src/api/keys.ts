import type { TCGCardFilters } from '@/types/tcg';

export const pokemonKeys = {
  all: ['pokemon'] as const,
  lists: () => [...pokemonKeys.all, 'list'] as const,
  list: (filters: { readonly [key: string]: string | number | boolean | null | undefined }) => [...pokemonKeys.lists(), { filters }] as const,
  details: () => [...pokemonKeys.all, 'detail'] as const,
  detail: (name: string, lang: string) => [...pokemonKeys.details(), name, lang] as const,
  species: (name: string, lang: string) => [...pokemonKeys.all, 'species', name, lang] as const,
  summarySlice: (offset: number, limit: number) => [...pokemonKeys.all, 'summary-slice', offset, limit] as const,
  types: () => [...pokemonKeys.all, 'type'] as const,
  type: (type: string) => [...pokemonKeys.types(), type] as const,
  encounters: (id: number) => [...pokemonKeys.all, 'encounters', id] as const,
  names: () => [...pokemonKeys.all, 'names'] as const,
  allDetailed: () => [...pokemonKeys.all, 'all-detailed'] as const,
  allSummary: () => [...pokemonKeys.all, 'all-summary'] as const,
  localized: (name: string, langId: number) => [...pokemonKeys.all, 'localized', name, langId] as const,
  allSearchIndex: () => [...pokemonKeys.all, 'all-search-index'] as const,
  abilities: {
    all: (lang: string) => [...pokemonKeys.all, 'abilities', 'all', lang] as const,
    detail: (name: string, lang: string) => [...pokemonKeys.all, 'abilities', 'detail', name, lang] as const,
    pokemon: (name: string, lang: string) => [...pokemonKeys.all, 'abilities', 'pokemon', name, lang] as const,
  },
  tcg: {
    all: () => ['tcg'] as const,
    cards: (name: string) => [...pokemonKeys.tcg.all(), 'cards', name] as const,
  }
};

export const tcgKeys = {
  all: () => ['tcg'] as const,
  catalog: (filters: TCGCardFilters, language: string, pageSize: number) =>
    [...tcgKeys.all(), 'catalog', language, pageSize, filters] as const,
  card: (cardId: string, language: string) => [...tcgKeys.all(), 'card', cardId, language] as const,
  filterOptions: (language: string) => [...tcgKeys.all(), 'filter-options', language] as const,
  rarities: (setId: string | null | undefined, language: string) =>
    [...tcgKeys.all(), 'rarities', setId ?? 'all', language] as const,
};
