import { SYNCED_KEYS, usePrimeDexStore, type PersistedState } from '@/store/primedex';
import { normalizeUserStateData } from '@/lib/tcg-owned-cards';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const isCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const isId = (value: unknown): value is number => isCount(value) && value > 0;
const isText = (value: unknown): value is string => typeof value === 'string';
const isTextList = (value: unknown): value is string[] => Array.isArray(value) && value.every(isText);
const isOneOf = (value: unknown, choices: readonly string[]): boolean =>
  isText(value) && choices.includes(value);

function validSearchFilters(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const strings = ['searchTerm', 'illustrator', 'regulationMark', 'releaseStart', 'releaseEnd'];
  const nullableStrings = ['selectedSet', 'selectedRarity', 'selectedPhase'];
  const lists = ['selectedTypes', 'selectedTrainerTypes', 'selectedEnergyTypes', 'legalities'];
  const numbers = ['minHp', 'maxHp', 'priceMin', 'priceMax'];
  return strings.every((key) => value[key] === undefined || isText(value[key]))
    && nullableStrings.every((key) => value[key] === undefined || value[key] === null || isText(value[key]))
    && lists.every((key) => value[key] === undefined || isTextList(value[key]))
    && numbers.every((key) => value[key] === undefined || (typeof value[key] === 'number' && Number.isFinite(value[key]) && value[key] >= 0))
    && (value.selectedCategory === undefined || isOneOf(value.selectedCategory, ['all', 'Pokemon', 'Trainer', 'Energy']))
    && (value.ownedState === undefined || isOneOf(value.ownedState, ['all', 'owned', 'wishlist', 'missing']))
    && (value.sortBy === undefined || isOneOf(value.sortBy, ['name', 'id', 'number', 'hp', 'rarity', 'releaseDate', 'marketPrice', 'updated']))
    && (value.sortOrder === undefined || isOneOf(value.sortOrder, ['asc', 'desc']));
}

const recordValidators: Record<string, (entry: Record<string, unknown>) => boolean> = {
  history: (entry) => isId(entry.id) && isText(entry.name),
  tcgDecks: (entry) => isText(entry.id) && isText(entry.name) && isText(entry.createdAt)
    && Array.isArray(entry.cards) && entry.cards.every((card) => isRecord(card) && isText(card.cardId) && isId(card.quantity)),
  tcgCardNotes: (entry) => isText(entry.cardId) && isOneOf(entry.state, ['owned', 'wishlist'])
    && isText(entry.updatedAt) && (entry.note === undefined || isText(entry.note)),
  tcgSavedSearches: (entry) => isText(entry.id) && isText(entry.name) && isText(entry.query)
    && isText(entry.createdAt) && isOneOf(entry.viewMode, ['visual', 'table', 'scan']) && validSearchFilters(entry.filters),
  nuzlockeRuns: (entry) => isText(entry.id) && isText(entry.name) && isText(entry.game) && isText(entry.createdAt)
    && Array.isArray(entry.encounters) && entry.encounters.every((encounter) => isRecord(encounter)
      && isText(encounter.id) && isText(encounter.routeName) && isId(encounter.pokemonId)
      && isText(encounter.pokemonName) && (encounter.nickname === null || isText(encounter.nickname))
      && isOneOf(encounter.status, ['alive', 'dead', 'boxed']) && isText(encounter.caughtAt)),
  quizHistory: (entry) => isText(entry.id) && isText(entry.date)
    && isOneOf(entry.challenge, ['classic', 'silhouette', 'stats']) && isOneOf(entry.mode, ['marathon', 'survival', 'time-attack'])
    && ['score', 'totalQuestions', 'correctAnswers', 'wrongAnswers', 'streak'].every((key) => isCount(entry[key])),
  recentActions: (entry) => isText(entry.id) && isText(entry.date) && isText(entry.label)
    && isOneOf(entry.type, ['quiz', 'pokemon_view', 'tcg_add', 'favorite_add', 'team_edit', 'caught'])
    && (entry.details === undefined || isText(entry.details)),
};

export function validateImportPayload(
  json: unknown,
): { valid: true; data: PersistedState } | { valid: false; error: string } {
  if (!isRecord(json)) {
    return { valid: false, error: 'Invalid JSON structure' };
  }

  const obj = json as Record<string, unknown>;

  if (!('version' in obj) || typeof obj.version !== 'string') {
    return { valid: false, error: 'Missing or invalid version field' };
  }
  if (!/^\d+\.\d+$/.test(obj.version) || !['1.0', '2.0', '3.0'].includes(obj.version)) {
    return { valid: false, error: 'Unsupported backup version' };
  }

  if (!isRecord(obj.data)) {
    return { valid: false, error: 'Missing or invalid data field' };
  }

  const data = obj.data as Record<string, unknown>;

  if (Array.isArray(data.favorites) && data.favorites.length > 2000) {
    return { valid: false, error: 'Favorites list exceeds 2000 entries' };
  }

  if (Array.isArray(data.team) && data.team.length > 6) {
    return { valid: false, error: 'Team exceeds 6 members' };
  }

  if (Array.isArray(data.compareList) && data.compareList.length > 3) {
    return { valid: false, error: 'Pokémon comparison exceeds 3 entries' };
  }
  if (Array.isArray(data.tcgCompareList) && data.tcgCompareList.length > 4) {
    return { valid: false, error: 'TCG comparison exceeds 4 entries' };
  }

  if (Array.isArray(data.caughtPokemon) && data.caughtPokemon.length > 2000) {
    return { valid: false, error: 'Caught Pokémon list exceeds 2000 entries' };
  }

  if (Array.isArray(data.tcgOwnedCards) && data.tcgOwnedCards.length > 10000) {
    return { valid: false, error: 'TCG owned cards list exceeds 10000 entries' };
  }
  if (Array.isArray(data.tcgCollectionCards) && data.tcgCollectionCards.length > 10000) {
    return { valid: false, error: 'TCG collection cards list exceeds 10000 entries' };
  }

  if (Array.isArray(data.tcgWishlistCards) && data.tcgWishlistCards.length > 5000) {
    return { valid: false, error: 'TCG wishlist exceeds 5000 entries' };
  }

  if (Array.isArray(data.badges) && data.badges.length > 500) {
    return { valid: false, error: 'Badges list exceeds 500 entries' };
  }

  const defaults = usePrimeDexStore.getInitialState();
  for (const key of SYNCED_KEYS) {
    if (!(key in data)) continue;
    const value = data[key];
    const baseline = defaults[key];
    if (Array.isArray(baseline)) {
      if (!Array.isArray(value)) return { valid: false, error: `Invalid ${key} list` };
    } else if (baseline === null) {
      if (value !== null && typeof value !== 'boolean' && typeof value !== 'number' && typeof value !== 'string') {
        return { valid: false, error: `Invalid ${key} value` };
      }
    } else if (typeof value !== typeof baseline || value === null || (typeof value === 'number' && !Number.isFinite(value))) {
      return { valid: false, error: `Invalid ${key} value` };
    }
  }
  for (const key of ['favorites', 'team', 'caughtPokemon', 'compareList', 'recentlyViewed']) {
    const value = data[key];
    if (value !== undefined && (!Array.isArray(value) || value.some((id) => !Number.isSafeInteger(id) || id <= 0))) {
      return { valid: false, error: `Invalid Pokémon IDs in ${key}` };
    }
  }
  for (const key of ['selectedTypes', 'selectedEggGroups', 'selectedColors', 'selectedShapes', 'tcgWishlistCards', 'tcgCompareList', 'tcgActiveSets', 'viewedTypes', 'badges']) {
    const value = data[key];
    if (value !== undefined && (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string'))) {
      return { valid: false, error: `Invalid entries in ${key}` };
    }
  }

  for (const [key, validate] of Object.entries(recordValidators)) {
    const value = data[key];
    if (value !== undefined && (!Array.isArray(value) || value.some((entry) => !isRecord(entry) || !validate(entry)))) {
      return { valid: false, error: `Invalid records in ${key}` };
    }
  }
  for (const key of ['viewCount', 'quizHighScores']) {
    const value = data[key];
    if (value !== undefined && (!isRecord(value) || Object.values(value).some((entry) => !isCount(entry)))) {
      return { valid: false, error: `Invalid ${key} values` };
    }
  }
  for (const key of ['selectedRegion', 'lastVisitDate']) {
    if (data[key] !== undefined && data[key] !== null && !isText(data[key])) return { valid: false, error: `Invalid ${key}` };
  }
  for (const key of ['selectedGeneration', 'weeklyQuestClaimedWeek']) {
    if (data[key] !== undefined && data[key] !== null && !isCount(data[key])) return { valid: false, error: `Invalid ${key}` };
  }
  for (const key of ['isLegendary', 'isMythical']) {
    if (data[key] !== undefined && data[key] !== null && typeof data[key] !== 'boolean') return { valid: false, error: `Invalid ${key}` };
  }
  if (data.theme !== undefined && !isOneOf(data.theme, ['light', 'dark', 'system'])) return { valid: false, error: 'Invalid theme' };
  if (data.showCaughtOnly !== undefined && !isOneOf(data.showCaughtOnly, ['all', 'caught', 'uncaught'])) return { valid: false, error: 'Invalid caught filter' };
  if (data.sortBy !== undefined && !isOneOf(data.sortBy, ['id-asc', 'id-desc', 'name-asc', 'name-desc', 'height-asc', 'height-desc', 'weight-asc', 'weight-desc'])) return { valid: false, error: 'Invalid sorting' };
  for (const key of ['heightRange', 'weightRange']) {
    const value = data[key];
    if (value !== undefined && (!Array.isArray(value) || value.length !== 2 || value.some((entry) => typeof entry !== 'number' || !Number.isFinite(entry) || entry < 0) || value[0] > value[1])) {
      return { valid: false, error: `Invalid ${key} range` };
    }
  }

  const normalized = normalizeUserStateData(data);
  if (!normalized) return { valid: false, error: 'Invalid TCG collection data' };
  if (isRecord(normalized.quizHighScores)) normalized.quizHighScores = { ...defaults.quizHighScores, ...normalized.quizHighScores };

  const syncedData: Record<string, unknown> = {};
  for (const key of SYNCED_KEYS) {
    if (key in normalized) {
      syncedData[key] = normalized[key];
    }
  }

  return { valid: true, data: syncedData as PersistedState };
}
