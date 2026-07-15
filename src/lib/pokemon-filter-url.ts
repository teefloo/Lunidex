import { TYPE_COLORS } from '@/types/pokemon';

export const HOME_SORT_VALUES = [
  'id-asc',
  'id-desc',
  'name-asc',
  'name-desc',
  'height-asc',
  'height-desc',
  'weight-asc',
  'weight-desc',
] as const;

export type HomeSortValue = typeof HOME_SORT_VALUES[number];
export type HomeViewValue = 'all' | 'caught' | 'missing';

export interface HomeFilterUrlState {
  q?: string;
  types?: string[];
  gen?: number;
  sort?: HomeSortValue;
  view?: HomeViewValue;
  fav?: boolean;
}

const validTypes = new Set(Object.keys(TYPE_COLORS));
const validSorts = new Set<HomeSortValue>(HOME_SORT_VALUES);

export function parseHomeFilters(params: Pick<URLSearchParams, 'get'>): HomeFilterUrlState {
  const result: HomeFilterUrlState = {};
  const query = params.get('q');
  const types = params.get('types');
  const generation = params.get('gen');
  const sort = params.get('sort');
  const view = params.get('view');

  if (query !== null) result.q = query;
  if (types !== null) {
    const parsedTypes = types
      .split(',')
      .map((type) => type.trim().toLowerCase())
      .filter((type, index, all) => validTypes.has(type) && all.indexOf(type) === index);
    if (parsedTypes.length > 0) result.types = parsedTypes;
  }

  if (generation !== null && /^[1-9]$/.test(generation)) {
    result.gen = Number(generation);
  }

  if (sort !== null && validSorts.has(sort as HomeSortValue)) {
    result.sort = sort as HomeSortValue;
  }

  if (view === 'all' || view === 'caught' || view === 'missing') {
    result.view = view;
  }

  if (params.get('fav') === '1') result.fav = true;

  return result;
}

export function serializeHomeFilters(state: {
  searchTerm: string;
  selectedTypes: string[];
  selectedGeneration: number | null;
  sortBy: HomeSortValue;
  showCaughtOnly: 'all' | 'caught' | 'uncaught';
  showFavoritesOnly: boolean;
}): string {
  const params = new URLSearchParams();
  const search = state.searchTerm.trim();
  const types = state.selectedTypes.filter((type) => validTypes.has(type));

  if (search) params.set('q', search);
  if (types.length > 0) params.set('types', types.join(','));
  if (state.selectedGeneration !== null) params.set('gen', String(state.selectedGeneration));
  if (state.sortBy !== 'id-asc') params.set('sort', state.sortBy);
  if (state.showCaughtOnly !== 'all') {
    params.set('view', state.showCaughtOnly === 'caught' ? 'caught' : 'missing');
  }
  if (state.showFavoritesOnly) params.set('fav', '1');

  return params.toString();
}
