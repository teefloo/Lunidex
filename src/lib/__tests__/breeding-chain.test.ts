import { describe, expect, it } from 'vitest';
import {
  getIvBreakdown,
  getEggMoves,
  suggestBreedingChain,
  type IVSet,
} from '../breeding-engine';

const perfectIvs: IVSet = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
const mediocreIvs: IVSet = { hp: 12, atk: 20, def: 5, spa: 31, spd: 8, spe: 15 };

describe('getIvBreakdown', () => {
  it('marks the power-item stat as guaranteed from the holding parent', () => {
    const breakdown = getIvBreakdown(perfectIvs, mediocreIvs, false, 'power-weight');

    const hpSlot = breakdown.find((slot) => slot.stat === 'hp');
    expect(hpSlot).toMatchObject({ source: 'parent1', guaranteed: true, value: 31 });
  });

  it('marks one guaranteed slot per held power item', () => {
    const breakdown = getIvBreakdown(
      { hp: 10, atk: 10, def: 10, spa: 10, spd: 10, spe: 10 },
      { hp: 20, atk: 20, def: 20, spa: 20, spd: 20, spe: 20 },
      false,
      'power-weight',
      'power-bracer',
    );

    // parent1 is consulted first, so its power item wins the shared slot.
    expect(breakdown.find((s) => s.stat === 'hp')).toMatchObject({ source: 'parent1', guaranteed: true });
    expect(breakdown.find((s) => s.stat === 'atk')).toMatchObject({ source: 'parent2', guaranteed: true });
    expect(breakdown.filter((s) => s.guaranteed)).toHaveLength(2);
  });

  it('shows the best possible parent for non-guaranteed slots', () => {
    const breakdown = getIvBreakdown(mediocreIvs, perfectIvs, true);

    for (const slot of breakdown) {
      if (slot.guaranteed) continue;
      // Without a matching power item, the slot reports the higher IV parent.
      expect(slot.value).toBe(Math.max(mediocreIvs[slot.stat], perfectIvs[slot.stat]));
    }
    // Destiny knot inherits five slots but guarantees none by itself.
    expect(breakdown).toHaveLength(6);
  });
});

describe('getEggMoves', () => {
  it('maps each move to its known source species and defaults to an empty list', () => {
    const result = getEggMoves(['dragon-dance', 'outrage'], {
      'dragon-dance': ['gyarados', 'altaria'],
    });

    expect(result).toEqual([
      { name: 'dragon-dance', sourceSpecies: ['gyarados', 'altaria'] },
      { name: 'outrage', sourceSpecies: [] },
    ]);
  });
});

describe('suggestBreedingChain', () => {
  it('returns no steps when there is nothing to breed onto the target', () => {
    expect(suggestBreedingChain('charizard', [], {})).toEqual([]);
  });

  it('produces one step per source group with accumulated moves', () => {
    const steps = suggestBreedingChain('charizard', ['dragon-dance', 'flare-blink'], {
      'dragon-dance': ['gyarados'],
      'flare-blink': ['typhlosion'],
    });

    expect(steps.length).toBe(2);
    expect(steps[0].step).toBe(1);
    expect(steps[steps.length - 1].targetMoves).toHaveLength(2);
    for (const step of steps) {
      expect(step.note).toContain('charizard');
    }
  });
});
