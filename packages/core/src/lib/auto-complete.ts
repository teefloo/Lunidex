import { PokemonBasicData } from '../types/pokemon';
import { analyzeTeam, TeamAnalysisResult } from './team-analysis';
import { TypeRelations } from '../api';
import { PokemonDetail } from '../types/pokemon';

export type TargetGeneration = 'all' | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export interface AutoCompleteOptions {
  includeLegendaries: boolean;
  includeMythicals: boolean;
  excludeSpecialForms: boolean;
  targetGeneration: TargetGeneration;
  minBaseStatTotal: number;
  preferUniqueTypes: boolean;
}

export const DEFAULT_AUTO_COMPLETE_OPTIONS: AutoCompleteOptions = {
  includeLegendaries: false,
  includeMythicals: false,
  excludeSpecialForms: true,
  targetGeneration: 'all',
  minBaseStatTotal: 300,
  preferUniqueTypes: true,
};

const RESTRICTED_FORM_PATTERNS = [
  /-mega(-|$)/i,
  /-gmax(-|$)/i,
  /-primal(-|$)/i,
  /-eternamax(-|$)/i,
];

export function isRestrictedFormName(name: string): boolean {
  return RESTRICTED_FORM_PATTERNS.some(pattern => pattern.test(name));
}

export type PokemonRole =
  | 'physical-sweeper'
  | 'special-sweeper'
  | 'physical-tank'
  | 'special-tank'
  | 'wall'
  | 'speedster'
  | 'all-rounder';

const STAT_NAME_MAP: Record<string, string> = {
  hp: 'hp',
  attack: 'attack',
  defense: 'defense',
  'special-attack': 'special-attack',
  'special-defense': 'special-defense',
  speed: 'speed',
};

function getStat(stats: PokemonBasicData['pokemon_v2_pokemonstats'], name: string): number {
  const stat = stats.find(s => {
    const statName = s.pokemon_v2_stat?.name;
    if (statName && STAT_NAME_MAP[statName] === name) return true;
    return false;
  });
  return stat?.base_stat ?? 0;
}

export function getBaseStatTotal(p: PokemonBasicData): number {
  return p.pokemon_v2_pokemonstats.reduce((sum, s) => sum + s.base_stat, 0);
}

export function classifyRoleByStats(stats: PokemonBasicData['pokemon_v2_pokemonstats']): PokemonRole {
  const hp = getStat(stats, 'hp');
  const atk = getStat(stats, 'attack');
  const def = getStat(stats, 'defense');
  const spAtk = getStat(stats, 'special-attack');
  const spDef = getStat(stats, 'special-defense');
  const spe = getStat(stats, 'speed');

  const physicalPresence = atk + def;
  const specialPresence = spAtk + spDef;

  if (spe >= 120 && (atk >= 100 || spAtk >= 100)) {
    return 'speedster';
  }
  if (def >= 100 && spDef >= 100 && hp >= 80) {
    return 'wall';
  }
  if (def >= 100 && hp >= 80 && atk >= spAtk) {
    return 'physical-tank';
  }
  if (spDef >= 100 && hp >= 80 && spAtk >= atk) {
    return 'special-tank';
  }
  if (atk >= 100 && atk >= spAtk && spe >= 80) {
    return 'physical-sweeper';
  }
  if (spAtk >= 100 && spAtk > atk && spe >= 80) {
    return 'special-sweeper';
  }
  if (physicalPresence > specialPresence && atk >= def) {
    return 'physical-sweeper';
  }
  if (specialPresence > physicalPresence && spAtk >= spDef) {
    return 'special-sweeper';
  }
  return 'all-rounder';
}

export function getPokemonTypes(p: PokemonBasicData): string[] {
  return p.pokemon_v2_pokemontypes.map(t => t.pokemon_v2_type.name);
}

export function isObtainable(
  pokemon: PokemonBasicData,
  options: AutoCompleteOptions
): boolean {
  const species = pokemon.pokemon_v2_pokemonspecy;
  if (!species) return false;
  if (!options.includeLegendaries && species.is_legendary === true) return false;
  if (!options.includeMythicals && species.is_mythical === true) return false;
  if (options.excludeSpecialForms && isRestrictedFormName(pokemon.name)) return false;
  if (options.targetGeneration !== 'all' && species.generation_id !== options.targetGeneration) {
    return false;
  }
  return true;
}

export interface ScoredCandidate {
  pokemon: PokemonBasicData;
  score: number;
  estimatedSynergy: number;
  role: PokemonRole;
  defensiveBonus: number;
  offensiveBonus: number;
  uniqueTypes: string[];
}

function buildPokemonDetailFromBasic(basic: PokemonBasicData, id: number): PokemonDetail {
  return {
    id,
    name: basic.name,
    order: id,
    is_default: true,
    sprites: {
      front_default: '',
      back_default: '',
      front_shiny: '',
      back_shiny: '',
      other: {
        'official-artwork': { front_default: '', front_shiny: '' },
        showdown: { front_default: '', back_default: '' },
      },
    },
    types: basic.pokemon_v2_pokemontypes.map((t, idx) => ({
      slot: idx + 1,
      type: { name: t.pokemon_v2_type.name, url: '' },
    })),
    stats: basic.pokemon_v2_pokemonstats.map(s => ({
      base_stat: s.base_stat,
      effort: 0,
      stat: { name: s.pokemon_v2_stat?.name ?? '', url: '' },
    })),
    weight: basic.weight ?? 0,
    height: basic.height ?? 0,
    base_experience: 0,
    species: { name: basic.name, url: '' },
    abilities: [],
    moves: [],
    game_indices: [],
    held_items: [],
    cries: { latest: '', legacy: '' },
    forms: [],
  };
}

function scoreCandidate(
  candidate: PokemonBasicData,
  currentTeamDetails: PokemonDetail[],
  currentAnalysis: TeamAnalysisResult | null,
  typeRelations: Record<string, TypeRelations>,
  currentRoles: Set<PokemonRole>,
  options: AutoCompleteOptions
): ScoredCandidate {
  const candidateTypes = getPokemonTypes(candidate);
  const candidateDetail = buildPokemonDetailFromBasic(candidate, candidate.id);
  const candidateRole = classifyRoleByStats(candidate.pokemon_v2_pokemonstats);
  const candidateBst = getBaseStatTotal(candidate);

  const projectedTeam = [...currentTeamDetails, candidateDetail];
  const projectedAnalysis = analyzeTeam(projectedTeam, typeRelations);

  const defensiveBonus = projectedAnalysis.defensive[candidateTypes[0]] ?? 0;
  const offensiveCoverageTypes = candidateTypes.filter(
    typeName => !currentAnalysis?.typeCoverage.has(typeName)
  );
  const offensiveBonus = offensiveCoverageTypes.length * 8;

  const newTypes = candidateTypes.filter(
    typeName => !currentAnalysis?.typeCoverage.has(typeName)
  );
  const duplicatePenalty =
    candidateTypes.length - newTypes.length > 0 && options.preferUniqueTypes
      ? (candidateTypes.length - newTypes.length) * 12
      : 0;

  const roleBonus = currentRoles.has(candidateRole) ? 0 : 25;

  const weaknessReduction = (currentAnalysis?.weaknesses ?? []).reduce((acc, [type, val]) => {
    if (val >= 1) {
      const rels = typeRelations[candidateTypes[0]]?.damage_relations;
      if (rels) {
        if (rels.no_damage_from.some(t => t.name === type)) return acc + 18;
        if (rels.half_damage_from.some(t => t.name === type)) return acc + 10;
      }
    }
    return acc;
  }, 0);

  const bstScore = Math.min(40, Math.max(0, (candidateBst - 300) / 6));

  const newWeaknessScore = projectedAnalysis.weaknesses.length < (currentAnalysis?.weaknesses.length ?? 0)
    ? 12
    : 0;
  const newResistanceScore = projectedAnalysis.resistances.length > (currentAnalysis?.resistances.length ?? 0)
    ? 8
    : 0;
  const newCoverageScore = projectedAnalysis.coverage.length > (currentAnalysis?.coverage.length ?? 0)
    ? 6
    : 0;

  const projectedSynergy = calculateTeamSynergyScore(projectedAnalysis);
  const currentSynergy = currentAnalysis ? calculateTeamSynergyScore(currentAnalysis) : 0;
  const synergyDelta = projectedSynergy - currentSynergy;

  const score =
    synergyDelta * 4 +
    defensiveBonus * 3 +
    offensiveBonus +
    roleBonus +
    weaknessReduction +
    bstScore +
    newWeaknessScore +
    newResistanceScore +
    newCoverageScore -
    duplicatePenalty;

  return {
    pokemon: candidate,
    score,
    estimatedSynergy: projectedSynergy,
    role: candidateRole,
    defensiveBonus,
    offensiveBonus,
    uniqueTypes: newTypes,
  };
}

function calculateTeamSynergyScore(analysis: TeamAnalysisResult): number {
  const { stats, weaknessesCount, resistancesCount, immunitiesCount, typeCoverage, coverage } = analysis;

  let score = 100;

  let majorWeaknessPenalty = 0;
  let minorWeaknessPenalty = 0;
  Object.entries(weaknessesCount).forEach(([, count]) => {
    if (count >= 3) majorWeaknessPenalty += 12;
    else if (count >= 2) minorWeaknessPenalty += 4;
  });
  score -= majorWeaknessPenalty + minorWeaknessPenalty;

  score += Math.min(typeCoverage.size, 12) * 3;
  score += Math.min(coverage.length, 14) * 2;
  score += Math.min(Object.keys(resistancesCount).length, 10) * 2;
  score += Object.values(immunitiesCount).reduce((sum, v) => sum + v, 0) * 3;

  const averages = [
    stats.avgHp,
    stats.avgAtk,
    stats.avgDef,
    stats.avgSpAtk,
    stats.avgSpDef,
    stats.avgSpe,
  ];
  const minAvg = Math.min(...averages);
  if (minAvg < 55) score -= 18;
  else if (minAvg < 70) score -= 10;
  else if (minAvg < 80) score -= 4;

  return Math.min(100, Math.max(0, score));
}

export interface AutoCompleteResult {
  added: PokemonBasicData[];
  candidateScores: ScoredCandidate[];
  finalSynergy: number;
}

export function rankAutoCompleteCandidates(
  currentTeamDetails: PokemonDetail[],
  currentAnalysis: TeamAnalysisResult | null,
  candidates: PokemonBasicData[],
  typeRelations: Record<string, TypeRelations>,
  options: AutoCompleteOptions = DEFAULT_AUTO_COMPLETE_OPTIONS
): AutoCompleteResult {
  const currentTeamIds = new Set(currentTeamDetails.map(p => p.id));
  const slotsRemaining = Math.max(0, 6 - currentTeamDetails.length);

  const available = candidates.filter(
    p => !currentTeamIds.has(p.id) && isObtainable(p, options)
  );

  const eligible = options.minBaseStatTotal > 0
    ? available.filter(p => getBaseStatTotal(p) >= options.minBaseStatTotal)
    : available;

  if (eligible.length === 0 || slotsRemaining === 0) {
    return {
      added: [],
      candidateScores: [],
      finalSynergy: currentAnalysis ? calculateTeamSynergyScore(currentAnalysis) : 0,
    };
  }

  const selected: PokemonBasicData[] = [];
  const scored: ScoredCandidate[] = [];
  let workingTeam: PokemonDetail[] = [...currentTeamDetails];
  let workingAnalysis: TeamAnalysisResult | null = currentAnalysis;
  let workingRoles: Set<PokemonRole> = new Set(
    currentTeamDetails.map(p => classifyRoleByStats(toBasicStats(p)))
  );

  for (let slot = 0; slot < slotsRemaining; slot++) {
    const scoredRound = eligible
      .filter(p => !selected.some(s => s.id === p.id))
      .map(candidate =>
        scoreCandidate(
          candidate,
          workingTeam,
          workingAnalysis,
          typeRelations,
          workingRoles,
          options
        )
      )
      .filter(s => s.score > -50)
      .sort((a, b) => b.score - a.score);

    if (scoredRound.length === 0) break;

    const best = scoredRound[0];
    if (!best) break;
    selected.push(best.pokemon);
    scored.push(best);

    const detail = buildPokemonDetailFromBasic(best.pokemon, best.pokemon.id);
    workingTeam = [...workingTeam, detail];
    workingAnalysis = analyzeTeam(workingTeam, typeRelations);
    workingRoles = new Set([...workingRoles, best.role]);
  }

  const finalSynergy = workingAnalysis ? calculateTeamSynergyScore(workingAnalysis) : 0;

  return {
    added: selected,
    candidateScores: scored,
    finalSynergy,
  };
}

function toBasicStats(p: PokemonDetail): PokemonBasicData['pokemon_v2_pokemonstats'] {
  return p.stats.map(s => ({
    base_stat: s.base_stat,
    pokemon_v2_stat: { name: s.stat.name },
  }));
}
