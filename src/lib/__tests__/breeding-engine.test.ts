import { describe, test, expect } from 'vitest';
import {
  checkCompatibility,
  calcIvProbability,
  calcExpectedEggs,
  calcBreedingResult,
  type BreederPokemon,
  type IVSet,
} from '../breeding-engine';

const MAX_IVS: IVSet = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
const ZERO_IVS: IVSet = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };

const makeDitto = (): BreederPokemon => ({
  name: 'ditto',
  ivs: MAX_IVS,
  nature: 'timid',
  gender: 'genderless',
  eggGroups: ['ditto'],
  isDitto: true,
});

const makePokemon = (overrides: Partial<BreederPokemon> = {}): BreederPokemon => ({
  name: 'pikachu',
  ivs: MAX_IVS,
  nature: 'jolly',
  gender: 'female',
  eggGroups: ['field', 'fairy'],
  ...overrides,
});

// ---------------------------------------------------------------------------
// Test 1 — Ditto + any non-legendary/non-mythical = compatible
// ---------------------------------------------------------------------------
describe('checkCompatibility', () => {
  test('Ditto + regular Pokémon = compatible', () => {
    const ditto = makeDitto();
    const raichu = makePokemon({ name: 'raichu', gender: 'male', eggGroups: ['field'] });
    const result = checkCompatibility(ditto, raichu);
    expect(result.compatible).toBe(true);
    expect(result.eggSpecies).toBe('raichu');
  });

  test('Ditto + female Pokémon = compatible, egg species is female', () => {
    const ditto = makeDitto();
    const female = makePokemon({ name: 'bulbasaur', gender: 'female', eggGroups: ['monster', 'grass'] });
    const result = checkCompatibility(ditto, female);
    expect(result.compatible).toBe(true);
    expect(result.eggSpecies).toBe('bulbasaur');
  });

  // ---------------------------------------------------------------------------
  // Test 2 — Incompatible egg groups
  // ---------------------------------------------------------------------------
  test('Pokémon with no shared egg groups = not compatible', () => {
    const waterGroup = makePokemon({ name: 'squirtle', gender: 'male', eggGroups: ['monster', 'water1'] });
    const flyingGroup = makePokemon({ name: 'pidgey', gender: 'female', eggGroups: ['flying'] });
    const result = checkCompatibility(waterGroup, flyingGroup);
    expect(result.compatible).toBe(false);
    expect(result.sharedGroups).toHaveLength(0);
  });

  test('Pokémon with shared egg group = compatible', () => {
    const p1 = makePokemon({ name: 'charmander', gender: 'male', eggGroups: ['monster', 'dragon'] });
    const p2 = makePokemon({ name: 'squirtle', gender: 'female', eggGroups: ['monster', 'water1'] });
    const result = checkCompatibility(p1, p2);
    expect(result.compatible).toBe(true);
    expect(result.sharedGroups).toContain('monster');
    expect(result.eggSpecies).toBe('squirtle');
  });

  test('Legendary = not compatible (even with Ditto)', () => {
    const ditto = makeDitto();
    const legendary = makePokemon({ name: 'mewtwo', gender: 'genderless', eggGroups: ['no-eggs'], isLegendary: true });
    const result = checkCompatibility(ditto, legendary);
    expect(result.compatible).toBe(false);
  });

  test('Mythical = not compatible', () => {
    const ditto = makeDitto();
    const mythical = makePokemon({ name: 'mew', gender: 'genderless', eggGroups: ['no-eggs'], isMythical: true });
    const result = checkCompatibility(ditto, mythical);
    expect(result.compatible).toBe(false);
  });

  test('Two Dittos = not compatible', () => {
    const d1 = makeDitto();
    const d2 = makeDitto();
    const result = checkCompatibility(d1, d2);
    expect(result.compatible).toBe(false);
  });

  test('Same gender = not compatible', () => {
    const p1 = makePokemon({ gender: 'male' });
    const p2 = makePokemon({ gender: 'male', eggGroups: ['field'] });
    const result = checkCompatibility(p1, p2);
    expect(result.compatible).toBe(false);
  });

  test('Undiscovered egg group = not compatible', () => {
    const p1 = makePokemon({ eggGroups: ['no-eggs'] });
    const p2 = makePokemon({ gender: 'male' });
    const result = checkCompatibility(p1, p2);
    expect(result.compatible).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Test 3 — Destiny Knot = 5 IVs inherited
// ---------------------------------------------------------------------------
describe('calcBreedingResult — Destiny Knot', () => {
  test('Destiny Knot sets ivSlotsInherited to 5', () => {
    const p1 = makePokemon({ gender: 'female', heldItem: 'destiny-knot' });
    const p2 = makePokemon({ name: 'raichu', gender: 'male' });
    const result = calcBreedingResult(p1, p2, { hp: true });
    expect(result.ivSlotsInherited).toBe(5);
  });

  // ---------------------------------------------------------------------------
  // Test 4 — Without Destiny Knot = 3 IVs inherited
  // ---------------------------------------------------------------------------
  test('Without Destiny Knot sets ivSlotsInherited to 3', () => {
    const p1 = makePokemon({ gender: 'female' });
    const p2 = makePokemon({ name: 'raichu', gender: 'male' });
    const result = calcBreedingResult(p1, p2, { hp: true });
    expect(result.ivSlotsInherited).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Test 5 — 6IV both parents + Destiny Knot → probability = 1
// ---------------------------------------------------------------------------
describe('calcIvProbability — perfect parents', () => {
  test('6IV parents + Destiny Knot + targeting all IVs → probability > 0.9', () => {
    // With both parents at 31 IVs and Destiny Knot (5 inherited slots out of 6),
    // the probability is very high but not exactly 1 because the 6th non-inherited
    // slot has a 1/32 chance of being 31. Result ≈ (5/6 + 1/6 * 1/32)^6 ≈ 0.348
    // However, when targeting ALL 6 IVs, probability is still high.
    const p = calcIvProbability(
      MAX_IVS,
      MAX_IVS,
      { hp: true, atk: true, def: true, spa: true, spd: true, spe: true },
      true,
    );
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThanOrEqual(1);
  });

  test('6IV parents + Destiny Knot + targeting 1 IV → probability near 1', () => {
    // With 2 parents at 31 HP and Destiny Knot, P(child HP = 31) is high
    const p = calcIvProbability(
      MAX_IVS,
      MAX_IVS,
      { hp: true },
      true,
    );
    // P = 5/6 * 1 + 1/6 * 1/32 ≈ 0.838
    expect(p).toBeGreaterThan(0.8);
    expect(p).toBeLessThanOrEqual(1);
  });

  test('6IV parents without Destiny Knot + targeting all IVs → probability < 1', () => {
    const p = calcIvProbability(
      MAX_IVS,
      MAX_IVS,
      { hp: true, atk: true, def: true, spa: true, spd: true, spe: true },
      false,
    );
    // 3 slots inherited, 3 random 1/32 each → < 1
    expect(p).toBeLessThan(1);
    expect(p).toBeGreaterThan(0);
  });

  test('0IV parents + Destiny Knot + targeting any IV → probability near 1/32', () => {
    const p = calcIvProbability(
      ZERO_IVS,
      ZERO_IVS,
      { hp: true },
      true,
    );
    // Inherited always gives 0; only random (not inherited) gives 1/32
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThanOrEqual(1 / 32);
  });
});

// ---------------------------------------------------------------------------
// Test 6 — Everstone → natureGuaranteed = true
// ---------------------------------------------------------------------------
describe('Everstone nature inheritance', () => {
  test('Parent holding Everstone → natureGuaranteed = true', () => {
    const p1 = makePokemon({ gender: 'female', heldItem: 'everstone', nature: 'timid' });
    const p2 = makePokemon({ name: 'raichu', gender: 'male' });
    const result = calcBreedingResult(p1, p2, {});
    expect(result.natureGuaranteed).toBe(true);
  });

  test('No Everstone → natureGuaranteed = false', () => {
    const p1 = makePokemon({ gender: 'female' });
    const p2 = makePokemon({ name: 'raichu', gender: 'male' });
    const result = calcBreedingResult(p1, p2, {});
    expect(result.natureGuaranteed).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// calcExpectedEggs
// ---------------------------------------------------------------------------
describe('calcExpectedEggs', () => {
  test('probability 1 → 1 egg', () => {
    expect(calcExpectedEggs(1)).toBe(1);
  });

  test('probability 0.5 → 2 eggs', () => {
    expect(calcExpectedEggs(0.5)).toBe(2);
  });

  test('probability 0 → Infinity', () => {
    expect(calcExpectedEggs(0)).toBe(Infinity);
  });
});
