import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getAllMoves, getAllPokemonDetailed, getAllPokemonSearchIndex, getAllPokemonSummaryPaginated } from './graphql';
import { graphqlClient } from './client';
import { getCachedData, setCachedData } from './cache';

vi.mock('./client', () => ({
  graphqlClient: {
    post: vi.fn(),
  },
}));

vi.mock('./cache', () => ({
  getCachedData: vi.fn().mockResolvedValue(null),
  setCachedData: vi.fn().mockResolvedValue(undefined),
}));

const mockedGraphqlPost = vi.mocked(graphqlClient.post);
const mockedGetCachedData = vi.mocked(getCachedData);
const mockedSetCachedData = vi.mocked(setCachedData);

const makeSummaryPokemon = (id: number) => ({
  id,
  name: `pokemon-${id}`,
  height: 10,
  weight: 100,
  pokemon_v2_pokemonspecy: {
    generation_id: 1,
    pokemon_v2_pokemonspeciesnames: [
      {
        name: `Pokemon ${id}`,
        pokemon_v2_language: { name: 'en' },
      },
    ],
  },
  pokemon_v2_pokemontypes: [
    {
      pokemon_v2_type: { name: 'normal' },
    },
  ],
});

const makeSearchPokemon = (id: number) => ({
  id,
  name: `pokemon-${id}`,
  pokemon_v2_pokemonspecy: {
    pokemon_v2_pokemonspeciesnames: [
      {
        name: `Pokemon ${id}`,
        pokemon_v2_language: { name: 'en' },
      },
    ],
  },
});

const makeMove = (id: number) => ({
  id,
  name: `move-${id}`,
  power: id % 2 === 0 ? id : null,
  accuracy: 100,
  pp: 5,
  priority: 0,
  generation_id: 1,
  pokemon_v2_type: { name: 'normal' },
  pokemon_v2_movedamageclass: { name: 'physical' },
  pokemon_v2_movenames: [{ name: `Move ${id}` }],
  pokemon_v2_moveflavortexts: [{ flavor_text: `Flavor ${id}` }],
  pokemon_v2_moveeffect: {
    pokemon_v2_moveeffecteffecttexts: [{ short_effect: `Short ${id}`, effect: `Effect ${id}` }],
  },
});

beforeEach(() => {
  mockedGraphqlPost.mockReset();
  mockedGetCachedData.mockResolvedValue(null);
  mockedSetCachedData.mockClear();
});

describe('graphql pagination helpers', () => {
  it('keeps paging through the full move catalog until the final short batch', async () => {
    mockedGraphqlPost
      .mockResolvedValueOnce({
        data: { data: { pokemon_v2_move: Array.from({ length: 250 }, (_, index) => makeMove(index + 1)) } },
      })
      .mockResolvedValueOnce({
        data: { data: { pokemon_v2_move: Array.from({ length: 12 }, (_, index) => makeMove(index + 251)) } },
      });

    const moves = await getAllMoves(9);
    const firstCallOptions = mockedGraphqlPost.mock.calls[0]?.[1] as { query?: string } | undefined;
    const secondCallOptions = mockedGraphqlPost.mock.calls[1]?.[1] as { query?: string } | undefined;

    expect(moves).toHaveLength(262);
    expect(mockedGraphqlPost).toHaveBeenCalledTimes(2);
    expect(firstCallOptions?.query).toContain('offset: 0');
    expect(secondCallOptions?.query).toContain('offset: 250');
    expect(firstCallOptions?.query).not.toContain('$languageId');
    expect(firstCallOptions?.query).toContain('language_id: {_eq: 9}');
    expect(mockedSetCachedData).toHaveBeenCalled();
  });

  it('keeps paging until the API returns a short batch', async () => {
    mockedGraphqlPost
      .mockResolvedValueOnce({ data: { data: { pokemon_v2_pokemon: Array.from({ length: 200 }, (_, i) => makeSummaryPokemon(i + 1)) } } })
      .mockResolvedValueOnce({ data: { data: { pokemon_v2_pokemon: Array.from({ length: 3 }, (_, i) => makeSummaryPokemon(i + 201)) } } });

    const batches = await getAllPokemonSummaryPaginated();
    const firstCallOptions = mockedGraphqlPost.mock.calls[0]?.[1] as { query?: string } | undefined;
    const secondCallOptions = mockedGraphqlPost.mock.calls[1]?.[1] as { query?: string } | undefined;

    expect(batches).toHaveLength(2);
    expect(batches[0]).toHaveLength(200);
    expect(batches[1]).toHaveLength(3);
    expect(mockedGraphqlPost).toHaveBeenCalledTimes(2);
    expect(firstCallOptions?.query).toContain('offset: 0');
    expect(secondCallOptions?.query).toContain('offset: 200');
  });

  it('uses the narrower search index payload for header search', async () => {
    mockedGraphqlPost
      .mockResolvedValueOnce({ data: { data: { pokemon_v2_pokemon: [makeSearchPokemon(1)] } } })
      .mockResolvedValueOnce({ data: { data: { pokemon_v2_pokemon: [] } } });

    const searchIndex = await getAllPokemonSearchIndex();
    const firstCallOptions = mockedGraphqlPost.mock.calls[0]?.[1] as { query?: string } | undefined;

    expect(searchIndex).toHaveLength(1);
    expect(firstCallOptions?.query).toContain('pokemon_v2_pokemonspeciesnames');
    expect(firstCallOptions?.query).not.toContain('pokemon_v2_pokemontypes');
    expect(mockedSetCachedData).toHaveBeenCalled();
  });

  it('falls back to cached detailed data without retrying the full crawl', async () => {
    mockedGetCachedData
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce([makeSummaryPokemon(1) as never]);
    mockedGraphqlPost.mockRejectedValueOnce(new Error('network failed'));

    const detailed = await getAllPokemonDetailed();

    expect(detailed).toHaveLength(1);
    expect(mockedGraphqlPost).toHaveBeenCalledTimes(1);
  });

  it('handles circular GraphQL payloads without crashing the error path', async () => {
    const circularResponse: { data: Record<string, unknown>; self?: unknown } = { data: {} };
    circularResponse.self = circularResponse;
    circularResponse.data.self = circularResponse;

    mockedGetCachedData
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce([] as never);
    mockedGraphqlPost.mockResolvedValueOnce({
      data: circularResponse as never,
    });

    const moves = await getAllMoves(9);

    expect(moves).toEqual([]);
    expect(mockedGraphqlPost).toHaveBeenCalledTimes(1);
  });
});
