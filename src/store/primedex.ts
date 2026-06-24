import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { get, set, del } from 'idb-keyval';
import { getLanguageId as getResolvedLanguageId } from '@/lib/languages';
import type { TCGSavedSearch, TCGUserCardEntry } from '@/types/tcg';
import type { QuizSession, ActivityAction } from '@/types/dashboard';
import type { GenTheme } from '@/lib/generation-themes';

const isIndexedDbAvailable = (): boolean =>
  typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';

// Custom storage for IndexedDB
const storage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    if (!isIndexedDbAvailable()) return null;
    return (await get(name)) || null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    if (!isIndexedDbAvailable()) return;
    await set(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    if (!isIndexedDbAvailable()) return;
    await del(name);
  },
};

type Theme = 'light' | 'dark' | 'system';

interface PrimeDexStore {
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
  toggleTCGOwned: (cardId: string) => void;
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
  animatedSprites: boolean;
  toggleAnimatedSprites: () => void;

  // Theme
  theme: Theme;
  setTheme: (theme: Theme) => void;

  // Generation theme
  genTheme: GenTheme;
  setGenTheme: (theme: GenTheme) => void;
  autoGenTheme: boolean;
  setAutoGenTheme: (v: boolean) => void;

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
 * Keys that make up a user's persisted snapshot. Single source of truth shared
 * by the local IndexedDB persistence (`partialize` below) and the Supabase sync
 * layer (`src/lib/supabase/sync-state.ts`). Add a key here and it is both stored
 * locally and synced to the signed-in user's `user_state` row.
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
  'viewedTypes',
  'soundEnabled',
  'animatedSprites',
  'theme',
  'genTheme',
  'autoGenTheme',
  'language',
  'weeklyQuestClaimedWeek',
] as const;

export type SyncedKey = (typeof SYNCED_KEYS)[number];
export type PersistedState = Pick<PrimeDexStore, SyncedKey>;

export const usePrimeDexStore = create<PrimeDexStore>()(
  persist(
    (set, get) => ({
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
      toggleTCGOwned: (cardId) => set((state) => ({
        tcgOwnedCards: state.tcgOwnedCards.includes(cardId)
          ? state.tcgOwnedCards.filter((id) => id !== cardId)
          : [...state.tcgOwnedCards, cardId],
      })),
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
      animatedSprites: false,
      toggleAnimatedSprites: () => set((state) => ({ animatedSprites: !state.animatedSprites })),

      theme: 'system',
      setTheme: (theme) => set({ theme }),

      genTheme: 'default',
      setGenTheme: (theme) => set({ genTheme: theme }),
      autoGenTheme: false,
      setAutoGenTheme: (v) => set({ autoGenTheme: v }),

      language: 'auto',
      setLanguage: (lang) => set({ language: lang }),
      getLanguageId: () => {
        return getResolvedLanguageId(get().language, get().systemLanguage);
      },
      systemLanguage: typeof window !== 'undefined' ? (navigator.language.split('-')[0] || 'en') : 'en',
      setSystemLanguage: (lang) => set({ systemLanguage: lang }),

      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: 'primedex-storage',
      storage: createJSONStorage(() => storage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      partialize: (state) =>
        Object.fromEntries(SYNCED_KEYS.map((key) => [key, state[key]])) as PersistedState,
    }
  )
);
