import { afterEach, describe, expect, it, vi } from 'vitest';
import { getRateLimitEntryCount, rateLimit } from './rate-limit';

describe('rateLimit', () => {
  afterEach(() => vi.useRealTimers());

  it('evicts expired client fingerprints on every request', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-30T00:00:00.000Z'));
    expect(rateLimit('expired-client', 1)).toBe(true);
    expect(getRateLimitEntryCount()).toBe(1);
    vi.advanceTimersByTime(60_001);
    expect(rateLimit('active-client', 1)).toBe(true);
    expect(getRateLimitEntryCount()).toBe(1);
  });
});
