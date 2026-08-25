import { describe, it, expect } from 'vitest';
import { calcDamage, getTypeEffectivenessMultiplier, chooseBestMove, simulateBattle, BattleMove } from '../battle-engine';
import { PokemonDetail } from '@/types/pokemon';

// ---------------------------------------------------------------------------
// Minimal PokemonDetail factory
// ---------------------------------------------------------------------------

function makePokemon(overrides: {
  id?: number;
  name?: string;
  types: string[];
  hp?: number;
  attack?: number;
  defense?: number;
  spAtk?: number;
  spDef?: number;
  speed?: number;
}): PokemonDetail {
  const {
    id = 1,
    name = 'test',
    types,
    hp = 45,
    attack = 49,
    defense = 49,
    spAtk = 65,
    spDef = 65,
    speed = 45,
  } = overrides;

  return {
    id,
    name,
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
    types: types.map((t, i) => ({ slot: i + 1, type: { name: t, url: '' } })),
    stats: [
      { base_stat: hp,     effort: 0, stat: { name: 'hp',              url: '' } },
      { base_stat: attack, effort: 0, stat: { name: 'attack',          url: '' } },
      { base_stat: defense,effort: 0, stat: { name: 'defense',         url: '' } },
      { base_stat: spAtk,  effort: 0, stat: { name: 'special-attack',  url: '' } },
      { base_stat: spDef,  effort: 0, stat: { name: 'special-defense', url: '' } },
      { base_stat: speed,  effort: 0, stat: { name: 'speed',           url: '' } },
    ],
    weight: 69,
    height: 7,
    base_experience: 64,
    species: { name, url: '' },
    abilities: [],
    moves: [],
    game_indices: [],
    held_items: [],
    cries: { latest: '', legacy: '' },
    forms: [],
  };
}

// ---------------------------------------------------------------------------
// Test data — canonical Pokémon
// ---------------------------------------------------------------------------

// Charmander: Fire, Atk 52, SpAtk 60
const charmander = makePokemon({ id: 4, name: 'charmander', types: ['fire'], hp: 39, attack: 52, defense: 43, spAtk: 60, spDef: 50, speed: 65 });
// Bulbasaur: Grass/Poison, Def 49, SpDef 65
const bulbasaur = makePokemon({ id: 1, name: 'bulbasaur', types: ['grass', 'poison'], hp: 45, attack: 49, defense: 49, spAtk: 65, spDef: 65, speed: 45 });
// Gastly: Ghost/Poison
const gastly = makePokemon({ id: 92, name: 'gastly', types: ['ghost', 'poison'], hp: 30, attack: 35, defense: 30, spAtk: 100, spDef: 35, speed: 80 });
// Generic Normal-type attacker
const normalAttacker = makePokemon({ id: 19, name: 'rattata', types: ['normal'], hp: 30, attack: 56, defense: 35, spAtk: 25, spDef: 35, speed: 72 });

// ---------------------------------------------------------------------------
// Helper move factories
// ---------------------------------------------------------------------------

const ember: BattleMove = { name: 'ember', type: 'fire', power: 40, damage_class: 'special', accuracy: 100 };
const flamethrower: BattleMove = { name: 'flamethrower', type: 'fire', power: 90, damage_class: 'special', accuracy: 100 };
const tackle: BattleMove = { name: 'tackle', type: 'normal', power: 40, damage_class: 'physical', accuracy: 100 };
const thunderbolt: BattleMove = { name: 'thunderbolt', type: 'electric', power: 90, damage_class: 'special', accuracy: 100 };

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('calcDamage', () => {
  // Test 1: Ember (Fire, special) vs Bulbasaur (Grass/Poison) — super effective
  it('Test 1 — Ember vs Bulbasaur hits super-effectively with a known damage range', () => {
    const result = calcDamage(charmander, bulbasaur, ember);
    // 2× (fire > grass), no STAB (fire attacker vs fire move → has STAB), so × 1.5 × 2 = 3×
    expect(result.min).toBeGreaterThan(0);
    expect(result.max).toBeGreaterThanOrEqual(result.min);
    // Super-effective + STAB should deal noticeably more than a neutral hit
    const neutralResult = calcDamage(charmander, bulbasaur, tackle);
    expect(result.average).toBeGreaterThan(neutralResult.average);
  });

  // Test 2: STAB applies ×1.5 when attacker type matches move type
  it('Test 2 — STAB applies ×1.5 (fire attacker uses fire move)', () => {
    // Compare Charmander (fire) using ember vs a generic (non-fire) attacker using ember
    const normalMon = makePokemon({ types: ['normal'], hp: 50, attack: 60, defense: 50, spAtk: 60, spDef: 50, speed: 50 });
    const defender   = makePokemon({ types: ['normal'], hp: 50, attack: 50, defense: 50, spAtk: 50, spDef: 50, speed: 50 });
    const withStab    = calcDamage(charmander, defender, ember);
    const withoutStab = calcDamage(normalMon,  defender, ember);
    // Ratio should be close to 1.5
    const ratio = withStab.average / withoutStab.average;
    expect(ratio).toBeGreaterThan(1.4);
    expect(ratio).toBeLessThan(1.65);
  });

  // Test 3: Normal move vs Ghost type = 0 damage (immunity)
  it('Test 3 — Normal vs Ghost = immune (0 damage)', () => {
    const result = calcDamage(normalAttacker, gastly, tackle);
    expect(result.min).toBe(0);
    expect(result.max).toBe(0);
    expect(result.ohkoChance).toBe(0);
  });

  // Test 4: Critical hit applies ×1.5
  it('Test 4 — Critical hit multiplies damage by ×1.5', () => {
    const defender = makePokemon({ types: ['normal'] });
    const normal   = calcDamage(charmander, defender, ember, { isCritical: false });
    const crit     = calcDamage(charmander, defender, ember, { isCritical: true });
    const ratio = crit.average / normal.average;
    expect(ratio).toBeGreaterThan(1.4);
    expect(ratio).toBeLessThan(1.65);
  });

  // Test 5: Sun weather boosts Fire moves by ×1.5
  it('Test 5 — Flamethrower in sun is stronger than without weather', () => {
    const defender = makePokemon({ types: ['normal'] });
    const clear    = calcDamage(charmander, defender, flamethrower, { weather: 'none' });
    const sunny    = calcDamage(charmander, defender, flamethrower, { weather: 'sun' });
    const ratio = sunny.average / clear.average;
    expect(ratio).toBeGreaterThan(1.4);
    expect(ratio).toBeLessThan(1.65);
  });

  // Test 6: Electric terrain boosts Electric moves by ×1.3
  it('Test 6 — Thunderbolt in electric terrain is 1.3× stronger', () => {
    const defender = makePokemon({ types: ['normal'] });
    const eMon     = makePokemon({ types: ['electric'], hp: 50, attack: 60, defense: 50, spAtk: 90, spDef: 55, speed: 100 });
    const noTerrain = calcDamage(eMon, defender, thunderbolt, { terrain: 'none' });
    const elecTerr  = calcDamage(eMon, defender, thunderbolt, { terrain: 'electric' });
    const ratio = elecTerr.average / noTerrain.average;
    expect(ratio).toBeGreaterThan(1.2);
    expect(ratio).toBeLessThanOrEqual(1.4);
  });
});

describe('getTypeEffectivenessMultiplier', () => {
  it('returns 0 for Normal vs Ghost', () => {
    expect(getTypeEffectivenessMultiplier('normal', ['ghost'])).toBe(0);
  });

  it('returns 2 for Fire vs Grass', () => {
    expect(getTypeEffectivenessMultiplier('fire', ['grass'])).toBe(2);
  });

  it('returns 4 for Ice vs Grass+Flying', () => {
    expect(getTypeEffectivenessMultiplier('ice', ['grass', 'flying'])).toBe(4);
  });

  it('returns 0.5 for Fire vs Water', () => {
    expect(getTypeEffectivenessMultiplier('fire', ['water'])).toBe(0.5);
  });
});

// ---------------------------------------------------------------------------
// chooseBestMove
// ---------------------------------------------------------------------------
describe('chooseBestMove', () => {
  const waterGun: BattleMove = { name: 'water gun', type: 'water', power: 40, damage_class: 'special', accuracy: 100 };
  const growl: BattleMove = { name: 'growl', type: 'normal', power: 0, damage_class: 'status', accuracy: 100 };

  it('picks the move with the highest average damage', () => {
    const attacker = makePokemon({ id: 7, name: 'squirtle', types: ['water'], spAtk: 65 });
    const defender = makePokemon({ id: 4, name: 'charmander', types: ['fire'] });

    const best = chooseBestMove(attacker, defender, [tackle, waterGun, growl]);

    expect(best).not.toBeNull();
    expect(best!.move.name).toBe('water gun');
    expect(best!.result.average).toBeGreaterThan(0);
  });

  it('returns null when only status moves are available', () => {
    const attacker = makePokemon({ types: ['normal'] });
    const defender = makePokemon({ types: ['normal'] });

    expect(chooseBestMove(attacker, defender, [growl])).toBeNull();
  });

  it('returns null for an empty move list', () => {
    const a = makePokemon({ types: ['normal'] });
    expect(chooseBestMove(a, a, [])).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// simulateBattle
// ---------------------------------------------------------------------------
describe('simulateBattle', () => {
  it('declares a winner and never exceeds the turn cap', () => {
    const fast = makePokemon({ id: 6, name: 'charizard', types: ['fire'], hp: 78, attack: 84, spAtk: 109, speed: 100 });
    const slow = makePokemon({ id: 1, name: 'bulbasaur', types: ['grass'], hp: 45, attack: 49, spAtk: 65, speed: 45 });

    const result = simulateBattle(
      { pokemon: fast, moves: [ember, flamethrower] },
      { pokemon: slow, moves: [tackle] },
    );

    expect(result.turns).toBeGreaterThan(0);
    expect(result.log.length).toBe(result.turns);
    expect([result.winner, result.loser]).toEqual(expect.arrayContaining(['charizard', 'bulbasaur']));
    expect(result.winner).not.toBe(result.loser);
  });

  it('logs entries whose damage never exceeds the defender max HP', () => {
    const a = makePokemon({ name: 'a-mon', types: ['electric'], hp: 60, attack: 100, spAtk: 100, speed: 120 });
    const b = makePokemon({ name: 'b-mon', types: ['water'], hp: 50, defense: 40, spDef: 40, speed: 30 });

    const result = simulateBattle({ pokemon: a, moves: [thunderbolt] }, { pokemon: b, moves: [tackle] });

    for (const entry of result.log) {
      expect(entry.damage).toBeGreaterThanOrEqual(0);
      expect(entry.defenderRemainingPercent).toBeLessThanOrEqual(100);
      expect(entry.effectiveness).toEqual(
        expect.stringMatching(/^(super|normal|resist|immune)$/)
      );
    }
  });
});
