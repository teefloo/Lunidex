import { describe, expect, it } from 'vitest';
import {
  DAILY_POKEMON_COUNT,
  getDailyQuizQuestionIds,
  isValidQuizAnswerId,
} from './quiz-attempt';

describe('server daily quiz attempt helpers', () => {
  it('uses a deterministic ten-question sequence for each UTC date', () => {
    const first = getDailyQuizQuestionIds('2026-08-20');
    const second = getDailyQuizQuestionIds('2026-08-20');

    expect(first).toHaveLength(10);
    expect(first).toEqual(second);
    expect(first.every((id) => id >= 1 && id <= DAILY_POKEMON_COUNT)).toBe(true);
  });

  it('accepts only bounded integer answer IDs', () => {
    expect(isValidQuizAnswerId(1)).toBe(true);
    expect(isValidQuizAnswerId(DAILY_POKEMON_COUNT)).toBe(true);
    expect(isValidQuizAnswerId(0)).toBe(false);
    expect(isValidQuizAnswerId(1.5)).toBe(false);
    expect(isValidQuizAnswerId('25')).toBe(false);
  });
});

