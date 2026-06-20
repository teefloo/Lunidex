import { describe, it, expect } from 'vitest';
import { BADGE_DEFINITIONS, computeBadgeStatus, findNextBadge } from './badges';
import type { BadgeConditionData } from '../types/dashboard';

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
    // caughtCount 200 -> collector is 200/256 (0.78), pokedex-master is 200/768 (0.26).
    const statuses = computeBadgeStatus(BADGE_DEFINITIONS, { ...emptyData, caughtCount: 200 });
    const next = findNextBadge(statuses);
    expect(next?.id).toBe('collector');
  });

  it('returns a badge object when at least one is locked', () => {
    const statuses = computeBadgeStatus(BADGE_DEFINITIONS, emptyData);
    expect(findNextBadge(statuses)).not.toBeNull();
  });
});
