import { beforeEach, describe, expect, it, vi } from 'vitest';
import { notFound, permanentRedirect } from 'next/navigation';
import { getAllPokemonNames, getPokemonDetail, getPokemonEncounters, getLocalizedPokemonData, getPokemonSpecies } from '@/lib/api';
import PokemonPage, { generateStaticParams } from './page';

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
  permanentRedirect: vi.fn((url: string) => {
    const error = new Error('NEXT_REDIRECT');
    Object.assign(error, { url });
    throw error;
  }),
}));

vi.mock('@/components/layout/Header', () => ({
  default: () => null,
}));

vi.mock('./PokemonDetailClient', () => ({
  PokemonDetailClient: () => null,
}));

vi.mock('@/lib/api', () => ({
  getAllPokemonNames: vi.fn(),
  getPokemonDetail: vi.fn(),
  getPokemonSpecies: vi.fn(),
  getLocalizedPokemonData: vi.fn(),
  getPokemonEncounters: vi.fn(),
}));

const mockedGetAllPokemonNames = vi.mocked(getAllPokemonNames);
const mockedGetPokemonDetail = vi.mocked(getPokemonDetail);
const mockedGetPokemonSpecies = vi.mocked(getPokemonSpecies);
const mockedGetLocalizedPokemonData = vi.mocked(getLocalizedPokemonData);
const mockedGetPokemonEncounters = vi.mocked(getPokemonEncounters);
const mockedNotFound = vi.mocked(notFound);
const mockedPermanentRedirect = vi.mocked(permanentRedirect);

const makePokemon = (name = 'bulbasaur') => ({
  id: 1,
  name,
  height: 7,
  weight: 69,
  sprites: {
    front_default: 'https://example.com/bulbasaur.png',
    other: {
      'official-artwork': {
        front_default: 'https://example.com/bulbasaur-art.png',
      },
    },
  },
  stats: [
    {
      base_stat: 45,
      stat: { name: 'hp' },
    },
  ],
  types: [
    {
      type: { name: 'grass' },
    },
  ],
});

beforeEach(() => {
  vi.clearAllMocks();
  mockedGetPokemonSpecies.mockResolvedValue({
    names: [{ name: 'Bulbasaur', language: { name: 'en' } }],
  } as never);
  mockedGetLocalizedPokemonData.mockResolvedValue({
    pokemon_v2_pokemonspeciesnames: [{ name: 'Bulbasaur' }],
    pokemon_v2_pokemonspeciesflavortexts: [{ flavor_text: 'A strange seed was planted on its back.' }],
  } as never);
  mockedGetPokemonEncounters.mockResolvedValue([]);
});

describe('Pokemon detail route indexing behavior', () => {
  it('pre-renders canonical slug params instead of numeric ids', async () => {
    mockedGetAllPokemonNames.mockResolvedValue(
      Array.from({ length: 152 }, (_, index) => ({
        name: `pokemon-${index + 1}`,
        url: `https://pokeapi.co/api/v2/pokemon/${index + 1}/`,
      })),
    );

    const params = await generateStaticParams();

    expect(params).toHaveLength(151);
    expect(params[0]).toEqual({ name: 'pokemon-1' });
    expect(params).not.toContainEqual({ name: '1' });
  });

  it('permanently redirects numeric ids to canonical slugs', async () => {
    mockedGetPokemonDetail.mockResolvedValue(makePokemon() as never);

    await expect(PokemonPage({
      params: Promise.resolve({ name: '1' }),
      searchParams: Promise.resolve({ lang: 'fr', tag: ['seed', 'starter'] }),
    })).rejects.toMatchObject({ message: 'NEXT_REDIRECT', url: '/pokemon/bulbasaur?lang=fr&tag=seed&tag=starter' });

    expect(mockedPermanentRedirect).toHaveBeenCalledWith('/pokemon/bulbasaur?lang=fr&tag=seed&tag=starter');
    expect(mockedGetPokemonSpecies).not.toHaveBeenCalled();
  });

  it('returns a real not-found result for invalid Pokemon slugs', async () => {
    mockedGetPokemonDetail.mockRejectedValue(new Error('missing'));

    await expect(PokemonPage({
      params: Promise.resolve({ name: 'not-a-real-pokemon-slug' }),
      searchParams: Promise.resolve({}),
    })).rejects.toThrow('NEXT_NOT_FOUND');

    expect(mockedNotFound).toHaveBeenCalled();
    expect(mockedPermanentRedirect).not.toHaveBeenCalled();
  });
});
