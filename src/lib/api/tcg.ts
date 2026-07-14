import axios from 'axios';
import axiosRetry from 'axios-retry';
import { getCachedData, setCachedData } from './cache';
import type {
  TCGCard,
  TCGCardAbility,
  TCGCardAttack,
  TCGCardCategoryFilter,
  TCGCardFilters,
  TCGCardSortField,
  TCGCardSortOrder,
  TCGCatalogPageResult,
  TCGCollectionCard,
  TCGSet,
  TCGFilterOptions,
} from '@/types/tcg';
import { getCanonicalTcgRarity } from '@/lib/tcg-rarity';
import { toCollectionCard } from '@/lib/tcg-collection';

const tcgClient = axios.create({
  baseURL: 'https://api.tcgdex.net/v2',
  timeout: 30000,
});

axiosRetry(tcgClient, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    return axiosRetry.isNetworkOrIdempotentRequestError(error) || error.response?.status === 429;
  },
});

const supportedLangs = ['en', 'fr', 'es', 'it', 'de', 'ja', 'ko', 'zh'] as const;
const unsupportedTcgLangs = new Set(['zh']);
const limitedTcgLangs = new Set(['ko', 'ja']);

export const TCG_CARD_CATEGORIES: TCGCardCategoryFilter[] = ['all', 'Pokemon', 'Trainer', 'Energy'];
export const TCG_POKEMON_TYPES = ['Colorless', 'Fire', 'Water', 'Lightning', 'Grass', 'Fighting', 'Psychic', 'Darkness', 'Dragon', 'Fairy', 'Metal'];
export const TCG_TRAINER_TYPES = ['Supporter', 'Item', 'Stadium', 'Tool', 'Ace Spec', 'Technical Machine', 'Goldenrod Game Corner', "Rocket's Secret Machine"];
export const TCG_ENERGY_TYPES = ['Basic', 'Special'];
export const TCG_POKEMON_STAGES = ['Basic', 'Stage1', 'Stage2', 'LevelX', 'V', 'VMAX', 'VSTAR', 'EX', 'GX', 'MEGA'];
export const TCG_GLOBAL_RARITIES = [
  'Common',
  'Uncommon',
  'Rare',
  'Double Rare',
  'Ultra Rare',
  'Illustration Rare',
  'Special Illustration Rare',
  'Hyper Rare',
  'Secret Rare',
  'Promo',
  'Trainer Gallery',
  'Amazing Rare',
  'Radiant Rare',
  'Rare Holo',
  'Rare Holo GX',
  'Rare Holo V',
  'Rare Holo VMAX',
  'Rare Holo VSTAR',
  'Rare Rainbow',
  'Rare Secret',
  'Reverse Holo',
];

const VISUAL_METADATA_CONCURRENCY = 8;
const POKEMON_CARD_PAGE_SIZE = 100;

export const DEFAULT_TCG_CARD_FILTERS: TCGCardFilters = {
  selectedCategory: 'all',
  sortBy: 'id',
  sortOrder: 'asc',
  ownedState: 'all',
};

export function normalizeTcgPositiveInteger(value: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback;

  const normalized = Math.floor(value);
  return normalized >= 1 ? normalized : fallback;
}

function resolveTcgLang(lang = 'en') {
  const supportedLang = supportedLangs.includes(lang as (typeof supportedLangs)[number]) ? lang : 'en';
  return unsupportedTcgLangs.has(supportedLang) ? 'en' : supportedLang;
}

export function isTcgLangSupported(lang: string): boolean {
  if (!supportedLangs.includes(lang as (typeof supportedLangs)[number])) return false;
  return !unsupportedTcgLangs.has(lang);
}

export function getUnsupportedTcgLangs(): readonly string[] {
  return Array.from(unsupportedTcgLangs);
}

export function isTcgLangLimited(lang: string): boolean {
  return limitedTcgLangs.has(lang);
}

function getWithOptionalSignal<T>(url: string, signal?: AbortSignal) {
  return signal ? tcgClient.get<T>(url, { signal }) : tcgClient.get<T>(url);
}

function throwIfAborted(signal?: AbortSignal) {
  if (!signal?.aborted) return;
  throw signal.reason ?? new DOMException('Aborted', 'AbortError');
}

function fixTcgdexImageUrl(url: string | undefined | null): string | undefined {
  if (!url) return undefined;
  if (url.endsWith('.png') || url.endsWith('.jpg') || url.endsWith('.webp') || url.endsWith('.svg')) return url;
  // Card image paths (e.g. /en/sv/sv03/001) resolve without an extension on tcgdex.net.
  // Logo/symbol paths (ending in /logo or /symbol) require .png to return the actual image.
  if (url.includes('tcgdex.net') && !url.endsWith('/logo') && !url.endsWith('/symbol')) return url;
  return `${url}.png`;
}

function normaliseSet(raw: RawSet): TCGSet {
  const fromCardsArray = Array.isArray(raw.cards) ? raw.cards.length : undefined;
  const fromCardCount = typeof raw.cardCount?.total === 'number' ? raw.cardCount.total : undefined;
  const fromTotalCards = typeof raw.totalCards === 'number' ? raw.totalCards : undefined;
  const count = fromCardsArray ?? fromCardCount ?? fromTotalCards ?? 0;

  return {
    id: raw.id,
    name: raw.name,
    logo: fixTcgdexImageUrl(raw.logo),
    symbol: fixTcgdexImageUrl(raw.symbol),
    releaseDate: raw.releaseDate,
    cardCount: raw.cardCount as TCGSet['cardCount'],
    totalCards: count,
    legalities: raw.legalities,
  };
}

function normaliseAttack(attack: TCGCardAttack): TCGCardAttack {
  return {
    ...attack,
    effect: attack.effect ?? attack.text,
    text: attack.text ?? attack.effect,
  };
}

function normaliseAbility(ability: TCGCardAbility): TCGCardAbility {
  return {
    ...ability,
    effect: ability.effect ?? ability.text,
    text: ability.text ?? ability.effect,
  };
}

function normaliseCard(card: TCGCard): TCGCard {
  return {
    ...card,
    image: fixTcgdexImageUrl(card.image),
    imageUrl: fixTcgdexImageUrl(card.imageUrl),
    category: normaliseCardCategory(card.category),
    source: card.source ?? 'TCGames',
    effect: card.effect ?? card.flavorText ?? card.description,
    description: card.description ?? card.flavorText,
    flavorText: card.flavorText ?? card.description,
    retreat: card.retreat ?? card.retreatCost,
    retreatCost: card.retreatCost ?? card.retreat,
    attacks: card.attacks?.map(normaliseAttack),
    abilities: Array.isArray(card.abilities)
      ? card.abilities.map(normaliseAbility)
      : card.abilities
        ? normaliseAbility(card.abilities)
        : card.abilities,
  };
}

function normaliseCardCategory(category: TCGCard['category']): TCGCard['category'] {
  const normalized = normalizeFilterValue(category ?? '');

  if (normalized === 'pokemon') return 'Pokemon';
  if (normalized === 'trainer' || normalized === 'dresseur') return 'Trainer';
  if (normalized === 'energy' || normalized === 'energie') return 'Energy';

  return category;
}

function buildCardQueryParams(filters: TCGCardFilters, page: number, limit: number) {
  const safePage = normalizeTcgPositiveInteger(page, 1);
  const safeLimit = normalizeTcgPositiveInteger(limit, 48);
  const params = new URLSearchParams();
  const searchTerm = filters.searchTerm?.trim();
  const selectedCategory = filters.selectedCategory ?? 'all';
  const selectedSet = filters.selectedSet?.trim();
  const sortBy: TCGCardSortField = filters.sortBy ?? 'name';
  const sortOrder: TCGCardSortOrder = filters.sortOrder ?? 'asc';
  const remoteSortField = resolveRemoteSortField(sortBy);

  params.set('pagination:page', String(safePage));
  params.set('pagination:itemsPerPage', String(safeLimit + 1));
  params.set('sort:field', remoteSortField);
  params.set('sort:order', sortOrder.toUpperCase());

  if (searchTerm) {
    params.set('name', `like:${searchTerm}`);
  }

  if (selectedCategory !== 'all') {
    params.set('category', selectedCategory);
  }

  if (selectedSet) {
    params.set('set.id', `eq:${selectedSet}`);
  }

  if (filters.selectedTypes?.length) {
    params.set('types', filters.selectedTypes.join('|'));
  }

  if (filters.selectedPhase) {
    params.set('stage', `eq:${filters.selectedPhase}`);
  }

  if (filters.selectedTrainerTypes?.length) {
    params.set('trainerType', filters.selectedTrainerTypes.join('|'));
  }

  if (filters.selectedEnergyTypes?.length) {
    params.set('energyType', filters.selectedEnergyTypes.join('|'));
  }

  if (typeof filters.minHp === 'number') {
    params.append('hp', `gte:${filters.minHp}`);
  }

  if (typeof filters.maxHp === 'number') {
    params.append('hp', `lte:${filters.maxHp}`);
  }

  return params;
}

function normalizeFilterValue(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u2019\u2018\u201C\u201D`]/g, "'")
    .replace(/[^a-z0-9']+/g, '');
}

function matchesRarityFilter(card: TCGCard, selectedRarity: string): boolean {
  const rarityKey = getCanonicalTcgRarity(selectedRarity);
  const cardRarity = getCanonicalTcgRarity(card.rarity);

  if (rarityKey === 'promo') {
    return Boolean(card.variants?.wPromo) || cardRarity.includes('promo');
  }

  if (rarityKey === 'reverseholo') {
    return Boolean(card.variants?.reverse) || cardRarity.includes('reverseholo');
  }

  return cardRarity === rarityKey;
}

export function matchesTcgRarityFilter(card: TCGCard, selectedRarity: string): boolean {
  return matchesRarityFilter(card, selectedRarity);
}

export function mergeTcgCardPages(pages: TCGCard[][]): TCGCard[] {
  const seenIds = new Set<string>();
  const cards: TCGCard[] = [];

  for (const page of pages) {
    for (const card of page) {
      if (!card.id || seenIds.has(card.id)) continue;
      seenIds.add(card.id);
      cards.push(card);
    }
  }

  return cards;
}

async function fetchAllCardSearchPages(
  filters: TCGCardFilters,
  lang: string,
  pageSize = POKEMON_CARD_PAGE_SIZE,
): Promise<TCGCard[]> {
  const pages: TCGCard[][] = [];
  let page = 1;
  let previousPageSignature = '';

  while (true) {
    // TCGdex documents a default page size of 100. Request exactly that
    // amount and continue when a full page is returned, including when the
    // service caps a larger requested page size.
    const query = buildCardQueryParams(filters, page, pageSize - 1).toString();
    const { data } = await tcgClient.get<TCGCard[]>(`/${lang}/cards?${query}`);
    const pageCards = Array.isArray(data) ? data.map((card) => normaliseCard(card)) : [];
    const pageSignature = pageCards.map((card) => card.id).join('|');

    if (pageSignature && pageSignature === previousPageSignature) {
      break;
    }

    pages.push(pageCards);
    if (pageCards.length < pageSize) {
      break;
    }

    previousPageSignature = pageSignature;
    page += 1;
  }

  return mergeTcgCardPages(pages);
}

function matchesTrainerType(card: TCGCard, selectedTypes: string[]): boolean {
  if (selectedTypes.length === 0) return true;
  const trainerType = normalizeFilterValue(card.trainerType ?? '');
  if (!trainerType) return false;
  return selectedTypes.some((type) => normalizeFilterValue(type) === trainerType);
}

function matchesEnergyType(card: TCGCard, selectedTypes: string[]): boolean {
  if (selectedTypes.length === 0) return true;
  const energyType = normalizeFilterValue(card.energyType ?? '');
  if (!energyType) return false;

  return selectedTypes.some((type) => {
    const normalizedType = normalizeFilterValue(type);
    if (normalizedType === 'basic') {
      return energyType === 'normal';
    }
    return normalizedType === energyType;
  });
}

interface LocalFilterContext {
  ownedIds?: Set<string>;
  wishlistIds?: Set<string>;
}

function cardMatchesLocalFilters(card: TCGCard, filters: TCGCardFilters, ctx?: LocalFilterContext): boolean {
  if (filters.selectedRarity && !matchesRarityFilter(card, filters.selectedRarity)) {
    return false;
  }

  if (!matchesTrainerType(card, filters.selectedTrainerTypes ?? [])) {
    return false;
  }

  if (!matchesEnergyType(card, filters.selectedEnergyTypes ?? [])) {
    return false;
  }

  if (filters.illustrator) {
    const illustrator = normalizeFilterValue(card.illustrator ?? '');
    if (!illustrator.includes(normalizeFilterValue(filters.illustrator))) {
      return false;
    }
  }

  if (filters.regulationMark) {
    if (normalizeFilterValue(card.regulationMark ?? '') !== normalizeFilterValue(filters.regulationMark)) {
      return false;
    }
  }

  if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
    const marketPrice = getMarketPrice(card);
    if (typeof marketPrice !== 'number') return false;
    if (typeof filters.priceMin === 'number' && marketPrice < filters.priceMin) return false;
    if (typeof filters.priceMax === 'number' && marketPrice > filters.priceMax) return false;
  }

  if (filters.releaseStart || filters.releaseEnd) {
    const releaseDate = card.set?.releaseDate ? new Date(card.set.releaseDate).getTime() : undefined;
    if (typeof releaseDate !== 'number' || Number.isNaN(releaseDate)) return false;
    if (filters.releaseStart && releaseDate < new Date(filters.releaseStart).getTime()) return false;
    if (filters.releaseEnd && releaseDate > new Date(filters.releaseEnd).getTime()) return false;
  }

  if (filters.legalities?.length) {
    const legal = card.legal;
    const setLegalities = card.set?.legalities;
    const matches = filters.legalities.some((state) => {
      if (legal?.[state]) return true;
      if (setLegalities?.[state]) return true;
      return false;
    });
    if (!matches) return false;
  }

  if (filters.ownedState && filters.ownedState !== 'all' && ctx) {
    const isOwned = ctx.ownedIds?.has(card.id) ?? false;
    const isWishlisted = ctx.wishlistIds?.has(card.id) ?? false;
    switch (filters.ownedState) {
      case 'owned':
        if (!isOwned) return false;
        break;
      case 'wishlist':
        if (!isWishlisted) return false;
        break;
      case 'missing':
        if (isOwned) return false;
        break;
    }
  }

  return true;
}

function stripLocalOnlyFilters(filters: TCGCardFilters): TCGCardFilters {
  return {
    ...filters,
    selectedRarity: null,
    selectedTrainerTypes: [],
    selectedEnergyTypes: [],
  };
}

function serializeLocalOnlyFilters(filters: TCGCardFilters) {
  const selectedRarity = filters.selectedRarity ?? '';
  const selectedTrainerTypes = [...(filters.selectedTrainerTypes ?? [])].sort().join('|');
  const selectedEnergyTypes = [...(filters.selectedEnergyTypes ?? [])].sort().join('|');
  const illustrator = filters.illustrator ?? '';
  const regulationMark = filters.regulationMark ?? '';
  const priceRange = `${filters.priceMin ?? ''}:${filters.priceMax ?? ''}`;
  const releaseRange = `${filters.releaseStart ?? ''}:${filters.releaseEnd ?? ''}`;

  return [selectedRarity, selectedTrainerTypes, selectedEnergyTypes, illustrator, regulationMark, priceRange, releaseRange].join('::');
}

function shouldHydrateForLocalFilters(card: TCGCard, filters: TCGCardFilters): boolean {
  if (filters.selectedRarity && !card.rarity && !card.variants) {
    return true;
  }

  if ((filters.selectedTrainerTypes?.length ?? 0) > 0 && !card.trainerType) {
    return true;
  }

  if ((filters.selectedEnergyTypes?.length ?? 0) > 0 && !card.energyType) {
    return true;
  }

  if (filters.illustrator && !card.illustrator) {
    return true;
  }

  if (filters.regulationMark && !card.regulationMark) {
    return true;
  }

  if ((filters.priceMin !== undefined || filters.priceMax !== undefined) && !hasMarketPrice(card)) {
    return true;
  }

  return false;
}

/**
 * Fetch a single card by ID with full details.
 */
export const getTCGCard = async (cardId: string, lang = 'en', signal?: AbortSignal): Promise<TCGCard | null> => {
  const tcgLang = resolveTcgLang(lang);
  const cacheKey = `tcg-card-v5-${cardId}-${tcgLang}`;

  try {
    const cached = await getCachedData<TCGCard>(cacheKey);
    if (cached) return cached;

    throwIfAborted(signal);

    const { data } = await getWithOptionalSignal<TCGCard>(`/${tcgLang}/cards/${cardId}`, signal);
    if (data) {
      const card = normaliseCard(data);
      await setCachedData(cacheKey, card);
      return card;
    }

    return null;
  } catch (error) {
    if (signal?.aborted) throw error;
    console.error(`[TCG API] Error fetching card ${cardId}:`, error);
    return await getCachedData<TCGCard>(cacheKey, true);
  }
};

async function hydrateCardsForVisualEffects(cards: TCGCard[], lang: string, signal?: AbortSignal): Promise<TCGCard[]> {
  return mapWithConcurrency(cards, VISUAL_METADATA_CONCURRENCY, async (card) => {
    throwIfAborted(signal);

    if (!needsVisualMetadata(card)) return card;

    const fullCard = await getTCGCard(card.id, lang, signal);
    return fullCard ?? card;
  });
}

function needsVisualMetadata(card: TCGCard): boolean {
  if (!card.image && !card.imageUrl) return true;
  if (!card.rarity || !card.category) return true;

  if (card.category === 'Pokemon') {
    return !card.stage && !(card.types?.length);
  }

  if (card.category === 'Trainer') {
    return !card.trainerType;
  }

  if (card.category === 'Energy') {
    return !card.energyType;
  }

  return false;
}

function getMarketPrice(card: TCGCard): number | undefined {
  const tcgplayer = card.pricing?.tcgplayer as { market?: number; mid?: number; low?: number } | undefined;
  const cardmarket = card.pricing?.cardmarket as { averageSellPrice?: number; trendPrice?: number } | undefined;

  return tcgplayer?.market ?? tcgplayer?.mid ?? tcgplayer?.low ?? cardmarket?.trendPrice ?? cardmarket?.averageSellPrice;
}

function hasMarketPrice(card: TCGCard): boolean {
  return typeof getMarketPrice(card) === 'number';
}

function resolveRemoteSortField(sortBy: TCGCardSortField): string {
  switch (sortBy) {
    case 'id':
    case 'number':
      return 'number';
    case 'hp':
      return 'hp';
    case 'rarity':
      return 'rarity';
    case 'releaseDate':
    case 'updated':
    case 'marketPrice':
      return 'name';
    default:
      return 'name';
  }
}

function compareCards(a: TCGCard, b: TCGCard, sortBy: TCGCardSortField, sortOrder: TCGCardSortOrder) {
  const direction = sortOrder === 'desc' ? -1 : 1;
  let result = 0;

  switch (sortBy) {
    case 'id':
      result = compareStrings(a.id, b.id);
      break;
    case 'number':
      result = compareCollectorNumbers(a.localId, b.localId);
      break;
    case 'hp':
      result = (a.hp ?? -1) - (b.hp ?? -1);
      break;
    case 'rarity':
      result = compareStrings(a.rarity ?? '', b.rarity ?? '');
      break;
    case 'releaseDate':
      result = compareDates(a.set?.releaseDate, b.set?.releaseDate);
      break;
    case 'marketPrice':
      result = (getMarketPrice(a) ?? -1) - (getMarketPrice(b) ?? -1);
      break;
    case 'updated':
      result = compareDates(a.updated, b.updated);
      break;
    case 'name':
    default:
      result = compareStrings(a.name, b.name);
      break;
  }

  return result * direction;
}

function compareStrings(a: string, b: string, numeric = false) {
  return numeric ? a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }) : a.localeCompare(b, undefined, { sensitivity: 'base' });
}

function compareCollectorNumbers(a: string, b: string) {
  const valueA = parseCollectorNumber(a);
  const valueB = parseCollectorNumber(b);

  if (valueA !== valueB) {
    return valueA - valueB;
  }

  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

function parseCollectorNumber(value: string) {
  const normalized = value.trim();
  if (!normalized) return Number.POSITIVE_INFINITY;

  const match = normalized.match(/(\d+)/);
  if (!match) return Number.POSITIVE_INFINITY;

  return Number.parseInt(match[1], 10);
}

function compareDates(a?: string, b?: string) {
  const timeA = a ? new Date(a).getTime() : Number.NEGATIVE_INFINITY;
  const timeB = b ? new Date(b).getTime() : Number.NEGATIVE_INFINITY;
  return timeA - timeB;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  }

  const workerCount = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: workerCount }, worker));

  return results;
}


/**
 * Fetches all cards from a given set.
 */
export const getCardsBySet = async (setId: string, lang = 'en'): Promise<TCGCard[]> => {
  const tcgLang = resolveTcgLang(lang);
  const cacheKey = `tcg-set-cards-v3-${setId}-${tcgLang}`;

  try {
    const cached = await getCachedData<TCGCard[]>(cacheKey);
    if (cached) return cached;

    const { data } = await tcgClient.get<Omit<RawSet, 'cards'> & { cards: TCGCard[] }>(`/${tcgLang}/sets/${setId}`);
    const cards = data.cards?.filter((card) => card && card.id).map((card) => normaliseCard({ ...card, source: 'TCGames' })) || [];

    await setCachedData(cacheKey, cards);
    return cards;
  } catch (error) {
    console.error(`[TCG API] Error fetching cards for set ${setId}:`, error);
    return (await getCachedData<TCGCard[]>(cacheKey, true)) || [];
  }
};

/** Upper bound on how many cards a single collection-insight request will hydrate. */
export const TCG_COLLECTION_MAX_CARDS = 600;

/**
 * Build the slim, owned-independent collection-card projection for a whole set.
 *
 * Pricing and rarity only exist on the TCGdex card *detail* endpoint, so every
 * card has to be hydrated. Each detail call is cached (client-side via idb and,
 * regardless, deduplicated upstream), the work is bounded by `maxCards`, and the
 * resulting slim array is small enough to be HTTP-cached by the route handler —
 * keeping this owned-independent and shareable across users.
 */
export const buildSetCollectionCards = async (
  setId: string,
  lang = 'en',
  maxCards = TCG_COLLECTION_MAX_CARDS,
): Promise<TCGCollectionCard[]> => {
  const tcgLang = resolveTcgLang(lang);
  const summaries = await getCardsBySet(setId, tcgLang);
  if (summaries.length === 0) return [];

  const limited = summaries.slice(0, Math.max(0, maxCards));
  const hydrated = await mapWithConcurrency(limited, VISUAL_METADATA_CONCURRENCY, async (card) => {
    const full = await getTCGCard(card.id, tcgLang).catch(() => null);
    return toCollectionCard(full ?? card);
  });

  return hydrated;
};

/**
 * Client helper: fetch a set's collection cards through the route handler so the
 * heavy hydration happens server-side and stays HTTP-cacheable. Components must
 * use this rather than calling the network directly.
 */
export const fetchSetCollectionCards = async (
  setId: string,
  lang = 'en',
  signal?: AbortSignal,
): Promise<TCGCollectionCard[]> => {
  const params = new URLSearchParams({ setId, lang });
  const response = await fetch(`/api/tcg/collection/set-cards?${params.toString()}`, { signal });
  if (!response.ok) {
    throw new Error(`Failed to load collection cards for ${setId}`);
  }
  const data = (await response.json()) as { cards?: TCGCollectionCard[] };
  return Array.isArray(data.cards) ? data.cards : [];
};

/**
 * Fetch all available expansion sets, enriched with releaseDate.
 * For non-English languages, also filters out sets that have no card data
 * on TCGdex (e.g. Korean SV6/SV5a report cards in the listing but the
 * detail endpoint returns an empty `cards` array).
 */
export const getAllSets = async (lang = 'en'): Promise<TCGSet[]> => {
  const tcgLang = resolveTcgLang(lang);
  const cacheKey = `tcg-all-sets-v7-${tcgLang}`;

  try {
    const cached = await getCachedData<TCGSet[]>(cacheKey);
    if (cached) return cached;

    const { data } = await tcgClient.get<RawSet[]>(`/${tcgLang}/sets`);
    const sets = data.map(normaliseSet);

    const enrichedSets = await mapWithConcurrency(sets, 10, async (set) => {
      try {
        const detail = await getSetById(set.id, lang);
        if (!detail) return null;

        return {
          ...set,
          releaseDate: detail.releaseDate ?? set.releaseDate,
          totalCards: detail.totalCards ?? set.totalCards,
        };
      } catch {
        return set;
      }
    });

    const validSets = enrichedSets.filter((set): set is TCGSet =>
      set !== null && (set.totalCards ?? 0) > 0,
    );

    const sortedSets = [...validSets].sort((a, b) => {
      const dateA = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
      const dateB = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
      return dateB - dateA;
    });

    await setCachedData(cacheKey, sortedSets);
    return sortedSets;
  } catch (error) {
    console.error('[TCG API] Error fetching all sets:', error);
    return (await getCachedData<TCGSet[]>(cacheKey, true)) || [];
  }
};

/**
 * Fetch set details by ID.
 */
export const getSetById = async (setId: string, lang = 'en'): Promise<TCGSet | null> => {
  const tcgLang = resolveTcgLang(lang);
  const cacheKey = `tcg-set-v5-${setId}-${tcgLang}`;

  try {
    const cached = await getCachedData<TCGSet>(cacheKey);
    if (cached) return cached;

    const { data } = await tcgClient.get<RawSet>(`/${tcgLang}/sets/${setId}`);
    const set = normaliseSet(data);
    await setCachedData(cacheKey, set);
    return set;
  } catch (error) {
    console.error(`[TCG API] Error fetching set ${setId}:`, error);
    return await getCachedData<TCGSet>(cacheKey, true);
  }
};

/**
 * Search for cards with filters and pagination.
 * When fetchAll is true, ignores pagination and returns all matching cards.
 */
export const searchCards = async (
  filters: TCGCardFilters,
  lang = 'en',
  page = 1,
  limit = 48,
  signal?: AbortSignal,
  ownedIds?: Set<string>,
  wishlistIds?: Set<string>,
  fetchAll = false,
): Promise<TCGCatalogPageResult> => {
  const tcgLang = resolveTcgLang(lang);
  const safePage = normalizeTcgPositiveInteger(page, 1);
  const safeLimit = normalizeTcgPositiveInteger(limit, 48);
  const queryFilters = stripLocalOnlyFilters(filters);
  const query = buildCardQueryParams(queryFilters, safePage, safeLimit).toString();
  const hasLocalOnlyFilters =
    Boolean(filters.selectedRarity) ||
    Boolean(filters.selectedTrainerTypes?.length) ||
    Boolean(filters.selectedEnergyTypes?.length) ||
    Boolean(filters.illustrator) ||
    Boolean(filters.regulationMark) ||
    Boolean(filters.priceMin !== undefined || filters.priceMax !== undefined) ||
    Boolean(filters.releaseStart || filters.releaseEnd);
  const sortBy = filters.sortBy ?? 'name';
  const sortOrder = filters.sortOrder ?? 'asc';
  const requiresLocalSorting = !['name', 'id', 'hp', 'rarity'].includes(sortBy);
  const requiresFullDatasetSort = sortBy === 'number' || sortBy === 'id';
  const cacheKey = fetchAll
    ? `tcg-catalog-all-v10-${tcgLang}-${query}-${serializeLocalOnlyFilters(filters)}-${sortBy}-${sortOrder}`
    : `tcg-catalog-v10-${tcgLang}-${query}-p${safePage}-l${safeLimit}-local-${serializeLocalOnlyFilters(filters)}`;

  try {
    const cached = await getCachedData<TCGCatalogPageResult>(cacheKey);
    if (cached) return cached;

    if (!hasLocalOnlyFilters && !requiresLocalSorting && !requiresFullDatasetSort) {
      if (fetchAll) {
        const ALL_PAGE_SIZE = 100;
        const allCards: TCGCard[] = [];
        let remotePage = 1;
        let hasMoreRemote = true;

        while (hasMoreRemote) {
          const pageQuery = buildCardQueryParams(queryFilters, remotePage, ALL_PAGE_SIZE - 1).toString();
          const { data } = await getWithOptionalSignal<TCGCard[]>(`/${tcgLang}/cards?${pageQuery}`, signal);
          throwIfAborted(signal);
          const normalized = Array.isArray(data) ? data.map((card) => normaliseCard(card)) : [];
          allCards.push(...normalized);
          hasMoreRemote = normalized.length === ALL_PAGE_SIZE;
          remotePage += 1;
        }

        const sorted = [...allCards].sort((a, b) => compareCards(a, b, sortBy, sortOrder));
        const pageCards = await hydrateCardsForVisualEffects(sorted, tcgLang, signal);
        const result = { cards: pageCards, hasMore: false };

        await setCachedData(cacheKey, result);
        return result;
      }

      const { data } = await getWithOptionalSignal<TCGCard[]>(`/${tcgLang}/cards?${query}`, signal);
      throwIfAborted(signal);
      const normalized = Array.isArray(data) ? data.map((card) => normaliseCard(card)) : [];
      const sorted = [...normalized].sort((a, b) => compareCards(a, b, filters.sortBy ?? 'name', filters.sortOrder ?? 'asc'));
      const pageCards = await hydrateCardsForVisualEffects(sorted.slice(0, safeLimit), tcgLang, signal);
      const result = {
        cards: pageCards,
        hasMore: Array.isArray(data) ? data.length > safeLimit : false,
      };

      await setCachedData(cacheKey, result);
      return result;
    }

    const cards: TCGCard[] = [];
    let remotePage = 1;
    let hasMoreRemote = true;
    const targetCount = fetchAll ? Number.POSITIVE_INFINITY : safePage * safeLimit + 1;
    const MAX_REMOTE_PAGES = fetchAll ? Number.POSITIVE_INFINITY : 30;

    while (hasMoreRemote && (requiresFullDatasetSort || cards.length < targetCount) && remotePage <= MAX_REMOTE_PAGES) {
      const pageQuery = buildCardQueryParams(queryFilters, remotePage, safeLimit).toString();
      const { data } = await getWithOptionalSignal<TCGCard[]>(`/${tcgLang}/cards?${pageQuery}`, signal);
      throwIfAborted(signal);
      const normalized = Array.isArray(data) ? data.map((card) => normaliseCard(card)) : [];
      const hydrated = hasLocalOnlyFilters
        ? await Promise.all(
            normalized.map(async (card) => {
              if (!shouldHydrateForLocalFilters(card, filters)) {
                return card;
              }

              const fullCard = await getTCGCard(card.id, tcgLang, signal);
              return fullCard ?? card;
            }),
          )
        : normalized;
      const filterCtx: LocalFilterContext | undefined = (ownedIds || wishlistIds) ? { ownedIds, wishlistIds } : undefined;
      const pageCards = hydrated.filter((card) => cardMatchesLocalFilters(card, filters, filterCtx));
      cards.push(...pageCards);
      hasMoreRemote = Array.isArray(data) ? data.length > safeLimit : false;
      remotePage += 1;
    }

    const sortedCards = [...cards].sort((a, b) => compareCards(a, b, sortBy, sortOrder));
    const pageCards = fetchAll
      ? await hydrateCardsForVisualEffects(sortedCards, tcgLang, signal)
      : await hydrateCardsForVisualEffects(sortedCards.slice((page - 1) * limit, (page - 1) * limit + safeLimit), tcgLang, signal);
    const result = {
      cards: pageCards,
      hasMore: fetchAll ? false : hasMoreRemote || sortedCards.length > (page - 1) * limit + safeLimit,
    };

    await setCachedData(cacheKey, result);
    return result;
  } catch (error) {
    if (signal?.aborted) throw error;
    console.error('[TCG API] Error in searchCards:', error);
    return (await getCachedData<TCGCatalogPageResult>(cacheKey, true)) || { cards: [], hasMore: false };
  }
};

/**
 * Fetch available filter options for the catalog.
 */
export const getFilterOptions = async (lang = 'en'): Promise<TCGFilterOptions> => {
  const tcgLang = resolveTcgLang(lang);
    const cacheKey = `tcg-filter-options-v7-${tcgLang}`;

  try {
    const cached = await getCachedData<TCGFilterOptions>(cacheKey);
    if (cached) return cached;

    const sets = await getAllSets(tcgLang);
    const options: TCGFilterOptions = {
      categories: TCG_CARD_CATEGORIES,
      sets,
      pokemonTypes: TCG_POKEMON_TYPES,
      trainerTypes: TCG_TRAINER_TYPES,
      energyTypes: TCG_ENERGY_TYPES,
      stages: TCG_POKEMON_STAGES,
      rarities: TCG_GLOBAL_RARITIES,
    };

    await setCachedData(cacheKey, options);
    return options;
  } catch (error) {
    console.error('[TCG API] Error fetching filter options:', error);
    return (
      (await getCachedData<TCGFilterOptions>(cacheKey, true)) ?? {
        categories: TCG_CARD_CATEGORIES,
        sets: [],
        pokemonTypes: TCG_POKEMON_TYPES,
        trainerTypes: TCG_TRAINER_TYPES,
        energyTypes: TCG_ENERGY_TYPES,
        stages: TCG_POKEMON_STAGES,
        rarities: TCG_GLOBAL_RARITIES,
      }
    );
  }
};

/**
 * Returns the unique rarities present in a given set, sorted alphabetically.
 * The set listing endpoint omits rarity, so we sample individual card details.
 */
export const getRaritiesForSet = async (setId: string, lang = 'en'): Promise<string[]> => {
  const tcgLang = resolveTcgLang(lang);
    const cacheKey = `tcg-rarities-v5-${setId}-${tcgLang}`;

  try {
    const cached = await getCachedData<string[]>(cacheKey);
    if (cached) return cached;

    const summaries = await getCardsBySet(setId, tcgLang);
    if (summaries.length === 0) return [];

    const summaryRarities = [...new Set(summaries.map((card) => card.rarity).filter((rarity): rarity is string => Boolean(rarity)))].sort((a, b) => a.localeCompare(b));
    if (summaryRarities.length > 0) {
      await setCachedData(cacheKey, summaryRarities);
      return summaryRarities;
    }

    const total = summaries.length;
    const sampleSize = Math.min(total, 40);
    const step = total / sampleSize;
    const sampledIndices = new Set<number>();
    for (let i = 0; i < sampleSize; i++) {
      sampledIndices.add(Math.min(Math.floor(i * step), total - 1));
    }
    for (let i = Math.max(0, total - 10); i < total; i++) {
      sampledIndices.add(i);
    }

    const sampledIds = [...sampledIndices].map((index) => summaries[index].id);
    const details = await mapWithConcurrency(sampledIds, 4, (id) =>
      getTCGCard(id, tcgLang).catch(() => null),
    );

    const raritySet = new Set<string>();
    for (const card of details) {
      if (card?.rarity) raritySet.add(card.rarity);
    }

    const rarities = [...raritySet].sort((a, b) => a.localeCompare(b));
    await setCachedData(cacheKey, rarities);
    return rarities;
  } catch (error) {
    console.error(`[TCG API] Error fetching rarities for set ${setId}:`, error);
    return (await getCachedData<string[]>(cacheKey, true)) || [];
  }
};

/**
 * Fetch cards by Pokémon name with English fallback and detail enrichment.
 */
export const getPokemonCards = async (
  pokemonName: string,
  lang = 'en',
  englishName?: string,
): Promise<TCGCard[]> => {
  const tcgLang = resolveTcgLang(lang);
  const cacheKey = `tcg-pokemon-cards-v7-${tcgLang}-${pokemonName}`;

  try {
    const cached = await getCachedData<TCGCard[]>(cacheKey);
    if (cached) return cached;

    const searchFilters: TCGCardFilters = {
      selectedCategory: 'Pokemon',
      searchTerm: pokemonName,
      sortBy: 'name',
      sortOrder: 'asc',
    };

    let cards = (await fetchAllCardSearchPages(searchFilters, tcgLang)).filter((card) => card.image);

    if (cards.length === 0 && tcgLang !== 'en' && englishName) {
      cards = (await fetchAllCardSearchPages({ ...searchFilters, searchTerm: englishName }, 'en'))
        .filter((card) => card.image);
    }

    const enriched = await Promise.all(
      cards.map(async (card) => {
        const fullDetails = await getTCGCard(card.id, tcgLang);
        return fullDetails || card;
      }),
    );

    await setCachedData(cacheKey, enriched);
    return enriched;
  } catch (error) {
    console.error(`[TCG API] Error fetching cards for ${pokemonName}:`, error);
    return (await getCachedData<TCGCard[]>(cacheKey, true)) || [];
  }
};

interface RawSet {
  id: string;
  name: string;
  logo?: string;
  symbol?: string;
  releaseDate?: string;
  cardCount?: { total?: number };
  totalCards?: number;
  legalities?: { unlimited?: string; standard?: string; expanded?: string };
  cards?: { id: string }[];
}

export { buildCardQueryParams };
