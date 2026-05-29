import type { BadgeDefinition, BadgeConditionData, BadgeDefinitionWithStatus } from '@/types/dashboard';

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: 'first-catch',
    nameKey: 'dashboard.badges.first_catch',
    descKey: 'dashboard.badges.first_catch_desc',
    icon: 'Pokeball',
    category: 'pokedex',
    condition: (data) => data.caughtCount >= 1,
    progress: (data) => ({ current: Math.min(data.caughtCount, 1), max: 1 }),
  },
  {
    id: 'collector',
    nameKey: 'dashboard.badges.collector',
    descKey: 'dashboard.badges.collector_desc',
    icon: 'Backpack',
    category: 'pokedex',
    condition: (data) => data.caughtCount >= 256,
    progress: (data) => ({ current: Math.min(data.caughtCount, 256), max: 256 }),
  },
  {
    id: 'pokedex-master',
    nameKey: 'dashboard.badges.pokedex_master',
    descKey: 'dashboard.badges.pokedex_master_desc',
    icon: 'Award',
    category: 'pokedex',
    condition: (data) => data.caughtCount >= 768,
    progress: (data) => ({ current: Math.min(data.caughtCount, 768), max: 768 }),
  },
  {
    id: 'complete-dex',
    nameKey: 'dashboard.badges.complete_dex',
    descKey: 'dashboard.badges.complete_dex_desc',
    icon: 'Trophy',
    category: 'pokedex',
    condition: (data) => data.caughtCount >= 1025,
    progress: (data) => ({ current: Math.min(data.caughtCount, 1025), max: 1025 }),
  },
  {
    id: 'quiz-novice',
    nameKey: 'dashboard.badges.quiz_novice',
    descKey: 'dashboard.badges.quiz_novice_desc',
    icon: 'Gamepad2',
    category: 'quiz',
    condition: (data) => data.quizHighScore >= 10,
    progress: (data) => ({ current: Math.min(data.quizHighScore, 10), max: 10 }),
  },
  {
    id: 'quiz-master',
    nameKey: 'dashboard.badges.quiz_master',
    descKey: 'dashboard.badges.quiz_master_desc',
    icon: 'Trophy',
    category: 'quiz',
    condition: (data) => data.quizHighScore >= 50,
    progress: (data) => ({ current: Math.min(data.quizHighScore, 50), max: 50 }),
  },
  {
    id: 'speed-demon',
    nameKey: 'dashboard.badges.speed_demon',
    descKey: 'dashboard.badges.speed_demon_desc',
    icon: 'Zap',
    category: 'quiz',
    condition: (data) => data.quizHighScoreTA >= 100,
    progress: (data) => ({ current: Math.min(data.quizHighScoreTA, 100), max: 100 }),
  },
  {
    id: 'eagle-eye',
    nameKey: 'dashboard.badges.eagle_eye',
    descKey: 'dashboard.badges.eagle_eye_desc',
    icon: 'EyeOff',
    category: 'quiz',
    condition: (data) => data.quizHighScoreSilhouette >= 20,
    progress: (data) => ({ current: Math.min(data.quizHighScoreSilhouette, 20), max: 20 }),
  },
  {
    id: 'professor',
    nameKey: 'dashboard.badges.professor',
    descKey: 'dashboard.badges.professor_desc',
    icon: 'BrainCircuit',
    category: 'quiz',
    condition: (data) => data.quizHighScoreStats >= 20,
    progress: (data) => ({ current: Math.min(data.quizHighScoreStats, 20), max: 20 }),
  },
  {
    id: 'fan-favorite',
    nameKey: 'dashboard.badges.fan_favorite',
    descKey: 'dashboard.badges.fan_favorite_desc',
    icon: 'Heart',
    category: 'social',
    condition: (data) => data.favoriteCount >= 50,
    progress: (data) => ({ current: Math.min(data.favoriteCount, 50), max: 50 }),
  },
  {
    id: 'team-builder',
    nameKey: 'dashboard.badges.team_builder',
    descKey: 'dashboard.badges.team_builder_desc',
    icon: 'Users',
    category: 'team',
    condition: (data) => data.teamCount >= 6,
    progress: (data) => ({ current: Math.min(data.teamCount, 6), max: 6 }),
  },
  {
    id: 'type-explorer',
    nameKey: 'dashboard.badges.type_explorer',
    descKey: 'dashboard.badges.type_explorer_desc',
    icon: 'Shapes',
    category: 'discovery',
    condition: (data) => data.uniqueTypesViewed >= 10,
    progress: (data) => ({ current: Math.min(data.uniqueTypesViewed, 10), max: 10 }),
  },
];

export function computeBadgeStatus(definitions: BadgeDefinition[], data: BadgeConditionData): BadgeDefinitionWithStatus[] {
  return definitions.map((badge) => {
    const { current, max } = badge.progress(data);
    return {
      ...badge,
      unlocked: badge.condition(data),
      progressCurrent: current,
      progressMax: max,
    };
  });
}

export function findNextBadge(badges: BadgeDefinitionWithStatus[]): BadgeDefinitionWithStatus | null {
  const locked = badges.filter((b) => !b.unlocked);
  if (locked.length === 0) return null;
  locked.sort((a, b) => {
    const aRatio = a.progressMax > 0 ? a.progressCurrent / a.progressMax : 0;
    const bRatio = b.progressMax > 0 ? b.progressCurrent / b.progressMax : 0;
    return bRatio - aRatio;
  });
  return locked[0];
}
