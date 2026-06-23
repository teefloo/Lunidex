import { TYPE_COLORS, type PokemonDetail } from '@/types/pokemon';

export interface MoveSuggestion {
  pokemonName: string;
  moveName: string;
  moveType: string;
  coversType: string;
  power: number;
}

export interface PokemonMoveCoverage {
  pokemonName: string;
  pokemonId: number;
  coveredTypes: string[];
  offensiveMoves: Array<{
    name: string;
    type: string;
    power: number;
  }>;
}

export interface MoveCoverageResult {
  coveredTypes: string[];
  uncoveredTypes: string[];
  suggestions: MoveSuggestion[];
  pokemonBreakdown: PokemonMoveCoverage[];
}

const OFFENSIVE_DAMAGE_TYPES = [
  'normal', 'fire', 'water', 'electric', 'grass', 'ice',
  'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug',
  'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy',
];

const SUPER_EFFECTIVE_MAP: Record<string, string[]> = {
  normal: [],
  fire: ['grass', 'ice', 'bug', 'steel'],
  water: ['fire', 'ground', 'rock'],
  electric: ['water', 'flying'],
  grass: ['water', 'ground', 'rock'],
  ice: ['grass', 'ground', 'flying', 'dragon'],
  fighting: ['normal', 'ice', 'rock', 'dark', 'steel'],
  poison: ['grass', 'fairy'],
  ground: ['fire', 'electric', 'poison', 'rock', 'steel'],
  flying: ['grass', 'fighting', 'bug'],
  psychic: ['fighting', 'poison'],
  bug: ['grass', 'psychic', 'dark'],
  rock: ['fire', 'ice', 'flying', 'bug'],
  ghost: ['psychic', 'ghost'],
  dragon: ['dragon'],
  dark: ['psychic', 'ghost'],
  steel: ['ice', 'rock', 'fairy'],
  fairy: ['fighting', 'dragon', 'dark'],
};

export function getTypeEffectiveness(
  moveType: string,
): string[] {
  return SUPER_EFFECTIVE_MAP[moveType] || [];
}

export function analyzeMoveCoverage(
  team: number[],
  pokemonDetails: PokemonDetail[],
  pokemonMoves: Array<{
    pokemonName: string;
    pokemonId: number;
    moves: Array<{ name: string; type: string; power: number }>;
  }>
): MoveCoverageResult {
  const allTypes = Object.keys(TYPE_COLORS);
  const teamTypeMap = new Map<number, PokemonDetail>();
  pokemonDetails.forEach(p => teamTypeMap.set(p.id, p));

  const pokemonBreakdown: PokemonMoveCoverage[] = [];
  const globalCoveredTypes = new Set<string>();

  pokemonMoves.forEach(pm => {
    const pokemon = teamTypeMap.get(pm.pokemonId);
    const pokemonName = pokemon
      ? pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)
      : pm.pokemonName;

    const coveredTypes = new Set<string>();
    const offensiveMoves = pm.moves
      .filter(m => m.power > 0)
      .map(m => ({
        name: m.name,
        type: m.type,
        power: m.power,
      }));

    offensiveMoves.forEach(m => {
      const effectiveness = getTypeEffectiveness(m.type);
      effectiveness.forEach(t => {
        coveredTypes.add(t);
        globalCoveredTypes.add(t);
      });
    });

    pokemonBreakdown.push({
      pokemonName,
      pokemonId: pm.pokemonId,
      coveredTypes: Array.from(coveredTypes),
      offensiveMoves,
    });
  });

  const uncoveredTypes = allTypes.filter(t => !globalCoveredTypes.has(t));

  const suggestions: MoveSuggestion[] = [];
  pokemonBreakdown.forEach(pm => {
    const pokemon = teamTypeMap.get(pm.pokemonId);
    if (!pokemon) return;

    uncoveredTypes.forEach(uncovType => {
      OFFENSIVE_DAMAGE_TYPES.forEach(moveType => {
        const covers = getTypeEffectiveness(moveType);
        if (covers.includes(uncovType)) {
          const existingMove = pm.offensiveMoves.find(m => m.type === moveType);
          if (!existingMove) {
            suggestions.push({
              pokemonName: pm.pokemonName,
              moveName: `(any ${moveType} move)`,
              moveType,
              coversType: uncovType,
              power: 0,
            });
          }
        }
      });
    });
  });

  const uniqueSuggestions = dedupeSuggestions(suggestions);

  return {
    coveredTypes: Array.from(globalCoveredTypes).sort(),
    uncoveredTypes,
    suggestions: uniqueSuggestions.slice(0, 12),
    pokemonBreakdown,
  };
}

function dedupeSuggestions(suggestions: MoveSuggestion[]): MoveSuggestion[] {
  const seen = new Set<string>();
  const result: MoveSuggestion[] = [];

  for (const s of suggestions) {
    const key = `${s.pokemonName}-${s.moveType}-${s.coversType}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(s);
    }
  }

  return result;
}

export function getMoveTypesForPokemon(): string[] {
  return OFFENSIVE_DAMAGE_TYPES;
}
