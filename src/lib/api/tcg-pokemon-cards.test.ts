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

  it('hydrates localized search fallbacks with one set request per set, never one request per card', async () => {
    const englishSummaries: TCGCard[] = [
      { id: 'sv1-1', localId: '1', name: 'Pikachu', category: 'Pokemon' },
      { id: 'sv1-2', localId: '2', name: 'Pikachu', category: 'Pokemon' },
      { id: 'base1-20', localId: '20', name: 'Pikachu', category: 'Pokemon' },
      { id: 'base1-21', localId: '21', name: 'Pikachu', category: 'Pokemon' },
    ];
    const setResponses = new Map([
      ['sv1', {
        id: 'sv1', name: 'Écarlate et Violet', releaseDate: '2023-03-31',
        cards: [
          { id: 'sv1-1', localId: '1', name: 'Pikachu', category: 'Pokemon' },
          { id: 'sv1-2', localId: '2', name: 'Pikachu', category: 'Pokemon' },
          { id: 'sv1-3', localId: '3', name: 'Other', category: 'Pokemon' },
        ],
      }],
      ['base1', {
        id: 'base1', name: 'Set de base', releaseDate: '1999-01-09',
        cards: [
          { id: 'base1-20', localId: '20', name: 'Pikachu', category: 'Pokemon' },
          { id: 'base1-21', localId: '21', name: 'Pikachu', category: 'Pokemon' },
        ],
      }],
    ]);

    mocks.get.mockImplementation(async (path: string) => {
      if (path.startsWith('/fr/cards?')) return { data: [] };
      if (path.startsWith('/en/cards?')) return { data: englishSummaries };
      const setId = path.split('/').at(-1);
      return { data: setId ? setResponses.get(setId) : undefined };
    });

    const cards = await getPokemonCards('Pikachu', 'fr', 'Pikachu');

    expect(cards.map((card) => card.id).sort()).toEqual(['base1-20', 'base1-21', 'sv1-1', 'sv1-2']);
    expect(cards.every((card) => card.set?.name)).toBe(true);
    expect(mocks.get.mock.calls.filter(([path]) => String(path).includes('/cards/'))).toHaveLength(0);
    expect(mocks.get.mock.calls.filter(([path]) => String(path).startsWith('/fr/sets/')).sort()).toEqual([
      ['/fr/sets/base1'],
      ['/fr/sets/sv1'],
    ]);
  });
});
