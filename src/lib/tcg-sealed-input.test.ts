import { describe, expect, it } from 'vitest';
import {
  formatSealedEuroInput,
  parseSealedEuroInput,
  sealedEuroPlaceholder,
} from './tcg-sealed-input';

describe('sealed EUR inputs', () => {
  it('accepts whole euros without requiring a decimal separator', () => {
    expect(parseSealedEuroInput('12')).toBe(1_200);
    expect(parseSealedEuroInput('12,50')).toBe(1_250);
    expect(parseSealedEuroInput('12.50')).toBe(1_250);
    expect(parseSealedEuroInput(',5')).toBe(50);
  });

  it('keeps empty fields at zero and rejects invalid precision', () => {
    expect(parseSealedEuroInput('')).toBe(0);
    expect(parseSealedEuroInput('   ')).toBe(0);
    expect(parseSealedEuroInput('12,345')).toBeNull();
    expect(parseSealedEuroInput('12,50,00')).toBeNull();
  });

  it('uses a locale-friendly edit value without forcing zero into the field', () => {
    expect(formatSealedEuroInput(0, 'fr')).toBe('');
    expect(formatSealedEuroInput(1_250, 'fr')).toBe('12,50');
    expect(formatSealedEuroInput(1_250, 'en')).toBe('12.50');
    expect(sealedEuroPlaceholder('fr')).toBe('0,00');
  });
});
