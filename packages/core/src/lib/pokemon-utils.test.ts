import { describe, it, expect } from 'vitest';
import {
  TYPE_ICONS,
  getThemeColor,
  getTypeGradientStyle,
  getSimulatedRarity,
} from './pokemon-utils';

describe('TYPE_ICONS', () => {
  it('has an icon for all 18 types', () => {
    expect(Object.keys(TYPE_ICONS)).toHaveLength(18);
    expect(TYPE_ICONS.fire).toBeDefined();
    expect(TYPE_ICONS.fairy).toBeDefined();
  });
});

describe('getThemeColor', () => {
  it('returns a color for a known type', () => {
    expect(getThemeColor('fire')).toMatch(/^#/);
  });

  it('falls back to a default color for unknown types', () => {
    expect(getThemeColor('mystery')).toBe('#A8A77A');
  });
});

describe('getTypeGradientStyle', () => {
  it('returns a slate gradient for an empty type list', () => {
    const style = getTypeGradientStyle([]);
    expect(style.background).toContain('#94a3b8');
  });

  it('uses the same color twice for a single type', () => {
    const color = getThemeColor('water');
    const style = getTypeGradientStyle(['water']);
    expect(style.background).toBe(`linear-gradient(to bottom right, ${color}, ${color})`);
  });

  it('blends two colors for a dual type', () => {
    const style = getTypeGradientStyle(['fire', 'flying']);
    expect(style.background).toContain(getThemeColor('fire'));
    expect(style.background).toContain(getThemeColor('flying'));
  });
});

describe('getSimulatedRarity', () => {
  it('prioritizes mythical over everything', () => {
    expect(getSimulatedRarity({ id: 151, is_mythical: true, is_legendary: true })).toBe('rare secret');
  });

  it('treats legendary as rare ultra', () => {
    expect(getSimulatedRarity({ id: 150, is_legendary: true })).toBe('rare ultra');
  });

  it('grades by base stat total', () => {
    expect(getSimulatedRarity({ id: 1, stats: [100, 100, 100, 100, 100, 100] })).toBe('rare holo'); // 600
    expect(getSimulatedRarity({ id: 1, stats: [80, 80, 80, 80, 80, 80] })).toBe('rare'); // 480
    expect(getSimulatedRarity({ id: 1, stats: [70, 70, 70, 70, 50, 50] })).toBe('uncommon'); // 380
    expect(getSimulatedRarity({ id: 1, stats: [10, 10, 10, 10, 10, 10] })).toBe('common'); // 60
  });

  it('defaults to common when stats are absent', () => {
    expect(getSimulatedRarity({ id: 1 })).toBe('common');
  });

  it('uses inclusive thresholds at the boundaries', () => {
    expect(getSimulatedRarity({ id: 1, stats: [540, 0, 0, 0, 0, 0] })).toBe('rare holo');
    expect(getSimulatedRarity({ id: 1, stats: [480, 0, 0, 0, 0, 0] })).toBe('rare');
    expect(getSimulatedRarity({ id: 1, stats: [380, 0, 0, 0, 0, 0] })).toBe('uncommon');
  });
});
