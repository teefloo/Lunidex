import { describe, expect, it } from 'vitest';

import {
  MAX_OG_POKEMON_NAME_LENGTH,
  MAX_OG_TCG_CARD_ID_LENGTH,
  normalizeOgEnum,
  normalizeOgPokemonName,
  normalizeOgTcgCardId,
  parseOgInteger,
  sanitizeOgText,
} from './input';
import { getTrustedOgImageUrl, isTrustedOgFontUrl } from './assets';

describe('OG input hardening', () => {
  it('accepts normal Pokémon slugs and rejects path/control characters', () => {
    expect(normalizeOgPokemonName('Mr-Mime')).toBe('mr-mime');
    expect(normalizeOgPokemonName('../etc/passwd')).toBeNull();
    expect(normalizeOgPokemonName('a'.repeat(MAX_OG_POKEMON_NAME_LENGTH + 1))).toBeNull();
  });

  it('accepts URL-safe TCG card IDs without allowing path separators', () => {
    expect(normalizeOgTcgCardId(' SV-BASE-1 ')).toBe('sv-base-1');
    expect(normalizeOgTcgCardId('sv-base/1')).toBeNull();
    expect(normalizeOgTcgCardId('a'.repeat(MAX_OG_TCG_CARD_ID_LENGTH + 1))).toBeNull();
  });

  it('bounds numbers and enum values before they reach the renderer', () => {
    expect(parseOgInteger('9999', 10, 1, 999)).toBe(10);
    expect(parseOgInteger('12', 10, 1, 999)).toBe(12);
    expect(normalizeOgEnum('TIME-ATTACK', ['marathon', 'time-attack'] as const, 'marathon')).toBe('time-attack');
    expect(normalizeOgEnum('unexpected', ['marathon', 'time-attack'] as const, 'marathon')).toBe('marathon');
  });

  it('removes control characters while retaining bounded display text', () => {
    expect(sanitizeOgText(' Ash\n\u0000 ', 'Trainer', 24)).toBe('Ash');
    expect(sanitizeOgText('', 'Trainer', 24)).toBe('Trainer');
  });

  it('allows only fixed HTTPS image and font hosts', () => {
    expect(getTrustedOgImageUrl('https://raw.githubusercontent.com/PokeAPI/sprites/1.png')).toContain('raw.githubusercontent.com');
    expect(getTrustedOgImageUrl('https://attacker.example/image.png')).toBe('');
    expect(getTrustedOgImageUrl('http://raw.githubusercontent.com/PokeAPI/sprites/1.png')).toBe('');
    expect(isTrustedOgFontUrl('https://fonts.gstatic.com/s/noto/v1/font.ttf')).toBe(true);
    expect(isTrustedOgFontUrl('https://attacker.example/font.ttf')).toBe(false);
  });
});
