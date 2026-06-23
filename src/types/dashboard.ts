export interface QuizSession {
  id: string;
  date: string;
  challenge: 'classic' | 'silhouette' | 'stats';
  mode: 'marathon' | 'survival' | 'time-attack';
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  streak: number;
}

export type BadgeTier = 'bronze' | 'silver' | 'gold';

export interface BadgeTierDefinition {
  nameKey: string;
  descKey: string;
  threshold: number;
}

export interface BadgeDefinition {
  id: string;
  nameKey: string;
  descKey: string;
  icon: string;
  category: 'quiz' | 'pokedex' | 'social' | 'team' | 'discovery' | 'tcg';
  condition: (data: BadgeConditionData) => boolean;
  progress: (data: BadgeConditionData) => { current: number; max: number };
  tiers?: BadgeTierDefinition[];
}

export interface BadgeConditionData {
  caughtCount: number;
  favoriteCount: number;
  teamCount: number;
  quizHighScore: number;
  quizHighScoreTA: number;
  quizHighScoreSilhouette: number;
  quizHighScoreStats: number;
  totalQuizSessions: number;
  uniqueTypesViewed: number;
  tcgOwnedCount: number;
  currentStreak: number;
}

export interface DashboardData {
  profile: {
    displayName: string;
    avatarPokemonId: number | null;
    memberSince: string | null;
  };
  badges: {
    all: BadgeDefinitionWithStatus[];
    unlocked: BadgeDefinitionWithStatus[];
    locked: BadgeDefinitionWithStatus[];
    next: BadgeDefinitionWithStatus | null;
  };
  quiz: {
    totalSessions: number;
    averageScore: number;
    bestScore: number;
    worstScore: number;
    perCategory: {
      classic: CategoryStats;
      silhouette: CategoryStats;
      stats: CategoryStats;
    };
    progression: { date: string; score: number; challenge: string }[];
    currentStreak: number;
    bestStreak: number;
    totalCorrect: number;
  };
  pokedex: {
    totalPokemon: number;
    caughtCount: number;
    seenCount: number;
    caughtPercent: number;
    seenPercent: number;
    byGeneration: { id: number; name: string; total: number; caught: number }[];
    byType: { name: string; total: number; caught: number; color: string }[];
    mostViewed: { id: number; name: string; count: number }[];
    neverViewed: { id: number; name: string }[];
  };
  activity: {
    visitCount: number;
    lastVisitDate: string | null;
    recentActions: ActivityAction[];
  };
  extensible: ExtensibleMetric[];
}

export interface CategoryStats {
  totalSessions: number;
  averageScore: number;
  bestScore: number;
}

export interface BadgeDefinitionWithStatus extends BadgeDefinition {
  unlocked: boolean;
  progressCurrent: number;
  progressMax: number;
  tierStatus?: TierStatus;
}

export interface TierStatus {
  currentTier: BadgeTier | null;
  highestTier: BadgeTier;
  currentTierProgress: number;
  currentTierMax: number;
}

export interface ActivityAction {
  id: string;
  date: string;
  type: 'quiz' | 'pokemon_view' | 'tcg_add' | 'favorite_add' | 'team_edit' | 'caught';
  label: string;
  details?: string;
}

export interface ExtensibleMetric {
  id: string;
  label: string;
  value: string | number;
  icon: string;
  subtitle?: string;
}

export interface TrainerLevel {
  level: number;
  titleKey: string;
  xp: number;
  xpForNextLevel: number;
  xpForCurrentLevel: number;
}

export interface WeeklyQuest {
  id: string;
  nameKey: string;
  descKey: string;
  icon: string;
  target: number;
  progress: number;
  xpReward: number;
}

// ---------------------------------------------------------------------------
// Public profile (read-only, SEO-indexable)
// ---------------------------------------------------------------------------

/** Row shape returned by Supabase for public profile queries. */
export interface PublicProfileRow {
  id: string;
  name: string | null;
  public_handle: string;
  is_public: boolean;
  avatar_pokemon_id: number | null;
  caught_count: number;
  total_pokemon: number;
  unlocked_badges: string[];
  team_ids: number[];
  quiz_best_score: number;
  quiz_best_streak: number;
  quiz_total_correct: number;
  tcg_owned_count: number;
  caught_by_gen: number[];
  member_since: string | null;
}

/** Derived shape consumed by the public profile UI. */
export interface PublicProfile {
  id: string;
  displayName: string;
  handle: string;
  avatarPokemonId: number | null;
  caughtCount: number;
  totalPokemon: number;
  caughtPercent: number;
  unlockedBadges: string[];
  teamIds: number[];
  quizBestScore: number;
  quizBestStreak: number;
  quizTotalCorrect: number;
  tcgOwnedCount: number;
  /** Caught count per generation, index 0 = gen 1 … index 8 = gen 9. */
  caughtByGen: number[];
  memberSince: string | null;
}

/** Handle validation regex: 3-30 lowercase alphanumeric with internal hyphens. */
export const HANDLE_REGEX = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
export const HANDLE_MIN_LENGTH = 3;
export const HANDLE_MAX_LENGTH = 30;
