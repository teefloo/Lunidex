import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockPost = vi.hoisted(() => vi.fn());
const mockGetCachedData = vi.hoisted(() => vi.fn());
const mockSetCachedData = vi.hoisted(() => vi.fn());

vi.mock('./client', () => ({
  graphqlClient: { post: mockPost },
}));

vi.mock('./cache', () => ({
  getCachedData: mockGetCachedData,
  setCachedData: mockSetCachedData,
}));

import { getPokemonDetailedByType, getPokemonSummarySlice } from './graphql';

describe('GraphQL cache safety', () => {
  beforeEach(() => {
    mockPost.mockReset();
    mockGetCachedData.mockReset();
    mockGetCachedData.mockResolvedValue(null);
    mockSetCachedData.mockReset();
    mockSetCachedData.mockResolvedValue(undefined);
  });

  it('refreshes an expired summary cache entry instead of treating it as fresh', async () => {
    mockPost.mockResolvedValue({ data: { data: { pokemon_v2_pokemon: [{ id: 1, name: 'bulbasaur' }] } } });

    await expect(getPokemonSummarySlice(1, 0)).resolves.toEqual([{ id: 1, name: 'bulbasaur' }]);

    expect(mockGetCachedData).toHaveBeenCalledWith('pokemon-summary-slice-v1-0-1');
    expect(mockSetCachedData).toHaveBeenCalledWith(
      'pokemon-summary-slice-v1-0-1',
      [{ id: 1, name: 'bulbasaur' }],
    );
  });

  it('does not cache an invalid GraphQL payload as an empty type result', async () => {
    mockPost.mockResolvedValue({ data: { errors: [{ message: 'upstream unavailable' }] } });

    await expect(getPokemonDetailedByType('grass')).rejects.toThrow('Invalid GraphQL response');
    expect(mockSetCachedData).not.toHaveBeenCalled();
  });
});
