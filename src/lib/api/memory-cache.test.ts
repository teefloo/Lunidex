import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryCache } from './memory-cache';

describe('bounded memory cache', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
  });

  it('returns fresh values and expires them after the configured TTL', () => {
    const cache = createMemoryCache<string>({ maxEntries: 2, ttlMs: 1_000 });
    cache.set('card', 'cached');

    expect(cache.get('card')).toBe('cached');
    vi.advanceTimersByTime(1_001);
    expect(cache.get('card')).toBeUndefined();
  });

  it('evicts the least recently used entry when it reaches its bound', () => {
    const cache = createMemoryCache<string>({ maxEntries: 2, ttlMs: 10_000 });
    cache.set('first', '1');
    cache.set('second', '2');
    expect(cache.get('first')).toBe('1');
    cache.set('third', '3');

    expect(cache.get('first')).toBe('1');
    expect(cache.get('second')).toBeUndefined();
    expect(cache.get('third')).toBe('3');
  });
});
