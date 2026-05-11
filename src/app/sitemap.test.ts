import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getAllPokemonNames } from '@/lib/api';
import { SITE_URL } from '@/lib/site';
import sitemap from './sitemap';

vi.mock('@/lib/api', () => ({
  getAllPokemonNames: vi.fn(),
}));

const mockedGetAllPokemonNames = vi.mocked(getAllPokemonNames);

beforeEach(() => {
  mockedGetAllPokemonNames.mockResolvedValue([
    {
      name: 'bulbasaur',
      url: 'https://pokeapi.co/api/v2/pokemon/1/',
    },
  ]);
});

describe('sitemap', () => {
  it('includes public indexable pages and Pokemon detail routes', async () => {
    const entries = await sitemap();
    const urls = entries.map((entry) => entry.url);

    expect(urls).toEqual(expect.arrayContaining([
      SITE_URL,
      `${SITE_URL}/types`,
      `${SITE_URL}/compare`,
      `${SITE_URL}/quiz`,
      `${SITE_URL}/tcg`,
      `${SITE_URL}/moves`,
      `${SITE_URL}/pokemon/bulbasaur`,
    ]));
  });

  it('excludes noindex and user-private pages', async () => {
    const entries = await sitemap();
    const urls = entries.map((entry) => entry.url);

    expect(urls).not.toContain(`${SITE_URL}/privacy`);
    expect(urls).not.toContain(`${SITE_URL}/terms`);
    expect(urls).not.toContain(`${SITE_URL}/favorites`);
    expect(urls).not.toContain(`${SITE_URL}/team`);
  });
});
