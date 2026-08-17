import { describe, expect, it } from 'vitest';
import type { MoveDetail } from '@/types/move';
import {
  getLocalizedMoveEffectEntry,
  getLocalizedMoveFlavorText,
  getLocalizedMoveName,
} from './move-seo';

const move: MoveDetail = {
  id: 85,
  name: 'thunderbolt',
  names: [
    { name: 'Thunderbolt', language: { name: 'en' } },
    { name: 'Tonnerre', language: { name: 'fr' } },
  ],
  accuracy: 100,
  effect_chance: 10,
  pp: 15,
  priority: 0,
  power: 90,
  damage_class: { name: 'special' },
  type: { name: 'electric' },
  generation: { name: 'generation-i' },
  effect_entries: [
    { effect: 'May paralyze.', short_effect: 'May paralyze.', language: { name: 'en' } },
    { effect: 'Peut paralyser.', short_effect: 'Peut paralyser.', language: { name: 'fr' } },
  ],
  flavor_text_entries: [
    { flavor_text: 'A strong electric blast.\nMay paralyze.', language: { name: 'en' }, version_group: { name: 'red-blue' } },
    { flavor_text: 'Une puissante décharge électrique.', language: { name: 'fr' }, version_group: { name: 'x-y' } },
  ],
  learned_by_pokemon: [],
  machines: [],
};

describe('localized move SEO data', () => {
  it('uses the localized name and effect when available', () => {
    expect(getLocalizedMoveName(move, 'fr')).toBe('Tonnerre');
    expect(getLocalizedMoveEffectEntry(move, 'fr')?.short_effect).toBe('Peut paralyser.');
    expect(getLocalizedMoveFlavorText(move, 'fr')).toBe('Une puissante décharge électrique.');
  });

  it('falls back to English when a locale is unavailable', () => {
    expect(getLocalizedMoveName(move, 'ja')).toBe('Thunderbolt');
    expect(getLocalizedMoveEffectEntry(move, 'ja')?.short_effect).toBe('May paralyze.');
    expect(getLocalizedMoveFlavorText(move, 'ja')).toBe('A strong electric blast. May paralyze.');
  });
});
