import { describe, expect, it } from 'vitest';
import { cleanItemText, getItemDescription, getItemEffectDescription } from './item-description';

describe('item descriptions', () => {
  it('normalizes line breaks and form-feed characters', () => {
    expect(cleanItemText('Restores\n 20 HP.\f')).toBe('Restores  20 HP.');
  });

  it('uses the long effect when the short effect is unavailable', () => {
    expect(getItemDescription({
      pokemon_v2_itemeffecttexts: [{ short_effect: '', effect: 'Restores 20 HP.' }],
      pokemon_v2_itemflavortexts: [],
    })).toBe('Restores 20 HP.');
  });

  it('uses the short effect for compact descriptions', () => {
    const item = {
      pokemon_v2_itemeffecttexts: [{ short_effect: 'Restores HP.', effect: 'Restores a moderate amount of HP.' }],
      pokemon_v2_itemflavortexts: [],
    };

    expect(getItemDescription(item)).toBe('Restores HP.');
    expect(getItemEffectDescription(item)).toBe('Restores a moderate amount of HP.');
  });

  it('falls back to flavor text when no effect text exists', () => {
    const item = {
      pokemon_v2_itemeffecttexts: [],
      pokemon_v2_itemflavortexts: [{ flavor_text: 'A mysterious item.' }],
    };

    expect(getItemEffectDescription(item)).toBe('');
    expect(getItemDescription(item)).toBe('A mysterious item.');
  });
});
