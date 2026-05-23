import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getFilterOptions, searchCards } from '@/lib/api/tcg';
import { GET } from './route';

vi.mock('@/lib/api/tcg', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/tcg')>('@/lib/api/tcg');
  return {
    ...actual,
    getFilterOptions: vi.fn(),
    searchCards: vi.fn(),
  };
});

const mockedGetFilterOptions = vi.mocked(getFilterOptions);
const mockedSearchCards = vi.mocked(searchCards);

beforeEach(() => {
  mockedGetFilterOptions.mockResolvedValue({
    categories: ['all'],
    sets: [],
    pokemonTypes: [],
    trainerTypes: [],
    energyTypes: [],
    stages: [],
    rarities: [],
  });
  mockedSearchCards.mockResolvedValue({
    cards: [],
    hasMore: false,
  });
});

describe('TCG search route', () => {
  it('clamps invalid pagination before querying the catalog', async () => {
    const request = new NextRequest('https://example.com/api/tcg/search?page=-4&limit=999&lang=fr');

    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockedSearchCards).toHaveBeenCalledWith(
      expect.objectContaining({ selectedCategory: 'all' }),
      'fr',
      1,
      96,
    );
    expect(mockedGetFilterOptions).toHaveBeenCalledWith('fr');
  });
});
