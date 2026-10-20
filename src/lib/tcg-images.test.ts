import { describe, expect, it } from 'vitest';
import { getTCGCardImageCandidates, hasTCGCardImage } from './tcg-images';

describe('hasTCGCardImage', () => {
  it('recognizes the imageUrl fallback returned by the TCG API', () => {
    expect(hasTCGCardImage({ imageUrl: 'https://assets.tcgdex.net/en/me/me03/001' })).toBe(true);
  });

  it('recognizes a primary image', () => {
    expect(hasTCGCardImage({ image: 'https://assets.tcgdex.net/en/me/me03/001' })).toBe(true);
  });

  it('rejects cards without an image source', () => {
    expect(hasTCGCardImage({})).toBe(false);
  });
});

describe('getTCGCardImageCandidates', () => {
  it('keeps all image fallbacks in the selected printing language for binders', () => {
    const candidates = getTCGCardImageCandidates({ id: 'base1-4', image: 'https://assets.tcgdex.net/fr/base/base1/4' }, 'high', { allowLanguageFallback: false });
    expect(candidates).toEqual([
      'https://assets.tcgdex.net/fr/base/base1/4/high.webp',
      'https://assets.tcgdex.net/fr/base/base1/4/high.png',
      'https://assets.tcgdex.net/fr/base/base1/4/high.jpg',
      '/images/pokemon-card-back.webp',
    ]);
  });

  it('ends with the authentic Pokémon card-back asset as the terminal fallback', () => {
    const candidates = getTCGCardImageCandidates({ id: 'missing-card' });

    expect(candidates.at(-1)).toBe('/images/pokemon-card-back.webp');
  });

  it('builds a localized TCGdex image URL from the parent set when the card summary omits it', () => {
    const candidates = getTCGCardImageCandidates({
      id: 'mep-001',
      localId: '001',
      set: { id: 'mep', name: 'MEP Black Star Promos', serie: { id: 'me', name: 'Mega Evolution' } },
    }, 'high', { language: 'fr' });

    expect(candidates).toContain('https://assets.tcgdex.net/fr/me/mep/001/high.webp');
    expect(candidates).toContain('https://assets.tcgdex.net/en/me/mep/001/high.webp');
    expect(candidates.at(-1)).toBe('/images/pokemon-card-back.webp');
  });

  it('uses TCGplayer product images when the TCGdex image is unavailable', () => {
    const candidates = getTCGCardImageCandidates({
      id: 'mep-031',
      localId: '031',
      variants_detailed: [
        { type: 'Holo', thirdParty: { tcgplayer: 680480 } },
        { type: 'Holo', stamp: ['Pokémon Center'], thirdParty: { tcgplayer: 680481 } },
      ],
    });

    expect(candidates).toContain('https://tcgplayer-cdn.tcgplayer.com/product/680480_in_1000x1000.jpg');
    expect(candidates).toContain('https://tcgplayer-cdn.tcgplayer.com/product/680481_in_1000x1000.jpg');
  });
});
