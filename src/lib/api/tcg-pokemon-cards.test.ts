import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TCGCard } from '@/types/tcg';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  getCachedData: vi.fn(),
  setCachedData: vi.fn(),
}));

vi.mock('axios', () => ({
  default: { create: vi.fn(() => ({ get: mocks.get })) },
}));

vi.mock('axios-retry', () => ({
  default: Object.assign(vi.fn(), {
    exponentialDelay: vi.fn(),
    isNetworkOrIdempotentRequestError: vi.fn(),
  }),
}));

vi.mock('@/lib/sentry-observability', () => ({
  attachAxiosSentryInstrumentation: vi.fn(),
  reportFallback: vi.fn(),
  reportHttpFailure: vi.fn(),
}));

vi.mock('./cache', () => ({
  getCachedData: mocks.getCachedData,
  setCachedData: mocks.setCachedData,
}));

import { getPokemonCards } from './tcg';

describe('getPokemonCards set metadata', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCachedData.mockResolvedValue(null);
    mocks.setCachedData.mockResolvedValue(undefined);
  });

  it('fills set names for English search summaries and fetches each set once', async () => {
    const summaries: TCGCard[] = [
      { id: 'tk-xy-w-2', localId: '2', name: 'Pidgeotto', category: 'Pokemon' },
      { id: 'tk-xy-w-23', localId: '23', name: 'Pidgeotto', category: 'Pokemon' },
      { id: 'base1-22', localId: '22', name: 'Pidgeotto', category: 'Pokemon' },
    ];
    const sets = new Map([
      ['tk-xy-w', { id: 'tk-xy-w', name: 'XY Trainer Kit (Wigglytuff)' }],
      ['base1', { id: 'base1', name: 'Base Set' }],
    ]);

    mocks.get.mockImplementation(async (path: string) => {
      if (path.includes('/cards?')) return { data: summaries };
      const setId = path.split('/').at(-1);
      const set = setId ? sets.get(setId) : undefined;
      return { data: set };
    });

    const cards = await getPokemonCards('Pidgeotto', 'en');

    expect(cards.map((card) => card.set?.name)).toEqual([
      'XY Trainer Kit (Wigglytuff)',
      'Base Set',
      'XY Trainer Kit (Wigglytuff)',
    ]);
    expect(mocks.get).toHaveBeenCalledWith('/en/sets/tk-xy-w');
    expect(mocks.get).toHaveBeenCalledWith('/en/sets/base1');
    expect(mocks.get.mock.calls.filter(([path]) => String(path).includes('/sets/'))).toHaveLength(2);
  });
});
