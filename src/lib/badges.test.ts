import { describe, it, expect } from 'vitest';
import { BADGE_DEFINITIONS, computeBadgeStatus, findNextBadge, findNextTierUnlock, BADGE_TIER_ORDER } from './badges';
import type { BadgeConditionData } from '@/types/dashboard';

const emptyData: BadgeConditionData = {
  caughtCount: 0,
  favoriteCount: 0,
  teamCount: 0,
  quizHighScore: 0,
  quizHighScoreTA: 0,
  quizHighScoreSilhouette: 0,
  quizHighScoreStats: 0,
  totalQuizSessions: 0,
  uniqueTypesViewed: 0,
};

describe('computeBadgeStatus', () => {
  it('locks all badges with empty data', () => {
    const statuses = computeBadgeStatus(BADGE_DEFINITIONS, emptyData);
    expect(statuses.every((b) => !b.unlocked)).toBe(true);
  });

  it('unlocks first-catch at one caught', () => {
    const statuses = computeBadgeStatus(BADGE_DEFINITIONS, { ...emptyData, caughtCount: 1 });
    const firstCatch = statuses.find((b) => b.id === 'first-catch');
    expect(firstCatch?.unlocked).toBe(true);
  });

  it('clamps progress current to the max', () => {
    const statuses = computeBadgeStatus(BADGE_DEFINITIONS, { ...emptyData, caughtCount: 99999 });
    const completeDex = statuses.find((b) => b.id === 'complete-dex');
    expect(completeDex?.progressCurrent).toBe(completeDex?.progressMax);
    expect(completeDex?.progressCurrent).toBe(1025);
  });

  it('reports partial progress before unlocking', () => {
    const statuses = computeBadgeStatus(BADGE_DEFINITIONS, { ...emptyData, caughtCount: 128 });
    const collector = statuses.find((b) => b.id === 'collector');
    expect(collector?.unlocked).toBe(false);
    expect(collector?.progressCurrent).toBe(128);
    expect(collector?.progressMax).toBe(256);
  });
});

describe('tier status', () => {
  it('provides tierStatus for badges with tiers', () => {
    const statuses = computeBadgeStatus(BADGE_DEFINITIONS, { ...emptyData, caughtCount: 0 });
    const firstCatch = statuses.find((b) => b.id === 'first-catch');
    expect(firstCatch?.tierStatus).toBeDefined();
  });

  it('returns bronze tier for first-catch at 1 catch', () => {
    const statuses = computeBadgeStatus(BADGE_DEFINITIONS, { ...emptyData, caughtCount: 1 });
    const firstCatch = statuses.find((b) => b.id === 'first-catch');
    expect(firstCatch?.tierStatus?.currentTier).toBe('bronze');
    expect(firstCatch?.tierStatus?.highestTier).toBe('bronze');
  });

  it('returns silver tier for first-catch at 50 catches', () => {
    const statuses = computeBadgeStatus(BADGE_DEFINITIONS, { ...emptyData, caughtCount: 50 });
    const firstCatch = statuses.find((b) => b.id === 'first-catch');
    expect(firstCatch?.tierStatus?.currentTier).toBe('silver');
    expect(firstCatch?.tierStatus?.highestTier).toBe('silver');
  });

  it('returns gold tier for first-catch at 256 catches', () => {
    const statuses = computeBadgeStatus(BADGE_DEFINITIONS, { ...emptyData, caughtCount: 256 });
    const firstCatch = statuses.find((b) => b.id === 'first-catch');
    expect(firstCatch?.tierStatus?.currentTier).toBe('gold');
    expect(firstCatch?.tierStatus?.highestTier).toBe('gold');
  });

  it('computes tier progress between tiers', () => {
    const statuses = computeBadgeStatus(BADGE_DEFINITIONS, { ...emptyData, caughtCount: 100 });
    const firstCatch = statuses.find((b) => b.id === 'first-catch');
    // silver range: 50-256, so progress = 100-50 = 50, max = 256-50 = 206
    expect(firstCatch?.tierStatus?.currentTier).toBe('silver');
    expect(firstCatch?.tierStatus?.currentTierProgress).toBe(50);
    expect(firstCatch?.tierStatus?.currentTierMax).toBe(206);
  });

  it('returns null currentTier when below bronze threshold', () => {
    const statuses = computeBadgeStatus(BADGE_DEFINITIONS, { ...emptyData, caughtCount: 0 });
    const firstCatch = statuses.find((b) => b.id === 'first-catch');
    expect(firstCatch?.tierStatus?.currentTier).toBeNull();
    expect(firstCatch?.tierStatus?.highestTier).toBe('bronze');
  });

  it('all badges have tiers defined', () => {
    expect(BADGE_DEFINITIONS.every((b) => b.tiers !== undefined && b.tiers.length === 3)).toBe(true);
  });

  it('tier order is consistent', () => {
    expect(BADGE_TIER_ORDER).toEqual(['bronze', 'silver', 'gold']);
  });
});

describe('findNextTierUnlock', () => {
  it('returns null when no unlocked badges have tiers below gold', () => {
    const statuses = computeBadgeStatus(BADGE_DEFINITIONS, emptyData);
    expect(findNextTierUnlock(statuses)).toBeNull();
  });

  it('returns the badge closest to next tier unlock', () => {
    // first-catch: bronze=1, silver=50, gold=256. With caughtCount=1, unlocked with bronze tier.
    const statuses = computeBadgeStatus(BADGE_DEFINITIONS, { ...emptyData, caughtCount: 1 });
    const next = findNextTierUnlock(statuses);
    expect(next?.id).toBe('first-catch');
  });

  it('returns null when all tiered badges are gold', () => {
    const maxedData: BadgeConditionData = {
      caughtCount: 99999,
      favoriteCount: 99999,
      teamCount: 99999,
      quizHighScore: 99999,
      quizHighScoreTA: 99999,
      quizHighScoreSilhouette: 99999,
      quizHighScoreStats: 99999,
      totalQuizSessions: 99999,
      uniqueTypesViewed: 99999,
    };
    const statuses = computeBadgeStatus(BADGE_DEFINITIONS, maxedData);
    expect(findNextTierUnlock(statuses)).toBeNull();
  });
});

describe('findNextBadge', () => {
  it('returns null when every badge is unlocked', () => {
    const maxedData: BadgeConditionData = {
      caughtCount: 99999,
      favoriteCount: 99999,
      teamCount: 99999,
      quizHighScore: 99999,
      quizHighScoreTA: 99999,
      quizHighScoreSilhouette: 99999,
      quizHighScoreStats: 99999,
      totalQuizSessions: 99999,
      uniqueTypesViewed: 99999,
    };
    const statuses = computeBadgeStatus(BADGE_DEFINITIONS, maxedData);
    expect(findNextBadge(statuses)).toBeNull();
  });

  it('returns the locked badge closest to completion', () => {
    const statuses = computeBadgeStatus(BADGE_DEFINITIONS, { ...emptyData, caughtCount: 200 });
    const next = findNextBadge(statuses);
    expect(next?.id).toBe('collector');
  });

  it('returns a badge object when at least one is locked', () => {
    const statuses = computeBadgeStatus(BADGE_DEFINITIONS, emptyData);
    expect(findNextBadge(statuses)).not.toBeNull();
  });
});
