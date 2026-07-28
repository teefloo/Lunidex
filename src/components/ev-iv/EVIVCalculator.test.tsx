import { describe, expect, it } from 'vitest';
import { findIVRange, hasCompleteActualStats } from './EVIVCalculator';

describe('EVIVCalculator IV matching', () => {
  it('returns no solution for an impossible observed stat instead of the full IV range', () => {
    expect(findIVRange('hp', 45, 999, 0, 50, 1)).toBeNull();
  });

  it('keeps valid IV ranges available for matching observed stats', () => {
    expect(findIVRange('hp', 45, 105, 0, 50, 1)).toEqual({ min: 0, max: 1 });
  });

  it('requires all six actual stats before enabling a calculation', () => {
    expect(hasCompleteActualStats({ hp: 105, atk: 50, def: 50, spatk: 50, spdef: 50, spd: 50 })).toBe(true);
    expect(hasCompleteActualStats({ hp: 0, atk: 50, def: 50, spatk: 50, spdef: 50, spd: 50 })).toBe(false);
  });
});
