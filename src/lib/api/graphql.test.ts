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

import {
  getAllAbilities,
  getAllItems,
  getAllMoves,
  getAllPokemonSummaryPaginated,
  getPokemonDetailedByType,
  getPokemonSummarySlice,
} from './graphql';

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

  it('bounds server catalog previews without changing the full catalog API', async () => {
    mockPost
      .mockResolvedValueOnce({ data: { data: { pokemon_v2_move: [{ id: 1, name: 'pound' }] } } })
      .mockResolvedValueOnce({ data: { data: { pokemon_v2_ability: [{ id: 1, name: 'stench' }] } } })
      .mockResolvedValueOnce({ data: { data: { pokemon_v2_item: [{ id: 1, name: 'master-ball' }] } } });

    await expect(getAllMoves(9, 48)).resolves.toHaveLength(1);
    await expect(getAllAbilities(9, 48)).resolves.toHaveLength(1);
    await expect(getAllItems(9, 48)).resolves.toHaveLength(1);

    expect(mockPost).toHaveBeenNthCalledWith(
      1,
      '/graphql/v1beta',
      expect.objectContaining({ variables: { limit: 48, offset: 0, languageId: 9 } }),
    );
    expect(mockPost).toHaveBeenNthCalledWith(
      2,
      '/graphql/v1beta',
      expect.objectContaining({ variables: { languageId: 9, limit: 48 } }),
    );
    expect(mockPost).toHaveBeenNthCalledWith(
      3,
      '/graphql/v1beta',
      expect.objectContaining({ variables: { languageId: 9, limit: 48, excludedCategories: expect.any(Array) } }),
    );
  });

  it('aborts the lookahead request after the final Pokémon batch', async () => {
    mockPost.mockImplementation((
      _path: string,
      payload: { variables?: { offset?: number } },
      config?: { signal?: AbortSignal },
    ) => {
      const offset = payload.variables?.offset ?? 0;
      if (offset === 0) {
        return Promise.resolve({
          data: {
            data: {
              pokemon_v2_pokemon: Array.from({ length: 200 }, (_, id) => ({ id, name: `pokemon-${id}` })),
            },
          },
        });
      }
      if (offset === 200) {
        return Promise.resolve({ data: { data: { pokemon_v2_pokemon: [{ id: 200, name: 'final-pokemon' }] } } });
      }

      return new Promise((_resolve, reject) => {
        config?.signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
      });
    });

    await expect(getAllPokemonSummaryPaginated()).resolves.toHaveLength(2);

    const tailCall = mockPost.mock.calls[2];
    expect(tailCall?.[2]?.signal?.aborted).toBe(true);
  });
});
