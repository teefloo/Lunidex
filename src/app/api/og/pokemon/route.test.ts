import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getPokemonDetail: vi.fn(),
  loadOgFonts: vi.fn(),
}));

vi.mock('@/lib/api/server-cache', () => ({ getPokemonDetailCached: mocks.getPokemonDetail }));
vi.mock('@/lib/og/fonts', () => ({ loadOgFonts: mocks.loadOgFonts }));
vi.mock('next/og', () => ({
  ImageResponse: class MockImageResponse {
    status = 200;
    constructor(public readonly body: unknown, public readonly init: unknown) {}
  },
}));

import { GET } from './route';

function requestFor(search: string): Parameters<typeof GET>[0] {
  return {
    nextUrl: new URL(`https://lunidex.app/api/og/pokemon?${search}`),
  } as unknown as Parameters<typeof GET>[0];
}

const minimalPokemon = {
  id: 25,
  name: 'pikachu',
  types: [{ type: { name: 'electric' } }],
  stats: [{ base_stat: 35 }],
  sprites: {},
};

describe('Pokémon OG route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.loadOgFonts.mockResolvedValue([]);
  });

  it('returns 400 for a missing or invalid Pokémon name', async () => {
    const response = await GET(requestFor('lang=fr'));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Invalid Pokémon name' });
    expect(mocks.getPokemonDetail).not.toHaveBeenCalled();
  });

  it('returns 404 for an upstream Pokémon not found response', async () => {
    mocks.getPokemonDetail.mockRejectedValue({ response: { status: 404 } });

    const response = await GET(requestFor('name=missingno&lang=fr'));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'Pokémon not found' });
  });

  it('renders valid input and lets unexpected upstream errors surface', async () => {
    mocks.getPokemonDetail.mockResolvedValue(minimalPokemon);

    const response = await GET(requestFor('name=Pikachu&lang=fr'));

    expect(response.status).toBe(200);
    expect(mocks.getPokemonDetail).toHaveBeenCalledWith('pikachu');
    expect(mocks.loadOgFonts).toHaveBeenCalled();

    const upstreamError = new Error('upstream unavailable');
    mocks.getPokemonDetail.mockRejectedValue(upstreamError);
    await expect(GET(requestFor('name=eevee'))).rejects.toBe(upstreamError);
  });
});
