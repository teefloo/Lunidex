import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { getTCGSetOptionArtwork, TCGSetOptionLabel } from './TCGSetOptionLabel';

describe('TCGSetOptionLabel set artwork', () => {
  it('prefers the set logo and keeps the printed symbol as an image fallback', () => {
    const markup = renderToStaticMarkup(createElement(TCGSetOptionLabel, {
      setId: 'base2',
      name: 'Jungle',
      symbol: 'https://assets.tcgdex.net/univ/base/base2/symbol',
      logo: 'https://assets.tcgdex.net/fr/base/base2/logo',
    }));

    expect(markup).toContain('h-7 w-14');
    expect(markup).toContain('src="https://assets.tcgdex.net/fr/base/base2/logo.png"');
    const artwork = getTCGSetOptionArtwork({
      setId: 'base2',
      name: 'Jungle',
      symbol: 'https://assets.tcgdex.net/univ/base/base2/symbol',
      logo: 'https://assets.tcgdex.net/fr/base/base2/logo',
    });
    expect(artwork.kind).toBe('logo');
    expect(artwork.candidates[0]).toBe('https://assets.tcgdex.net/fr/base/base2/logo.png');
    expect(artwork.candidates).toContain('https://assets.tcgdex.net/univ/base/base2/symbol.png');
  });

  it('shows the logo when a set has no symbol', () => {
    const markup = renderToStaticMarkup(createElement(TCGSetOptionLabel, {
      setId: 'sm3.5',
      name: 'Légendes Brillantes',
      logo: 'https://assets.tcgdex.net/fr/sm/sm3.5/logo',
    }));

    expect(markup).toContain('h-7 w-14');
    expect(markup).toContain('src="https://assets.tcgdex.net/fr/sm/sm3.5/logo.png"');
    expect(markup).not.toContain('symbol.png');
    expect(getTCGSetOptionArtwork({
      setId: 'sm3.5',
      name: 'Légendes Brillantes',
      logo: 'https://assets.tcgdex.net/fr/sm/sm3.5/logo',
    })).toMatchObject({
      kind: 'logo',
      candidates: [
        'https://assets.tcgdex.net/fr/sm/sm3.5/logo.png',
        'https://assets.tcgdex.net/en/sm/sm3.5/logo.png',
        'https://assets.tcgdex.net/fr/sm/sm3.5/logo.webp',
        'https://assets.tcgdex.net/en/sm/sm3.5/logo.webp',
        'https://assets.tcgdex.net/fr/sm/sm3.5/logo.jpg',
        'https://assets.tcgdex.net/en/sm/sm3.5/logo.jpg',
      ],
    });
  });

  it('shows the logo and keeps the PFL badge for a modern set', () => {
    const set = {
      setId: 'me02',
      name: 'Flammes Fantasmagoriques',
      logo: 'https://assets.tcgdex.net/fr/me/me02/logo',
      symbol: 'https://assets.tcgdex.net/univ/me/me02/symbol',
    };
    const markup = renderToStaticMarkup(createElement(TCGSetOptionLabel, set));

    expect(markup).toContain('PFL');
    expect(markup).toContain('src="https://assets.tcgdex.net/fr/me/me02/logo.png"');
    expect(markup).toContain('h-7 w-14');
    expect(getTCGSetOptionArtwork(set).candidates[0]).toBe('https://assets.tcgdex.net/fr/me/me02/logo.png');
  });

  it('shows the logo and keeps the PBL badge for a modern set', () => {
    const set = {
      setId: 'me05',
      name: 'Nuit Noire',
      logo: 'https://assets.tcgdex.net/fr/me/me05/logo',
      symbol: 'https://assets.tcgdex.net/univ/me/me05/symbol',
    };
    const markup = renderToStaticMarkup(createElement(TCGSetOptionLabel, set));

    expect(markup).toContain('PBL');
    expect(markup).toContain('src="https://assets.tcgdex.net/fr/me/me05/logo.png"');
    expect(markup).toContain('h-7 w-14');
  });

  it('shows a square symbol when a set has no logo', () => {
    const markup = renderToStaticMarkup(createElement(TCGSetOptionLabel, {
      setId: 'basep',
      name: 'Wizards Black Star Promos',
      symbol: 'https://assets.tcgdex.net/univ/base/basep/symbol',
    }));

    expect(markup).toContain('h-7 w-7');
    expect(markup).toContain('src="https://assets.tcgdex.net/univ/base/basep/symbol.png"');
  });

  it('omits the artwork slot when a set has neither a symbol nor a logo', () => {
    const markup = renderToStaticMarkup(createElement(TCGSetOptionLabel, {
      setId: 'base1',
      name: 'Set de Base',
    }));

    expect(markup).not.toContain('<img');
    expect(markup).toContain('Set de Base');
    expect(getTCGSetOptionArtwork({ setId: 'base1', name: 'Set de Base' })).toEqual({ candidates: [], kind: null });
  });

  it.each([
    ['30th', '30ᵉ Anniversaire', 'fr', '/images/tcg-set-logos/30th-celebration-fr.webp'],
    ['30th', '30th Celebration', 'en', '/images/tcg-set-logos/30th-celebration-en.webp'],
    ['30th-c', 'Collection Classique 30ᵉ Anniversaire', 'fr', '/images/tcg-set-logos/30th-celebration-fr.webp'],
    ['B1a', 'Embrasement Écarlate', 'fr', '/images/tcg-set-logos/crimson-blaze-en.webp'],
    ['B2a', 'Merveilles de Paldea', 'fr', '/images/tcg-set-logos/paldean-wonders-en.webp'],
  ])('shows the sourced logo fallback for %s', (setId, name, language, imagePath) => {
    const markup = renderToStaticMarkup(createElement(TCGSetOptionLabel, {
      setId,
      name,
      language,
    }));
    const artwork = getTCGSetOptionArtwork({ setId, name, language });

    expect(markup).toContain(`src="${imagePath}"`);
    expect(markup).toContain('h-7 w-14');
    expect(artwork).toMatchObject({ kind: 'logo', candidates: [imagePath] });
  });
});
