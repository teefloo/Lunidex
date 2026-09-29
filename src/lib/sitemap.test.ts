import { describe, expect, it } from 'vitest';

import {
  SITEMAP_FILE_DESCRIPTORS,
  SITEMAP_MAX_URLS,
  assertSitemapIntegrity,
  buildGuidesSitemapEntries,
  buildPokemonSitemapEntries,
  buildStaticSitemapEntries,
  buildTcgCardSitemapEntries,
  renderUrlset,
  splitSitemapEntries,
  validateSitemapDocumentSize,
} from './sitemap';

describe('localized sitemaps', () => {
  it('lists the localized URL itself in each page alternate set', () => {
    const entries = buildPokemonSitemapEntries([{ name: 'pikachu', url: 'ignored' }], 'fr');

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      url: 'https://lunidex.app/fr/pokemon/pikachu',
      alternates: {
        fr: 'https://lunidex.app/fr/pokemon/pikachu',
        en: 'https://lunidex.app/en/pokemon/pikachu',
        'x-default': 'https://lunidex.app/en/pokemon/pikachu',
      },
    });
    expect(renderUrlset(entries)).toContain('hreflang="fr" href="https://lunidex.app/fr/pokemon/pikachu"');
  });

  it('includes all translated legacy guides and only translated editorial variants', () => {
    const frenchGuides = buildGuidesSitemapEntries('fr');
    const germanGuides = buildGuidesSitemapEntries('de');

    expect(frenchGuides.some((entry) => entry.url.endsWith('/fr/guides/pokemon-card-collection-tracker'))).toBe(true);
    expect(frenchGuides.some((entry) => entry.url.endsWith('/fr/guides/organize-pokemon-card-collection'))).toBe(true);
    expect(germanGuides.some((entry) => entry.url.endsWith('/de/guides/pokemon-card-collection-tracker'))).toBe(true);
    expect(germanGuides.some((entry) => entry.url.endsWith('/de/guides/organize-pokemon-card-collection'))).toBe(false);
  });

  it('keeps every static locale entry aligned with its indexable alternates', () => {
    const english = buildStaticSitemapEntries('en');
    const french = buildStaticSitemapEntries('fr');

    expect(english.some((entry) => entry.url.endsWith('/en/about'))).toBe(true);
    expect(french.some((entry) => entry.url.endsWith('/fr/about'))).toBe(true);
    expect(french.some((entry) => entry.url.endsWith('/fr/30e-anniversaire'))).toBe(true);
    expect(buildStaticSitemapEntries('de').some((entry) => entry.url.endsWith('/de/30e-anniversaire'))).toBe(false);
    expect(french.find((entry) => entry.url.endsWith('/fr/30e-anniversaire'))?.alternates).toEqual({
      en: 'https://lunidex.app/en/30e-anniversaire',
      fr: 'https://lunidex.app/fr/30e-anniversaire',
      'x-default': 'https://lunidex.app/en/30e-anniversaire',
    });
  });

  it('includes every indexable TCG card locale and four stable sitemap fragments', () => {
    const entries = buildTcgCardSitemapEntries(['base1-1', 'base1-2', 'base1-3', 'base1-4'], 'zh');
    const descriptors = SITEMAP_FILE_DESCRIPTORS.filter((descriptor) => descriptor.family === 'tcg-cards');

    expect(entries[0]?.url).toBe('https://lunidex.app/zh/tcg/cards/base1-1');
    expect(entries[0]?.alternates?.zh).toBe('https://lunidex.app/zh/tcg/cards/base1-1');
    expect(descriptors).toHaveLength(32);
    expect(descriptors.filter((descriptor) => descriptor.language === 'en').map(({ id }) => id)).toEqual([
      'tcg-cards',
      'tcg-cards-2',
      'tcg-cards-3',
      'tcg-cards-4',
    ]);
    expect(SITEMAP_FILE_DESCRIPTORS.some(({ id }) => id === 'pokemon-ko')).toBe(true);
  });

  it('splits sitemap entries into deterministic, non-overlapping chunks', () => {
    const entries = Array.from({ length: 11 }, (_, index) => ({ url: `https://lunidex.app/en/pokemon/${index}` }));
    const chunks = splitSitemapEntries(entries, 4);

    expect(chunks.map((chunk) => chunk.length)).toEqual([3, 3, 3, 2]);
    expect(chunks.flat().map(({ url }) => url)).toEqual(entries.map(({ url }) => url));
  });

  it('rejects localized private routes from public sitemaps', () => {
    expect(() => assertSitemapIntegrity([
      { url: 'https://lunidex.app/fr/tcg/collection' },
    ], 'static')).toThrow(/Private URL/);
    expect(() => assertSitemapIntegrity([
      { url: 'https://lunidex.app/en/tcg/sealed/products/123' },
    ], 'static')).toThrow(/Private URL/);
    expect(() => assertSitemapIntegrity([
      { url: 'https://lunidex.app/en/tcg/sealed/market/products/123', alternates: { en: 'https://lunidex.app/en/tcg/sealed/market/products/123' } },
    ], 'sealed-products')).not.toThrow();
  });

  it('enforces both sitemap protocol limits', () => {
    expect(() => validateSitemapDocumentSize(SITEMAP_MAX_URLS + 1, 100)).toThrow(/50,000/);
    expect(() => validateSitemapDocumentSize(1, 50 * 1024 * 1024 + 1)).toThrow(/50 MB/);
    expect(() => validateSitemapDocumentSize(SITEMAP_MAX_URLS, 50 * 1024 * 1024)).not.toThrow();
  });
});
