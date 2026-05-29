import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { get, set, del } from 'idb-keyval';
import { getLanguageId as getResolvedLanguageId } from '@/lib/languages';
import type { TCGSavedSearch, TCGUserCardEntry } from '@/types/tcg';
import type { QuizSession, ActivityAction } from '@/types/dashboard';

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
  tcgWatchlistCards: string[];
  tcgActiveSets: string[];
  toggleTCGOwned: (cardId: string) => void;
  toggleTCGWishlist: (cardId: string) => void;
  toggleTCGWatchlist: (cardId: string) => void;
  toggleTCGActiveSet: (setId: string) => void;
  isTCGOwned: (cardId: string) => boolean;
  isTCGWishlist: (cardId: string) => boolean;
  isTCGWatchlist: (cardId: string) => boolean;
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
  };
  updateQuizHighScore: (mode: 'classic' | 'silhouette' | 'stats', score: number) => void;

  // Settings
  isSettingsOpen: boolean;
  toggleSettings: () => void;
  soundEnabled: boolean;
  toggleSound: () => void;

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
      tcgWatchlistCards: [],
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
      toggleTCGWatchlist: (cardId) => set((state) => ({
        tcgWatchlistCards: state.tcgWatchlistCards.includes(cardId)
          ? state.tcgWatchlistCards.filter((id) => id !== cardId)
          : [...state.tcgWatchlistCards, cardId],
      })),
      toggleTCGActiveSet: (setId) => set((state) => ({
        tcgActiveSets: state.tcgActiveSets.includes(setId)
          ? state.tcgActiveSets.filter((id) => id !== setId)
          : [...state.tcgActiveSets, setId],
      })),
      isTCGOwned: (cardId) => get().tcgOwnedCards.includes(cardId),
      isTCGWishlist: (cardId) => get().tcgWishlistCards.includes(cardId),
      isTCGWatchlist: (cardId) => get().tcgWatchlistCards.includes(cardId),
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
      },
      updateQuizHighScore: (mode, score) => set((state) => ({
        quizHighScores: {
          ...state.quizHighScores,
          [mode]: Math.max(state.quizHighScores[mode], score)
        }
      })),

      isSettingsOpen: false,
      toggleSettings: () => set((state) => ({ isSettingsOpen: !state.isSettingsOpen })),
      soundEnabled: true,
      toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),

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
    }),
    {
      name: 'primedex-storage',
      storage: createJSONStorage(() => storage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      partialize: (state) => ({
        favorites: state.favorites,
        caughtPokemon: state.caughtPokemon,
        showCaughtOnly: state.showCaughtOnly,
        selectedTypes: state.selectedTypes,
        selectedGeneration: state.selectedGeneration,
        selectedEggGroups: state.selectedEggGroups,
        selectedColors: state.selectedColors,
        selectedShapes: state.selectedShapes,
        isLegendary: state.isLegendary,
        isMythical: state.isMythical,
        minBaseStats: state.minBaseStats,
        minAttack: state.minAttack,
        minDefense: state.minDefense,
        minSpeed: state.minSpeed,
        minHp: state.minHp,
        heightRange: state.heightRange,
        weightRange: state.weightRange,
        selectedRegion: state.selectedRegion,
        showFavoritesOnly: state.showFavoritesOnly,
        sortBy: state.sortBy,
        compareList: state.compareList,
        tcgCompareList: state.tcgCompareList,
        tcgOwnedCards: state.tcgOwnedCards,
        tcgWishlistCards: state.tcgWishlistCards,
        tcgWatchlistCards: state.tcgWatchlistCards,
        tcgActiveSets: state.tcgActiveSets,
        tcgSavedSearches: state.tcgSavedSearches,
        tcgCardNotes: state.tcgCardNotes,
        team: state.team,
        history: state.history,
        badges: state.badges,
        quizHighScores: state.quizHighScores,
        quizHistory: state.quizHistory,
        currentStreak: state.currentStreak,
        bestStreak: state.bestStreak,
        totalQuizCorrect: state.totalQuizCorrect,
        visitCount: state.visitCount,
        lastVisitDate: state.lastVisitDate,
        viewCount: state.viewCount,
        recentActions: state.recentActions,
        soundEnabled: state.soundEnabled,
        theme: state.theme,
        language: state.language,
      }),
    }
  )
);
