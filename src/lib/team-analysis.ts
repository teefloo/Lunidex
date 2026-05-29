import { PokemonDetail, TYPE_COLORS } from '@/types/pokemon';
import { TypeRelations } from './api';

export interface TeamAnalysisResult {
  defensive: Record<string, number>;
  offensive: Record<string, number>;
  resistancesCount: Record<string, number>;
  weaknessesCount: Record<string, number>;
  immunitiesCount: Record<string, number>;
  stats: {
    avgHp: number;
    avgAtk: number;
    avgDef: number;
    avgSpAtk: number;
    avgSpDef: number;
    avgSpe: number;
    total: number;
  };
  weaknesses: [string, number][];
  resistances: [string, number][];
  coverage: [string, number][];
  typeCoverage: Set<string>;
  missingTypes: string[];
  suggestions: {
    types: string[];
    statFocus: string[];
  };
}

export function calculateSynergyScore(
  teamData: PokemonDetail[],
  analysis: TeamAnalysisResult
): number {
  if (teamData.length === 0) return 0;

  let score = 100;

  // 1. Subtract for duplicate types
  const typeCounts: Record<string, number> = {};
  teamData.forEach(p => {
    p.types.forEach(t => {
      typeCounts[t.type.name] = (typeCounts[t.type.name] || 0) + 1;
    });
  });

  Object.values(typeCounts).forEach(count => {
    if (count > 1) {
      score -= (count - 1) * 10;
    }
  });

  // 2. Add for unique type coverage (offensive)
  score += analysis.coverage.length * 5;

  // 3. Subtract for major weaknesses (types where we have > 2 weaknesses and no resistances)
  Object.entries(analysis.weaknessesCount).forEach(([type, count]) => {
    if (count >= 3 && analysis.resistancesCount[type] === 0 && analysis.immunitiesCount[type] === 0) {
      score -= 15;
    }
  });

  return Math.min(100, Math.max(0, score));
}

export function analyzeTeam(
  teamData: PokemonDetail[],
  typeRelations: Record<string, TypeRelations>
): TeamAnalysisResult {
  const defensive: Record<string, number> = {};
  const offensive: Record<string, number> = {};
  const resistancesCount: Record<string, number> = {};
  const weaknessesCount: Record<string, number> = {};
  const immunitiesCount: Record<string, number> = {};
  const typeCoverage = new Set<string>();
  
  const stats = {
    hp: 0, atk: 0, def: 0, spAtk: 0, spDef: 0, spe: 0, total: 0
  };

  Object.keys(TYPE_COLORS).forEach(t => {
    defensive[t] = 0;
    offensive[t] = 0;
    resistancesCount[t] = 0;
    weaknessesCount[t] = 0;
    immunitiesCount[t] = 0;
  });

  teamData.forEach(p => {
    // Types present
    p.types.forEach(t => typeCoverage.add(t.type.name));

    // Stats
    p.stats.forEach(s => {
      if (s.stat.name === 'hp') stats.hp += s.base_stat;
      if (s.stat.name === 'attack') stats.atk += s.base_stat;
      if (s.stat.name === 'defense') stats.def += s.base_stat;
      if (s.stat.name === 'special-attack') stats.spAtk += s.base_stat;
      if (s.stat.name === 'special-defense') stats.spDef += s.base_stat;
      if (s.stat.name === 'speed') stats.spe += s.base_stat;
    });
    stats.total += p.stats.reduce((acc, s) => acc + s.base_stat, 0);

    // Defensive analysis
    const pokemonEffectiveness: Record<string, number> = {};
    Object.keys(TYPE_COLORS).forEach(t => pokemonEffectiveness[t] = 1);

    p.types.forEach(t => {
      const rels = typeRelations[t.type.name]?.damage_relations;
      if (rels) {
        rels.double_damage_from.forEach(tr => pokemonEffectiveness[tr.name] *= 2);
        rels.half_damage_from.forEach(tr => pokemonEffectiveness[tr.name] *= 0.5);
        rels.no_damage_from.forEach(tr => pokemonEffectiveness[tr.name] *= 0);
      }
    });

    Object.entries(pokemonEffectiveness).forEach(([type, mult]) => {
      if (mult > 1) {
        // Scale penalty by multiplier: 2x = -1, 4x = -2
        defensive[type] -= Math.round(Math.log2(mult));
        weaknessesCount[type] += Math.round(Math.log2(mult));
      }
      if (mult < 1 && mult > 0) {
        // Scale bonus by multiplier: 0.5x = +1, 0.25x = +2
        defensive[type] += Math.round(Math.log2(1 / mult));
        resistancesCount[type] += Math.round(Math.log2(1 / mult));
      }
      if (mult === 0) {
        defensive[type] += 2; // Immunities are highly valued
        immunitiesCount[type]++;
      }
    });

    // Offensive analysis
    p.types.forEach(t => {
      const rels = typeRelations[t.type.name]?.damage_relations;
      if (rels) {
        rels.double_damage_to.forEach(tr => {
          offensive[tr.name]++;
        });
      }
    });
  });

  const count = teamData.length || 1;
  const avgStats = {
    avgHp: Math.round(stats.hp / count),
    avgAtk: Math.round(stats.atk / count),
    avgDef: Math.round(stats.def / count),
    avgSpAtk: Math.round(stats.spAtk / count),
    avgSpDef: Math.round(stats.spDef / count),
    avgSpe: Math.round(stats.spe / count),
    total: Math.round(stats.total / count),
  };

  const weaknesses = Object.entries(defensive).filter(([, val]) => val < 0).sort((a, b) => a[1] - b[1]);
  const resistances = Object.entries(defensive).filter(([, val]) => val > 0).sort((a, b) => b[1] - a[1]);
  const coverage = Object.entries(offensive).filter(([, val]) => val > 0).sort((a, b) => b[1] - a[1]);

  const missingTypes = Object.keys(TYPE_COLORS).filter(t => !typeCoverage.has(t));

  // Determine stat focus for suggestions
  const statFocus: string[] = [];
  if (avgStats.avgSpe < 80) statFocus.push('speed');
  if (avgStats.avgAtk < 80 && avgStats.avgSpAtk < 80) statFocus.push('offensive');
  if (avgStats.avgDef < 80 && avgStats.avgSpDef < 80) statFocus.push('defensive');

  // Suggest types that resist the team's biggest weaknesses
  const topWeaknesses = weaknesses.slice(0, 3).map(([type]) => type);
  const suggestionTypes = new Set<string>();
  
  if (topWeaknesses.length > 0) {
    Object.entries(typeRelations).forEach(([type, rels]) => {
      const dr = rels.damage_relations;
      const resistsWeakness = topWeaknesses.some(w => 
        dr.half_damage_from.some(hw => hw.name === w) || 
        dr.no_damage_from.some(nw => nw.name === w)
      );
      if (resistsWeakness && !typeCoverage.has(type)) {
        suggestionTypes.add(type);
      }
    });
  }

  return {
    defensive,
    offensive,
    resistancesCount,
    weaknessesCount,
    immunitiesCount,
    stats: avgStats,
    weaknesses,
    resistances,
    coverage,
    typeCoverage,
    missingTypes,
    suggestions: {
      types: Array.from(suggestionTypes).slice(0, 4),
      statFocus
    }
  };
}
