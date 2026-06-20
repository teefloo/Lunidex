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

export interface BadgeDefinition {
  id: string;
  nameKey: string;
  descKey: string;
  icon: string;
  category: 'quiz' | 'pokedex' | 'social' | 'team' | 'discovery';
  condition: (data: BadgeConditionData) => boolean;
  progress: (data: BadgeConditionData) => { current: number; max: number };
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
