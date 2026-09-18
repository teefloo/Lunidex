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
  it('ends with the authentic Pokémon card-back asset as the terminal fallback', () => {
    const candidates = getTCGCardImageCandidates({ id: 'missing-card' });

    expect(candidates.at(-1)).toBe('/images/pokemon-card-back.webp');
  });
});
