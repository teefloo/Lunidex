import { describe, expect, it } from 'vitest';
import { normalizeAuthPath } from '@/lib/neon/auth-route';

describe('normalizeAuthPath', () => {
  it('maps a root GET probe to get-session', () => {
    expect(normalizeAuthPath(undefined, 'GET')).toEqual(['get-session']);
    expect(normalizeAuthPath([], 'GET')).toEqual(['get-session']);
  });

  it('preserves endpoint paths and never maps non-GET roots', () => {
    expect(normalizeAuthPath(['sign-in', 'email'], 'POST')).toEqual(['sign-in', 'email']);
    expect(normalizeAuthPath([], 'POST')).toEqual([]);
  });
});
