import type {
  TCGCard,
  TCGCardFilters,
  TCGCardViewMode,
  TCGOwnedState,
  TCGSavedSearch,
  TCGSearchFacets,
  TCGSearchInsights,
} from '@/types/tcg';

type SearchParamsLike = Pick<URLSearchParams, 'get'>;

export interface TCGSearchState {
  filters: TCGCardFilters;
  viewMode: TCGCardViewMode;
  compare: string[];
}

const DEFAULT_VIEW_MODE: TCGCardViewMode = 'visual';

export function parseTCGSearchState(searchParams: SearchParamsLike): TCGSearchState {
  const viewMode = normalizeViewMode(readString(searchParams, 'view') as TCGCardViewMode | string | null | undefined);
  const filters: TCGCardFilters = {
    searchTerm: readString(searchParams, 'q') || undefined,
    selectedCategory: (readString(searchParams, 'category') as TCGCardFilters['selectedCategory']) ?? 'all',
    selectedSet: readString(searchParams, 'set') || null,
    selectedRarity: readString(searchParams, 'rarity') || null,
    selectedTypes: readList(searchParams, 'types'),
    selectedPhase: readString(searchParams, 'stage') || null,
    selectedTrainerTypes: readList(searchParams, 'trainer'),
    selectedEnergyTypes: readList(searchParams, 'energy'),
    minHp: readNumber(searchParams, 'minHp'),
    maxHp: readNumber(searchParams, 'maxHp'),
    illustrator: readString(searchParams, 'illustrator') || undefined,
    regulationMark: readString(searchParams, 'regulation') || undefined,
    legalities: readList(searchParams, 'legal').filter(Boolean) as TCGCardFilters['legalities'],
    priceMin: readNumber(searchParams, 'priceMin'),
    priceMax: readNumber(searchParams, 'priceMax'),
    releaseStart: readString(searchParams, 'releaseStart') || undefined,
    releaseEnd: readString(searchParams, 'releaseEnd') || undefined,
    ownedState: (readString(searchParams, 'owned') as TCGOwnedState) || 'all',
    sortBy: (readString(searchParams, 'sortBy') as TCGCardFilters['sortBy']) || 'name',
    sortOrder: (readString(searchParams, 'sortOrder') as TCGCardFilters['sortOrder']) || 'asc',
  };

  return {
    filters,
    viewMode,
    compare: readList(searchParams, 'compare'),
  };
}

export function serializeTCGSearchState(state: TCGSearchState): string {
  const params = new URLSearchParams();
  const { filters, viewMode, compare } = state;
  const normalizedViewMode = normalizeViewMode(viewMode);

  writeString(params, 'q', filters.searchTerm);
  writeString(params, 'category', filters.selectedCategory && filters.selectedCategory !== 'all' ? filters.selectedCategory : undefined);
  writeString(params, 'set', filters.selectedSet ?? undefined);
  writeString(params, 'rarity', filters.selectedRarity ?? undefined);
  writeList(params, 'types', filters.selectedTypes);
  writeString(params, 'stage', filters.selectedPhase ?? undefined);
  writeList(params, 'trainer', filters.selectedTrainerTypes);
  writeList(params, 'energy', filters.selectedEnergyTypes);
  writeNumber(params, 'minHp', filters.minHp);
  writeNumber(params, 'maxHp', filters.maxHp);
  writeString(params, 'illustrator', filters.illustrator);
  writeString(params, 'regulation', filters.regulationMark);
  writeList(params, 'legal', filters.legalities);
  writeNumber(params, 'priceMin', filters.priceMin);
  writeNumber(params, 'priceMax', filters.priceMax);
  writeString(params, 'releaseStart', filters.releaseStart);
  writeString(params, 'releaseEnd', filters.releaseEnd);
  writeString(params, 'owned', filters.ownedState && filters.ownedState !== 'all' ? filters.ownedState : undefined);
  writeString(params, 'sortBy', filters.sortBy);
  writeString(params, 'sortOrder', filters.sortOrder);
  writeString(params, 'view', normalizedViewMode !== DEFAULT_VIEW_MODE ? normalizedViewMode : undefined);
  writeList(params, 'compare', compare);

  return params.toString();
}

export function buildTCGSearchInsights(
  cards: TCGCard[],
  facets?: TCGSearchFacets | null,
): TCGSearchInsights {
  const topSets = facets?.sets ?? [];
  const topRarities = facets?.rarities ?? [];
  const topTypes = facets?.types ?? [];

  return {
    totalResults: cards.length,
    totalSets: topSets.length,
    activeSet: null,
    topRarities: topRarities.slice(0, 5),
    topTypes: topTypes.slice(0, 5),
    lines: buildInsightLines(cards, facets),
  };
}

export function summarizeSearch(cards: TCGCard[], filters: TCGCardFilters): TCGSavedSearch {
  return {
    id: createSearchId(filters),
    name: filters.searchTerm?.trim() || 'TCG Search',
    query: serializeTCGSearchState({ filters, viewMode: 'visual', compare: [] }),
    filters,
    viewMode: 'visual',
    createdAt: new Date().toISOString(),
  };
}

export function createSearchId(filters: TCGCardFilters): string {
  return `search_${hashString(JSON.stringify(filters))}`;
}

export function getPriceSnapshot(card: TCGCard): number | undefined {
  const candidate = card.pricing?.tcgplayer as { market?: number; low?: number; mid?: number } | undefined;
  return candidate?.market ?? candidate?.mid ?? candidate?.low;
}

export function formatTCGCardCount(count: number): string {
  return new Intl.NumberFormat().format(count);
}

function buildInsightLines(cards: TCGCard[], facets?: TCGSearchFacets | null) {
  const setCount = facets?.sets?.length ?? 0;
  const pokemonCount = cards.filter((card) => card.category === 'Pokemon').length;
  const trainerCount = cards.filter((card) => card.category === 'Trainer').length;
  const energyCount = cards.filter((card) => card.category === 'Energy').length;
  const topRarity = facets?.rarities?.[0];

  return [
    { label: 'Results', value: formatTCGCardCount(cards.length), tone: 'primary' as const },
    { label: 'Sets', value: formatTCGCardCount(setCount), tone: 'default' as const },
    { label: 'Pokemon', value: formatTCGCardCount(pokemonCount), tone: 'success' as const },
    { label: 'Trainer', value: formatTCGCardCount(trainerCount), tone: 'warning' as const },
    { label: 'Energy', value: formatTCGCardCount(energyCount), tone: 'warning' as const },
    { label: 'Top rarity', value: topRarity ? `${topRarity.label} (${topRarity.count})` : 'None', tone: 'default' as const },
  ];
}

function readString(searchParams: SearchParamsLike, key: string) {
  const value = searchParams.get(key)?.trim();
  return value ? value : '';
}

function readList(searchParams: SearchParamsLike, key: string) {
  const value = searchParams.get(key)?.trim();
  if (!value) return [];
  return value.split(',').map((item: string) => item.trim()).filter(Boolean);
}

function readNumber(searchParams: SearchParamsLike, key: string) {
  const value = searchParams.get(key)?.trim();
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function writeString(params: URLSearchParams, key: string, value?: string | null) {
  if (!value) return;
  params.set(key, value);
}

function writeNumber(params: URLSearchParams, key: string, value?: number) {
  if (typeof value !== 'number' || Number.isNaN(value)) return;
  params.set(key, String(value));
}

function writeList(params: URLSearchParams, key: string, values?: string[] | null) {
  if (!values || values.length === 0) return;
  params.set(key, values.join(','));
}

function normalizeViewMode(viewMode?: TCGCardViewMode | string | null): TCGCardViewMode {
  if (viewMode === 'compact') return DEFAULT_VIEW_MODE;
  if (viewMode === 'visual' || viewMode === 'table' || viewMode === 'scan') return viewMode;
  return DEFAULT_VIEW_MODE;
}

function hashString(input: string): string {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash.toString(36);
}
