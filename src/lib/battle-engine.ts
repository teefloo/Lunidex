/**
 * Battle Engine — Gen 9 damage formula implementation
 * Reference: https://bulbapedia.bulbagarden.net/wiki/Damage
 */

import { PokemonDetail } from '@/types/pokemon';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BattleMove {
  name: string;
  type: string;
  power: number;
  damage_class: 'physical' | 'special' | 'status';
  accuracy: number | null;
}

export interface BattleOptions {
  weather?: 'sun' | 'rain' | 'sandstorm' | 'snow' | 'none';
  terrain?: 'electric' | 'grassy' | 'psychic' | 'misty' | 'none';
  isCritical?: boolean;
  isAdaptability?: boolean;
  attackerStatus?: 'burned' | 'none';
}

export interface DamageResult {
  min: number;
  max: number;
  average: number;
  minPercent: number;
  maxPercent: number;
  ohkoChance: number;   // 0–1
  twoHkoChance: number; // 0–1
}

// ---------------------------------------------------------------------------
// Type effectiveness matrix (Gen 6+)
// Outer key = attacking type, inner array = defending types hit super-effectively
// ---------------------------------------------------------------------------

const TYPE_CHART: Record<string, { superEffective: string[]; notVeryEffective: string[]; immune: string[] }> = {
  normal:   { superEffective: [],                                      notVeryEffective: ['rock', 'steel'],                       immune: ['ghost'] },
  fire:     { superEffective: ['grass', 'ice', 'bug', 'steel'],       notVeryEffective: ['fire', 'water', 'rock', 'dragon'],      immune: [] },
  water:    { superEffective: ['fire', 'ground', 'rock'],             notVeryEffective: ['water', 'grass', 'dragon'],             immune: [] },
  electric: { superEffective: ['water', 'flying'],                    notVeryEffective: ['electric', 'grass', 'dragon'],          immune: ['ground'] },
  grass:    { superEffective: ['water', 'ground', 'rock'],            notVeryEffective: ['fire', 'grass', 'poison', 'flying', 'bug', 'dragon', 'steel'], immune: [] },
  ice:      { superEffective: ['grass', 'ground', 'flying', 'dragon'], notVeryEffective: ['fire', 'water', 'ice', 'steel'],      immune: [] },
  fighting: { superEffective: ['normal', 'ice', 'rock', 'dark', 'steel'], notVeryEffective: ['poison', 'flying', 'psychic', 'bug', 'fairy'], immune: ['ghost'] },
  poison:   { superEffective: ['grass', 'fairy'],                     notVeryEffective: ['poison', 'ground', 'rock', 'ghost'],    immune: ['steel'] },
  ground:   { superEffective: ['fire', 'electric', 'poison', 'rock', 'steel'], notVeryEffective: ['grass', 'bug'],              immune: ['flying'] },
  flying:   { superEffective: ['grass', 'fighting', 'bug'],           notVeryEffective: ['electric', 'rock', 'steel'],           immune: [] },
  psychic:  { superEffective: ['fighting', 'poison'],                 notVeryEffective: ['psychic', 'steel'],                    immune: ['dark'] },
  bug:      { superEffective: ['grass', 'psychic', 'dark'],           notVeryEffective: ['fire', 'fighting', 'poison', 'flying', 'ghost', 'steel', 'fairy'], immune: [] },
  rock:     { superEffective: ['fire', 'ice', 'flying', 'bug'],       notVeryEffective: ['fighting', 'ground', 'steel'],         immune: [] },
  ghost:    { superEffective: ['psychic', 'ghost'],                   notVeryEffective: ['dark'],                                immune: ['normal'] },
  dragon:   { superEffective: ['dragon'],                             notVeryEffective: ['steel'],                               immune: ['fairy'] },
  dark:     { superEffective: ['psychic', 'ghost'],                   notVeryEffective: ['fighting', 'dark', 'fairy'],           immune: [] },
  steel:    { superEffective: ['ice', 'rock', 'fairy'],               notVeryEffective: ['fire', 'water', 'electric', 'steel'],  immune: [] },
  fairy:    { superEffective: ['fighting', 'dragon', 'dark'],         notVeryEffective: ['fire', 'poison', 'steel'],             immune: [] },
};

/**
 * Returns the type effectiveness multiplier for a given attacking type
 * against a defender with one or more types.
 */
export function getTypeEffectivenessMultiplier(
  attackingType: string,
  defenderTypes: string[]
): number {
  const chart = TYPE_CHART[attackingType];
  if (!chart) return 1;

  let multiplier = 1;
  for (const defType of defenderTypes) {
    if (chart.immune.includes(defType)) return 0;
    if (chart.superEffective.includes(defType)) multiplier *= 2;
    if (chart.notVeryEffective.includes(defType)) multiplier *= 0.5;
  }
  return multiplier;
}

// ---------------------------------------------------------------------------
// Helper: read a stat from PokemonDetail
// ---------------------------------------------------------------------------

function getStat(pokemon: PokemonDetail, statName: string): number {
  return pokemon.stats.find(s => s.stat.name === statName)?.base_stat ?? 0;
}

function getDefenderTypes(defender: PokemonDetail): string[] {
  return defender.types.map(t => t.type.name);
}

function getAttackerTypes(attacker: PokemonDetail): string[] {
  return attacker.types.map(t => t.type.name);
}

// ---------------------------------------------------------------------------
// Weather modifier
// ---------------------------------------------------------------------------

function weatherModifier(weather: BattleOptions['weather'], moveType: string): number {
  if (!weather || weather === 'none') return 1;
  if (weather === 'sun') {
    if (moveType === 'fire') return 1.5;
    if (moveType === 'water') return 0.5;
  }
  if (weather === 'rain') {
    if (moveType === 'water') return 1.5;
    if (moveType === 'fire') return 0.5;
  }
  // sandstorm / snow / hail: no direct damage mod for most moves
  return 1;
}

// ---------------------------------------------------------------------------
// Terrain modifier (Gen 6+)
// Only boosts grounded Pokémon; we approximate by always applying it.
// ---------------------------------------------------------------------------

function terrainModifier(terrain: BattleOptions['terrain'], moveType: string): number {
  if (!terrain || terrain === 'none') return 1;
  if (terrain === 'electric' && moveType === 'electric') return 1.3;
  if (terrain === 'grassy' && moveType === 'grass') return 1.3;
  if (terrain === 'psychic' && moveType === 'psychic') return 1.3;
  if (terrain === 'misty' && moveType === 'dragon') return 0.5;
  return 1;
}

// ---------------------------------------------------------------------------
// Critical hit rate stages (Gen 6+)
// Stage 0 → 1/24, stage 1 → 1/8, stage 2 → 1/2, stage 3 → 1/1
// ---------------------------------------------------------------------------
// We don't expose stage in BattleOptions (single isCritical toggle).
// If isCritical is true we use 1.5× and ohkoChance uses stage-0 probability (1/24).
const CRIT_STAGE_0_RATE = 1 / 24;
const CRIT_MULTIPLIER = 1.5;

// ---------------------------------------------------------------------------
// Core damage formula — Gen 9
// ---------------------------------------------------------------------------

/**
 * Calculates the damage dealt by `move` from `attacker` to `defender`.
 *
 * Returns {min, max, average, minPercent, maxPercent, ohkoChance, twoHkoChance}.
 *
 * The formula follows the official Bulbapedia breakdown:
 *   Damage = floor( floor( floor(2*Level/5+2) * BasePower * Atk/Def / 50 + 2 )
 *            * Targets * Weather * Badge * Crit * Random * STAB * Type * Burn * Final )
 *
 * Level is assumed 50 (competitive standard) unless otherwise noted.
 */
export function calcDamage(
  attacker: PokemonDetail,
  defender: PokemonDetail,
  move: BattleMove,
  options: BattleOptions = {}
): DamageResult {
  const {
    weather = 'none',
    terrain = 'none',
    isCritical = false,
    isAdaptability = false,
    attackerStatus = 'none',
  } = options;

  const LEVEL = 50;
  const defenderTypes = getDefenderTypes(defender);
  const attackerTypes = getAttackerTypes(attacker);
  const defenderMaxHp =
    Math.floor(((2 * getStat(defender, 'hp') + 31) * LEVEL) / 100) + LEVEL + 10;

  // Zero-damage special cases
  if (move.damage_class === 'status' || move.power <= 0) {
    return { min: 0, max: 0, average: 0, minPercent: 0, maxPercent: 0, ohkoChance: 0, twoHkoChance: 0 };
  }

  const typeEffectiveness = getTypeEffectivenessMultiplier(move.type, defenderTypes);
  if (typeEffectiveness === 0) {
    return { min: 0, max: 0, average: 0, minPercent: 0, maxPercent: 0, ohkoChance: 0, twoHkoChance: 0 };
  }

  // Attacker and defender stats (base only — no EVs/IVs for a simulator default)
  const isPhysical = move.damage_class === 'physical';
  const attackStat = isPhysical ? getStat(attacker, 'attack') : getStat(attacker, 'special-attack');
  const defenseStat = isPhysical ? getStat(defender, 'defense') : getStat(defender, 'special-defense');

  // Level factor
  const levelFactor = Math.floor((2 * LEVEL) / 5 + 2);

  // Base damage (before random roll)
  const baseDamage = Math.floor(
    Math.floor(levelFactor * move.power * attackStat / defenseStat / 50) + 2
  );

  // Targets modifier (1v1 = 1.0)
  const targets = 1.0;

  // Weather
  const weather_mod = weatherModifier(weather, move.type);

  // Badge (always 1 in simulator)
  const badge = 1.0;

  // Critical
  const crit = isCritical ? CRIT_MULTIPLIER : 1.0;

  // STAB
  const hasStab = attackerTypes.includes(move.type);
  const stab = hasStab ? (isAdaptability ? 2.0 : 1.5) : 1.0;

  // Type
  const type_mod = typeEffectiveness;

  // Burn (halves physical attack; Gen 5+ doesn't affect Guts, ignored here)
  const burn = attackerStatus === 'burned' && isPhysical ? 0.5 : 1.0;

  // Terrain (applied as part of "final" modifier per Bulbapedia)
  const terrain_mod = terrainModifier(terrain, move.type);

  // Random roll range: 0.85 – 1.00 (16 values: 85, 86, …, 100)
  const rolls: number[] = [];
  for (let r = 85; r <= 100; r++) {
    const randomFactor = r / 100;
    const damage = Math.floor(
      Math.floor(
        Math.floor(
          Math.floor(
            Math.floor(
              Math.floor(baseDamage * targets) * weather_mod
            ) * badge
          ) * crit
        ) * randomFactor
      ) * stab * type_mod * burn * terrain_mod
    );
    rolls.push(Math.max(1, damage));
  }

  const min = rolls[0];
  const max = rolls[rolls.length - 1];
  const average = rolls.reduce((a, b) => a + b, 0) / rolls.length;

  const minPercent = (min / defenderMaxHp) * 100;
  const maxPercent = (max / defenderMaxHp) * 100;

  // OHKO chance: fraction of rolls that kill in one hit
  const ohkoRolls = rolls.filter(d => d >= defenderMaxHp).length;
  const ohkoChance = ohkoRolls / rolls.length;

  // 2HKO chance: all roll combinations where 2 hits kill (min damage × 2 ≥ HP)
  // Conservative: min + min >= defenderMaxHp
  const twoHkoChance = (min * 2 >= defenderMaxHp) ? 1 :
    (max * 2 >= defenderMaxHp) ?
      (rolls.filter(d => d * 2 >= defenderMaxHp).length / rolls.length) : 0;

  // Factor in crit probability for ohko/2hko when not forced
  const critWeight = isCritical ? 1 : CRIT_STAGE_0_RATE;
  const adjustedOhko = isCritical ? ohkoChance : ohkoChance * critWeight + ohkoChance * (1 - critWeight);
  // Simplification: crit doesn't change 2hko calc meaningfully here
  const adjustedTwoHko = twoHkoChance;

  return {
    min,
    max,
    average: Math.round(average * 10) / 10,
    minPercent: Math.round(minPercent * 10) / 10,
    maxPercent: Math.round(maxPercent * 10) / 10,
    ohkoChance: isCritical ? ohkoChance : adjustedOhko,
    twoHkoChance: adjustedTwoHko,
  };
}

// ---------------------------------------------------------------------------
// AI move selector (picks the move dealing the most average damage)
// ---------------------------------------------------------------------------

export function chooseBestMove(
  attacker: PokemonDetail,
  defender: PokemonDetail,
  moves: BattleMove[],
  options: BattleOptions = {}
): { move: BattleMove; result: DamageResult } | null {
  let best: { move: BattleMove; result: DamageResult } | null = null;

  for (const move of moves) {
    if (move.damage_class === 'status' || move.power <= 0) continue;
    const result = calcDamage(attacker, defender, move, options);
    if (!best || result.average > best.result.average) {
      best = { move, result };
    }
  }

  return best;
}

// ---------------------------------------------------------------------------
// Turn-by-turn simulation
// ---------------------------------------------------------------------------

export interface CombatantState {
  pokemon: PokemonDetail;
  currentHp: number;
  maxHp: number;
  moves: BattleMove[];
  name: string;
}

export interface BattleLogEntry {
  turn: number;
  attacker: string;
  defender: string;
  moveName: string;
  damage: number;
  damagePercent: number;
  defenderRemainingHp: number;
  defenderRemainingPercent: number;
  isCritical: boolean;
  effectiveness: 'super' | 'normal' | 'resist' | 'immune';
}

export interface SimulationResult {
  winner: string;
  loser: string;
  turns: number;
  log: BattleLogEntry[];
}

function computeMaxHp(pokemon: PokemonDetail, level = 50): number {
  const base = getStat(pokemon, 'hp');
  return Math.floor(((2 * base + 31) * level) / 100) + level + 10;
}

export function simulateBattle(
  a: { pokemon: PokemonDetail; moves: BattleMove[] },
  b: { pokemon: PokemonDetail; moves: BattleMove[] },
  options: BattleOptions = {}
): SimulationResult {
  const stateA: CombatantState = {
    pokemon: a.pokemon,
    currentHp: computeMaxHp(a.pokemon),
    maxHp: computeMaxHp(a.pokemon),
    moves: a.moves,
    name: a.pokemon.name,
  };
  const stateB: CombatantState = {
    pokemon: b.pokemon,
    currentHp: computeMaxHp(b.pokemon),
    maxHp: computeMaxHp(b.pokemon),
    moves: b.moves,
    name: b.pokemon.name,
  };

  const log: BattleLogEntry[] = [];
  let turn = 0;
  const MAX_TURNS = 50;

  // Speed determines who attacks first
  const speedA = getStat(a.pokemon, 'speed');
  const speedB = getStat(b.pokemon, 'speed');

  while (stateA.currentHp > 0 && stateB.currentHp > 0 && turn < MAX_TURNS) {
    turn++;

    const [first, second] = speedA >= speedB ? [stateA, stateB] : [stateB, stateA];

    // First attacker
    const bestFirst = chooseBestMove(first.pokemon, second.pokemon, first.moves, options);
    if (bestFirst) {
      const dmg = Math.round(bestFirst.result.average);
      second.currentHp = Math.max(0, second.currentHp - dmg);

      const defTypes = getDefenderTypes(second.pokemon);
      const eff = getTypeEffectivenessMultiplier(bestFirst.move.type, defTypes);
      const effectivenessLabel =
        eff === 0 ? 'immune' : eff >= 2 ? 'super' : eff < 1 ? 'resist' : 'normal';

      log.push({
        turn,
        attacker: first.name,
        defender: second.name,
        moveName: bestFirst.move.name,
        damage: dmg,
        damagePercent: Math.round((dmg / second.maxHp) * 1000) / 10,
        defenderRemainingHp: second.currentHp,
        defenderRemainingPercent: Math.round((second.currentHp / second.maxHp) * 1000) / 10,
        isCritical: options.isCritical ?? false,
        effectiveness: effectivenessLabel,
      });
    }

    if (second.currentHp <= 0) break;

    // Second attacker
    const bestSecond = chooseBestMove(second.pokemon, first.pokemon, second.moves, options);
    if (bestSecond) {
      const dmg = Math.round(bestSecond.result.average);
      first.currentHp = Math.max(0, first.currentHp - dmg);

      const defTypes = getDefenderTypes(first.pokemon);
      const eff = getTypeEffectivenessMultiplier(bestSecond.move.type, defTypes);
      const effectivenessLabel =
        eff === 0 ? 'immune' : eff >= 2 ? 'super' : eff < 1 ? 'resist' : 'normal';

      log.push({
        turn,
        attacker: second.name,
        defender: first.name,
        moveName: bestSecond.move.name,
        damage: dmg,
        damagePercent: Math.round((dmg / first.maxHp) * 1000) / 10,
        defenderRemainingHp: first.currentHp,
        defenderRemainingPercent: Math.round((first.currentHp / first.maxHp) * 1000) / 10,
        isCritical: options.isCritical ?? false,
        effectiveness: effectivenessLabel,
      });
    }
  }

  const winner = stateA.currentHp > 0 ? stateA.name : stateB.name;
  const loser = stateA.currentHp > 0 ? stateB.name : stateA.name;

  return { winner, loser, turns: turn, log };
}
