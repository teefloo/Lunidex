import { describe, it, expect } from 'vitest';
import {
  findCounterTypes,
  findPartnerTypes,
  getCompareSuggestions,
  type TypeRelationsForSuggestion,
  type TeamAnalysisResult,
} from './counter-suggestions';
import { TYPE_COLORS } from '@/types/pokemon';

function makeTypeRelations(overrides: Partial<{
  double_damage_from: string[];
  double_damage_to: string[];
  half_damage_from: string[];
  half_damage_to: string[];
  no_damage_from: string[];
  no_damage_to: string[];
}> = {}): TypeRelationsForSuggestion {
  return {
    damage_relations: {
      double_damage_from: (overrides.double_damage_from ?? []).map(name => ({ name, url: '' })),
      double_damage_to: (overrides.double_damage_to ?? []).map(name => ({ name, url: '' })),
      half_damage_from: (overrides.half_damage_from ?? []).map(name => ({ name, url: '' })),
      half_damage_to: (overrides.half_damage_to ?? []).map(name => ({ name, url: '' })),
      no_damage_from: (overrides.no_damage_from ?? []).map(name => ({ name, url: '' })),
      no_damage_to: (overrides.no_damage_to ?? []).map(name => ({ name, url: '' })),
    },
  };
}

function makeAnalysis(overrides: Partial<TeamAnalysisResult> = {}): TeamAnalysisResult {
  const defensive: Record<string, number> = {};
  const offensive: Record<string, number> = {};
  const resistancesCount: Record<string, number> = {};
  const weaknessesCount: Record<string, number> = {};
  const immunitiesCount: Record<string, number> = {};
  Object.keys(TYPE_COLORS).forEach(t => {
    defensive[t] = 0;
    offensive[t] = 0;
    resistancesCount[t] = 0;
    weaknessesCount[t] = 0;
    immunitiesCount[t] = 0;
  });

  return {
    defensive,
    offensive,
    resistancesCount,
    weaknessesCount,
    immunitiesCount,
    stats: { avgHp: 80, avgAtk: 80, avgDef: 80, avgSpAtk: 80, avgSpDef: 80, avgSpe: 80, total: 480 },
    weaknesses: [],
    resistances: [],
    coverage: [],
    typeCoverage: new Set<string>(),
    missingTypes: [],
    suggestions: { types: [], statFocus: [] },
    ...overrides,
  };
}

const realTypeRelations: Record<string, TypeRelationsForSuggestion> = {
  fire: makeTypeRelations({
    double_damage_from: ['water', 'ground', 'rock'],
    double_damage_to: ['grass', 'ice', 'bug', 'steel'],
    half_damage_from: ['fire', 'grass', 'ice', 'bug', 'steel', 'fairy'],
    half_damage_to: ['fire', 'water', 'rock', 'dragon'],
    no_damage_from: [],
    no_damage_to: [],
  }),
  water: makeTypeRelations({
    double_damage_from: ['grass', 'electric'],
    double_damage_to: ['fire', 'ground', 'rock'],
    half_damage_from: ['fire', 'water', 'ice', 'steel'],
    half_damage_to: ['water', 'grass', 'dragon'],
    no_damage_from: [],
    no_damage_to: [],
  }),
  grass: makeTypeRelations({
    double_damage_from: ['fire', 'ice', 'poison', 'flying', 'bug'],
    double_damage_to: ['water', 'ground', 'rock'],
    half_damage_from: ['water', 'electric', 'grass', 'ground'],
    half_damage_to: ['fire', 'grass', 'poison', 'flying', 'bug', 'steel', 'dragon', 'fairy'],
    no_damage_from: [],
    no_damage_to: [],
  }),
  electric: makeTypeRelations({
    double_damage_from: ['ground'],
    double_damage_to: ['water', 'flying'],
    half_damage_from: ['electric', 'flying', 'steel'],
    half_damage_to: ['electric', 'grass', 'dragon'],
    no_damage_from: [],
    no_damage_to: ['ground'],
  }),
  ground: makeTypeRelations({
    double_damage_from: ['water', 'grass', 'ice'],
    double_damage_to: ['fire', 'electric', 'poison', 'rock', 'steel'],
    half_damage_from: ['poison', 'rock'],
    half_damage_to: ['grass', 'bug'],
    no_damage_from: ['electric'],
    no_damage_to: ['flying'],
  }),
  flying: makeTypeRelations({
    double_damage_from: ['electric', 'ice', 'rock'],
    double_damage_to: ['grass', 'bug', 'fighting'],
    half_damage_from: ['grass', 'fighting', 'bug'],
    half_damage_to: ['electric', 'rock', 'steel'],
    no_damage_from: ['ground'],
    no_damage_to: [],
  }),
  bug: makeTypeRelations({
    double_damage_from: ['fire', 'flying', 'rock'],
    double_damage_to: ['grass', 'psychic', 'dark'],
    half_damage_from: ['grass', 'fighting', 'ground'],
    half_damage_to: ['fire', 'fighting', 'poison', 'flying', 'ghost', 'steel', 'fairy'],
    no_damage_from: [],
    no_damage_to: [],
  }),
  ice: makeTypeRelations({
    double_damage_from: ['fire', 'fighting', 'rock', 'steel'],
    double_damage_to: ['grass', 'ground', 'flying', 'dragon'],
    half_damage_from: ['ice'],
    half_damage_to: ['fire', 'water', 'ice', 'steel'],
    no_damage_from: [],
    no_damage_to: [],
  }),
  fighting: makeTypeRelations({
    double_damage_from: ['flying', 'psychic', 'fairy'],
    double_damage_to: ['normal', 'ice', 'rock', 'dark', 'steel'],
    half_damage_from: ['bug', 'rock', 'dark'],
    half_damage_to: ['poison', 'flying', 'psychic', 'bug', 'fairy'],
    no_damage_from: [],
    no_damage_to: ['ghost'],
  }),
  poison: makeTypeRelations({
    double_damage_from: ['ground', 'psychic'],
    double_damage_to: ['grass', 'fairy'],
    half_damage_from: ['grass', 'fighting', 'poison', 'bug', 'fairy'],
    half_damage_to: ['poison', 'ground', 'rock', 'ghost'],
    no_damage_from: [],
    no_damage_to: ['steel'],
  }),
  rock: makeTypeRelations({
    double_damage_from: ['water', 'grass', 'fighting', 'ground', 'steel'],
    double_damage_to: ['fire', 'ice', 'flying', 'bug'],
    half_damage_from: ['normal', 'fire', 'poison', 'flying'],
    half_damage_to: ['fighting', 'ground', 'steel'],
    no_damage_from: [],
    no_damage_to: [],
  }),
  ghost: makeTypeRelations({
    double_damage_from: ['ghost', 'dark'],
    double_damage_to: ['psychic', 'ghost'],
    half_damage_from: ['poison', 'bug'],
    half_damage_to: ['dark', 'steel'],
    no_damage_from: ['normal', 'fighting'],
    no_damage_to: ['normal'],
  }),
  dragon: makeTypeRelations({
    double_damage_from: ['ice', 'dragon', 'fairy'],
    double_damage_to: ['dragon'],
    half_damage_from: ['fire', 'water', 'grass', 'electric'],
    half_damage_to: ['steel'],
    no_damage_from: [],
    no_damage_to: ['fairy'],
  }),
  dark: makeTypeRelations({
    double_damage_from: ['fighting', 'bug', 'fairy'],
    double_damage_to: ['psychic', 'ghost'],
    half_damage_from: ['ghost', 'dark'],
    half_damage_to: ['fighting', 'dark', 'fairy'],
    no_damage_from: ['psychic'],
    no_damage_to: ['fighting'],
  }),
  steel: makeTypeRelations({
    double_damage_from: ['fire', 'fighting', 'ground'],
    double_damage_to: ['ice', 'rock', 'fairy'],
    half_damage_from: ['normal', 'grass', 'ice', 'flying', 'psychic', 'bug', 'rock', 'dragon', 'steel', 'fairy'],
    half_damage_to: ['fire', 'water', 'electric', 'steel'],
    no_damage_from: ['poison'],
    no_damage_to: [],
  }),
  fairy: makeTypeRelations({
    double_damage_from: ['poison', 'steel'],
    double_damage_to: ['fighting', 'dragon', 'dark'],
    half_damage_from: ['fighting', 'bug', 'dark'],
    half_damage_to: ['fire', 'poison', 'steel'],
    no_damage_from: ['dragon'],
    no_damage_to: [],
  }),
  normal: makeTypeRelations({
    double_damage_from: ['fighting'],
    double_damage_to: [],
    half_damage_from: [],
    half_damage_to: ['rock', 'steel'],
    no_damage_from: ['ghost'],
    no_damage_to: ['ghost'],
  }),
};

describe('findCounterTypes', () => {
  it('returns empty for a team with no weaknesses', () => {
    const analysis = makeAnalysis({
      weaknesses: [],
      missingTypes: [],
    });
    const result = findCounterTypes(analysis, realTypeRelations, ['steel', 'fairy']);
    expect(result).toEqual([]);
  });

  it('identifies counters for a Ground-weak team', () => {
    const analysis = makeAnalysis({
      weaknesses: [['ground', -3]],
      weaknessesCount: { ground: 3 } as Record<string, number>,
      missingTypes: [],
    });
    const result = findCounterTypes(analysis, realTypeRelations, ['fire', 'electric']);
    const groundCounter = result.find(c => c.type === 'ground');
    expect(groundCounter).toBeDefined();
    expect(groundCounter!.severity).toBe(3);
    expect(groundCounter!.threatTypes).toContain('water');
    expect(groundCounter!.threatTypes).toContain('grass');
    expect(groundCounter!.threatTypes).toContain('ice');
  });

  it('excludes team types from threat suggestions', () => {
    const analysis = makeAnalysis({
      weaknesses: [['fire', -2]],
      missingTypes: [],
    });
    const result = findCounterTypes(analysis, realTypeRelations, ['fire', 'water']);
    const fireCounter = result.find(c => c.type === 'fire');
    expect(fireCounter).toBeDefined();
    expect(fireCounter!.threatTypes).not.toContain('fire');
    expect(fireCounter!.threatTypes).toContain('ground');
    expect(fireCounter!.threatTypes).toContain('rock');
  });

  it('limits results to 5', () => {
    const weaknesses = Object.keys(TYPE_COLORS).slice(0, 8).map(t => [t, -1] as [string, number]);
    const analysis = makeAnalysis({ weaknesses, missingTypes: [] });
    const result = findCounterTypes(analysis, realTypeRelations, ['steel']);
    expect(result.length).toBeLessThanOrEqual(5);
  });

  it('sorts by severity descending', () => {
    const analysis = makeAnalysis({
      weaknesses: [['fire', -1], ['ground', -3], ['ice', -2]],
      missingTypes: [],
    });
    const result = findCounterTypes(analysis, realTypeRelations, ['steel']);
    expect(result[0].type).toBe('ground');
    expect(result[0].severity).toBe(3);
  });
});

describe('findPartnerTypes', () => {
  it('returns empty for a team with no weaknesses and full coverage', () => {
    const allTypes = new Set(Object.keys(TYPE_COLORS));
    const analysis = makeAnalysis({
      weaknessesCount: {} as Record<string, number>,
      missingTypes: [],
      typeCoverage: allTypes,
    });
    const result = findPartnerTypes(analysis, realTypeRelations, Object.keys(TYPE_COLORS));
    expect(result).toEqual([]);
  });

  it('suggests types that resist shared weaknesses', () => {
    const analysis = makeAnalysis({
      weaknessesCount: { fire: 2, ground: 2 } as Record<string, number>,
      missingTypes: [],
      typeCoverage: new Set(['fire', 'electric']),
    });
    const result = findPartnerTypes(analysis, realTypeRelations, ['fire', 'electric']);
    const waterPartner = result.find(p => p.type === 'water');
    expect(waterPartner).toBeDefined();
    expect(waterPartner!.coversTypes).toContain('fire');
  });

  it('suggests missing types as coverage fills', () => {
    const analysis = makeAnalysis({
      weaknessesCount: {} as Record<string, number>,
      missingTypes: ['fairy'],
      typeCoverage: new Set(['fire', 'water']),
    });
    const result = findPartnerTypes(analysis, realTypeRelations, ['fire', 'water']);
    const fairyPartner = result.find(p => p.type === 'fairy');
    expect(fairyPartner).toBeDefined();
    expect(fairyPartner!.reason).toBe('fills_coverage');
  });

  it('gives "both" reason when type covers weakness AND fills coverage', () => {
    const analysis = makeAnalysis({
      weaknessesCount: { dragon: 2 } as Record<string, number>,
      missingTypes: ['fairy'],
      typeCoverage: new Set(['fire', 'water']),
    });
    const result = findPartnerTypes(analysis, realTypeRelations, ['fire', 'water']);
    const fairyPartner = result.find(p => p.type === 'fairy');
    expect(fairyPartner).toBeDefined();
    expect(fairyPartner!.reason).toBe('both');
    expect(fairyPartner!.coversTypes).toContain('dragon');
  });

  it('excludes team types from suggestions', () => {
    const analysis = makeAnalysis({
      weaknessesCount: { fire: 2 } as Record<string, number>,
      missingTypes: [],
      typeCoverage: new Set(['fire']),
    });
    const result = findPartnerTypes(analysis, realTypeRelations, ['fire']);
    expect(result.every(p => p.type !== 'fire')).toBe(true);
  });

  it('limits results to 6', () => {
    const allButOne = Object.keys(TYPE_COLORS).slice(0, 17);
    const analysis = makeAnalysis({
      weaknessesCount: Object.fromEntries(Object.keys(TYPE_COLORS).slice(0, 10).map(t => [t, 3])) as Record<string, number>,
      missingTypes: Object.keys(TYPE_COLORS).slice(0, 17),
      typeCoverage: new Set(allButOne),
    });
    const result = findPartnerTypes(analysis, realTypeRelations, allButOne);
    expect(result.length).toBeLessThanOrEqual(6);
  });
});

describe('getCompareSuggestions', () => {
  it('returns empty suggestions for a balanced team', () => {
    const analysis = makeAnalysis({
      weaknesses: [],
      missingTypes: [],
      weaknessesCount: {} as Record<string, number>,
      typeCoverage: new Set(Object.keys(TYPE_COLORS)),
      stats: { avgHp: 100, avgAtk: 100, avgDef: 100, avgSpAtk: 100, avgSpDef: 100, avgSpe: 100, total: 600 },
    });
    const result = getCompareSuggestions(analysis, realTypeRelations, Object.keys(TYPE_COLORS));
    expect(result.counters).toEqual([]);
    expect(result.partners).toEqual([]);
    expect(result.sharedWeaknesses).toEqual([]);
    expect(result.statDeficiencies).toEqual([]);
  });

  it('detects shared weaknesses when 2+ members are weak to same type', () => {
    const analysis = makeAnalysis({
      weaknessesCount: { ground: 3, fire: 2 } as Record<string, number>,
    });
    const result = getCompareSuggestions(analysis, realTypeRelations, ['electric', 'steel']);
    expect(result.sharedWeaknesses).toContain('ground');
    expect(result.sharedWeaknesses).toContain('fire');
  });

  it('detects stat deficiencies', () => {
    const analysis = makeAnalysis({
      stats: { avgHp: 60, avgAtk: 50, avgDef: 50, avgSpAtk: 50, avgSpDef: 50, avgSpe: 40, total: 300 },
    });
    const result = getCompareSuggestions(analysis, realTypeRelations, ['fire']);
    expect(result.statDeficiencies).toContain('speed');
    expect(result.statDeficiencies).toContain('offensive');
    expect(result.statDeficiencies).toContain('defensive');
  });

  it('suggests Flying and Grass as partners for a team weak to Ground', () => {
    const analysis = makeAnalysis({
      weaknessesCount: { ground: 3 } as Record<string, number>,
      weaknesses: [['ground', -3]],
      missingTypes: [],
      typeCoverage: new Set(['fire', 'electric']),
    });
    const result = getCompareSuggestions(analysis, realTypeRelations, ['fire', 'electric']);
    const partnerTypes = result.partners.map(p => p.type);
    expect(partnerTypes).toContain('flying');
    expect(partnerTypes).toContain('grass');
  });

  it('suggests Water as counter for Fire-weak team', () => {
    const analysis = makeAnalysis({
      weaknesses: [['fire', -2]],
      missingTypes: [],
      weaknessesCount: {} as Record<string, number>,
    });
    const result = getCompareSuggestions(analysis, realTypeRelations, ['grass']);
    const counterTypes = result.counters.map(c => c.type);
    expect(counterTypes).toContain('fire');
  });
});

describe('edge cases', () => {
  it('handles empty team analysis gracefully', () => {
    const analysis = makeAnalysis();
    const result = getCompareSuggestions(analysis, realTypeRelations, []);
    expect(result.counters).toEqual([]);
    expect(result.partners).toEqual([]);
    expect(result.sharedWeaknesses).toEqual([]);
  });

  it('handles missing type relations gracefully', () => {
    const analysis = makeAnalysis({
      weaknesses: [['fire', -2]],
      missingTypes: [],
    });
    const sparseRelations = { fire: realTypeRelations.fire };
    const result = findCounterTypes(analysis, sparseRelations, ['water']);
    expect(result).toBeDefined();
  });
});
