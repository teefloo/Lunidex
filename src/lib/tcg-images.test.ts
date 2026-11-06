import { describe, expect, it } from 'vitest';
import { getTCGCardImageCandidates, getTCGSetImageCandidates, hasTCGCardImage } from './tcg-images';

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

  it.each([
    ['mep-055', 709969],
    ['mep-056', 709970],
    ['mep-057', 709971],
  ])('uses the verified promo image for %s when language fallback is disabled', (id, productId) => {
    const candidates = getTCGCardImageCandidates({
      id,
      image: `https://assets.tcgdex.net/fr/me/mep/${id.slice(-3)}`,
    }, 'high', { allowLanguageFallback: false });

    expect(candidates).toContain(`https://tcgplayer-cdn.tcgplayer.com/product/${productId}_in_1000x1000.jpg`);
    expect(candidates).not.toContain(`https://assets.tcgdex.net/en/me/mep/${id.slice(-3)}/high.webp`);
  });

  it.each([
    ['mep-049', 699873],
    ['mep-050', 699874],
    ['mep-051', 699875],
  ])('uses the card-provided TCGplayer image for %s when language fallback is disabled', (id, productId) => {
    const candidates = getTCGCardImageCandidates({
      id,
      image: `https://assets.tcgdex.net/fr/me/mep/${id.slice(-3)}`,
      variants_detailed: [{ type: 'Holo', thirdParty: { tcgplayer: productId } }],
    }, 'high', { allowLanguageFallback: false });

    expect(candidates).toContain(`https://tcgplayer-cdn.tcgplayer.com/product/${productId}_in_1000x1000.jpg`);
    expect(candidates).not.toContain(`https://assets.tcgdex.net/en/me/mep/${id.slice(-3)}/high.webp`);
  });
});

describe('getTCGSetImageCandidates verified logo fallbacks', () => {
  it('selects the locale-appropriate 30th Celebration logo for the main and classic subsets', () => {
    expect(getTCGSetImageCandidates({ id: '30th', name: '30ᵉ Anniversaire' }, 'logo', { language: 'fr' }))
      .toEqual(['/images/tcg-set-logos/30th-celebration-fr.webp']);
    expect(getTCGSetImageCandidates({ id: '30th-c', name: 'Collection Classique 30ᵉ Anniversaire' }, 'logo', { language: 'en' }))
      .toEqual(['/images/tcg-set-logos/30th-celebration-en.webp']);
  });

  it('uses the sourced English Pocket logos for French catalog IDs with missing TCGdex metadata', () => {
    expect(getTCGSetImageCandidates({ id: 'B1a', name: 'Embrasement Écarlate' }, 'logo', { language: 'fr' }))
      .toEqual(['/images/tcg-set-logos/crimson-blaze-en.webp']);
    expect(getTCGSetImageCandidates({ id: 'B2a', name: 'Merveilles de Paldea' }, 'logo', { language: 'fr' }))
      .toEqual(['/images/tcg-set-logos/paldean-wonders-en.webp']);
  });

  it('does not invent assets for IDs with no verified source logo', () => {
    expect(getTCGSetImageCandidates({ id: 'base1', name: 'Set de Base' }, 'logo')).toEqual([]);
    expect(getTCGSetImageCandidates({ id: 'unknown', name: 'Unknown' }, 'logo')).toEqual([]);
  });
});
