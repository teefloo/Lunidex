import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  getCachedData: vi.fn(),
  setCachedData: vi.fn(),
  reportFallback: vi.fn(),
  reportHttpFailure: vi.fn(),
}));

vi.mock('./client', () => ({
  default: { get: mocks.get },
  REST_API_BASE: 'https://pokeapi.co/api/v2',
}));
vi.mock('./cache', () => ({
  getCachedData: mocks.getCachedData,
  setCachedData: mocks.setCachedData,
}));
vi.mock('@/lib/sentry-observability', () => ({
  reportFallback: mocks.reportFallback,
  reportHttpFailure: mocks.reportHttpFailure,
}));

import { getPokemonDetail } from './rest';

describe('getPokemonDetail route boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCachedData.mockResolvedValue(null);
    mocks.setCachedData.mockResolvedValue(undefined);
  });

  it('rejects path traversal and malformed names before making a request', async () => {
    await expect(getPokemonDetail('../secret')).rejects.toThrow('Invalid Pokémon name');
    expect(mocks.get).not.toHaveBeenCalled();
  });

  it('normalizes a valid name before requesting and caching it', async () => {
    mocks.get.mockResolvedValue({ data: {
      id: 25,
      name: 'pikachu',
      types: [{ type: { name: 'electric' } }],
      stats: [{ base_stat: 35 }],
      sprites: {},
    } });

    await getPokemonDetail(' Pikachu ');

    expect(mocks.get).toHaveBeenCalledWith('/pokemon/pikachu');
    expect(mocks.setCachedData).toHaveBeenCalledWith('pokemon-detail-pikachu', expect.any(Object));
  });

  it('rejects malformed upstream detail data and records the invalid response fallback', async () => {
    mocks.get.mockResolvedValue({ data: { id: 25, name: 'pikachu' } });

    await expect(getPokemonDetail('pikachu')).rejects.toThrow('Invalid PokéAPI Pokémon detail response');
    expect(mocks.reportFallback).toHaveBeenCalledWith('invalid-response', expect.objectContaining({
      operation: 'pokemon-detail',
    }));
  });
});
