import { describe, expect, it } from 'vitest';
import { parseHomeFilters, serializeHomeFilters } from './pokemon-filter-url';

describe('Pokédex URL filters', () => {
  it('round-trips advanced filters in deterministic URL order', () => {
    const query = serializeHomeFilters({
      searchTerm: 'char',
      selectedTypes: ['water', 'fire'],
      selectedGeneration: 3,
      sortBy: 'id-asc',
      showCaughtOnly: 'all',
      showFavoritesOnly: false,
      isLegendary: true,
      isMythical: null,
      selectedEggGroups: ['water1', 'monster'],
      selectedColors: ['blue'],
      selectedShapes: [],
      minBaseStats: 500,
      minAttack: 100,
      minDefense: 0,
      minSpeed: 0,
      minHp: 80,
      heightRange: [0.5, 12],
      weightRange: [2, 900],
    });

    expect(query).toBe(
      'q=char&types=fire%2Cwater&gen=3&legendary=1&eggs=monster%2Cwater1&colors=blue&bst=500&atk=100&hp=80&height=0.5-12&weight=2-900',
    );
    expect(parseHomeFilters(new URLSearchParams(query))).toMatchObject({
      q: 'char',
      types: ['fire', 'water'],
      gen: 3,
      legendary: true,
      eggGroups: ['monster', 'water1'],
      minBst: 500,
      minAttack: 100,
      minHp: 80,
      heightRange: [0.5, 12],
      weightRange: [2, 900],
    });
  });

  it('ignores invalid advanced values without throwing', () => {
    expect(parseHomeFilters(new URLSearchParams('gen=99&bst=-1&height=4-2&eggs=unknown')))
      .toEqual({});
  });
});

describe('Pokédex detail navigation URL contracts', () => {
  it('exposes a safe tab parser and return-target validator', async () => {
    const navigation = await import('./pokemon-filter-url') as typeof import('./pokemon-filter-url') & {
      parsePokemonDetailTab?: (value: string | null) => string;
      parsePokemonReturnTarget?: (value: string | null) => string | null;
      setPokemonDetailTab?: (search: string, tab: string) => string;
    };

    expect(navigation.parsePokemonDetailTab).toEqual(expect.any(Function));
    expect(navigation.parsePokemonReturnTarget).toEqual(expect.any(Function));

    expect(navigation.parsePokemonDetailTab?.('stats')).toBe('stats');
    expect(navigation.parsePokemonDetailTab?.('unknown')).toBe('about');
    expect(navigation.parsePokemonDetailTab?.(null)).toBe('about');
    expect(navigation.parsePokemonReturnTarget?.(encodeURIComponent('/fr/pokedex?gen=1#pokemon-25')))
      .toBe('/fr/pokedex?gen=1#pokemon-25');
    expect(navigation.parsePokemonReturnTarget?.('/fr/pokedex?q=pikachu&gen=1'))
      .toBe('/fr/pokedex?q=pikachu&gen=1');
    expect(navigation.parsePokemonReturnTarget?.(encodeURIComponent('https://evil.example/'))).toBeNull();
    expect(navigation.parsePokemonReturnTarget?.(encodeURIComponent('/fr/pokemon/mew'))).toBeNull();
    expect(navigation.setPokemonDetailTab?.('from=%2Ffr%2Fpokedex%3Fgen%3D1', 'stats'))
      .toBe('from=%2Ffr%2Fpokedex%3Fgen%3D1&tab=stats');
  });
});
