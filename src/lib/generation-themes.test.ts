import { describe, it, expect } from 'vitest';
import {
  GENERATION_THEMES,
  GEN_THEME_ORDER,
  getThemeForGeneration,
} from './generation-themes';
import type { GenerationTheme } from './generation-themes';

const REQUIRED_FIELDS: (keyof GenerationTheme)[] = [
  'id',
  'name',
  'game',
  'generation',
  'primaryColor',
  'accentColor',
  'bgColor',
  'textColor',
];

describe('GENERATION_THEMES', () => {
  it('every theme has all required fields with non-empty values', () => {
    for (const id of GEN_THEME_ORDER) {
      const theme = GENERATION_THEMES[id];
      for (const field of REQUIRED_FIELDS) {
        if (field === 'generation') {
          expect(
            theme[field],
            `${id}.${field} should be defined`,
          ).toBeDefined();
        } else {
          expect(
            theme[field],
            `${id}.${field} should be defined and non-empty`,
          ).toBeTruthy();
        }
      }
    }
  });

  it('contains exactly 10 themes (default + gen1–gen9)', () => {
    expect(GEN_THEME_ORDER).toHaveLength(10);
  });

  it('generation numbers are unique across non-default themes', () => {
    const gens = GEN_THEME_ORDER.filter((id) => id !== 'default').map(
      (id) => GENERATION_THEMES[id].generation,
    );
    const unique = new Set(gens);
    expect(unique.size).toBe(gens.length);
  });
});

describe('getThemeForGeneration', () => {
  it('returns the correct GenTheme for each generation 1–9', () => {
    const cases: [number, string][] = [
      [1, 'gen1'],
      [2, 'gen2'],
      [3, 'gen3'],
      [4, 'gen4'],
      [5, 'gen5'],
      [6, 'gen6'],
      [7, 'gen7'],
      [8, 'gen8'],
      [9, 'gen9'],
    ];

    for (const [gen, expected] of cases) {
      expect(getThemeForGeneration(gen)).toBe(expected);
    }
  });

  it('returns "default" as fallback for unknown generation numbers', () => {
    expect(getThemeForGeneration(0)).toBe('default');
    expect(getThemeForGeneration(99)).toBe('default');
    expect(getThemeForGeneration(-1)).toBe('default');
  });

  it('"default" theme has generation 0 and acts as fallback', () => {
    const defaultTheme = GENERATION_THEMES['default'];
    expect(defaultTheme.generation).toBe(0);
    expect(getThemeForGeneration(0)).toBe('default');
  });
});
