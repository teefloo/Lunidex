import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { DEFAULT_LATEST_TCG_SET } from '@/lib/tcg-default-latest-set';
import {
  DEFAULT_TCG_CARD_FILTERS,
  getCollectionSetAlbum,
  getCollectionSetCatalog,
  getAllSets,
  getCardsBySet,
  getTCGCard,
  getSetById,
  isTcgLangLimited,
  searchCards,
} from './tcg';
import {
  getAllAbilities,
  getAllItems,
  getAllMoves,
  getAbilityPokemon,
  getItemDetail,
  getPokemonSummarySlice,
  getLocalizedPokemonData,
} from './graphql';
import {
  getAllAbilityNames,
  getAllItemNames,
  getAllMoveNames,
  getAllPokemonNames,
  getAbilityDetail,
  getPokemonDetail,
  getPokemonEncounters,
  getPokemonForm,
  getPokemonList,
  getPokemonSpecies,
} from './rest';

const INITIAL_CATALOG_LIMIT = 48;

const getPokemonDetailPersistent = unstable_cache(
  (name: string) => getPokemonDetail(name),
  ['lunidex:pokemon-detail:v1'],
  { revalidate: 86400 },
);

const getPokemonSpeciesPersistent = unstable_cache(
  (name: string) => getPokemonSpecies(name),
  ['lunidex:pokemon-species:v1'],
  { revalidate: 86400 },
);

const getPokemonFormPersistent = unstable_cache(
  (name: string) => getPokemonForm(name),
  ['lunidex:pokemon-form:v1'],
  { revalidate: 86400 },
);

const getPokemonEncountersPersistent = unstable_cache(
  (id: number) => getPokemonEncounters(id),
  ['lunidex:pokemon-encounters:v1'],
  { revalidate: 86400 },
);

const getLocalizedPokemonDataPersistent = unstable_cache(
  (name: string, languageId: number) => getLocalizedPokemonData(name, languageId),
  ['lunidex:pokemon-localized:v1'],
  { revalidate: 86400 },
);

const getPokemonListPersistent = unstable_cache(
  (pageParam: number) => getPokemonList({ pageParam }),
  ['lunidex:pokemon-list:v1'],
  { revalidate: 3600 },
);

const getPokemonSummarySlicePersistent = unstable_cache(
  (limit: number, offset: number) => getPokemonSummarySlice(limit, offset),
  ['lunidex:pokemon-summary-slice:v1'],
  { revalidate: 3600 },
);

const getAllPokemonNamesPersistent = unstable_cache(
  () => getAllPokemonNames(),
  ['lunidex:pokemon-names:v1'],
  { revalidate: 86400 },
);

const getAllMoveNamesPersistent = unstable_cache(
  () => getAllMoveNames(),
  ['lunidex:move-names:v1'],
  { revalidate: 86400 },
);

const getAllAbilityNamesPersistent = unstable_cache(
  () => getAllAbilityNames(),
  ['lunidex:ability-names:v1'],
  { revalidate: 86400 },
);

const getAllItemNamesPersistent = unstable_cache(
  () => getAllItemNames(),
  ['lunidex:item-names:v1'],
  { revalidate: 86400 },
);

const getInitialMovesPersistent = unstable_cache(
  (languageId: number) => getAllMoves(languageId, INITIAL_CATALOG_LIMIT),
  ['lunidex:catalog-moves-preview:v1'],
  { revalidate: 3600 },
);

const getInitialAbilitiesPersistent = unstable_cache(
  (languageId: number) => getAllAbilities(languageId, INITIAL_CATALOG_LIMIT),
  ['lunidex:catalog-abilities-preview:v1'],
  { revalidate: 3600 },
);

const getInitialItemsPersistent = unstable_cache(
  (languageId: number) => getAllItems(languageId, INITIAL_CATALOG_LIMIT),
  ['lunidex:catalog-items-preview:v1'],
  { revalidate: 3600 },
);

const getInitialTcgCatalogPersistent = unstable_cache(
  async (language: string) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    try {
      return await searchCards(
        { ...DEFAULT_TCG_CARD_FILTERS, selectedSet: DEFAULT_LATEST_TCG_SET.id },
        language,
        1,
        24,
        controller.signal,
      );
    } finally {
      clearTimeout(timeoutId);
    }
  },
  ['lunidex:tcg-initial-catalog:v1'],
  { revalidate: 3600 },
);

const getTCGCardPersistent = unstable_cache(
  (cardId: string, language: string) => getTCGCard(cardId, language),
  ['lunidex:tcg-card:v1'],
  { revalidate: 3600 },
);

const getTCGSetPersistent = unstable_cache(
  (setId: string, language: string) => getSetById(setId, language),
  ['lunidex:tcg-set:v2'],
  { revalidate: 3600 },
);

const getTCGSetCardsPersistent = unstable_cache(
  (setId: string, language: string) => getCardsBySet(setId, language),
  // v2 invalidates previously cached partial set responses used by the public
  // checklist route.
  ['lunidex:tcg-set-cards:v2'],
  { revalidate: 3600 },
);

const getAllSetsPersistent = unstable_cache(
  (language: string) => getAllSets(language),
  ['lunidex:tcg-all-sets:v1'],
  { revalidate: 3600 },
);

const getCollectionSetAlbumPersistent = unstable_cache(
  (setId: string, language: string) => getCollectionSetAlbum(setId, language),
  ['lunidex:tcg-collection-set-album:v1'],
  { revalidate: 3600 },
);

const getCollectionSetCatalogPersistent = unstable_cache(
  (language: string) => getCollectionSetCatalog(language),
  ['lunidex:tcg-collection-set-catalog:v1'],
  { revalidate: 3600 },
);

// Limited locales need a real card-availability pass. Keep that manifest
// shared for a day while the regular catalog remains fresh each hour.
const getLimitedCollectionSetCatalogPersistent = unstable_cache(
  (language: string) => getCollectionSetCatalog(language),
  ['lunidex:tcg-collection-set-catalog-limited:v1'],
  { revalidate: 86400 },
);

// Detail-route fetchers shared by generateMetadata and the page component:
// without per-request memoization each route issues two identical upstream
// calls (axios traffic is invisible to Next's fetch dedupe).
const getItemDetailPersistent = unstable_cache(
  (name: string, languageId: number) => getItemDetail(name, languageId),
  ['lunidex:item-detail:v1'],
  { revalidate: 86400 },
);

const getAbilityDetailPersistent = unstable_cache(
  (name: string) => getAbilityDetail(name),
  ['lunidex:ability-detail:v1'],
  { revalidate: 86400 },
);

const getAbilityPokemonPersistent = unstable_cache(
  (name: string, languageId: number) => getAbilityPokemon(name, languageId),
  ['lunidex:ability-pokemon:v1'],
  { revalidate: 86400 },
);

/**
 * Server-cached and per-request memoized versions of the public fetchers used
 * by detail routes. `unstable_cache` avoids repeating stable upstream work
 * across requests, while `cache()` dedupes repeated calls during one render.
 */
export const getPokemonDetailCached = cache(getPokemonDetailPersistent);
export const getPokemonSpeciesCached = cache(getPokemonSpeciesPersistent);
export const getPokemonFormCached = cache(getPokemonFormPersistent);
export const getPokemonEncountersCached = cache(getPokemonEncountersPersistent);
export const getLocalizedPokemonDataCached = cache(getLocalizedPokemonDataPersistent);
export const getPokemonListCached = cache(getPokemonListPersistent);
export const getPokemonSummarySliceCached = cache(getPokemonSummarySlicePersistent);
export const getAllPokemonNamesCached = cache(getAllPokemonNamesPersistent);
export const getAllMoveNamesCached = cache(getAllMoveNamesPersistent);
export const getAllAbilityNamesCached = cache(getAllAbilityNamesPersistent);
export const getAllItemNamesCached = cache(getAllItemNamesPersistent);
export const getInitialMovesCached = cache(getInitialMovesPersistent);
export const getInitialAbilitiesCached = cache(getInitialAbilitiesPersistent);
export const getInitialItemsCached = cache(getInitialItemsPersistent);
export const getInitialTcgCatalogCached = cache(getInitialTcgCatalogPersistent);
export const getTCGCardCached = cache(getTCGCardPersistent);
export const getTCGSetCached = cache(getTCGSetPersistent);
export const getTCGSetCardsCached = cache(getTCGSetCardsPersistent);
export const getAllSetsCached = cache(getAllSetsPersistent);
export const getCollectionSetAlbumCached = cache(getCollectionSetAlbumPersistent);
export const getCollectionSetCatalogCached = cache((language: string) => (
  isTcgLangLimited(language)
    ? getLimitedCollectionSetCatalogPersistent(language)
    : getCollectionSetCatalogPersistent(language)
));
export const getItemDetailCached = cache(getItemDetailPersistent);
export const getAbilityDetailCached = cache(getAbilityDetailPersistent);
export const getAbilityPokemonCached = cache(getAbilityPokemonPersistent);
