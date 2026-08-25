import { unstable_cache } from 'next/cache';

import {
  assertSitemapIntegrity,
  buildAbilitiesSitemapEntries,
  buildGuidesSitemapEntries,
  buildItemsSitemapEntries,
  buildMovesSitemapEntries,
  buildPokemonSitemapEntries,
  buildStaticSitemapEntries,
  buildTcgCardSitemapEntries,
  buildTcgSetSitemapEntries,
  type SitemapEntry,
  type SitemapFamily,
  SITEMAP_REVALIDATE_SECONDS,
} from '@/lib/sitemap';
import {
  getAllAbilityNamesCached,
  getAllItemNamesCached,
  getAllMoveNamesCached,
  getAllPokemonNamesCached,
  getAllSetsCached,
  getTCGSetCardsCached,
} from '@/lib/api/server-cache';
import { isIndexableTCGSetCardList } from '@/lib/tcg-seo';
import type { TCGSet } from '@/types/tcg';

const TCG_CARD_LIST_URL = 'https://api.tcgdex.net/v2/en/cards';
const TCG_CARD_PAGE_SIZE = 250;
const TCG_CARD_MAX_PAGES = 200;
const TCG_CARD_BATCH_SIZE = 8;
const TCG_CARD_PAGE_RETRIES = 3;
const TCG_CARD_PAGE_TIMEOUT_MS = 10_000;

type NamedPokemon = { name: string; url: string };

function assertNonEmpty<T>(family: SitemapFamily, value: T[], label: string): T[] {
  if (value.length === 0) throw new Error(`Sitemap ${family}: ${label} returned no data.`);
  return value;
}

function validateNames(family: SitemapFamily, names: string[], label: string): string[] {
  const uniqueNames = [...new Set(names.filter((name) => typeof name === 'string' && name.length > 0))];
  assertNonEmpty(family, uniqueNames, label);
  return uniqueNames;
}

async function fetchTcgCardPage(page: number): Promise<string[]> {
  const params = new URLSearchParams({
    'pagination:page': String(page),
    'pagination:itemsPerPage': String(TCG_CARD_PAGE_SIZE),
    'sort:field': 'id',
    'sort:order': 'ASC',
  });

  let lastError: unknown;
  for (let attempt = 0; attempt < TCG_CARD_PAGE_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TCG_CARD_PAGE_TIMEOUT_MS);

    try {
      const response = await fetch(`${TCG_CARD_LIST_URL}?${params.toString()}`, {
        next: { revalidate: SITEMAP_REVALIDATE_SECONDS },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`TCGdex page ${page} returned ${response.status}`);

      const data: unknown = await response.json();
      if (!Array.isArray(data)) throw new Error(`TCGdex page ${page} did not return an array`);

      const ids = data.map((card) => {
        if (!card || typeof card !== 'object' || !('id' in card) || typeof card.id !== 'string' || card.id.length === 0) {
          throw new Error(`TCGdex page ${page} contains a card without a valid id`);
        }
        return card.id;
      });

      return ids;
    } catch (error) {
      lastError = error;
      if (attempt < TCG_CARD_PAGE_RETRIES - 1) {
        await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw new Error(`Unable to fetch the complete TCG card listing at page ${page}: ${String(lastError)}`);
}

async function fetchCompleteTcgCardIds(): Promise<string[]> {
  const ids: string[] = [];

  for (let batchStart = 1; batchStart <= TCG_CARD_MAX_PAGES; batchStart += TCG_CARD_BATCH_SIZE) {
    const batchEnd = Math.min(batchStart + TCG_CARD_BATCH_SIZE - 1, TCG_CARD_MAX_PAGES);
    // Promise.all is intentional: any failed page fails this family instead
    // of allowing a partial card inventory to become a valid sitemap.
    const pages = await Promise.all(
      Array.from({ length: batchEnd - batchStart + 1 }, (_, index) => fetchTcgCardPage(batchStart + index)),
    );

    for (const page of pages) ids.push(...page);

    const shortPageIndex = pages.findIndex((page) => page.length < TCG_CARD_PAGE_SIZE);
    if (shortPageIndex !== -1) break;

    if (batchEnd === TCG_CARD_MAX_PAGES) {
      throw new Error(`TCG card listing exceeded the ${TCG_CARD_MAX_PAGES}-page safety limit`);
    }
  }

  const uniqueIds = [...new Set(ids)];
  if (uniqueIds.length < 10_000) {
    throw new Error(`TCG card listing is suspiciously small: ${uniqueIds.length} cards`);
  }
  return uniqueIds;
}

const getCompleteTcgCardIdsCached = unstable_cache(
  fetchCompleteTcgCardIds,
  ['lunidex:sitemap:tcg-card-ids:v2'],
  { revalidate: SITEMAP_REVALIDATE_SECONDS },
);

const getValidatedPokemonNames = unstable_cache(
  async (): Promise<NamedPokemon[]> => {
    const data = await getAllPokemonNamesCached();
    const valid = data.filter((entry): entry is NamedPokemon => (
      typeof entry?.name === 'string' && entry.name.length > 0 && typeof entry.url === 'string'
    ));
    if (valid.length < 900) throw new Error(`Pokémon listing is suspiciously small: ${valid.length} entries`);
    return valid;
  },
  ['lunidex:sitemap:pokemon:v2'],
  { revalidate: SITEMAP_REVALIDATE_SECONDS },
);

const getValidatedMoveNames = unstable_cache(
  async () => validateNames('moves', await getAllMoveNamesCached(), 'PokéAPI moves'),
  ['lunidex:sitemap:moves:v2'],
  { revalidate: SITEMAP_REVALIDATE_SECONDS },
);

const getValidatedAbilityNames = unstable_cache(
  async () => validateNames('abilities', await getAllAbilityNamesCached(), 'PokéAPI abilities'),
  ['lunidex:sitemap:abilities:v2'],
  { revalidate: SITEMAP_REVALIDATE_SECONDS },
);

const getValidatedItemNames = unstable_cache(
  async () => validateNames('items', await getAllItemNamesCached(), 'PokéAPI items'),
  ['lunidex:sitemap:items:v2'],
  { revalidate: SITEMAP_REVALIDATE_SECONDS },
);

const getValidatedSets = unstable_cache(
  async () => {
    const sets = await getAllSetsCached('en');
    if (sets.length < 50) throw new Error(`TCG set listing is suspiciously small: ${sets.length} sets`);
    return sets.filter((set) => typeof set.id === 'string' && set.id.length > 0);
  },
  ['lunidex:sitemap:tcg-sets:v2'],
  { revalidate: SITEMAP_REVALIDATE_SECONDS },
);

const getValidatedIndexableSets = unstable_cache(
  async (): Promise<TCGSet[]> => {
    const sets = await getValidatedSets();
    const verified: TCGSet[] = [];

    for (let offset = 0; offset < sets.length; offset += 8) {
      const batch = sets.slice(offset, offset + 8);
      // A set is included only after the same completeness gate used by the
      // route metadata. Known incomplete sets are intentionally omitted: the
      // page marks those URLs noindex, so publishing them would contradict
      // the page's own indexability decision. Promise.all still ensures an
      // unexpected loader failure cannot produce a partial batch silently.
      const verifiedBatch = await Promise.all(batch.map(async (set) => {
        const cards = await getTCGSetCardsCached(set.id, 'en');
        return isIndexableTCGSetCardList(set, cards) ? set : null;
      }));
      verified.push(...verifiedBatch.filter((set): set is TCGSet => set !== null));
    }

    return verified;
  },
  ['lunidex:sitemap:tcg-sets-indexable:v2'],
  { revalidate: SITEMAP_REVALIDATE_SECONDS },
);

export async function getSitemapEntries(family: SitemapFamily): Promise<SitemapEntry[]> {
  let entries: SitemapEntry[];

  switch (family) {
    case 'static':
      entries = buildStaticSitemapEntries();
      break;
    case 'guides':
      entries = buildGuidesSitemapEntries();
      break;
    case 'pokemon':
      entries = buildPokemonSitemapEntries(await getValidatedPokemonNames());
      break;
    case 'tcg-sets':
      entries = buildTcgSetSitemapEntries(await getValidatedIndexableSets());
      break;
    case 'tcg-cards':
      entries = buildTcgCardSitemapEntries(await getCompleteTcgCardIdsCached());
      break;
    case 'moves':
      entries = buildMovesSitemapEntries(await getValidatedMoveNames());
      break;
    case 'abilities':
      entries = buildAbilitiesSitemapEntries(await getValidatedAbilityNames());
      break;
    case 'items':
      entries = buildItemsSitemapEntries(await getValidatedItemNames());
      break;
  }

  assertSitemapIntegrity(entries, family);
  return entries;
}
