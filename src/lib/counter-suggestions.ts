import { TYPE_COLORS } from '@/types/pokemon';
import { TeamAnalysisResult } from './team-analysis';

export type { TeamAnalysisResult } from './team-analysis';

export interface CounterSuggestion {
  type: string;
  reason: 'threat' | 'shared_weakness' | 'coverage_gap';
  threatTypes: string[];
  severity: number;
}

export interface PartnerSuggestion {
  type: string;
  reason: 'covers_weakness' | 'fills_coverage' | 'both';
  coversTypes: string[];
}

export interface TypeRelationsForSuggestion {
  damage_relations: {
    double_damage_from: { name: string; url: string }[];
    double_damage_to: { name: string; url: string }[];
    half_damage_from: { name: string; url: string }[];
    half_damage_to: { name: string; url: string }[];
    no_damage_from: { name: string; url: string }[];
    no_damage_to: { name: string; url: string }[];
  };
}

export interface CompareSuggestions {
  counters: CounterSuggestion[];
  partners: PartnerSuggestion[];
  sharedWeaknesses: string[];
  statDeficiencies: string[];
}

function getTypesThatHitSuperEffective(
  targetType: string,
  allRelations: Record<string, TypeRelationsForSuggestion>,
): string[] {
  const result: string[] = [];
  for (const [typeName, rels] of Object.entries(allRelations)) {
    const dr = rels.damage_relations;
    if (dr.double_damage_to.some(t => t.name === targetType)) {
      result.push(typeName);
    }
  }
  return result;
}

export function findCounterTypes(
  analysis: TeamAnalysisResult,
  allRelations: Record<string, TypeRelationsForSuggestion>,
  teamTypeNames: string[],
): CounterSuggestion[] {
  const counters: CounterSuggestion[] = [];
  const teamTypeSet = new Set(teamTypeNames);

  for (const [defendingType, weaknessScore] of analysis.weaknesses) {
    if (weaknessScore >= 0) continue;

    const threatTypes = getTypesThatHitSuperEffective(defendingType, allRelations)
      .filter(t => !teamTypeSet.has(t));

    if (threatTypes.length > 0) {
      counters.push({
        type: defendingType,
        reason: 'threat',
        threatTypes,
        severity: Math.abs(weaknessScore),
      });
    }
  }

  for (const weaknessType of analysis.missingTypes) {
    const existingCounter = counters.find(c => c.type === weaknessType);
    if (existingCounter) continue;

    const threatTypes = getTypesThatHitSuperEffective(weaknessType, allRelations)
      .filter(t => !teamTypeSet.has(t));

    if (threatTypes.length > 0) {
      counters.push({
        type: weaknessType,
        reason: 'shared_weakness',
        threatTypes,
        severity: 1,
      });
    }
  }

  return counters
    .sort((a, b) => b.severity - a.severity)
    .slice(0, 5);
}

export function findPartnerTypes(
  analysis: TeamAnalysisResult,
  allRelations: Record<string, TypeRelationsForSuggestion>,
  teamTypeNames: string[],
): PartnerSuggestion[] {
  const partners: PartnerSuggestion[] = [];
  const teamTypeSet = new Set(teamTypeNames);

  const sharedWeaknessTypes = Object.entries(analysis.weaknessesCount)
    .filter(([, count]) => count >= 2)
    .map(([type]) => type);

  const coveredWeaknessTypes = new Set<string>();

  for (const typeName of Object.keys(TYPE_COLORS)) {
    if (teamTypeSet.has(typeName)) continue;

    const rels = allRelations[typeName];
    if (!rels) continue;

    const dr = rels.damage_relations;
    const resistsWeaknesses = sharedWeaknessTypes.filter(wt =>
      dr.half_damage_from.some(t => t.name === wt) ||
      dr.no_damage_from.some(t => t.name === wt)
    );

    const coversMissing = analysis.missingTypes.includes(typeName);

    if (resistsWeaknesses.length > 0 || coversMissing) {
      const reason = resistsWeaknesses.length > 0 && coversMissing
        ? 'both'
        : resistsWeaknesses.length > 0
        ? 'covers_weakness'
        : 'fills_coverage';

      partners.push({
        type: typeName,
        reason,
        coversTypes: resistsWeaknesses,
      });

      resistsWeaknesses.forEach(t => coveredWeaknessTypes.add(t));
    }
  }

  partners.sort((a, b) => {
    const aScore = (a.coversTypes.length * 2) + (a.reason === 'both' ? 3 : a.reason === 'covers_weakness' ? 1 : 0);
    const bScore = (b.coversTypes.length * 2) + (b.reason === 'both' ? 3 : b.reason === 'covers_weakness' ? 1 : 0);
    return bScore - aScore;
  });

  return partners.slice(0, 6);
}

export function getCompareSuggestions(
  analysis: TeamAnalysisResult,
  allRelations: Record<string, TypeRelationsForSuggestion>,
  teamTypeNames: string[],
): CompareSuggestions {
  const counters = findCounterTypes(analysis, allRelations, teamTypeNames);
  const partners = findPartnerTypes(analysis, allRelations, teamTypeNames);

  const sharedWeaknesses = Object.entries(analysis.weaknessesCount)
    .filter(([, count]) => count >= 2)
    .map(([type]) => type);

  const statDeficiencies: string[] = [];
  if (analysis.stats.avgSpe < 80) statDeficiencies.push('speed');
  if (analysis.stats.avgAtk < 80 && analysis.stats.avgSpAtk < 80) statDeficiencies.push('offensive');
  if (analysis.stats.avgDef < 80 && analysis.stats.avgSpDef < 80) statDeficiencies.push('defensive');

  return {
    counters,
    partners,
    sharedWeaknesses,
    statDeficiencies,
  };
}
