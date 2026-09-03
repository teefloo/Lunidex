import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getLanguageId as getResolvedLanguageId } from '../lib/languages';
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
} from '../lib/tcg-collections';
import {
  DEFAULT_TCG_CARD_LANGUAGE,
  normalizeTCGCardLanguage,
  type TCGCardLanguage,
} from '../lib/tcg-language';
import {
  DEFAULT_TCG_DISPLAY_CURRENCY,
  normalizeTCGDisplayCurrency,
  type TCGDisplayCurrency,
} from '../lib/tcg-currency';
import { storage } from '../platform/storage';
import type { TCGSavedSearch, TCGUserCardEntry } from '../types/tcg';
import type { QuizSession, ActivityAction } from '../types/dashboard';
import { hasSyncAccess, requestSyncAccess } from './sync-access';

type Theme = 'light' | 'dark' | 'system';

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
  /** Independent TCG data language used by catalogue and collection actions. */
  tcgBrowseLanguage: TCGCardLanguage;
  /** Compact `tcg2:<language>:<setId>` collection keys. */
  tcgCollections: string[];
  /** Compact v3 `<collectionKey>|<cardId>|<variant>|<quantity>` ownership tokens. */
  tcgCollectionCards: string[];
  /** Collection keys currently marked as in progress. */
  tcgActiveCollections: string[];
  /** Historical card IDs with intentionally undefined language. */
  tcgLegacyOwnedCards: string[];
  tcgCollectionModelVersion: 1 | 2 | typeof TCG_COLLECTION_MODEL_VERSION;
  setTCGBrowseLanguage: (language: TCGCardLanguage) => void;
  createTCGCollection: (setId: string, language?: TCGCardLanguage) => string;
  addTCGCollectionCard: (collectionKey: string, cardId: string) => void;
  removeTCGCollectionCard: (collectionKey: string, cardId: string) => void;
  transferTCGCollectionCards: (sourceCollectionKey: string, targetCollectionKey: string) => boolean;
  setTCGCollectionVariantQuantity: (collectionKey: string, cardId: string, variant: import('../lib/tcg-collections').TCGCollectionVariant, quantity: number) => void;
  adjustTCGCollectionVariantQuantity: (collectionKey: string, cardId: string, variant: import('../lib/tcg-collections').TCGCollectionVariant, delta: number) => void;
  qualifyTCGCollectionCardVariant: (collectionKey: string, cardId: string, variant: import('../lib/tcg-collections').TCGPhysicalVariant) => void;
  toggleTCGCollectionCard: (collectionKey: string, cardId: string) => void;
  isTCGCollectionCardOwned: (collectionKey: string, cardId: string) => boolean;
  toggleTCGActiveCollection: (collectionKey: string) => void;
  isTCGActiveCollection: (collectionKey: string) => boolean;
  assignLegacyTCGSetLanguage: (setId: string, language: TCGCardLanguage) => string;
  getTCGPhysicalCardCount: () => number;
  /** Compatibility action; without a collection key it edits the legacy list. */
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

  // Badges
  badges: string[];
  addBadge: (badgeId: string) => void;
  hasBadge: (badgeId: string) => boolean;

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
 * longer persisted as an anonymous device-first snapshot.
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
  'soundEnabled',
  'tcgDisplayCurrency',
  'theme',
  'language',
] as const;

export type SyncedKey = (typeof SYNCED_KEYS)[number];
export type PersistedState = Pick<PrimeDexStore, SyncedKey>;
const SYNCED_KEY_SET = new Set<string>(SYNCED_KEYS);
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
        const changesSyncableData = Object.keys(next).some((key) => SYNCED_KEY_SET.has(key));
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
        // Browsing language is a display preference, so it remains usable on
        // public/catalogue screens before an account sync is available. The
        // sync bridge still observes and persists the resulting state.
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

      badges: [],
      addBadge: (badgeId) => set((state) => ({
        badges: state.badges.includes(badgeId) ? state.badges : [...state.badges, badgeId]
      })),
      hasBadge: (badgeId) => get().badges.includes(badgeId),

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
      incrementViewCount: (id) => set((state) => ({
        viewCount: { ...state.viewCount, [id]: (state.viewCount[id] || 0) + 1 },
      })),
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
        // The currency is a display preference, just like the TCG browsing
        // language. Apply it immediately even before account sync is ready;
        // the sync bridge still observes and persists the resulting value.
        baseSet({ tcgDisplayCurrency: normalizeTCGDisplayCurrency(currency) });
      },

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
      // namespace intentionally stores no synchronizable user data.
      name: ONLINE_STATE_STORAGE_KEY,
      storage: createJSONStorage(() => storage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      partialize: () => ({}),
      merge: (_persistedState, currentState) => currentState,
    }
  )
);
