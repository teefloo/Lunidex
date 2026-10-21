import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isValidElement, type ReactElement, type ReactNode } from 'react';

const mocks = vi.hoisted(() => ({
  pokemon: vi.fn(),
  species: vi.fn(),
  localized: vi.fn(),
  translate: vi.fn((key: string) => key),
}));

vi.mock('@/lib/server-i18n', () => ({
  getServerT: async () => mocks.translate,
  getServerLanguage: async () => 'fr',
  getServerPokemonLanguage: async () => 'fr',
}));

vi.mock('@/lib/api/server-cache', () => ({
  getPokemonDetailCached: mocks.pokemon,
  getPokemonSpeciesCached: mocks.species,
  getLocalizedPokemonDataCached: mocks.localized,
}));

import PokemonOfTheDay from './PokemonOfTheDay';

function textContent(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textContent).join('');
  if (!isValidElement(node)) return '';
  return textContent((node as ReactElement<{ children?: ReactNode }>).props.children);
}

describe('PokemonOfTheDay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.pokemon.mockResolvedValue({
      name: 'pikachu',
      species: { name: 'pikachu' },
      sprites: { front_default: null, other: { 'official-artwork': { front_default: null } } },
      types: [{ type: { name: 'electric' } }],
    });
    mocks.species.mockResolvedValue({
      name: 'pikachu',
      names: [{ language: { name: 'fr' }, name: 'Pikachu fallback' }],
    });
    mocks.localized.mockImplementation(async (name: string) => name === 'pikachu'
      ? { pokemon_v2_pokemonspeciesnames: [{ name: 'Pikachu GraphQL' }] }
      : null);
  });

  it('uses the species slug to load the localized daily Pokémon name', async () => {
    const page = await PokemonOfTheDay();

    expect(textContent(page)).toContain('Pikachu GraphQL');
    expect(mocks.localized).toHaveBeenCalledWith('pikachu', 5);
  });
});
