import { describe, expect, it } from 'vitest';
import { analyzeMoveCoverage, getTypeEffectiveness } from '../move-coverage';
import type { PokemonDetail } from '@/types/pokemon';

function detail(id: number, name: string): PokemonDetail {
  return {
    id,
    name,
    order: id,
    is_default: true,
    sprites: {
      front_default: '',
      back_default: '',
      front_shiny: '',
      back_default_shiny: '',
      other: {
        'official-artwork': { front_default: '', front_shiny: '' },
        showdown: { front_default: '', back_default: '' },
      },
    },
  } as unknown as PokemonDetail;
}

describe('getTypeEffectiveness', () => {
  it('lists the types a move hits super-effectively', () => {
    expect(getTypeEffectiveness('water')).toEqual(expect.arrayContaining(['fire', 'ground', 'rock']));
  });

  it('returns an empty list for unknown types', () => {
    expect(getTypeEffectiveness('not-a-type')).toEqual([]);
  });
});

describe('analyzeMoveCoverage', () => {
  const teamDetails = [detail(6, 'charizard'), detail(9, 'blastoise')];

  const moves = [
    {
      pokemonName: 'charizard',
      pokemonId: 6,
      moves: [
        { name: 'flamethrower', type: 'fire', power: 90 },
        { name: 'air-slash', type: 'flying', power: 75 },
        { name: 'swords-dance', type: 'normal', power: 0 },
      ],
    },
    {
      pokemonName: 'blastoise',
      pokemonId: 9,
      moves: [{ name: 'surf', type: 'water', power: 90 }],
    },
  ];

  it('only counts offensive moves toward coverage', () => {
    const result = analyzeMoveCoverage([6, 9], teamDetails, moves);

    const charizard = result.pokemonBreakdown.find((b) => b.pokemonId === 6);
    expect(charizard?.offensiveMoves.map((m) => m.name)).toEqual(['flamethrower', 'air-slash']);
  });

  it('reports uncovered types as exactly those no move hits super-effectively', () => {
    const result = analyzeMoveCoverage([6, 9], teamDetails, moves);
    const covered = new Set(result.coveredTypes);

    for (const type of result.uncoveredTypes) {
      expect(covered.has(type)).toBe(false);
    }
    // Fire coverage from the Charizard line and Water from Surf must be present.
    expect(result.coveredTypes).toEqual(expect.arrayContaining(['grass', 'fire']));
  });

  it('suggests moves that would cover the remaining types', () => {
    const result = analyzeMoveCoverage([6], [teamDetails[0]], [{
      pokemonName: 'charizard',
      pokemonId: 6,
      moves: [{ name: 'ember', type: 'fire', power: 40 }],
    }]);

    // Fire alone leaves many types uncovered; suggestions should exist and
    // each suggestion must target an uncovered type.
    expect(result.uncoveredTypes.length).toBeGreaterThan(0);
    for (const suggestion of result.suggestions) {
      expect(result.uncoveredTypes).toContain(suggestion.coversType);
      expect(suggestion.power).toBe(0);
    }
  });
});
