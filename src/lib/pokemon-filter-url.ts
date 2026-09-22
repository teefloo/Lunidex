import { TYPE_COLORS } from '@/types/pokemon';
import { supportedLanguages } from '@/lib/languages';

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
  legendary?: true;
  mythical?: true;
  eggGroups?: string[];
  colors?: string[];
  shapes?: string[];
  minBst?: number;
  minAttack?: number;
  minDefense?: number;
  minSpeed?: number;
  minHp?: number;
  heightRange?: [number, number];
  weightRange?: [number, number];
}

const validTypes = new Set(Object.keys(TYPE_COLORS));
const validSorts = new Set<HomeSortValue>(HOME_SORT_VALUES);
const validEggGroups = new Set([
  'monster', 'bug', 'flying', 'field', 'fairy', 'grass', 'human-like',
  'water1', 'water2', 'water3', 'mineral', 'amorphous', 'dragon', 'no-eggs',
]);
const validColors = new Set([
  'red', 'blue', 'yellow', 'green', 'black', 'brown', 'purple', 'gray', 'white', 'pink',
]);
const validShapes = new Set([
  'ball', 'squiggle', 'fish', 'arms', 'blob', 'upright', 'legs',
  'wings', 'tentacles', 'heads', 'humanoid', 'bug-wings', 'armor',
]);

export const POKEMON_DETAIL_TABS = [
  'about',
  'stats',
  'evolution',
  'moves',
  'breeding',
  'builds',
  'locations',
  'cards',
  'sprites',
  'competitive',
] as const;

export type PokemonDetailTab = typeof POKEMON_DETAIL_TABS[number];

export interface HomeFilterUrlSerializableState {
  searchTerm: string;
  selectedTypes: string[];
  selectedGeneration: number | null;
  sortBy: HomeSortValue;
  showCaughtOnly: 'all' | 'caught' | 'uncaught';
  showFavoritesOnly: boolean;
  isLegendary: boolean | null;
  isMythical: boolean | null;
  selectedEggGroups: string[];
  selectedColors: string[];
  selectedShapes: string[];
  minBaseStats: number;
  minAttack: number;
  minDefense: number;
  minSpeed: number;
  minHp: number;
  heightRange: [number, number];
  weightRange: [number, number];
}

const parseEnumList = (value: string | null, validValues: Set<string>): string[] | undefined => {
  if (value === null) return undefined;
  const values = value
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter((item, index, all) => validValues.has(item) && all.indexOf(item) === index)
    .sort();
  return values.length > 0 ? values : undefined;
};

const parseBoundedInteger = (value: string | null, max: number): number | undefined => {
  if (value === null || !/^\d+$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 && parsed <= max ? parsed : undefined;
};

const parseBoundedRange = (value: string | null, max: number, decimals: number): [number, number] | undefined => {
  if (value === null) return undefined;
  const numberPattern = decimals === 0 ? '\\d+' : `\\d+(?:\\.\\d{1,${decimals}})?`;
  const pattern = new RegExp(`^(${numberPattern})-(${numberPattern})$`);
  const match = pattern.exec(value);
  if (!match) return undefined;
  const min = Number(match[1]);
  const maxValue = Number(match[2]);
  if (!Number.isFinite(min) || !Number.isFinite(maxValue) || min < 0 || maxValue > max || min > maxValue) {
    return undefined;
  }
  return [min, maxValue];
};

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

  if (params.get('legendary') === '1') result.legendary = true;
  if (params.get('mythical') === '1') result.mythical = true;

  const eggGroups = parseEnumList(params.get('eggs'), validEggGroups);
  if (eggGroups) result.eggGroups = eggGroups;
  const colors = parseEnumList(params.get('colors'), validColors);
  if (colors) result.colors = colors;
  const shapes = parseEnumList(params.get('shapes'), validShapes);
  if (shapes) result.shapes = shapes;

  const minBst = parseBoundedInteger(params.get('bst'), 800);
  if (minBst !== undefined && minBst > 0) result.minBst = minBst;
  const minAttack = parseBoundedInteger(params.get('atk'), 255);
  if (minAttack !== undefined && minAttack > 0) result.minAttack = minAttack;
  const minDefense = parseBoundedInteger(params.get('def'), 255);
  if (minDefense !== undefined && minDefense > 0) result.minDefense = minDefense;
  const minSpeed = parseBoundedInteger(params.get('spd'), 255);
  if (minSpeed !== undefined && minSpeed > 0) result.minSpeed = minSpeed;
  const minHp = parseBoundedInteger(params.get('hp'), 255);
  if (minHp !== undefined && minHp > 0) result.minHp = minHp;

  const heightRange = parseBoundedRange(params.get('height'), 25, 1);
  if (heightRange && (heightRange[0] > 0 || heightRange[1] < 25)) result.heightRange = heightRange;
  const weightRange = parseBoundedRange(params.get('weight'), 1200, 0);
  if (weightRange && (weightRange[0] > 0 || weightRange[1] < 1200)) result.weightRange = weightRange;

  return result;
}

export function serializeHomeFilters(state: HomeFilterUrlSerializableState): string {
  const params = new URLSearchParams();
  const search = state.searchTerm.trim();
  const types = state.selectedTypes.filter((type) => validTypes.has(type)).sort();

  if (search) params.set('q', search);
  if (types.length > 0) params.set('types', types.join(','));
  if (state.selectedGeneration !== null) params.set('gen', String(state.selectedGeneration));
  if (state.sortBy !== 'id-asc') params.set('sort', state.sortBy);
  if (state.showCaughtOnly !== 'all') {
    params.set('view', state.showCaughtOnly === 'caught' ? 'caught' : 'missing');
  }
  if (state.showFavoritesOnly) params.set('fav', '1');

  if (state.isLegendary === true) params.set('legendary', '1');
  if (state.isMythical === true) params.set('mythical', '1');

  const eggGroups = state.selectedEggGroups.filter((group) => validEggGroups.has(group)).sort();
  if (eggGroups.length > 0) params.set('eggs', eggGroups.join(','));
  const colors = state.selectedColors.filter((color) => validColors.has(color)).sort();
  if (colors.length > 0) params.set('colors', colors.join(','));
  const shapes = state.selectedShapes.filter((shape) => validShapes.has(shape)).sort();
  if (shapes.length > 0) params.set('shapes', shapes.join(','));

  if (state.minBaseStats > 0) params.set('bst', String(Math.min(800, Math.max(0, Math.round(state.minBaseStats)))));
  if (state.minAttack > 0) params.set('atk', String(Math.min(255, Math.max(0, Math.round(state.minAttack)))));
  if (state.minDefense > 0) params.set('def', String(Math.min(255, Math.max(0, Math.round(state.minDefense)))));
  if (state.minSpeed > 0) params.set('spd', String(Math.min(255, Math.max(0, Math.round(state.minSpeed)))));
  if (state.minHp > 0) params.set('hp', String(Math.min(255, Math.max(0, Math.round(state.minHp)))));

  const [minHeight, maxHeight] = state.heightRange;
  if (minHeight > 0 || maxHeight < 25) {
    params.set('height', `${Math.max(0, minHeight).toFixed(1).replace(/\.0$/, '')}-${Math.min(25, maxHeight).toFixed(1).replace(/\.0$/, '')}`);
  }
  const [minWeight, maxWeight] = state.weightRange;
  if (minWeight > 0 || maxWeight < 1200) {
    params.set('weight', `${Math.max(0, Math.round(minWeight))}-${Math.min(1200, Math.round(maxWeight))}`);
  }

  return params.toString();
}

export function parsePokemonDetailTab(value: string | null): PokemonDetailTab {
  return POKEMON_DETAIL_TABS.includes(value as PokemonDetailTab)
    ? value as PokemonDetailTab
    : 'about';
}

export function setPokemonDetailTab(search: string, tab: PokemonDetailTab): string {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  if (tab === 'about') {
    params.delete('tab');
  } else {
    params.set('tab', tab);
  }
  return params.toString();
}

export function buildPokemonReturnTarget(pathname: string, search: string): string {
  return `${pathname}${search}`;
}

export function parsePokemonReturnTarget(value: string | null): string | null {
  if (!value) return null;

  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return null;
  }

  if (!decoded.startsWith('/')) return null;

  try {
    const target = new URL(decoded, 'https://lunidex.local');
    const localePattern = supportedLanguages.join('|');
    const pokedexPath = new RegExp(`^/(?:${localePattern})/pokedex/?$`);
    if (target.origin !== 'https://lunidex.local' || !pokedexPath.test(target.pathname)) return null;
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return null;
  }
}
