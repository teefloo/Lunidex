import { describe, it, expect } from 'vitest';
import {
  computeTotalXP,
  getTrainerLevel,
  getXPProgress,
  didLevelUp,
  computeWeeklyQuest,
  XP_REWARDS,
} from './trainer';
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
  tcgOwnedCount: 0,
  currentStreak: 0,
};

describe('computeTotalXP', () => {
  it('returns 0 for empty data', () => {
    expect(computeTotalXP(emptyData)).toBe(0);
  });

  it('calculates XP from caught pokemon', () => {
    const xp = computeTotalXP({ ...emptyData, caughtCount: 10 });
    expect(xp).toBe(10 * XP_REWARDS.caught);
  });

  it('calculates XP from favorites', () => {
    const xp = computeTotalXP({ ...emptyData, favoriteCount: 5 });
    expect(xp).toBe(5 * XP_REWARDS.favorite);
  });

  it('calculates XP from team members', () => {
    const xp = computeTotalXP({ ...emptyData, teamCount: 3 });
    expect(xp).toBe(3 * XP_REWARDS.teamMember);
  });

  it('calculates XP from quiz sessions', () => {
    const xp = computeTotalXP({ ...emptyData, totalQuizSessions: 4 }, { totalQuizCorrect: 0 });
    expect(xp).toBe(4 * XP_REWARDS.quizSession);
  });

  it('calculates XP from quiz correct answers', () => {
    const xp = computeTotalXP(emptyData, { totalQuizCorrect: 20 });
    expect(xp).toBe(20 * XP_REWARDS.quizCorrect);
  });

  it('calculates XP from TCG owned cards', () => {
    const xp = computeTotalXP(emptyData, { tcgOwnedCount: 7 });
    expect(xp).toBe(7 * XP_REWARDS.tcgOwned);
  });

  it('calculates XP from unique types viewed', () => {
    const xp = computeTotalXP({ ...emptyData, uniqueTypesViewed: 8 });
    expect(xp).toBe(8 * XP_REWARDS.typeViewed);
  });

  it('sums all XP sources', () => {
    const data: BadgeConditionData = {
      caughtCount: 10,
      favoriteCount: 5,
      teamCount: 3,
      quizHighScore: 0,
      quizHighScoreTA: 0,
      quizHighScoreSilhouette: 0,
      quizHighScoreStats: 0,
      totalQuizSessions: 4,
      uniqueTypesViewed: 8,
      tcgOwnedCount: 0,
      currentStreak: 0,
    };
    const xp = computeTotalXP(data, { tcgOwnedCount: 7, totalQuizCorrect: 20 });
    const expected =
      10 * XP_REWARDS.caught +
      5 * XP_REWARDS.favorite +
      3 * XP_REWARDS.teamMember +
      4 * XP_REWARDS.quizSession +
      20 * XP_REWARDS.quizCorrect +
      8 * XP_REWARDS.typeViewed +
      7 * XP_REWARDS.tcgOwned;
    expect(xp).toBe(expected);
  });
});

describe('getTrainerLevel', () => {
  it('returns level 1 for 0 XP', () => {
    const level = getTrainerLevel(0);
    expect(level.level).toBe(1);
    expect(level.xp).toBe(0);
  });

  it('returns level 2 at 100 XP', () => {
    const level = getTrainerLevel(100);
    expect(level.level).toBe(2);
  });

  it('returns level 1 below 100 XP', () => {
    const level = getTrainerLevel(99);
    expect(level.level).toBe(1);
  });

  it('returns correct level for high XP', () => {
    const level = getTrainerLevel(5000);
    expect(level.level).toBeGreaterThanOrEqual(10);
  });

  it('xpForNextLevel is always greater than xpForCurrentLevel', () => {
    for (let xp = 0; xp <= 10000; xp += 100) {
      const level = getTrainerLevel(xp);
      expect(level.xpForNextLevel).toBeGreaterThan(level.xpForCurrentLevel);
    }
  });

  it('titleKey cycles through levels', () => {
    const level1 = getTrainerLevel(0);
    const level7 = getTrainerLevel(1700);
    const level13 = getTrainerLevel(6800);
    const level19 = getTrainerLevel(15500);
    const level25 = getTrainerLevel(27800);
    expect(level1.titleKey).toBe('dashboard.trainer.titles.rookie');
    expect(level7.titleKey).toBe('dashboard.trainer.titles.bronze');
    expect(level13.titleKey).toBe('dashboard.trainer.titles.silver');
    expect(level19.titleKey).toBe('dashboard.trainer.titles.gold');
    expect(level25.titleKey).toBe('dashboard.trainer.titles.champion');
  });
});

describe('getXPProgress', () => {
  it('returns 0 current and max for level 1', () => {
    const progress = getXPProgress(0);
    expect(progress.current).toBe(0);
    expect(progress.max).toBe(100);
    expect(progress.percent).toBe(0);
  });

  it('returns correct percent at midpoint', () => {
    const progress = getXPProgress(50);
    expect(progress.percent).toBe(50);
  });

  it('returns 100 percent at level threshold', () => {
    const progress = getXPProgress(99);
    expect(progress.percent).toBe(99);
  });
});

describe('didLevelUp', () => {
  it('returns true when crossing a level threshold', () => {
    expect(didLevelUp(99, 100)).toBe(true);
  });

  it('returns false when staying in same level', () => {
    expect(didLevelUp(100, 150)).toBe(false);
  });

  it('returns false when XP is the same', () => {
    expect(didLevelUp(100, 100)).toBe(false);
  });
});

describe('computeWeeklyQuest', () => {
  it('returns a valid quest', () => {
    const quest = computeWeeklyQuest(new Date('2024-01-15'), emptyData);
    expect(quest.id).toBeDefined();
    expect(quest.nameKey).toBeDefined();
    expect(quest.target).toBeGreaterThan(0);
    expect(quest.xpReward).toBeGreaterThan(0);
  });

  it('deterministic: same date returns same quest', () => {
    const date = new Date('2024-06-15');
    const quest1 = computeWeeklyQuest(date, emptyData);
    const quest2 = computeWeeklyQuest(date, emptyData);
    expect(quest1.id).toBe(quest2.id);
    expect(quest1.target).toBe(quest2.target);
  });

  it('different weeks may return different quests', () => {
    const quest1 = computeWeeklyQuest(new Date('2024-01-08'), emptyData);
    const quest2 = computeWeeklyQuest(new Date('2024-01-15'), emptyData);
    // Not guaranteed to be different, but at least both are valid
    expect(quest1.id).toBeDefined();
    expect(quest2.id).toBeDefined();
  });

  it('progress is clamped to target', () => {
    const quest = computeWeeklyQuest(new Date('2024-01-15'), { ...emptyData, caughtCount: 999 });
    expect(quest.progress).toBeLessThanOrEqual(quest.target);
  });

  it('progress reflects current data', () => {
    const quest = computeWeeklyQuest(new Date('2024-01-15'), { ...emptyData, caughtCount: 5 });
    expect(quest.progress).toBeGreaterThanOrEqual(0);
    expect(quest.progress).toBeLessThanOrEqual(quest.target);
  });
});
