import type {
  BadgeDefinition,
  BadgeConditionData,
  BadgeDefinitionWithStatus,
  BadgeTier,
  BadgeTierDefinition,
  TierStatus,
} from '@/types/dashboard';

export const BADGE_TIER_ORDER: BadgeTier[] = ['bronze', 'silver', 'gold'];

function getTierForValue(tiers: BadgeTierDefinition[], value: number): TierStatus {
  const bronze = tiers.find((t) => t.nameKey.endsWith('_bronze'))!;
  const silver = tiers.find((t) => t.nameKey.endsWith('_silver'))!;
  const gold = tiers.find((t) => t.nameKey.endsWith('_gold'))!;

  let currentTier: BadgeTier | null = null;
  let currentTierProgress = value;
  let currentTierMax = bronze.threshold;

  if (value >= gold.threshold) {
    currentTier = 'gold';
    currentTierProgress = value;
    currentTierMax = gold.threshold;
  } else if (value >= silver.threshold) {
    currentTier = 'silver';
    currentTierProgress = value - silver.threshold;
    currentTierMax = gold.threshold - silver.threshold;
  } else if (value >= bronze.threshold) {
    currentTier = 'bronze';
    currentTierProgress = value - bronze.threshold;
    currentTierMax = silver.threshold - bronze.threshold;
  }

  return {
    currentTier,
    highestTier: currentTier ?? 'bronze',
    currentTierProgress,
    currentTierMax,
  };
}

function getRawValue(data: BadgeConditionData, category: string): number {
  switch (category) {
    case 'caught':
      return data.caughtCount;
    case 'quiz':
      return data.quizHighScore;
    case 'quiz-ta':
      return data.quizHighScoreTA;
    case 'silhouette':
      return data.quizHighScoreSilhouette;
    case 'stats':
      return data.quizHighScoreStats;
    case 'favorites':
      return data.favoriteCount;
    case 'team':
      return data.teamCount;
    case 'types':
      return data.uniqueTypesViewed;
    case 'tcg':
      return data.tcgOwnedCount;
    case 'streak':
      return data.currentStreak;
    default:
      return 0;
  }
}

const TIER_RAW_KEY: Record<string, string> = {
  'first-catch': 'caught',
  'collector': 'caught',
  'pokedex-master': 'caught',
  'complete-dex': 'caught',
  'quiz-novice': 'quiz',
  'quiz-master': 'quiz',
  'speed-demon': 'quiz-ta',
  'eagle-eye': 'silhouette',
  'professor': 'stats',
  'fan-favorite': 'favorites',
  'team-builder': 'team',
  'type-explorer': 'types',
  'tcg-starter': 'tcg',
  'daily-streak': 'streak',
  'quiz-daily-champion': 'quiz',
};

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: 'first-catch',
    nameKey: 'dashboard.badges.first_catch',
    descKey: 'dashboard.badges.first_catch_desc',
    icon: 'Pokeball',
    category: 'pokedex',
    condition: (data) => data.caughtCount >= 1,
    progress: (data) => ({ current: Math.min(data.caughtCount, 1), max: 1 }),
    tiers: [
      { nameKey: 'dashboard.badges.tier_bronze', descKey: 'dashboard.badges.tier_bronze_desc', threshold: 1 },
      { nameKey: 'dashboard.badges.tier_silver', descKey: 'dashboard.badges.tier_silver_desc', threshold: 50 },
      { nameKey: 'dashboard.badges.tier_gold', descKey: 'dashboard.badges.tier_gold_desc', threshold: 256 },
    ],
  },
  {
    id: 'collector',
    nameKey: 'dashboard.badges.collector',
    descKey: 'dashboard.badges.collector_desc',
    icon: 'Backpack',
    category: 'pokedex',
    condition: (data) => data.caughtCount >= 256,
    progress: (data) => ({ current: Math.min(data.caughtCount, 256), max: 256 }),
    tiers: [
      { nameKey: 'dashboard.badges.tier_bronze', descKey: 'dashboard.badges.tier_bronze_desc', threshold: 256 },
      { nameKey: 'dashboard.badges.tier_silver', descKey: 'dashboard.badges.tier_silver_desc', threshold: 512 },
      { nameKey: 'dashboard.badges.tier_gold', descKey: 'dashboard.badges.tier_gold_desc', threshold: 768 },
    ],
  },
  {
    id: 'pokedex-master',
    nameKey: 'dashboard.badges.pokedex_master',
    descKey: 'dashboard.badges.pokedex_master_desc',
    icon: 'Award',
    category: 'pokedex',
    condition: (data) => data.caughtCount >= 768,
    progress: (data) => ({ current: Math.min(data.caughtCount, 768), max: 768 }),
    tiers: [
      { nameKey: 'dashboard.badges.tier_bronze', descKey: 'dashboard.badges.tier_bronze_desc', threshold: 768 },
      { nameKey: 'dashboard.badges.tier_silver', descKey: 'dashboard.badges.tier_silver_desc', threshold: 900 },
      { nameKey: 'dashboard.badges.tier_gold', descKey: 'dashboard.badges.tier_gold_desc', threshold: 1025 },
    ],
  },
  {
    id: 'complete-dex',
    nameKey: 'dashboard.badges.complete_dex',
    descKey: 'dashboard.badges.complete_dex_desc',
    icon: 'Trophy',
    category: 'pokedex',
    condition: (data) => data.caughtCount >= 1025,
    progress: (data) => ({ current: Math.min(data.caughtCount, 1025), max: 1025 }),
    tiers: [
      { nameKey: 'dashboard.badges.tier_bronze', descKey: 'dashboard.badges.tier_bronze_desc', threshold: 151 },
      { nameKey: 'dashboard.badges.tier_silver', descKey: 'dashboard.badges.tier_silver_desc', threshold: 493 },
      { nameKey: 'dashboard.badges.tier_gold', descKey: 'dashboard.badges.tier_gold_desc', threshold: 1025 },
    ],
  },
  {
    id: 'quiz-novice',
    nameKey: 'dashboard.badges.quiz_novice',
    descKey: 'dashboard.badges.quiz_novice_desc',
    icon: 'Gamepad2',
    category: 'quiz',
    condition: (data) => data.quizHighScore >= 10,
    progress: (data) => ({ current: Math.min(data.quizHighScore, 10), max: 10 }),
    tiers: [
      { nameKey: 'dashboard.badges.tier_bronze', descKey: 'dashboard.badges.tier_bronze_desc', threshold: 10 },
      { nameKey: 'dashboard.badges.tier_silver', descKey: 'dashboard.badges.tier_silver_desc', threshold: 25 },
      { nameKey: 'dashboard.badges.tier_gold', descKey: 'dashboard.badges.tier_gold_desc', threshold: 50 },
    ],
  },
  {
    id: 'quiz-master',
    nameKey: 'dashboard.badges.quiz_master',
    descKey: 'dashboard.badges.quiz_master_desc',
    icon: 'Trophy',
    category: 'quiz',
    condition: (data) => data.quizHighScore >= 50,
    progress: (data) => ({ current: Math.min(data.quizHighScore, 50), max: 50 }),
    tiers: [
      { nameKey: 'dashboard.badges.tier_bronze', descKey: 'dashboard.badges.tier_bronze_desc', threshold: 50 },
      { nameKey: 'dashboard.badges.tier_silver', descKey: 'dashboard.badges.tier_silver_desc', threshold: 100 },
      { nameKey: 'dashboard.badges.tier_gold', descKey: 'dashboard.badges.tier_gold_desc', threshold: 200 },
    ],
  },
  {
    id: 'speed-demon',
    nameKey: 'dashboard.badges.speed_demon',
    descKey: 'dashboard.badges.speed_demon_desc',
    icon: 'Zap',
    category: 'quiz',
    condition: (data) => data.quizHighScoreTA >= 100,
    progress: (data) => ({ current: Math.min(data.quizHighScoreTA, 100), max: 100 }),
    tiers: [
      { nameKey: 'dashboard.badges.tier_bronze', descKey: 'dashboard.badges.tier_bronze_desc', threshold: 100 },
      { nameKey: 'dashboard.badges.tier_silver', descKey: 'dashboard.badges.tier_silver_desc', threshold: 250 },
      { nameKey: 'dashboard.badges.tier_gold', descKey: 'dashboard.badges.tier_gold_desc', threshold: 500 },
    ],
  },
  {
    id: 'eagle-eye',
    nameKey: 'dashboard.badges.eagle_eye',
    descKey: 'dashboard.badges.eagle_eye_desc',
    icon: 'EyeOff',
    category: 'quiz',
    condition: (data) => data.quizHighScoreSilhouette >= 20,
    progress: (data) => ({ current: Math.min(data.quizHighScoreSilhouette, 20), max: 20 }),
    tiers: [
      { nameKey: 'dashboard.badges.tier_bronze', descKey: 'dashboard.badges.tier_bronze_desc', threshold: 20 },
      { nameKey: 'dashboard.badges.tier_silver', descKey: 'dashboard.badges.tier_silver_desc', threshold: 50 },
      { nameKey: 'dashboard.badges.tier_gold', descKey: 'dashboard.badges.tier_gold_desc', threshold: 100 },
    ],
  },
  {
    id: 'professor',
    nameKey: 'dashboard.badges.professor',
    descKey: 'dashboard.badges.professor_desc',
    icon: 'BrainCircuit',
    category: 'quiz',
    condition: (data) => data.quizHighScoreStats >= 20,
    progress: (data) => ({ current: Math.min(data.quizHighScoreStats, 20), max: 20 }),
    tiers: [
      { nameKey: 'dashboard.badges.tier_bronze', descKey: 'dashboard.badges.tier_bronze_desc', threshold: 20 },
      { nameKey: 'dashboard.badges.tier_silver', descKey: 'dashboard.badges.tier_silver_desc', threshold: 50 },
      { nameKey: 'dashboard.badges.tier_gold', descKey: 'dashboard.badges.tier_gold_desc', threshold: 100 },
    ],
  },
  {
    id: 'fan-favorite',
    nameKey: 'dashboard.badges.fan_favorite',
    descKey: 'dashboard.badges.fan_favorite_desc',
    icon: 'Heart',
    category: 'social',
    condition: (data) => data.favoriteCount >= 50,
    progress: (data) => ({ current: Math.min(data.favoriteCount, 50), max: 50 }),
    tiers: [
      { nameKey: 'dashboard.badges.tier_bronze', descKey: 'dashboard.badges.tier_bronze_desc', threshold: 10 },
      { nameKey: 'dashboard.badges.tier_silver', descKey: 'dashboard.badges.tier_silver_desc', threshold: 25 },
      { nameKey: 'dashboard.badges.tier_gold', descKey: 'dashboard.badges.tier_gold_desc', threshold: 50 },
    ],
  },
  {
    id: 'team-builder',
    nameKey: 'dashboard.badges.team_builder',
    descKey: 'dashboard.badges.team_builder_desc',
    icon: 'Users',
    category: 'team',
    condition: (data) => data.teamCount >= 6,
    progress: (data) => ({ current: Math.min(data.teamCount, 6), max: 6 }),
    tiers: [
      { nameKey: 'dashboard.badges.tier_bronze', descKey: 'dashboard.badges.tier_bronze_desc', threshold: 1 },
      { nameKey: 'dashboard.badges.tier_silver', descKey: 'dashboard.badges.tier_silver_desc', threshold: 3 },
      { nameKey: 'dashboard.badges.tier_gold', descKey: 'dashboard.badges.tier_gold_desc', threshold: 6 },
    ],
  },
  {
    id: 'type-explorer',
    nameKey: 'dashboard.badges.type_explorer',
    descKey: 'dashboard.badges.type_explorer_desc',
    icon: 'Triangle',
    category: 'discovery',
    condition: (data) => data.uniqueTypesViewed >= 18,
    progress: (data) => ({ current: Math.min(data.uniqueTypesViewed, 18), max: 18 }),
    tiers: [
      { nameKey: 'dashboard.badges.tier_bronze', descKey: 'dashboard.badges.tier_bronze_desc', threshold: 9 },
      { nameKey: 'dashboard.badges.tier_silver', descKey: 'dashboard.badges.tier_silver_desc', threshold: 14 },
      { nameKey: 'dashboard.badges.tier_gold', descKey: 'dashboard.badges.tier_gold_desc', threshold: 18 },
    ],
  },
  {
    id: 'tcg-starter',
    nameKey: 'dashboard.badges.tcg_starter',
    descKey: 'dashboard.badges.tcg_starter_desc',
    icon: 'Layers',
    category: 'tcg',
    condition: (data) => data.tcgOwnedCount >= 1,
    progress: (data) => ({ current: Math.min(data.tcgOwnedCount, 500), max: 500 }),
    tiers: [
      { nameKey: 'dashboard.badges.tier_bronze', descKey: 'dashboard.badges.tier_bronze_desc', threshold: 1 },
      { nameKey: 'dashboard.badges.tier_silver', descKey: 'dashboard.badges.tier_silver_desc', threshold: 50 },
      { nameKey: 'dashboard.badges.tier_gold', descKey: 'dashboard.badges.tier_gold_desc', threshold: 500 },
    ],
  },
  {
    id: 'daily-streak',
    nameKey: 'dashboard.badges.daily_streak',
    descKey: 'dashboard.badges.daily_streak_desc',
    icon: 'Flame',
    category: 'discovery',
    condition: (data) => data.currentStreak >= 7,
    progress: (data) => ({ current: Math.min(data.currentStreak, 90), max: 90 }),
    tiers: [
      { nameKey: 'dashboard.badges.tier_bronze', descKey: 'dashboard.badges.tier_bronze_desc', threshold: 7 },
      { nameKey: 'dashboard.badges.tier_silver', descKey: 'dashboard.badges.tier_silver_desc', threshold: 30 },
      { nameKey: 'dashboard.badges.tier_gold', descKey: 'dashboard.badges.tier_gold_desc', threshold: 90 },
    ],
  },
  {
    id: 'quiz-daily-champion',
    nameKey: 'dashboard.badges.quiz_daily_champion',
    descKey: 'dashboard.badges.quiz_daily_champion_desc',
    icon: 'Crown',
    category: 'quiz',
    condition: (data) => data.quizHighScore >= 5,
    progress: (data) => ({ current: Math.min(data.quizHighScore, 100), max: 100 }),
    tiers: [
      { nameKey: 'dashboard.badges.tier_bronze', descKey: 'dashboard.badges.tier_bronze_desc', threshold: 5 },
      { nameKey: 'dashboard.badges.tier_silver', descKey: 'dashboard.badges.tier_silver_desc', threshold: 25 },
      { nameKey: 'dashboard.badges.tier_gold', descKey: 'dashboard.badges.tier_gold_desc', threshold: 100 },
    ],
  },
];

export function computeBadgeStatus(definitions: BadgeDefinition[], data: BadgeConditionData): BadgeDefinitionWithStatus[] {
  return definitions.map((badge) => {
    const { current, max } = badge.progress(data);
    const result: BadgeDefinitionWithStatus = {
      ...badge,
      unlocked: badge.condition(data),
      progressCurrent: current,
      progressMax: max,
    };
    if (badge.tiers) {
      const rawKey = TIER_RAW_KEY[badge.id];
      const rawValue = rawKey ? getRawValue(data, rawKey) : current;
      result.tierStatus = getTierForValue(badge.tiers, rawValue);
    }
    return result;
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

export function findNextTierUnlock(badges: BadgeDefinitionWithStatus[]): BadgeDefinitionWithStatus | null {
  const tiered = badges.filter((b) => b.tierStatus && b.unlocked && b.tierStatus.highestTier !== 'gold');
  if (tiered.length === 0) return null;
  tiered.sort((a, b) => {
    const aRatio = a.tierStatus!.currentTierMax > 0
      ? a.tierStatus!.currentTierProgress / a.tierStatus!.currentTierMax
      : 0;
    const bRatio = b.tierStatus!.currentTierMax > 0
      ? b.tierStatus!.currentTierProgress / b.tierStatus!.currentTierMax
      : 0;
    return bRatio - aRatio;
  });
  return tiered[0];
}
