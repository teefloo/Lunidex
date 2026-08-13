import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getRateLimitEntryCount, ipKey, rateLimit } from './rate-limit';

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

  it('fails closed for invalid limits without creating an entry', () => {
    const before = getRateLimitEntryCount();
    expect(rateLimit('invalid-limit', 0)).toBe(false);
    expect(rateLimit('invalid-limit-nan', Number.NaN)).toBe(false);
    expect(getRateLimitEntryCount()).toBe(before);
  });

  it('uses a trusted proxy fingerprint fallback and bounds oversized keys', () => {
    const request = new NextRequest('https://example.test', {
      headers: { 'x-real-ip': '198.51.100.7' },
    });
    expect(ipKey(request)).toBe('198.51.100.7');

    const oversizedKey = `client:${'x'.repeat(2_000)}`;
    expect(rateLimit(oversizedKey, 1)).toBe(true);
    expect(rateLimit(oversizedKey, 1)).toBe(false);
  });
});
