import { describe, it, expect } from 'vitest';
import { analyzeTeam, calculateSynergyScore } from './team-analysis';
import type { PokemonDetail } from '@/types/pokemon';
import type { TypeRelations } from './api/rest';

/** Build a minimal PokemonDetail with the fields team-analysis reads. */
function makePokemon(
  typeNames: string[],
  stats: { hp: number; attack: number; defense: number; 'special-attack': number; 'special-defense': number; speed: number },
): PokemonDetail {
  return {
    types: typeNames.map((name, i) => ({ slot: i + 1, type: { name, url: '' } })),
    stats: (Object.entries(stats) as [string, number][]).map(([name, base_stat]) => ({
      base_stat,
      effort: 0,
      stat: { name, url: '' },
    })),
  } as unknown as PokemonDetail;
}

const BALANCED = {
  hp: 100,
  attack: 100,
  defense: 100,
  'special-attack': 100,
  'special-defense': 100,
  speed: 100,
};

/** Type chart slice: fire/water/grass triangle + a no-damage immunity. */
const typeRelations: Record<string, TypeRelations> = {
  fire: {
    damage_relations: {
      double_damage_from: [{ name: 'water', url: '' }],
      double_damage_to: [{ name: 'grass', url: '' }],
      half_damage_from: [{ name: 'fire', url: '' }],
      half_damage_to: [{ name: 'water', url: '' }],
      no_damage_from: [],
      no_damage_to: [],
    },
  },
  water: {
    damage_relations: {
      double_damage_from: [{ name: 'grass', url: '' }],
      double_damage_to: [{ name: 'fire', url: '' }],
      half_damage_from: [{ name: 'water', url: '' }],
      half_damage_to: [{ name: 'grass', url: '' }],
      no_damage_from: [],
      no_damage_to: [],
    },
  },
  grass: {
    damage_relations: {
      double_damage_from: [{ name: 'fire', url: '' }],
      double_damage_to: [{ name: 'water', url: '' }],
      half_damage_from: [{ name: 'grass', url: '' }],
      half_damage_to: [{ name: 'fire', url: '' }],
      no_damage_from: [],
      no_damage_to: [],
    },
  },
  ground: {
    damage_relations: {
      double_damage_from: [],
      double_damage_to: [],
      half_damage_from: [],
      half_damage_to: [],
      no_damage_from: [{ name: 'electric', url: '' }],
      no_damage_to: [],
    },
  },
};

describe('analyzeTeam', () => {
  it('returns zeroed analysis for an empty team', () => {
    const result = analyzeTeam([], typeRelations);
    expect(result.stats.total).toBe(0);
    expect(result.typeCoverage.size).toBe(0);
    expect(result.weaknesses).toEqual([]);
    expect(result.resistances).toEqual([]);
  });

  it('records type coverage and missing types', () => {
    const team = [makePokemon(['fire'], BALANCED)];
    const result = analyzeTeam(team, typeRelations);
    expect(result.typeCoverage.has('fire')).toBe(true);
    expect(result.missingTypes).not.toContain('fire');
    expect(result.missingTypes).toContain('water');
  });

  it('computes a 2x weakness from the type chart', () => {
    const team = [makePokemon(['grass'], BALANCED)];
    const result = analyzeTeam(team, typeRelations);
    // grass takes double from fire -> fire should be a weakness (negative defensive score)
    expect(result.weaknessesCount.fire).toBeGreaterThan(0);
    expect(result.defensive.fire).toBeLessThan(0);
  });

  it('counts immunities as resistances with high value', () => {
    const team = [makePokemon(['ground'], BALANCED)];
    const result = analyzeTeam(team, typeRelations);
    expect(result.immunitiesCount.electric).toBe(1);
    expect(result.defensive.electric).toBeGreaterThan(0);
  });

  it('averages stats across the team', () => {
    const team = [
      makePokemon(['fire'], { ...BALANCED, hp: 60 }),
      makePokemon(['water'], { ...BALANCED, hp: 100 }),
    ];
    const result = analyzeTeam(team, typeRelations);
    expect(result.stats.avgHp).toBe(80);
  });
});

describe('calculateSynergyScore', () => {
  it('is 0 for an empty team', () => {
    const analysis = analyzeTeam([], typeRelations);
    expect(calculateSynergyScore([], analysis)).toBe(0);
  });

  it('stays within the 0-100 range', () => {
    const team = [makePokemon(['fire'], BALANCED), makePokemon(['water'], BALANCED)];
    const analysis = analyzeTeam(team, typeRelations);
    const score = calculateSynergyScore(team, analysis);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('penalizes duplicate typings vs diverse typings', () => {
    const dupes = [makePokemon(['fire'], BALANCED), makePokemon(['fire'], BALANCED)];
    const diverse = [makePokemon(['fire'], BALANCED), makePokemon(['water'], BALANCED)];

    const dupeScore = calculateSynergyScore(dupes, analyzeTeam(dupes, typeRelations));
    const diverseScore = calculateSynergyScore(diverse, analyzeTeam(diverse, typeRelations));

    expect(diverseScore).toBeGreaterThan(dupeScore);
  });

  it('penalizes very low average stats', () => {
    const weakStats = { hp: 20, attack: 20, defense: 20, 'special-attack': 20, 'special-defense': 20, speed: 20 };
    const strong = [makePokemon(['fire'], BALANCED), makePokemon(['water'], BALANCED)];
    const weak = [makePokemon(['fire'], weakStats), makePokemon(['water'], weakStats)];

    const strongScore = calculateSynergyScore(strong, analyzeTeam(strong, typeRelations));
    const weakScore = calculateSynergyScore(weak, analyzeTeam(weak, typeRelations));

    expect(strongScore).toBeGreaterThan(weakScore);
  });
});
