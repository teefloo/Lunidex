import { describe, expect, it } from 'vitest';
import { getTCGCardImageCandidates, getTCGSetImageCandidates } from './tcg-images';
import type { TCGCard } from '@/types/tcg';

describe('getTCGCardImageCandidates', () => {
  it('does not replace a TCGdex image with a generic Pokémon card back', () => {
    const card: TCGCard = {
      id: 'cel25-4A',
      localId: '4A',
      name: 'Charizard',
      set: { id: 'cel25', name: 'Celebrations' },
      imageUrl: 'https://assets.tcgdex.net/en/swsh/cel25/4A',
    };

    const candidates = getTCGCardImageCandidates(card);

    expect(candidates).not.toContain('https://images.pokemontcg.io/cel25/4A_hires.png');
    expect(candidates.at(-1)).toBe('/images/card-placeholder.svg');
  });

  it('tries the localized TCGdex asset before the English fallback', () => {
    const card: TCGCard = {
      id: 'me1-001',
      localId: '001',
      name: 'Tropius',
      image: 'https://assets.tcgdex.net/fr/me/me1/001',
    };

    const candidates = getTCGCardImageCandidates(card);

    expect(candidates[0]).toBe('https://assets.tcgdex.net/fr/me/me1/001/high.webp');
    expect(candidates[1]).toBe('https://assets.tcgdex.net/en/me/me1/001/high.webp');
  });

  it('uses low-resolution candidates for collection thumbnails', () => {
    const card: TCGCard = {
      id: 'me1-001',
      localId: '001',
      name: 'Tropius',
      image: 'https://assets.tcgdex.net/fr/me/me1/001',
    };

    const candidates = getTCGCardImageCandidates(card, 'low');

    expect(candidates[0]).toBe('https://assets.tcgdex.net/fr/me/me1/001/low.webp');
    expect(candidates).not.toContain('https://assets.tcgdex.net/fr/me/me1/001/high.webp');
  });

  it('uses only the placeholder when a legacy set has no artwork', () => {
    const card: TCGCard = {
      id: '2011bw-1',
      localId: '1',
      name: 'Snivy',
      set: { id: '2011bw', name: "McDonald's Collection 2011" },
    };

    expect(getTCGCardImageCandidates(card)).toEqual(['/images/card-placeholder.svg']);
  });

  it('provides an English fallback for localized set logos', () => {
    const candidates = getTCGSetImageCandidates({
      id: 'me1',
      name: 'Nuit Noire',
      logo: 'https://assets.tcgdex.net/fr/me/me1/logo.png',
    });

    expect(candidates[0]).toBe('https://assets.tcgdex.net/fr/me/me1/logo.png');
    expect(candidates[1]).toBe('https://assets.tcgdex.net/en/me/me1/logo.png');
    expect(candidates).not.toContain('https://assets.tcgdex.net/fr/me/me1/logo/high.png');
    expect(candidates).not.toContain('https://assets.tcgdex.net/fr/me/me1/logo/logo.png');
  });
});
