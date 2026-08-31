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
  TCGCollectionSetSummary,
  TCGSetAlbumData,
  TCGSet,
  TCGFilterOptions,
} from '@/types/tcg';
import { getCanonicalTcgRarity } from '@/lib/tcg-rarity';
import { isValidTcgCardId } from '@/lib/tcg-owned-cards';
import {
  DEFAULT_TCG_CARD_LANGUAGE,
  isTCGCardLanguage,
  normalizeTCGCardLanguage,
  type TCGCardLanguage,
} from '@/lib/tcg-language';
import {
  aggregateCollectionValueWithVariants,
  getCardMarketValue,
  toCollectionCard,
  type TCGOwnedVariant,
  type TCGCollectionValuationResult,
} from '@/lib/tcg-collection';
import type { TCGDisplayCurrency } from '@/lib/tcg-currency';
import { MAX_TCG_COLLECTION_PHYSICAL_CARDS } from '@primedex/core/lib/tcg-collections';

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

// `zh` was the former Lunidex locale alias, not a TCGdex code. Keep it as an
// invalid/unsupported input so it cannot silently select a different card
// language; callers should choose zh-cn or zh-tw explicitly.
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
const COLLECTION_CATALOG_TIMEOUT_MS = 10_000;
const COLLECTION_CATALOG_CLIENT_TIMEOUT_MS = 8_000;
const COLLECTION_SET_CARDS_CLIENT_TIMEOUT_MS = 8_000;
const COLLECTION_SET_CARDS_FALLBACK_TIMEOUT_MS = 15_000;
const COLLECTION_ALBUM_TIMEOUT_MS = 15_000;

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

export function resolveTcgLang(lang: string | null | undefined): TCGCardLanguage {
  const normalized = normalizeTCGCardLanguage(lang, DEFAULT_TCG_CARD_LANGUAGE) ?? DEFAULT_TCG_CARD_LANGUAGE;
  return unsupportedTcgLangs.has(normalized) ? DEFAULT_TCG_CARD_LANGUAGE : normalized;
}

export function isTcgLangSupported(lang: string): boolean {
  if (!isTCGCardLanguage(lang)) return false;
  return !unsupportedTcgLangs.has(lang);
}

export function getUnsupportedTcgLangs(): readonly string[] {
  return Array.from(unsupportedTcgLangs);
}

export function isTcgLangLimited(lang: string): boolean {
  return isTCGCardLanguage(lang) && limitedTcgLangs.has(lang);
}

function getWithOptionalSignal<T>(url: string, signal?: AbortSignal) {
  return signal ? tcgClient.get<T>(url, { signal }) : tcgClient.get<T>(url);
}

function createCollectionRequestSignal(signal: AbortSignal | undefined, timeoutMs: number): AbortSignal {
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  return signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;
}

function getCollectionSetCatalogCacheKey(language: string): string {
  return `tcg-collection-set-catalog-v1-${resolveTcgLang(language)}`;
}

function throwIfAborted(signal?: AbortSignal) {
  if (!signal?.aborted) return;
  throw signal.reason ?? new DOMException('Aborted', 'AbortError');
}

function isNotFoundResponse(error: unknown): boolean {
  if (!error || typeof error !== 'object' || !('response' in error)) return false;

  const response = (error as { response?: unknown }).response;
  return Boolean(
    response
      && typeof response === 'object'
      && 'status' in response
      && response.status === 404,
  );
}

function fixTcgdexImageUrl(url: string | undefined | null): string | undefined {
  if (!url) return undefined;
  if (url.endsWith('.png') || url.endsWith('.jpg') || url.endsWith('.webp') || url.endsWith('.svg')) return url;
  // Card image paths (e.g. /en/sv/sv03/001) resolve without an extension on tcgdex.net.
  // Logo/symbol paths (ending in /logo or /symbol) require .png to return the actual image.
  if (url.includes('tcgdex.net') && !url.endsWith('/logo') && !url.endsWith('/symbol')) return url;
  return `${url}.png`;
}

function localizeTcgdexAssetUrl(url: string | undefined, lang: string): string | undefined {
  if (!url) return url;

  try {
    const parsed = new URL(url);
    if (parsed.hostname !== 'assets.tcgdex.net' && parsed.hostname !== 'images.tcgdex.net') return url;

    const segments = parsed.pathname.split('/');
    const languageIndex = 1;
    if (!/^[a-z]{2}(?:-[a-z]{2})?$/.test(segments[languageIndex] ?? '')) return url;

    segments[languageIndex] = lang;
    parsed.pathname = segments.join('/');
    return parsed.toString();
  } catch {
    return url;
  }
}

function normaliseSet(raw: RawSet, lang = 'en'): TCGSet {
  const fromCardCount = typeof raw.cardCount?.total === 'number' ? raw.cardCount.total : undefined;
  const fromTotalCards = typeof raw.totalCards === 'number' ? raw.totalCards : undefined;
  const count = fromCardCount ?? fromTotalCards ?? 0;

  return {
    id: raw.id,
    name: raw.name,
    serie: raw.serie,
    logo: localizeTcgdexAssetUrl(fixTcgdexImageUrl(raw.logo), lang),
    symbol: localizeTcgdexAssetUrl(fixTcgdexImageUrl(raw.symbol), lang),
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

function normaliseCard(card: TCGCard, lang = 'en'): TCGCard {
  return {
    ...card,
    image: localizeTcgdexAssetUrl(fixTcgdexImageUrl(card.image), lang),
    imageUrl: localizeTcgdexAssetUrl(fixTcgdexImageUrl(card.imageUrl), lang),
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

async function resolveCardImage(card: TCGCard, lang: string, signal?: AbortSignal): Promise<TCGCard> {
  if (card.image || card.imageUrl) return card;

  const setId = card.set?.id ?? card.id.split('-')[0];
  const idLocalId = card.id.startsWith(`${setId}-`) ? card.id.slice(setId.length + 1) : undefined;
  const localId = idLocalId || card.localId || card.number;
  if (!setId || !localId) return card;

  throwIfAborted(signal);
  const set = await getSetById(setId, lang);
  throwIfAborted(signal);

  // Some legacy TCGdex sets expose neither artwork nor a card image. Do not
  // synthesize a URL for those sets: the asset host returns HTML 404s, which
  // browsers block as cross-origin image responses.
  if (!set?.logo && !set?.symbol) return card;

  const serieId = set?.serie?.id;
  if (!serieId) return card;

  return {
    ...card,
    image: undefined,
    imageUrl: `https://assets.tcgdex.net/${lang}/${serieId}/${setId}/${encodeURIComponent(localId)}`,
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
    const pageCards = Array.isArray(data) ? data.map((card) => normaliseCard(card, lang)) : [];
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
  const legalities = [...(filters.legalities ?? [])].sort().join('|');
  const ownedState = filters.ownedState ?? 'all';

  return [selectedRarity, selectedTrainerTypes, selectedEnergyTypes, illustrator, regulationMark, priceRange, releaseRange, legalities, ownedState].join('::');
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
interface GetTCGCardOptions {
  /** Keep a localized response localized instead of replacing it with English data. */
  allowEnglishFallback?: boolean;
  /** Bypass cached card summaries until a market price is available. */
  requirePricing?: boolean;
}

export const getTCGCard = async (
  cardId: string,
  lang = 'en',
  signal?: AbortSignal,
  options: GetTCGCardOptions = {},
): Promise<TCGCard | null> => {
  // Defense in depth: card ids end up concatenated into upstream URL paths.
  // Reject anything that is not a plain path-safe identifier before it can
  // reach the network layer.
  if (!isValidTcgCardId(cardId)) return null;
  const tcgLang = resolveTcgLang(lang);
  // v12 invalidates cards cached before the variant-price resolver learned to
  // preserve zero quotes and keep each finish on its exact provider tier.
  const cacheKey = `tcg-card-v12-${cardId}-${tcgLang}`;
  const allowEnglishFallback = options.allowEnglishFallback !== false;

  try {
    const cached = await getCachedData<TCGCard>(cacheKey);
    if (cached && (!options.requirePricing || hasMarketPrice(cached))) return cached;

    throwIfAborted(signal);

    const { data } = await getWithOptionalSignal<TCGCard>(`/${tcgLang}/cards/${cardId}`, signal);
    if (data) {
      const card = await resolveCardImage(normaliseCard(data, tcgLang), tcgLang, signal);
      await setCachedData(cacheKey, card);
      return card;
    }

    return null;
  } catch (error) {
    if (signal?.aborted) throw error;

    // TCGdex does not publish every card in every supported UI language.
    // Keep the localized route indexable with the English card payload rather
    // than turning a valid alternate URL into a 404.
    if (allowEnglishFallback && tcgLang !== 'en') {
      const fallbackCard = await getTCGCard(cardId, 'en', signal, options);
      if (fallbackCard) return fallbackCard;
    }

    if (!allowEnglishFallback) {
      return await getCachedData<TCGCard>(cacheKey, true);
    }

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

/**
 * Single market price used for price filtering and sorting.
 *
 * This deliberately reuses `getCardMarketValue` — the same resolution the card
 * detail modal, collection valuation, deck builder, and compare panel display —
 * so the value users see (Cardmarket EUR first, TCGplayer USD fallback) is
 * exactly the value that is filtered and sorted on. Mixing independent
 * sources/currencies here previously made "Price: High to Low" disagree with
 * the displayed prices.
 */
function getMarketPrice(card: TCGCard): number | undefined {
  const value = getCardMarketValue(card);
  return value ? value.amount : undefined;
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
      result = compareStrings(a.id, b.id, true);
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
      {
        const priceA = getMarketPrice(a);
        const priceB = getMarketPrice(b);
        if (priceA === undefined && priceB === undefined) return 0;
        if (priceA === undefined) return 1;
        if (priceB === undefined) return -1;
        result = priceA - priceB;
      }
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
 * Hydrate and aggregate only the cards currently owned by the user.
 *
 * The collection is account-backed; this intentionally fetches only the
 * currently owned card IDs instead of fetching every card in every set.
 */
export const fetchCollectionValue = async (
  ownedInput: readonly string[] | readonly TCGOwnedVariant[],
  lang = 'en',
  signal?: AbortSignal,
  displayCurrency?: TCGDisplayCurrency,
): Promise<TCGCollectionValuationResult> => {
  const ownedVariants: TCGOwnedVariant[] = [];
  const seenLegacyIds = new Set<string>();
  let physicalCount = 0;
  for (const entry of ownedInput) {
    if (typeof entry === 'string') {
      const cardId = entry.trim().toLowerCase();
      if (cardId && !seenLegacyIds.has(cardId) && physicalCount < MAX_TCG_COLLECTION_PHYSICAL_CARDS) {
        seenLegacyIds.add(cardId);
        ownedVariants.push({ cardId, variant: 'unspecified', quantity: 1 });
        physicalCount += 1;
      }
      continue;
    }

    if (!entry || typeof entry !== 'object') continue;
    const candidate = entry as Partial<TCGOwnedVariant>;
    const cardId = typeof candidate.cardId === 'string' ? candidate.cardId.trim().toLowerCase() : '';
    const variant = candidate.variant;
    const quantity = candidate.quantity;
    if (!cardId || (variant !== 'normal' && variant !== 'reverse' && variant !== 'holo' && variant !== 'unspecified')) continue;
    if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity <= 0 || quantity > MAX_TCG_COLLECTION_PHYSICAL_CARDS) continue;
    if (physicalCount + quantity > MAX_TCG_COLLECTION_PHYSICAL_CARDS) continue;
    ownedVariants.push({ cardId, variant, quantity });
    physicalCount += quantity;
  }
  const uniqueIds = [...new Set(ownedVariants.map((entry) => entry.cardId))];
  if (uniqueIds.length === 0) {
    return { groups: [], ownedCount: 0, pricedCount: 0, unpricedCount: 0, bySet: {} };
  }

  const cards = await mapWithConcurrency(
    uniqueIds,
    VISUAL_METADATA_CONCURRENCY,
    async (cardId) => {
      throwIfAborted(signal);
      return getTCGCard(cardId, lang, signal, { requirePricing: true });
    },
  );
  const collectionCards = cards
    .filter((card): card is TCGCard => Boolean(card))
    .map((card) => toCollectionCard(card, undefined, displayCurrency));
  const valuation = aggregateCollectionValueWithVariants(collectionCards, ownedVariants, displayCurrency);
  const ownedCount = ownedVariants.reduce((sum, entry) => sum + entry.quantity, 0);

  return {
    ...valuation,
    // A missing detail response is still an owned physical card without a price.
    ownedCount,
    unpricedCount: Math.max(0, ownedCount - valuation.pricedCount),
  };
};


/**
 * Fetches all cards from a given set.
 */
export const getCardsBySet = async (
  setId: string,
  lang = 'en',
  signal?: AbortSignal,
): Promise<TCGCard[]> => {
  const tcgLang = resolveTcgLang(lang);
  // v6 invalidates earlier partial-set caches so public checklist pages can
  // safely hydrate the complete set response before becoming indexable.
  const cacheKey = `tcg-set-cards-v6-${setId}-${tcgLang}`;

  try {
    const cached = await getCachedData<TCGCard[]>(cacheKey);
    // Empty responses are not useful cache entries: they can be produced by a
    // transient upstream failure while the set is still available.
    if (cached?.length) return cached;

    const { data } = await getWithOptionalSignal<Omit<RawSet, 'cards'> & { cards: TCGCard[] }>(
      `/${tcgLang}/sets/${setId}`,
      signal,
    );
    const cards = data.cards?.filter((card) => card && card.id).map((card) => normaliseCard({ ...card, source: 'TCGames' }, tcgLang)) || [];

    if (cards.length > 0) await setCachedData(cacheKey, cards);
    return cards;
  } catch (error) {
    if (signal?.aborted) throw error;

    if (tcgLang !== 'en') {
      const fallbackCards = await getCardsBySet(setId, 'en', signal);
      if (fallbackCards.length > 0) return fallbackCards;
    }

    console.error(`[TCG API] Error fetching cards for set ${setId}:`, error);
    return (await getCachedData<TCGCard[]>(cacheKey, true)) || [];
  }
};

function isRawSetBrief(value: unknown): value is RawSet {
  if (!value || typeof value !== 'object') return false;
  const set = value as Partial<RawSet>;
  return typeof set.id === 'string' && typeof set.name === 'string';
}

function isRawSetCard(value: unknown): value is TCGCard {
  if (!value || typeof value !== 'object') return false;
  const card = value as Partial<TCGCard>;
  return (
    typeof card.id === 'string'
    && typeof card.localId === 'string'
    && typeof card.name === 'string'
  );
}

function normaliseCollectionSetAlbum(
  raw: RawSet,
  language: string,
  expectedSetId: string,
): TCGSetAlbumData | null {
  // TCGdex occasionally canonicalizes the casing of an identifier in the
  // response (for example, `XY10` is returned as `xy10` in English). Treat
  // that as the same set while retaining the canonical payload identifier.
  if (raw.id.trim().toLowerCase() !== expectedSetId.trim().toLowerCase() || !Array.isArray(raw.cards)) {
    throw new Error(`Invalid TCGdex set response for ${expectedSetId}`);
  }

  if (raw.cards.some((card) => !isRawSetCard(card))) {
    throw new Error(`Invalid TCGdex card response for ${expectedSetId}`);
  }

  const cards = raw.cards.map((card) => normaliseCard({ ...card, source: 'TCGames' }, language));
  if (cards.length === 0) return null;

  return {
    set: {
      ...normaliseSet(raw, language),
      // The collection must count cards that can actually be displayed in the
      // selected language, not a declared count for an unavailable locale.
      totalCards: cards.length,
    },
    cards,
    dataLanguage: language,
  };
}

async function fetchCollectionSetAlbumForLanguage(
  setId: string,
  language: string,
  signal?: AbortSignal,
): Promise<TCGSetAlbumData | null> {
  const encodedSetId = encodeURIComponent(setId);
  const { data } = await getWithOptionalSignal<RawSet>(`/${language}/sets/${encodedSetId}`, signal);
  return normaliseCollectionSetAlbum(data, language, setId);
}

/**
 * Fetch one collection album as a single set response. Empty localized sets
 * may use the same-ID English response, while transient failures stay
 * retryable and are never converted into an empty album.
 */
export const getCollectionSetAlbum = async (
  setId: string,
  lang = 'en',
  signal?: AbortSignal,
): Promise<TCGSetAlbumData | null> => {
  const tcgLang = resolveTcgLang(lang);
  const cacheKey = `tcg-collection-set-album-v1-${setId}-${tcgLang}`;
  const cached = await getCachedData<TCGSetAlbumData>(cacheKey);
  if (cached?.cards.length) return cached;
  const requestSignal = createCollectionRequestSignal(signal, COLLECTION_ALBUM_TIMEOUT_MS);

  try {
    let album: TCGSetAlbumData | null;
    try {
      album = await fetchCollectionSetAlbumForLanguage(setId, tcgLang, requestSignal);
    } catch (error) {
      if (!isNotFoundResponse(error)) throw error;
      album = null;
    }

    if (!album && tcgLang !== 'en') {
      try {
        album = await fetchCollectionSetAlbumForLanguage(setId, 'en', requestSignal);
      } catch (error) {
        if (!isNotFoundResponse(error)) throw error;
        album = null;
      }
    }

    if (album) await setCachedData(cacheKey, album);
    return album;
  } catch (error) {
    if (signal?.aborted) throw error;
    const staleAlbum = await getCachedData<TCGSetAlbumData>(cacheKey, true);
    if (staleAlbum?.cards.length) return staleAlbum;
    throw error;
  }
};

/**
 * Collection-specific catalog loader. The ordered brief list is intentionally
 * kept as a compact manifest; localized card availability is resolved when a
 * user opens an album instead of probing every set on the landing page.
 */
export const getCollectionSetCatalog = async (
  lang = 'en',
  signal?: AbortSignal,
): Promise<TCGCollectionSetSummary[]> => {
  const tcgLang = resolveTcgLang(lang);
  const cacheKey = getCollectionSetCatalogCacheKey(tcgLang);
  const cached = await getCachedData<TCGCollectionSetSummary[]>(cacheKey);
  if (cached?.length) return cached;

  try {
    const { data } = await tcgClient.get<RawSet[]>(
      `/${tcgLang}/sets?sort:field=releaseDate&sort:order=DESC`,
      { signal: createCollectionRequestSignal(signal, COLLECTION_CATALOG_TIMEOUT_MS) },
    );
    if (!Array.isArray(data)) throw new Error('Invalid TCGdex set catalog response');

    const listedSets = data
      .map((raw, index) => {
        if (!isRawSetBrief(raw)) throw new Error('Invalid TCGdex set catalog item');
        const normalized = normaliseSet(raw, tcgLang);
        return {
          ...normalized,
          totalCards: normalized.totalCards ?? 0,
          releaseRank: index,
          dataLanguage: tcgLang,
        } satisfies TCGCollectionSetSummary;
      })
      .filter((set) => (set.totalCards ?? 0) > 0);

    if (listedSets.length === 0) throw new Error('TCGdex returned no usable sets');

    // The ordered list is the compact collection manifest. Validate card data
    // only when an authenticated user opens a set; probing every Japanese or
    // Korean set here turns the landing page into an N+1 request waterfall.
    await setCachedData(cacheKey, listedSets);
    return listedSets;
  } catch (error) {
    if (signal?.aborted) throw error;
    if (cached?.length) return cached;
    const staleCatalog = await getCachedData<TCGCollectionSetSummary[]>(cacheKey, true);
    if (staleCatalog?.length) return staleCatalog;
    throw error;
  }
};

export function isCollectionSetSummary(value: unknown): value is TCGCollectionSetSummary {
  if (!value || typeof value !== 'object') return false;
  const set = value as Partial<TCGCollectionSetSummary>;
  return (
    typeof set.id === 'string'
    && typeof set.name === 'string'
    && typeof set.releaseRank === 'number'
    && Number.isInteger(set.releaseRank)
    && set.releaseRank >= 0
    && typeof set.dataLanguage === 'string'
    && (set.totalCards ?? 0) > 0
  );
}

function isCollectionCard(value: unknown): value is TCGCollectionCard {
  if (!value || typeof value !== 'object') return false;
  const card = value as Partial<TCGCollectionCard>;
  return (
    typeof card.id === 'string'
    && typeof card.localId === 'string'
    && typeof card.name === 'string'
    && typeof card.setId === 'string'
  );
}

function hasCollectionCardValue(card: TCGCollectionCard): boolean {
  return Boolean(
    card.value
    && Number.isFinite(card.value.amount)
    && typeof card.value.currency === 'string'
    && card.value.currency.length > 0,
  );
}

async function hydrateCollectionCardValues(
  cards: TCGCollectionCard[],
  lang: string,
  signal?: AbortSignal,
): Promise<TCGCollectionCard[]> {
  if (cards.length === 0) return cards;

  const hydrationSignal = createCollectionRequestSignal(signal, COLLECTION_SET_CARDS_FALLBACK_TIMEOUT_MS);
  return mapWithConcurrency(cards, VISUAL_METADATA_CONCURRENCY, async (card) => {
    if (hydrationSignal.aborted) return card;

    try {
      const fullCard = await getTCGCard(
        card.id,
        lang,
        hydrationSignal,
        { requirePricing: true },
      );
      return fullCard ? { ...card, ...toCollectionCard(fullCard, card.setId) } : card;
    } catch (error) {
      if (signal?.aborted) throw error;
      return card;
    }
  });
}

/** Fetch the collection catalog through the same-origin cached route. */
export const fetchCollectionSetCatalog = async (
  lang = 'en',
  signal?: AbortSignal,
): Promise<TCGCollectionSetSummary[]> => {
  const params = new URLSearchParams({ tcgLang: lang });
  try {
    const response = await fetch(
      `/api/tcg/sets?${params.toString()}`,
      { signal: createCollectionRequestSignal(signal, COLLECTION_CATALOG_CLIENT_TIMEOUT_MS) },
    );
    if (!response.ok) throw new Error(`Collection catalog request failed (${response.status})`);

    const payload: unknown = await response.json();
    if (!payload || typeof payload !== 'object' || !('sets' in payload)) {
      throw new Error('Invalid collection catalog response');
    }

    const sets = (payload as { sets?: unknown }).sets;
    if (!Array.isArray(sets) || sets.length === 0 || !sets.every(isCollectionSetSummary)) {
      throw new Error('Collection catalog is empty or malformed');
    }

    // Keep the public manifest available to the installed PWA when its server
    // route or the upstream catalog is temporarily unavailable.
    void setCachedData(getCollectionSetCatalogCacheKey(lang), sets);
    return sets;
  } catch (error) {
    if (signal?.aborted) throw error;
  }

  // The browser can still reach TCGdex when the server function is cold,
  // blocked, or stale. This also returns the local IndexedDB snapshot first.
  return getCollectionSetCatalog(lang, signal);
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
  signal?: AbortSignal,
): Promise<TCGCollectionCard[]> => {
  const tcgLang = resolveTcgLang(lang);
  const summaries = await getCardsBySet(setId, tcgLang, signal);
  if (summaries.length === 0) return [];

  const limited = summaries.slice(0, Math.max(0, maxCards));
  const hydrated = await mapWithConcurrency(limited, VISUAL_METADATA_CONCURRENCY, async (card) => {
    const full = await getTCGCard(card.id, tcgLang, signal, { requirePricing: true }).catch((error) => {
      if (signal?.aborted) throw error;
      return null;
    });
    return toCollectionCard(full ?? card, setId);
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
  const params = new URLSearchParams({ setId, tcgLang: lang });
  try {
    const response = await fetch(
      `/api/tcg/collection/set-cards?${params.toString()}`,
      { signal: createCollectionRequestSignal(signal, COLLECTION_SET_CARDS_CLIENT_TIMEOUT_MS) },
    );
    if (response.ok) {
      const payload: unknown = await response.json();
      const rawCards = payload && typeof payload === 'object' && 'cards' in payload
        ? (payload as { cards?: unknown }).cards
        : undefined;
      if (Array.isArray(rawCards)) {
        const cards = rawCards.filter(isCollectionCard);
        if (cards.length === rawCards.length && cards.length > 0) {
          const cardsWithoutPrices = cards.filter((card) => !hasCollectionCardValue(card));
          if (cardsWithoutPrices.length === 0) return cards;

          const hydratedCards = await hydrateCollectionCardValues(cardsWithoutPrices, lang, signal);
          const hydratedById = new Map(hydratedCards.map((card) => [card.id, card]));
          return cards.map((card) => hydratedById.get(card.id) ?? card);
        }
      }
    }
  } catch (error) {
    if (signal?.aborted) throw error;
  }

  // The server route may be unable to reach TCGdex while the browser can. The
  // lightweight set listing contains no prices, so hydrate its cards directly
  // before rendering collection values.
  const fallbackCards = await getCardsBySet(setId, lang, signal);
  const collectionCards = fallbackCards.map((card) => toCollectionCard(card, setId));
  return hydrateCollectionCardValues(collectionCards, lang, signal);
};

/**
 * Fetch all available expansion sets, enriched with releaseDate.
 * For non-English languages, also filters out sets that have no card data
 * on TCGdex (e.g. Korean SV6/SV5a report cards in the listing but the
 * detail endpoint returns an empty `cards` array).
 */
export const getAllSets = async (lang = 'en'): Promise<TCGSet[]> => {
  const tcgLang = resolveTcgLang(lang);
  const cacheKey = `tcg-all-sets-v8-${tcgLang}`;
  // The set list changes when a new expansion releases. Keep IndexedDB as an
  // offline fallback, but always give the live API the first opportunity to
  // provide the latest list.
  const cachedSets = await getCachedData<TCGSet[]>(cacheKey);

  try {
    const { data } = await tcgClient.get<RawSet[]>(`/${tcgLang}/sets`);
    const sets = data.map((set) => normaliseSet(set, tcgLang));

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

    if (sortedSets.length > 0 || !cachedSets?.length) {
      await setCachedData(cacheKey, sortedSets);
    }
    return sortedSets.length > 0 ? sortedSets : (cachedSets ?? []);
  } catch (error) {
    console.error('[TCG API] Error fetching all sets:', error);
    const fallbackSets = cachedSets ?? (await getCachedData<TCGSet[]>(cacheKey, true));
    return fallbackSets ?? [];
  }
};

/**
 * Fetch set details by ID.
 */
export const getSetById = async (setId: string, lang = 'en'): Promise<TCGSet | null> => {
  const tcgLang = resolveTcgLang(lang);
  const cacheKey = `tcg-set-v10-${setId}-${tcgLang}`;

  try {
    const cached = await getCachedData<TCGSet>(cacheKey);
    if (cached) return cached;

    const { data } = await tcgClient.get<RawSet>(`/${tcgLang}/sets/${setId}`);
    const set = normaliseSet(data, tcgLang);
    await setCachedData(cacheKey, set);
    return set;
  } catch (error) {
    const staleSet = await getCachedData<TCGSet>(cacheKey, true);
    if (staleSet) return staleSet;

    if (tcgLang !== 'en') {
      try {
        const englishSet = await getSetById(setId, 'en');
        if (englishSet) {
          await setCachedData(cacheKey, englishSet);
          return englishSet;
        }
      } catch (fallbackError) {
        // A network or upstream failure is temporary. Throwing keeps Next's
        // persistent cache from storing it as a missing set for an hour.
        console.error(`[TCG API] Error fetching fallback set ${setId}:`, fallbackError);
        throw fallbackError;
      }
    }

    if (isNotFoundResponse(error)) return null;

    // Only a confirmed 404 means the identifier is absent. Other failures
    // must remain retryable instead of being cached as a route-level 404.
    console.error(`[TCG API] Error fetching set ${setId}:`, error);
    throw error;
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
    Boolean(filters.releaseStart || filters.releaseEnd) ||
    Boolean(filters.legalities?.length) ||
    Boolean(filters.ownedState && filters.ownedState !== 'all');
  const sortBy = filters.sortBy ?? 'name';
  const sortOrder = filters.sortOrder ?? 'asc';
  const requiresPriceHydration = sortBy === 'marketPrice';
  const requiresLocalSorting = !['name', 'id', 'hp', 'rarity'].includes(sortBy);
  // `number`, `id`, and `marketPrice` cannot be ordered remotely: the list
  // endpoint carries no pricing, so price sorts must hydrate and rank the
  // complete result set (bounded by MAX_REMOTE_PAGES) — ranking only the first
  // alphabetically-ordered pages would silently drop expensive cards that sit
  // deeper in the set.
  const requiresFullDatasetSort = sortBy === 'number' || sortBy === 'id' || sortBy === 'marketPrice';
  const dependsOnLocalOwnership = Boolean(filters.ownedState && filters.ownedState !== 'all');
  const cacheKey = fetchAll
    ? `tcg-catalog-all-v14-${tcgLang}-${query}-${serializeLocalOnlyFilters(filters)}-${sortBy}-${sortOrder}`
    : `tcg-catalog-v14-${tcgLang}-${query}-p${safePage}-l${safeLimit}-local-${serializeLocalOnlyFilters(filters)}-${sortBy}-${sortOrder}`;

  try {
    if (!dependsOnLocalOwnership) {
      const cached = await getCachedData<TCGCatalogPageResult>(cacheKey);
      if (cached) return cached;
    }

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
          const normalized = Array.isArray(data) ? data.map((card) => normaliseCard(card, tcgLang)) : [];
          allCards.push(...normalized);
          hasMoreRemote = normalized.length === ALL_PAGE_SIZE;
          remotePage += 1;
        }

        const sorted = [...allCards].sort((a, b) => compareCards(a, b, sortBy, sortOrder));
        const pageCards = await hydrateCardsForVisualEffects(sorted, tcgLang, signal);
        const result = { cards: pageCards, hasMore: false };

        if (!dependsOnLocalOwnership) await setCachedData(cacheKey, result);
        return result;
      }

      const { data } = await getWithOptionalSignal<TCGCard[]>(`/${tcgLang}/cards?${query}`, signal);
      throwIfAborted(signal);
      const normalized = Array.isArray(data) ? data.map((card) => normaliseCard(card, tcgLang)) : [];
      const sorted = [...normalized].sort((a, b) => compareCards(a, b, filters.sortBy ?? 'name', filters.sortOrder ?? 'asc'));
      const pageCards = await hydrateCardsForVisualEffects(sorted.slice(0, safeLimit), tcgLang, signal);
      const result = {
        cards: pageCards,
        hasMore: Array.isArray(data) ? data.length > safeLimit : false,
      };

      if (!dependsOnLocalOwnership) await setCachedData(cacheKey, result);
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
      const normalized = Array.isArray(data) ? data.map((card) => normaliseCard(card, tcgLang)) : [];
      const hydrated = hasLocalOnlyFilters || requiresPriceHydration
        ? await mapWithConcurrency(normalized, VISUAL_METADATA_CONCURRENCY, async (card) => {
              if (!requiresPriceHydration && !shouldHydrateForLocalFilters(card, filters)) {
                return card;
              }

              const fullCard = await getTCGCard(card.id, tcgLang, signal);
              return fullCard ?? card;
            })
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

    if (!dependsOnLocalOwnership) await setCachedData(cacheKey, result);
    return result;
  } catch (error) {
    if (signal?.aborted) throw error;
    console.error('[TCG API] Error in searchCards:', error);
    const staleCached = dependsOnLocalOwnership
      ? null
      : await getCachedData<TCGCatalogPageResult>(cacheKey, true);
    if (staleCached) return staleCached;
    throw error;
  }
};

/**
 * Fetch available filter options for the catalog.
 */
export const getFilterOptions = async (lang = 'en'): Promise<TCGFilterOptions> => {
  const tcgLang = resolveTcgLang(lang);
  const cacheKey = `tcg-filter-options-v7-${tcgLang}`;
  const cached = await getCachedData<TCGFilterOptions>(cacheKey);

  try {
    const sets = await getAllSets(tcgLang);
    const options: TCGFilterOptions = {
      categories: cached?.categories ?? TCG_CARD_CATEGORIES,
      sets,
      pokemonTypes: cached?.pokemonTypes ?? TCG_POKEMON_TYPES,
      trainerTypes: cached?.trainerTypes ?? TCG_TRAINER_TYPES,
      energyTypes: cached?.energyTypes ?? TCG_ENERGY_TYPES,
      stages: cached?.stages ?? TCG_POKEMON_STAGES,
      rarities: cached?.rarities ?? TCG_GLOBAL_RARITIES,
    };

    await setCachedData(cacheKey, options);
    return options;
  } catch (error) {
    console.error('[TCG API] Error fetching filter options:', error);
    return (
      cached ?? (await getCachedData<TCGFilterOptions>(cacheKey, true)) ?? {
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
 * Fetch card summaries by Pokémon name in the requested TCGdex language.
 *
 * TCGdex does not always index a localized card under the translated Pokémon
 * name. When that happens, use the English index only to discover stable card
 * IDs, then hydrate each card from the requested locale. This keeps the card
 * artwork and printed text in the same language as the page.
 *
 * The localized search endpoint already provides the identity and image needed
 * by the grid. Detail hydration is only used when the localized index cannot
 * find the Pokémon, so the English index can be used for IDs without leaking
 * English card payloads into the localized grid.
 */
export const getPokemonCards = async (
  pokemonName: string,
  lang = 'en',
  englishName?: string,
): Promise<TCGCard[]> => {
  const tcgLang = resolveTcgLang(lang);
  const cacheKey = `tcg-pokemon-cards-v13-${tcgLang}-${pokemonName}`;

  try {
    const cached = await getCachedData<TCGCard[]>(cacheKey);
    if (cached) return sortCardsByReleaseDate(cached);

    const searchFilters: TCGCardFilters = {
      selectedCategory: 'Pokemon',
      searchTerm: pokemonName,
      sortBy: 'name',
      sortOrder: 'asc',
    };

    const searchTerms = [pokemonName];
    if (englishName && englishName.trim().toLowerCase() !== pokemonName.trim().toLowerCase()) {
      searchTerms.push(englishName);
    }

    let cards: TCGCard[] = [];
    for (const searchTerm of searchTerms) {
      cards = await fetchAllCardSearchPages({ ...searchFilters, searchTerm }, tcgLang);
      if (cards.length > 0) break;
    }

    if (cards.length === 0 && tcgLang !== 'en' && englishName) {
      const englishSummaries = await fetchAllCardSearchPages({ ...searchFilters, searchTerm: englishName }, 'en');
      const localizedCards = await mapWithConcurrency(
        englishSummaries,
        VISUAL_METADATA_CONCURRENCY,
        (card) => getTCGCard(card.id, tcgLang, undefined, { allowEnglishFallback: false }),
      );

      // Do not put an English card into a localized page when TCGdex has no
      // localized detail for that card. Showing fewer cards is preferable to
      // silently mixing languages in the same grid.
      cards = localizedCards.filter((card): card is TCGCard => Boolean(card));
    }

    const sorted = sortCardsByReleaseDate(cards);
    await setCachedData(cacheKey, sorted);
    return sorted;
  } catch (error) {
    console.error(`[TCG API] Error fetching cards for ${pokemonName}:`, error);
    const staleCached = await getCachedData<TCGCard[]>(cacheKey, true);
    return staleCached ? sortCardsByReleaseDate(staleCached) : [];
  }
};

/** Sort a Pokémon's TCG appearances from the newest expansion to the oldest. */
export function sortCardsByReleaseDate(cards: TCGCard[]): TCGCard[] {
  return [...cards].sort((a, b) => {
    const dateA = a.set?.releaseDate ? new Date(a.set.releaseDate).getTime() : Number.NEGATIVE_INFINITY;
    const dateB = b.set?.releaseDate ? new Date(b.set.releaseDate).getTime() : Number.NEGATIVE_INFINITY;
    const safeDateA = Number.isNaN(dateA) ? Number.NEGATIVE_INFINITY : dateA;
    const safeDateB = Number.isNaN(dateB) ? Number.NEGATIVE_INFINITY : dateB;

    if (safeDateA !== safeDateB) return safeDateB - safeDateA;
    return compareCollectorNumbers(a.localId, b.localId);
  });
}

interface RawSet {
  id: string;
  name: string;
  logo?: string;
  symbol?: string;
  releaseDate?: string;
  serie?: { id: string; name: string };
  cardCount?: { total?: number };
  totalCards?: number;
  legalities?: { unlimited?: string; standard?: string; expanded?: string };
  cards?: TCGCard[];
}

export { buildCardQueryParams };
