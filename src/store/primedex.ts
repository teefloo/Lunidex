import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { get, set, del } from 'idb-keyval';
import { getLanguageId as getResolvedLanguageId, isSupportedLanguage } from '@/lib/languages';
import {
  adjustTCGCollectionVariantQuantity as adjustCollectionVariantQuantity,
  assignLegacyTCGSetToCollection,
  countPhysicalTCGCards,
  createTCGCollection,
  deriveTCGOwnedCardIds,
  getTCGCollectionCardIdentity,
  getTCGCollectionCardQuantity,
  isTCGCollectionCardOwned,
  isValidTCGCollectionKey,
  qualifyTCGCollectionCardVariant,
  removeTCGCollectionCard,
  setTCGCollectionVariantQuantity,
  transferTCGCollectionCards as transferCollectionCards,
  MAX_TCG_COLLECTION_PHYSICAL_CARDS,
  TCG_COLLECTION_MODEL_VERSION,
} from '@/lib/tcg-collections';
import {
  DEFAULT_TCG_CARD_LANGUAGE,
  normalizeTCGCardLanguage,
  type TCGCardLanguage,
} from '@/lib/tcg-language';
import {
  DEFAULT_TCG_DISPLAY_CURRENCY,
  normalizeTCGDisplayCurrency,
  type TCGDisplayCurrency,
} from '@/lib/tcg-currency';
import type { TCGSavedSearch, TCGUserCardEntry, TCGDeck } from '@/types/tcg';
import type { NuzlockeRun, NuzlockeEncounter, NuzlockeEncounterStatus } from '@/types/nuzlocke';
import type { QuizSession, ActivityAction } from '@/types/dashboard';
import { hasSyncAccess, requestSyncAccess } from './sync-access';

const isIndexedDbAvailable = (): boolean =>
  typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';

function getLocalStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

// Custom storage for IndexedDB
const storage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    if (isIndexedDbAvailable()) {
      try {
        const value = await get(name);
        if (value) return value;
      } catch {
        // A denied or corrupt IndexedDB should not block the remote-backed app.
      }
    }

    try {
      return getLocalStorage()?.getItem(name) ?? null;
    } catch {
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    if (isIndexedDbAvailable()) {
      try {
        await set(name, value);
        return;
      } catch {
        // Fall through to the browser's synchronous fallback.
      }
    }

    try {
      getLocalStorage()?.setItem(name, value);
    } catch {
      // Persistence is best effort; the in-memory Zustand state remains usable.
    }
  },
  removeItem: async (name: string): Promise<void> => {
    if (isIndexedDbAvailable()) {
      try {
        await del(name);
      } catch {
        // Continue and remove the fallback copy as well.
      }
    }

    try {
      getLocalStorage()?.removeItem(name);
    } catch {
      // Persistence is best effort.
    }
  },
};

export type Theme = 'light' | 'dark' | 'system';

export function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark' || value === 'system';
}

export interface PrimeDexStore {
  favorites: number[];
  addFavorite: (id: number) => void;
  removeFavorite: (id: number) => void;
  isFavorite: (id: number) => boolean;

  caughtPokemon: number[];
  toggleCaught: (id: number) => void;
  isCaught: (id: number) => boolean;
  showCaughtOnly: 'all' | 'caught' | 'uncaught';
  setShowCaughtOnly: (mode: 'all' | 'caught' | 'uncaught') => void;

  searchTerm: string;
  setSearchTerm: (term: string) => void;

  selectedTypes: string[];
  setSelectedTypes: (types: string[]) => void;
  toggleType: (type: string) => void;

  selectedGeneration: number | null;
  setSelectedGeneration: (gen: number | null) => void;

  selectedEggGroups: string[];
  setSelectedEggGroups: (groups: string[]) => void;
  toggleEggGroup: (group: string) => void;

  selectedColors: string[];
  setSelectedColors: (colors: string[]) => void;
  toggleColor: (color: string) => void;

  selectedShapes: string[];
  setSelectedShapes: (shapes: string[]) => void;
  toggleShape: (shape: string) => void;

  isLegendary: boolean | null;
  setIsLegendary: (isLegendary: boolean | null) => void;

  isMythical: boolean | null;
  setIsMythical: (isMythical: boolean | null) => void;

  minBaseStats: number;
  setMinBaseStats: (min: number) => void;

  minAttack: number;
  setMinAttack: (min: number) => void;
  minDefense: number;
  setMinDefense: (min: number) => void;
  minSpeed: number;
  setMinSpeed: (min: number) => void;
  minHp: number;
  setMinHp: (min: number) => void;

  heightRange: [number, number];
  setHeightRange: (range: [number, number]) => void;

  weightRange: [number, number];
  setWeightRange: (range: [number, number]) => void;

  selectedRegion: string | null;
  setSelectedRegion: (region: string | null) => void;

  showFavoritesOnly: boolean;
  setShowFavoritesOnly: (show: boolean) => void;

  sortBy: 'id-asc' | 'id-desc' | 'name-asc' | 'name-desc' | 'height-asc' | 'height-desc' | 'weight-asc' | 'weight-desc';
  setSortBy: (sort: 'id-asc' | 'id-desc' | 'name-asc' | 'name-desc' | 'height-asc' | 'height-desc' | 'weight-asc' | 'weight-desc') => void;

  // Comparison
  compareList: number[];
  addToCompare: (id: number) => void;
  removeFromCompare: (id: number) => void;
  isInCompare: (id: number) => boolean;
  clearCompare: () => void;

  // TCG
  tcgCompareList: string[];
  addTCGCompare: (cardId: string) => void;
  removeTCGCompare: (cardId: string) => void;
  isTCGCompared: (cardId: string) => boolean;
  clearTCGCompare: () => void;

  tcgOwnedCards: string[];
  tcgWishlistCards: string[];
  tcgActiveSets: string[];
  tcgBrowseLanguage: TCGCardLanguage;
  tcgCollections: string[];
  tcgCollectionCards: string[];
  tcgActiveCollections: string[];
  tcgLegacyOwnedCards: string[];
  tcgCollectionModelVersion: 1 | 2 | typeof TCG_COLLECTION_MODEL_VERSION;
  setTCGBrowseLanguage: (language: TCGCardLanguage) => void;
  createTCGCollection: (setId: string, language?: TCGCardLanguage) => string;
  addTCGCollectionCard: (collectionKey: string, cardId: string) => void;
  removeTCGCollectionCard: (collectionKey: string, cardId: string) => void;
  transferTCGCollectionCards: (sourceCollectionKey: string, targetCollectionKey: string) => boolean;
  setTCGCollectionVariantQuantity: (collectionKey: string, cardId: string, variant: import('@/lib/tcg-collections').TCGCollectionVariant, quantity: number) => void;
  adjustTCGCollectionVariantQuantity: (collectionKey: string, cardId: string, variant: import('@/lib/tcg-collections').TCGCollectionVariant, delta: number) => void;
  qualifyTCGCollectionCardVariant: (collectionKey: string, cardId: string, variant: import('@/lib/tcg-collections').TCGPhysicalVariant) => void;
  toggleTCGCollectionCard: (collectionKey: string, cardId: string) => void;
  isTCGCollectionCardOwned: (collectionKey: string, cardId: string) => boolean;
  toggleTCGActiveCollection: (collectionKey: string) => void;
  isTCGActiveCollection: (collectionKey: string) => boolean;
  assignLegacyTCGSetLanguage: (setId: string, language: TCGCardLanguage) => string;
  getTCGPhysicalCardCount: () => number;
  toggleTCGOwned: (cardId: string, collectionKey?: string) => void;
  toggleTCGWishlist: (cardId: string) => void;
  toggleTCGActiveSet: (setId: string) => void;
  isTCGOwned: (cardId: string) => boolean;
  isTCGWishlist: (cardId: string) => boolean;
  isTCGActiveSet: (setId: string) => boolean;

  tcgSavedSearches: TCGSavedSearch[];
  saveTCGSearch: (search: TCGSavedSearch) => void;
  removeTCGSavedSearch: (id: string) => void;
  clearTCGSavedSearches: () => void;

  tcgCardNotes: TCGUserCardEntry[];
  upsertTCGCardNote: (entry: TCGUserCardEntry) => void;
  removeTCGCardNote: (cardId: string) => void;

  tcgDecks: TCGDeck[];
  createTCGDeck: (name: string) => string;
  deleteTCGDeck: (deckId: string) => void;
  renameTCGDeck: (deckId: string, name: string) => void;
  addCardToTCGDeck: (deckId: string, cardId: string, isEnergy: boolean) => void;
  removeCardFromTCGDeck: (deckId: string, cardId: string) => void;

  nuzlockeRuns: NuzlockeRun[];
  createNuzlockeRun: (name: string, game: string) => string;
  deleteNuzlockeRun: (runId: string) => void;
  addNuzlockeEncounter: (runId: string, encounter: Omit<NuzlockeEncounter, 'id' | 'caughtAt'>) => void;
  updateNuzlockeEncounterStatus: (runId: string, encounterId: string, status: NuzlockeEncounterStatus) => void;
  removeNuzlockeEncounter: (runId: string, encounterId: string) => void;

  // Team
  team: number[];
  addToTeam: (id: number) => void;
  removeFromTeam: (id: number) => void;
  isInTeam: (id: number) => boolean;
  clearTeam: () => void;

  // History
  history: { id: number, name: string }[];
  addToHistory: (pokemon: { id: number, name: string }) => void;
  clearHistory: () => void;

  // Viewed types (for type explorer badge)
  viewedTypes: string[];
  addViewedType: (type: string) => void;

  // Badges
  badges: string[];
  addBadge: (badgeId: string) => void;
  hasBadge: (badgeId: string) => boolean;

  // Weekly Quest
  weeklyQuestClaimedWeek: number | null;
  claimWeeklyQuest: () => void;
  hasClaimedWeeklyQuest: (weekNumber: number) => boolean;

  resetFilters: () => void;

  // Dashboard / Activity tracking
  quizHistory: QuizSession[];
  addQuizSession: (session: QuizSession) => void;
  currentStreak: number;
  bestStreak: number;
  totalQuizCorrect: number;
  visitCount: number;
  lastVisitDate: string | null;
  incrementVisit: () => void;
  viewCount: Record<number, number>;
  incrementViewCount: (id: number) => void;
  recentActions: ActivityAction[];
  addAction: (action: ActivityAction) => void;

  // Quiz
  quizHighScores: {
    classic: number;
    silhouette: number;
    stats: number;
    timeAttack: number;
  };
  updateQuizHighScore: (mode: 'classic' | 'silhouette' | 'stats' | 'timeAttack', score: number) => void;

  // Settings
  isSettingsOpen: boolean;
  toggleSettings: () => void;
  soundEnabled: boolean;
  toggleSound: () => void;
  tcgDisplayCurrency: TCGDisplayCurrency;
  setTCGDisplayCurrency: (currency: TCGDisplayCurrency) => void;
  animatedSprites: boolean;
  toggleAnimatedSprites: () => void;

  // Theme
  theme: Theme;
  setTheme: (theme: Theme) => void;

  // Language
  language: string;
  setLanguage: (lang: string) => void;
  getLanguageId: () => number;
  systemLanguage: string;
  setSystemLanguage: (lang: string) => void;

  // Hydration state
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
}

/**
 * Keys that make up the remote user snapshot. These fields are read from and
 * written to the authenticated user's Neon `user_state` row; they are no
 * longer persisted as an anonymous browser-first snapshot.
 */
export const SYNCED_KEYS = [
  'favorites',
  'caughtPokemon',
  'showCaughtOnly',
  'selectedTypes',
  'selectedGeneration',
  'selectedEggGroups',
  'selectedColors',
  'selectedShapes',
  'isLegendary',
  'isMythical',
  'minBaseStats',
  'minAttack',
  'minDefense',
  'minSpeed',
  'minHp',
  'heightRange',
  'weightRange',
  'selectedRegion',
  'showFavoritesOnly',
  'sortBy',
  'compareList',
  'tcgCompareList',
  'tcgOwnedCards',
  'tcgBrowseLanguage',
  'tcgCollections',
  'tcgCollectionCards',
  'tcgActiveCollections',
  'tcgLegacyOwnedCards',
  'tcgCollectionModelVersion',
  'tcgWishlistCards',
  'tcgActiveSets',
  'tcgSavedSearches',
  'tcgCardNotes',
  'tcgDecks',
  'nuzlockeRuns',
  'team',
  'history',
  'badges',
  'quizHighScores',
  'quizHistory',
  'currentStreak',
  'bestStreak',
  'totalQuizCorrect',
  'visitCount',
  'lastVisitDate',
  'viewCount',
  'recentActions',
  'viewedTypes',
  'soundEnabled',
  'animatedSprites',
  'tcgDisplayCurrency',
  'theme',
  'weeklyQuestClaimedWeek',
] as const;

export type SyncedKey = (typeof SYNCED_KEYS)[number];
export type PersistedState = Pick<PrimeDexStore, SyncedKey>;

/**
 * View filters and display preferences shape the public browsing experience
 * but hold no user-owned data, so they are applied locally even before the
 * sync bridge is ready (including for signed-out visitors). Shared filter
 * URLs such as /pokedex?types=fire must keep working without an account.
 * They remain part of SYNCED_KEYS so signed-in accounts still sync them.
 */
export const LOCAL_PREFERENCE_KEYS = [
  'showCaughtOnly',
  'selectedTypes',
  'selectedGeneration',
  'selectedEggGroups',
  'selectedColors',
  'selectedShapes',
  'isLegendary',
  'isMythical',
  'minBaseStats',
  'minAttack',
  'minDefense',
  'minSpeed',
  'minHp',
  'heightRange',
  'weightRange',
  'selectedRegion',
  'showFavoritesOnly',
  'sortBy',
  'soundEnabled',
  'animatedSprites',
  'tcgBrowseLanguage',
  'tcgDisplayCurrency',
] as const;

export type LocalPreferenceKey = (typeof LOCAL_PREFERENCE_KEYS)[number];

const SYNCED_KEY_SET = new Set<string>(SYNCED_KEYS);
// Theme is also a display preference: it works before authentication.
const UNGATED_KEY_SET = new Set<string>([...LOCAL_PREFERENCE_KEYS, 'theme']);
const ONLINE_STATE_STORAGE_KEY = 'primedex-online-session';

export const usePrimeDexStore = create<PrimeDexStore>()(
  persist(
    (baseSet, get) => {
      type StoreUpdate = Partial<PrimeDexStore> | PrimeDexStore;
      const applyStoreUpdate = (
        update: StoreUpdate | ((state: PrimeDexStore) => StoreUpdate),
        replace: false | undefined,
      ): void => {
        const next = typeof update === 'function' ? update(get()) : update;
        // View filters and display preferences always apply locally; the
        // remaining synced keys stay gated until the remote session is ready.
        const changesSyncableData = Object.keys(next).some(
          (key) => SYNCED_KEY_SET.has(key) && !UNGATED_KEY_SET.has(key),
        );
        if (changesSyncableData && !hasSyncAccess()) {
          requestSyncAccess();
          return;
        }
        baseSet(next, replace);
      };
      const guardedSet = (
        update: StoreUpdate | ((state: PrimeDexStore) => StoreUpdate),
        replace?: false,
      ): void => applyStoreUpdate(update, replace);
      const set = guardedSet;

      return ({
      favorites: [],
      addFavorite: (id) => set((state) => ({ favorites: [...state.favorites, id] })),
      removeFavorite: (id) => set((state) => ({ favorites: state.favorites.filter((fid) => fid !== id) })),
      isFavorite: (id) => get().favorites.includes(id),

      caughtPokemon: [],
      toggleCaught: (id) => set((state) => ({
        caughtPokemon: state.caughtPokemon.includes(id)
          ? state.caughtPokemon.filter((cid) => cid !== id)
          : [...state.caughtPokemon, id]
      })),
      isCaught: (id) => get().caughtPokemon.includes(id),
      showCaughtOnly: 'all',
      setShowCaughtOnly: (mode) => set({ showCaughtOnly: mode }),

      searchTerm: '',
      setSearchTerm: (term) => set({ searchTerm: term }),

      selectedTypes: [],
      setSelectedTypes: (types) => set({ selectedTypes: types }),
      toggleType: (type) => set((state) => ({
        selectedTypes: state.selectedTypes.includes(type)
          ? state.selectedTypes.filter((t) => t !== type)
          : [...state.selectedTypes, type]
      })),

      selectedGeneration: null,
      setSelectedGeneration: (gen) => set({ selectedGeneration: gen }),

      selectedEggGroups: [],
      setSelectedEggGroups: (groups) => set({ selectedEggGroups: groups }),
      toggleEggGroup: (group) => set((state) => ({
        selectedEggGroups: state.selectedEggGroups.includes(group)
          ? state.selectedEggGroups.filter((g) => g !== group)
          : [...state.selectedEggGroups, group]
      })),

      selectedColors: [],
      setSelectedColors: (colors) => set({ selectedColors: colors }),
      toggleColor: (color) => set((state) => ({
        selectedColors: state.selectedColors.includes(color)
          ? state.selectedColors.filter((c) => c !== color)
          : [...state.selectedColors, color]
      })),

      selectedShapes: [],
      setSelectedShapes: (shapes) => set({ selectedShapes: shapes }),
      toggleShape: (shape) => set((state) => ({
        selectedShapes: state.selectedShapes.includes(shape)
          ? state.selectedShapes.filter((s) => s !== shape)
          : [...state.selectedShapes, shape]
      })),

      isLegendary: null,
      setIsLegendary: (isLegendary) => set({ isLegendary }),

      isMythical: null,
      setIsMythical: (isMythical) => set({ isMythical }),

      minBaseStats: 0,
      setMinBaseStats: (min) => set({ minBaseStats: min }),

      minAttack: 0,
      setMinAttack: (minAttack) => set({ minAttack }),
      minDefense: 0,
      setMinDefense: (minDefense) => set({ minDefense }),
      minSpeed: 0,
      setMinSpeed: (minSpeed) => set({ minSpeed }),
      minHp: 0,
      setMinHp: (minHp) => set({ minHp }),

      heightRange: [0, 25],
      setHeightRange: (range) => set({ heightRange: range }),

      weightRange: [0, 1200],
      setWeightRange: (range) => set({ weightRange: range }),

      selectedRegion: null,
      setSelectedRegion: (region) => set({ selectedRegion: region }),

      showFavoritesOnly: false,
      setShowFavoritesOnly: (show) => set({ showFavoritesOnly: show }),

      sortBy: 'id-asc',
      setSortBy: (sort) => set({ sortBy: sort }),

      // Comparison
      compareList: [],
      addToCompare: (id) => set((state) => {
        if (state.compareList.includes(id)) return state;
        if (state.compareList.length >= 3) return state;
        return { compareList: [...state.compareList, id] };
      }),
      removeFromCompare: (id) => set((state) => ({ 
        compareList: state.compareList.filter((cid) => cid !== id) 
      })),
      isInCompare: (id) => get().compareList.includes(id),
      clearCompare: () => set({ compareList: [] }),

      tcgCompareList: [],
      addTCGCompare: (cardId) => set((state) => {
        if (state.tcgCompareList.includes(cardId)) return state;
        if (state.tcgCompareList.length >= 4) return state;
        return { tcgCompareList: [...state.tcgCompareList, cardId] };
      }),
      removeTCGCompare: (cardId) => set((state) => ({
        tcgCompareList: state.tcgCompareList.filter((id) => id !== cardId),
      })),
      isTCGCompared: (cardId) => get().tcgCompareList.includes(cardId),
      clearTCGCompare: () => set({ tcgCompareList: [] }),

      tcgOwnedCards: [],
      tcgWishlistCards: [],
      tcgActiveSets: [],
      tcgBrowseLanguage: DEFAULT_TCG_CARD_LANGUAGE,
      tcgCollections: [],
      tcgCollectionCards: [],
      tcgActiveCollections: [],
      tcgLegacyOwnedCards: [],
      tcgCollectionModelVersion: TCG_COLLECTION_MODEL_VERSION,
      setTCGBrowseLanguage: (language) => {
        const normalized = normalizeTCGCardLanguage(language);
        // Browsing language is a display preference and must stay usable on
        // public catalogue screens before authentication/sync is available.
        // The sync bridge observes the updated state and persists it when it
        // can access the account.
        if (normalized) baseSet({ tcgBrowseLanguage: normalized });
      },
      createTCGCollection: (setId, language = get().tcgBrowseLanguage) => {
        const collection = createTCGCollection(setId, language);
        if (!collection) return '';
        set((state) => ({
          tcgCollections: state.tcgCollections.includes(collection.key)
            ? state.tcgCollections
            : [...state.tcgCollections, collection.key],
          tcgActiveCollections: state.tcgActiveCollections.includes(collection.key)
            ? state.tcgActiveCollections
            : [...state.tcgActiveCollections, collection.key],
          tcgCollectionModelVersion: TCG_COLLECTION_MODEL_VERSION,
        }));
        return collection.key;
      },
      addTCGCollectionCard: (collectionKey, cardId) => {
        // Keep the historical API as an idempotent unspecified ×1 write, but
        // route it through the quantity action so the global physical cap and
        // legacy-to-collection migration stay atomic.
        get().setTCGCollectionVariantQuantity(collectionKey, cardId, 'unspecified', 1);
      },
      removeTCGCollectionCard: (collectionKey, cardId) => set((state) => {
        const collectionCards = removeTCGCollectionCard(collectionKey, cardId, state.tcgCollectionCards);
        return {
          tcgCollectionCards: collectionCards,
          tcgOwnedCards: deriveTCGOwnedCardIds(collectionCards, state.tcgLegacyOwnedCards),
          tcgCollectionModelVersion: TCG_COLLECTION_MODEL_VERSION,
        };
      }),
      transferTCGCollectionCards: (sourceCollectionKey, targetCollectionKey) => {
        const current = get();
        const collectionCards = transferCollectionCards(
          sourceCollectionKey,
          targetCollectionKey,
          current.tcgCollectionCards,
        );
        if (!collectionCards) return false;
        if (sourceCollectionKey === targetCollectionKey) return true;
        set((state) => ({
          tcgCollections: state.tcgCollections.includes(targetCollectionKey)
            ? state.tcgCollections
            : [...state.tcgCollections, targetCollectionKey],
          tcgActiveCollections: [
            ...state.tcgActiveCollections.filter((key) => key !== sourceCollectionKey),
            ...(state.tcgActiveCollections.includes(targetCollectionKey) ? [] : [targetCollectionKey]),
          ],
          tcgCollectionCards: collectionCards,
          tcgOwnedCards: deriveTCGOwnedCardIds(collectionCards, state.tcgLegacyOwnedCards),
          tcgCollectionModelVersion: TCG_COLLECTION_MODEL_VERSION,
        }));
        return true;
      },
      setTCGCollectionVariantQuantity: (collectionKey, cardId, variant, quantity) => set((state) => {
        if (!isValidTCGCollectionKey(collectionKey)) return state;
        if (typeof cardId !== 'string' || !getTCGCollectionCardIdentity(collectionKey, cardId, variant)) return state;
        if (!Number.isInteger(quantity) || quantity < 0 || quantity > MAX_TCG_COLLECTION_PHYSICAL_CARDS) return state;
        const currentQuantity = getTCGCollectionCardQuantity(collectionKey, cardId, variant, state.tcgCollectionCards);
        const normalizedCardId = cardId.trim().toLowerCase();
        const legacyQuantity = state.tcgLegacyOwnedCards.some((id) => id.trim().toLowerCase() === normalizedCardId) ? 1 : 0;
        if (quantity === 0 && currentQuantity === 0) return state;
        const removedLegacyQuantity = quantity > 0 ? legacyQuantity : 0;
        const otherQuantity = countPhysicalTCGCards(state.tcgCollectionCards, state.tcgLegacyOwnedCards)
          - currentQuantity
          - removedLegacyQuantity;
        if (otherQuantity + quantity > MAX_TCG_COLLECTION_PHYSICAL_CARDS) return state;
        const collectionCards = setTCGCollectionVariantQuantity(
          collectionKey,
          cardId,
          variant,
          quantity,
          state.tcgCollectionCards,
        );
        const legacyOwnedCards = quantity > 0
          ? state.tcgLegacyOwnedCards.filter((id) => id.trim().toLowerCase() !== normalizedCardId)
          : state.tcgLegacyOwnedCards;
        return {
          tcgCollections: state.tcgCollections.includes(collectionKey) ? state.tcgCollections : [...state.tcgCollections, collectionKey],
          tcgActiveCollections: state.tcgActiveCollections.includes(collectionKey) ? state.tcgActiveCollections : [...state.tcgActiveCollections, collectionKey],
          tcgCollectionCards: collectionCards,
          tcgLegacyOwnedCards: legacyOwnedCards,
          tcgOwnedCards: deriveTCGOwnedCardIds(collectionCards, legacyOwnedCards),
          tcgCollectionModelVersion: TCG_COLLECTION_MODEL_VERSION,
        };
      }),
      adjustTCGCollectionVariantQuantity: (collectionKey, cardId, variant, delta) => set((state) => {
        if (!isValidTCGCollectionKey(collectionKey) || typeof cardId !== 'string' || !Number.isInteger(delta)) return state;
        const currentQuantity = getTCGCollectionCardQuantity(collectionKey, cardId, variant, state.tcgCollectionCards);
        const nextQuantity = currentQuantity + delta;
        if (nextQuantity < 0 || nextQuantity > MAX_TCG_COLLECTION_PHYSICAL_CARDS) return state;
        const normalizedCardId = cardId.trim().toLowerCase();
        const legacyQuantity = state.tcgLegacyOwnedCards.some((id) => id.trim().toLowerCase() === normalizedCardId) ? 1 : 0;
        const removedLegacyQuantity = nextQuantity > 0 ? legacyQuantity : 0;
        const otherQuantity = countPhysicalTCGCards(state.tcgCollectionCards, state.tcgLegacyOwnedCards)
          - currentQuantity
          - removedLegacyQuantity;
        if (otherQuantity + nextQuantity > MAX_TCG_COLLECTION_PHYSICAL_CARDS) return state;
        const collectionCards = adjustCollectionVariantQuantity(
          collectionKey,
          cardId,
          variant,
          delta,
          state.tcgCollectionCards,
        );
        if (collectionCards.length === state.tcgCollectionCards.length
          && collectionCards.every((entry, index) => entry === state.tcgCollectionCards[index])) return state;
        const legacyOwnedCards = nextQuantity > 0
          ? state.tcgLegacyOwnedCards.filter((id) => id.trim().toLowerCase() !== normalizedCardId)
          : state.tcgLegacyOwnedCards;
        return {
          tcgCollections: state.tcgCollections.includes(collectionKey) ? state.tcgCollections : [...state.tcgCollections, collectionKey],
          tcgActiveCollections: state.tcgActiveCollections.includes(collectionKey) ? state.tcgActiveCollections : [...state.tcgActiveCollections, collectionKey],
          tcgCollectionCards: collectionCards,
          tcgLegacyOwnedCards: legacyOwnedCards,
          tcgOwnedCards: deriveTCGOwnedCardIds(collectionCards, legacyOwnedCards),
          tcgCollectionModelVersion: TCG_COLLECTION_MODEL_VERSION,
        };
      }),
      qualifyTCGCollectionCardVariant: (collectionKey, cardId, variant) => set((state) => {
        if (!isValidTCGCollectionKey(collectionKey) || typeof cardId !== 'string') return state;
        const unspecifiedQuantity = getTCGCollectionCardQuantity(collectionKey, cardId, 'unspecified', state.tcgCollectionCards);
        if (unspecifiedQuantity <= 0) return state;
        const collectionCards = qualifyTCGCollectionCardVariant(collectionKey, cardId, variant, state.tcgCollectionCards);
        if (collectionCards === state.tcgCollectionCards || collectionCards.length === state.tcgCollectionCards.length && collectionCards.every((entry, index) => entry === state.tcgCollectionCards[index])) return state;
        return {
          tcgCollectionCards: collectionCards,
          tcgOwnedCards: deriveTCGOwnedCardIds(collectionCards, state.tcgLegacyOwnedCards),
          tcgCollectionModelVersion: TCG_COLLECTION_MODEL_VERSION,
        };
      }),
      toggleTCGCollectionCard: (collectionKey, cardId) => {
        if (get().isTCGCollectionCardOwned(collectionKey, cardId)) get().removeTCGCollectionCard(collectionKey, cardId);
        else get().addTCGCollectionCard(collectionKey, cardId);
      },
      isTCGCollectionCardOwned: (collectionKey, cardId) => isTCGCollectionCardOwned(collectionKey, cardId, get().tcgCollectionCards),
      toggleTCGActiveCollection: (collectionKey) => set((state) => {
        if (!isValidTCGCollectionKey(collectionKey) || !state.tcgCollections.includes(collectionKey)) return state;
        return {
          tcgActiveCollections: state.tcgActiveCollections.includes(collectionKey)
            ? state.tcgActiveCollections.filter((key) => key !== collectionKey)
            : [...state.tcgActiveCollections, collectionKey],
        };
      }),
      isTCGActiveCollection: (collectionKey) => get().tcgActiveCollections.includes(collectionKey),
      assignLegacyTCGSetLanguage: (setId, language) => {
        const collection = createTCGCollection(setId, language);
        if (!collection) return '';
        set((state) => {
          const next = assignLegacyTCGSetToCollection(
            setId,
            language,
            state.tcgLegacyOwnedCards,
            state.tcgCollectionCards,
          );
          if (!next.collection) return state;
          return {
            tcgCollections: state.tcgCollections.includes(collection.key)
              ? state.tcgCollections
              : [...state.tcgCollections, collection.key],
            tcgActiveCollections: state.tcgActiveCollections.includes(collection.key)
              ? state.tcgActiveCollections
              : [...state.tcgActiveCollections, collection.key],
            tcgCollectionCards: next.tcgCollectionCards,
            tcgOwnedCards: deriveTCGOwnedCardIds(next.tcgCollectionCards, next.tcgLegacyOwnedCards),
            tcgLegacyOwnedCards: next.tcgLegacyOwnedCards,
            tcgCollectionModelVersion: TCG_COLLECTION_MODEL_VERSION,
          };
        });
        return collection.key;
      },
      getTCGPhysicalCardCount: () => countPhysicalTCGCards(get().tcgCollectionCards, get().tcgLegacyOwnedCards),
      toggleTCGOwned: (cardId, collectionKey) => {
        if (collectionKey) {
          get().toggleTCGCollectionCard(collectionKey, cardId);
          return;
        }
        set((state) => {
          const normalizedCardId = cardId.trim().toLowerCase();
          const legacyOwned = state.tcgLegacyOwnedCards.some((id) => id.toLowerCase() === normalizedCardId);
          const nextLegacy = legacyOwned
            ? state.tcgLegacyOwnedCards.filter((id) => id.toLowerCase() !== normalizedCardId)
            : [...state.tcgLegacyOwnedCards, cardId];
          if (!legacyOwned && countPhysicalTCGCards(state.tcgCollectionCards, nextLegacy) > MAX_TCG_COLLECTION_PHYSICAL_CARDS) return state;
          return {
            tcgLegacyOwnedCards: nextLegacy,
            tcgOwnedCards: deriveTCGOwnedCardIds(state.tcgCollectionCards, nextLegacy),
            tcgCollectionModelVersion: TCG_COLLECTION_MODEL_VERSION,
          };
        });
      },
      toggleTCGWishlist: (cardId) => set((state) => ({
        tcgWishlistCards: state.tcgWishlistCards.includes(cardId)
          ? state.tcgWishlistCards.filter((id) => id !== cardId)
          : [...state.tcgWishlistCards, cardId],
      })),
      toggleTCGActiveSet: (setId) => set((state) => ({
        tcgActiveSets: state.tcgActiveSets.includes(setId)
          ? state.tcgActiveSets.filter((id) => id !== setId)
          : [...state.tcgActiveSets, setId],
      })),
      isTCGOwned: (cardId) => get().tcgOwnedCards.includes(cardId),
      isTCGWishlist: (cardId) => get().tcgWishlistCards.includes(cardId),
      isTCGActiveSet: (setId) => get().tcgActiveSets.includes(setId),

      tcgSavedSearches: [],
      saveTCGSearch: (search) => set((state) => ({
        tcgSavedSearches: [search, ...state.tcgSavedSearches.filter((item) => item.id !== search.id)].slice(0, 20),
      })),
      removeTCGSavedSearch: (id) => set((state) => ({
        tcgSavedSearches: state.tcgSavedSearches.filter((search) => search.id !== id),
      })),
      clearTCGSavedSearches: () => set({ tcgSavedSearches: [] }),

      tcgCardNotes: [],
      upsertTCGCardNote: (entry) => set((state) => ({
        tcgCardNotes: [entry, ...state.tcgCardNotes.filter((note) => note.cardId !== entry.cardId)],
      })),
      removeTCGCardNote: (cardId) => set((state) => ({
        tcgCardNotes: state.tcgCardNotes.filter((note) => note.cardId !== cardId),
      })),

      tcgDecks: [],
      createTCGDeck: (name) => {
        if (!hasSyncAccess()) {
          requestSyncAccess();
          return '';
        }
        const id = `deck-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        set((state) => ({
          tcgDecks: [
            ...state.tcgDecks,
            { id, name, cards: [], createdAt: new Date().toISOString() },
          ],
        }));
        return id;
      },
      deleteTCGDeck: (deckId) => set((state) => ({
        tcgDecks: state.tcgDecks.filter((deck) => deck.id !== deckId),
      })),
      renameTCGDeck: (deckId, name) => set((state) => ({
        tcgDecks: state.tcgDecks.map((deck) => (deck.id === deckId ? { ...deck, name } : deck)),
      })),
      addCardToTCGDeck: (deckId, cardId, isEnergy) => set((state) => ({
        tcgDecks: state.tcgDecks.map((deck) => {
          if (deck.id !== deckId) return deck;
          const totalCount = deck.cards.reduce((sum, c) => sum + c.quantity, 0);
          if (totalCount >= 60) return deck;
          const existing = deck.cards.find((c) => c.cardId === cardId);
          if (existing) {
            if (!isEnergy && existing.quantity >= 4) return deck;
            return {
              ...deck,
              cards: deck.cards.map((c) => (c.cardId === cardId ? { ...c, quantity: c.quantity + 1 } : c)),
            };
          }
          return { ...deck, cards: [...deck.cards, { cardId, quantity: 1 }] };
        }),
      })),
      removeCardFromTCGDeck: (deckId, cardId) => set((state) => ({
        tcgDecks: state.tcgDecks.map((deck) => {
          if (deck.id !== deckId) return deck;
          const existing = deck.cards.find((c) => c.cardId === cardId);
          if (!existing) return deck;
          if (existing.quantity <= 1) {
            return { ...deck, cards: deck.cards.filter((c) => c.cardId !== cardId) };
          }
          return {
            ...deck,
            cards: deck.cards.map((c) => (c.cardId === cardId ? { ...c, quantity: c.quantity - 1 } : c)),
          };
        }),
      })),

      nuzlockeRuns: [],
      createNuzlockeRun: (name, game) => {
        if (!hasSyncAccess()) {
          requestSyncAccess();
          return '';
        }
        const id = `nuzlocke-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        set((state) => ({
          nuzlockeRuns: [
            ...state.nuzlockeRuns,
            { id, name, game, encounters: [], createdAt: new Date().toISOString() },
          ],
        }));
        return id;
      },
      deleteNuzlockeRun: (runId) => set((state) => ({
        nuzlockeRuns: state.nuzlockeRuns.filter((run) => run.id !== runId),
      })),
      addNuzlockeEncounter: (runId, encounter) => set((state) => ({
        nuzlockeRuns: state.nuzlockeRuns.map((run) => {
          if (run.id !== runId) return run;
          const id = `encounter-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          return {
            ...run,
            encounters: [
              ...run.encounters,
              { ...encounter, id, caughtAt: new Date().toISOString() },
            ],
          };
        }),
      })),
      updateNuzlockeEncounterStatus: (runId, encounterId, status) => set((state) => ({
        nuzlockeRuns: state.nuzlockeRuns.map((run) => {
          if (run.id !== runId) return run;
          return {
            ...run,
            encounters: run.encounters.map((enc) => (enc.id === encounterId ? { ...enc, status } : enc)),
          };
        }),
      })),
      removeNuzlockeEncounter: (runId, encounterId) => set((state) => ({
        nuzlockeRuns: state.nuzlockeRuns.map((run) => {
          if (run.id !== runId) return run;
          return { ...run, encounters: run.encounters.filter((enc) => enc.id !== encounterId) };
        }),
      })),

      // Team
      team: [],
      addToTeam: (id) => set((state) => {
        if (state.team.includes(id)) return state;
        if (state.team.length >= 6) return state;
        return { team: [...state.team, id] };
      }),
      removeFromTeam: (id) => set((state) => ({ 
        team: state.team.filter((tid) => tid !== id) 
      })),
      isInTeam: (id) => get().team.includes(id),
      clearTeam: () => set({ team: [] }),

      // History
      history: [],
      addToHistory: (pokemon) => set((state) => {
        const filtered = state.history.filter(p => p.id !== pokemon.id);
        return { history: [pokemon, ...filtered].slice(0, 10) };
      }),
      clearHistory: () => set({ history: [] }),

      // Viewed types (for type explorer badge)
      viewedTypes: [],
      addViewedType: (type) => set((state) => ({
        viewedTypes: state.viewedTypes.includes(type) ? state.viewedTypes : [...state.viewedTypes, type],
      })),

      badges: [],
      addBadge: (badgeId) => set((state) => ({
        badges: state.badges.includes(badgeId) ? state.badges : [...state.badges, badgeId]
      })),
      hasBadge: (badgeId) => get().badges.includes(badgeId),

      weeklyQuestClaimedWeek: null,
      claimWeeklyQuest: () => {
        const now = new Date();
        const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
        set({ weeklyQuestClaimedWeek: weekNum });
      },
      hasClaimedWeeklyQuest: (weekNumber) => get().weeklyQuestClaimedWeek === weekNumber,

      resetFilters: () => set({
        searchTerm: '',
        selectedTypes: [],
        selectedGeneration: null,
        selectedEggGroups: [],
        selectedColors: [],
        selectedShapes: [],
        isLegendary: null,
        isMythical: null,
        minBaseStats: 0,
        minAttack: 0,
        minDefense: 0,
        minSpeed: 0,
        minHp: 0,
        heightRange: [0, 25],
        weightRange: [0, 1200],
        selectedRegion: null,
        showFavoritesOnly: false,
        showCaughtOnly: 'all',
        sortBy: 'id-asc',
      }),

      // Dashboard / Activity tracking
      quizHistory: [],
      addQuizSession: (session) => set((state) => ({
        quizHistory: [session, ...state.quizHistory].slice(0, 100),
        currentStreak: session.streak,
        bestStreak: Math.max(state.bestStreak, session.streak),
        totalQuizCorrect: state.totalQuizCorrect + session.correctAnswers,
      })),
      currentStreak: 0,
      bestStreak: 0,
      totalQuizCorrect: 0,
      visitCount: 0,
      lastVisitDate: null,
      incrementVisit: () => set((state) => ({
        visitCount: state.visitCount + 1,
        lastVisitDate: new Date().toISOString(),
      })),
      viewCount: {},
      incrementViewCount: (id) => set((state) => {
        const next = { ...state.viewCount, [id]: (state.viewCount[id] || 0) + 1 };
        const entries = Object.entries(next);
        if (entries.length > 500) {
          const capped = Object.fromEntries(entries.sort((a, b) => b[1] - a[1]).slice(0, 500));
          return { viewCount: capped };
        }
        return { viewCount: next };
      }),
      recentActions: [],
      addAction: (action) => set((state) => ({
        recentActions: [action, ...state.recentActions].slice(0, 50),
      })),

      // Quiz
      quizHighScores: {
        classic: 0,
        silhouette: 0,
        stats: 0,
        timeAttack: 0,
      },
      updateQuizHighScore: (mode, score) => set((state) => ({
        quizHighScores: {
          ...state.quizHighScores,
          [mode]: Math.max(state.quizHighScores[mode as keyof typeof state.quizHighScores] || 0, score)
        }
      })),

      isSettingsOpen: false,
      toggleSettings: () => set((state) => ({ isSettingsOpen: !state.isSettingsOpen })),
      soundEnabled: true,
      toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
      tcgDisplayCurrency: DEFAULT_TCG_DISPLAY_CURRENCY,
      setTCGDisplayCurrency: (currency) => {
        baseSet({ tcgDisplayCurrency: normalizeTCGDisplayCurrency(currency) });
      },
      animatedSprites: false,
      toggleAnimatedSprites: () => set((state) => ({ animatedSprites: !state.animatedSprites })),

      theme: 'system',
      setTheme: (theme) => set({ theme }),

      language: 'auto',
      setLanguage: (lang) => set({ language: lang }),
      getLanguageId: () => {
        return getResolvedLanguageId(get().language, get().systemLanguage);
      },
      systemLanguage: typeof window !== 'undefined' ? (navigator.language.split('-')[0] || 'en') : 'en',
      setSystemLanguage: (lang) => set({ systemLanguage: lang }),

      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),
      });
    },
    {
      // Keep historical primedex-storage snapshots untouched. This new
      // namespace stores only local display preferences. Synchronizable user
      // collections remain remote-owned, while theme is also persisted here
      // so it works before authentication and during remote outages.
      name: ONLINE_STATE_STORAGE_KEY,
      storage: createJSONStorage(() => storage),
      version: 3,
      migrate: (persisted) => {
        const stored = persisted as { language?: unknown; theme?: unknown; tcgBrowseLanguage?: unknown; tcgDisplayCurrency?: unknown } | null;
        // Rewrite the old online-session envelope so retired generation-theme
        // preferences disappear without touching the legacy collection store.
        const restoredTcgLanguage = normalizeTCGCardLanguage(stored?.tcgBrowseLanguage);
        const restoredTcgCurrency = normalizeTCGDisplayCurrency(stored?.tcgDisplayCurrency);
        return {
          ...(typeof stored?.language === 'string' && isSupportedLanguage(stored.language)
            ? { language: stored.language }
            : {}),
          ...(isTheme(stored?.theme) ? { theme: stored.theme } : {}),
          ...(restoredTcgLanguage
            ? { tcgBrowseLanguage: restoredTcgLanguage }
            : {}),
          tcgDisplayCurrency: restoredTcgCurrency,
        };
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHasHydrated(true);
        } else {
          // Corrupt persistence should degrade to an empty, usable session.
          usePrimeDexStore.setState({ _hasHydrated: true });
        }
      },
      partialize: (state) => ({
        language: state.language,
        theme: state.theme,
        tcgBrowseLanguage: state.tcgBrowseLanguage,
        tcgDisplayCurrency: state.tcgDisplayCurrency,
      }),
      // Ignore any other legacy fields an old snapshot may still carry.
      merge: (persisted, currentState) => {
        const stored = persisted as { language?: unknown; theme?: unknown; tcgBrowseLanguage?: unknown; tcgDisplayCurrency?: unknown } | null;
        const restoredTcgLanguage = normalizeTCGCardLanguage(stored?.tcgBrowseLanguage);
        const restoredTcgCurrency = normalizeTCGDisplayCurrency(stored?.tcgDisplayCurrency);
        return {
          ...currentState,
          ...(typeof stored?.language === 'string' && isSupportedLanguage(stored.language)
            ? { language: stored.language }
            : {}),
          ...(isTheme(stored?.theme) ? { theme: stored.theme } : {}),
          ...(restoredTcgLanguage
            ? { tcgBrowseLanguage: restoredTcgLanguage }
            : {}),
          tcgDisplayCurrency: restoredTcgCurrency,
        };
      },
    }
  )
);
