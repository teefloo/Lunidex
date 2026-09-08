import { describe, expect, it } from 'vitest';
import { STATIC_REMOTE_DATA_STALE_TIME } from './query-options';

describe('static remote query policy', () => {
  it('keeps stable reference data fresh across normal route navigation', () => {
    expect(STATIC_REMOTE_DATA_STALE_TIME).toBe(24 * 60 * 60 * 1000);
  });
});
