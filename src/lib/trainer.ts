import type { BadgeConditionData, TrainerLevel, WeeklyQuest } from '@/types/dashboard';

export const XP_REWARDS = {
  caught: 10,
  favorite: 5,
  teamMember: 5,
  quizCorrect: 2,
  quizSession: 15,
  visit: 1,
  tcgOwned: 3,
  typeViewed: 2,
} as const;

const LEVEL_XP_TABLE: readonly number[] = [
  0, 100, 250, 500, 800, 1200, 1700, 2300, 3000, 3800,
  4700, 5700, 6800, 8000, 9300, 10700, 12200, 13800, 15500, 17300,
  19200, 21200, 23300, 25500, 27800, 30200, 32700, 35300, 38000, 40800,
];

const LEVEL_TITLE_KEYS: readonly string[] = [
  'dashboard.trainer.titles.rookie',
  'dashboard.trainer.titles.bronze',
  'dashboard.trainer.titles.silver',
  'dashboard.trainer.titles.gold',
  'dashboard.trainer.titles.champion',
];

export function computeTotalXP(data: BadgeConditionData, additional?: {
  tcgOwnedCount?: number;
  totalQuizCorrect?: number;
}): number {
  const tcgOwned = additional?.tcgOwnedCount ?? 0;
  const quizCorrect = additional?.totalQuizCorrect ?? data.totalQuizSessions * 5;

  return (
    data.caughtCount * XP_REWARDS.caught +
    data.favoriteCount * XP_REWARDS.favorite +
    data.teamCount * XP_REWARDS.teamMember +
    data.totalQuizSessions * XP_REWARDS.quizSession +
    quizCorrect * XP_REWARDS.quizCorrect +
    data.uniqueTypesViewed * XP_REWARDS.typeViewed +
    tcgOwned * XP_REWARDS.tcgOwned
  );
}

export function getTrainerLevel(xp: number): TrainerLevel {
  let level = 1;
  for (let i = 1; i < LEVEL_XP_TABLE.length; i++) {
    if (xp >= LEVEL_XP_TABLE[i]) {
      level = i + 1;
    } else {
      break;
    }
  }

  const xpForCurrentLevel = LEVEL_XP_TABLE[level - 1] ?? 0;
  const xpForNextLevel = LEVEL_XP_TABLE[level] ?? LEVEL_XP_TABLE[LEVEL_XP_TABLE.length - 1] + 5000;

  const titleIndex = Math.min(Math.floor((level - 1) / 6), LEVEL_TITLE_KEYS.length - 1);

  return {
    level,
    titleKey: LEVEL_TITLE_KEYS[titleIndex],
    xp,
    xpForNextLevel,
    xpForCurrentLevel,
  };
}

export function getXPProgress(xp: number): { current: number; max: number; percent: number } {
  const level = getTrainerLevel(xp);
  const span = level.xpForNextLevel - level.xpForCurrentLevel;
  const current = xp - level.xpForCurrentLevel;
  const percent = span > 0 ? Math.round((current / span) * 100) : 0;
  return { current, max: span, percent };
}

export function didLevelUp(prevXP: number, newXP: number): boolean {
  return getTrainerLevel(prevXP).level < getTrainerLevel(newXP).level;
}

const WEEKLY_QUESTS: readonly {
  id: string;
  nameKey: string;
  descKey: string;
  icon: string;
  type: 'caught' | 'quiz' | 'favorites' | 'team' | 'types' | 'tcg';
  target: number;
  xpReward: number;
}[] = [
  { id: 'wq-catch-fire', nameKey: 'dashboard.weekly.catch_fire', descKey: 'dashboard.weekly.catch_fire_desc', icon: 'Flame', type: 'caught', target: 10, xpReward: 50 },
  { id: 'wq-catch-water', nameKey: 'dashboard.weekly.catch_water', descKey: 'dashboard.weekly.catch_water_desc', icon: 'Droplets', type: 'caught', target: 10, xpReward: 50 },
  { id: 'wq-catch-grass', nameKey: 'dashboard.weekly.catch_grass', descKey: 'dashboard.weekly.catch_grass_desc', icon: 'Leaf', type: 'caught', target: 10, xpReward: 50 },
  { id: 'wq-quiz-score', nameKey: 'dashboard.weekly.quiz_score', descKey: 'dashboard.weekly.quiz_score_desc', icon: 'BrainCircuit', type: 'quiz', target: 30, xpReward: 75 },
  { id: 'wq-favorites', nameKey: 'dashboard.weekly.add_favorites', descKey: 'dashboard.weekly.add_favorites_desc', icon: 'Heart', type: 'favorites', target: 10, xpReward: 40 },
  { id: 'wq-team', nameKey: 'dashboard.weekly.build_team', descKey: 'dashboard.weekly.build_team_desc', icon: 'Users', type: 'team', target: 6, xpReward: 60 },
  { id: 'wq-types', nameKey: 'dashboard.weekly.explore_types', descKey: 'dashboard.weekly.explore_types_desc', icon: 'Shapes', type: 'types', target: 5, xpReward: 35 },
  { id: 'wq-tcg', nameKey: 'dashboard.weekly.collect_cards', descKey: 'dashboard.weekly.collect_cards_desc', icon: 'Layers', type: 'tcg', target: 5, xpReward: 45 },
] as const;

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}

export function computeWeeklyQuest(
  date: Date,
  data: BadgeConditionData,
  tcgOwnedCount?: number,
): WeeklyQuest {
  const weekNum = getWeekNumber(date);
  const questIndex = weekNum % WEEKLY_QUESTS.length;
  const questDef = WEEKLY_QUESTS[questIndex];

  let progress = 0;
  switch (questDef.type) {
    case 'caught':
      progress = Math.min(data.caughtCount, questDef.target);
      break;
    case 'quiz':
      progress = Math.min(data.quizHighScore, questDef.target);
      break;
    case 'favorites':
      progress = Math.min(data.favoriteCount, questDef.target);
      break;
    case 'team':
      progress = Math.min(data.teamCount, questDef.target);
      break;
    case 'types':
      progress = Math.min(data.uniqueTypesViewed, questDef.target);
      break;
    case 'tcg':
      progress = Math.min(tcgOwnedCount ?? 0, questDef.target);
      break;
  }

  return {
    id: questDef.id,
    nameKey: questDef.nameKey,
    descKey: questDef.descKey,
    icon: questDef.icon,
    target: questDef.target,
    progress,
    xpReward: questDef.xpReward,
  };
}
