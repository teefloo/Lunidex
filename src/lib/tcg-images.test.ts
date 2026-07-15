import { describe, expect, it } from 'vitest';
import { getTCGCardImageCandidates } from './tcg-images';
import type { TCGCard } from '@/types/tcg';

describe('getTCGCardImageCandidates', () => {
  it('adds the Pokémon TCG API fallback for cards with an unavailable TCGdex image', () => {
    const card: TCGCard = {
      id: 'cel25-4A',
      localId: '4A',
      name: 'Charizard',
      set: { id: 'cel25', name: 'Celebrations' },
      imageUrl: 'https://assets.tcgdex.net/en/swsh/cel25/4A',
    };

    const candidates = getTCGCardImageCandidates(card);

    expect(candidates).toContain('https://images.pokemontcg.io/cel25/4A_hires.png');
    expect(candidates.at(-1)).toBe('/images/card-placeholder.svg');
  });
});
