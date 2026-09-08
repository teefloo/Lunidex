import { describe, expect, it } from 'vitest';

import { getTCGCategoryLabel, getTCGRarityLabel } from './tcg-labels';

const translate = (key: string, options?: { defaultValue?: string }) => ({
  'tcg.card_category_pokemon': 'Pokémon traduit',
  'tcg.unknown': 'Inconnu',
}[key] ?? options?.defaultValue ?? key);

describe('TCG visible labels', () => {
  it('localizes categories instead of exposing provider values', () => {
    expect(getTCGCategoryLabel('Pokemon', translate)).toBe('Pokémon traduit');
  });

  it('maps unknown provider rarity values to the translated unknown label', () => {
    expect(getTCGRarityLabel('UNKNOWN', translate)).toBe('Inconnu');
  });
});
