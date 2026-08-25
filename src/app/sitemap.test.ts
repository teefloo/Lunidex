import { describe, expect, it } from 'vitest';
import {
  assertSitemapIntegrity,
  buildGuidesSitemapEntries,
  buildTcgLanguages,
  buildStaticSitemapEntries,
  deduplicateSitemapEntries,
  EDITORIAL_SITEMAP_ROUTES,
  LAUNCH_SITEMAP_ROUTES,
  renderSitemapIndex,
  renderUrlset,
  sitemapIndexUrls,
} from '@/lib/sitemap';

describe('launch sitemap routes', () => {
  it('keeps indexable product pages while excluding legal and pre-launch pages', () => {
    const paths = LAUNCH_SITEMAP_ROUTES.map((route) => route.path);

    expect(paths).toContain('tcg');
    expect(paths).toContain('30e-anniversaire');
    expect(paths).toContain('team');
    expect(paths).toContain('battle');
    expect(paths).toContain('nuzlocke');
    expect(paths).toContain('contact');
    expect(paths).toContain('compare/lunidex-vs-pokecardex-zebradex');
    expect(paths).toContain('guides/pokemon-card-collection-tracker');
    expect(paths).toContain('guides/team-builder-guide');
    expect(paths).toContain('guides/quiz-guide');
    expect(paths).toContain('guides/nuzlocke-guide');
    expect(paths).toContain('blog');
    expect(paths).not.toContain('early-access');
    expect(paths).not.toContain('privacy');
    expect(paths).not.toContain('terms');
    expect(paths).not.toContain('cookies');
    expect(paths).not.toContain('legal');
  });

  it('does not publish unsupported Chinese TCG alternates', () => {
    const languages = buildTcgLanguages('tcg/cards/A1-001');

    expect(languages.en).toBe('https://lunidex.app/en/tcg/cards/A1-001');
    expect(languages.fr).toBe('https://lunidex.app/fr/tcg/cards/A1-001');
    expect(languages.zh).toBeUndefined();
    expect(languages['x-default']).toBe(languages.en);
  });

  it('publishes the editorial wave with only its translated locales', () => {
    expect(EDITORIAL_SITEMAP_ROUTES).toContain('/compare/lunidex-vs-pokemon-database');
    expect(EDITORIAL_SITEMAP_ROUTES).toContain('/guides/tcg-workspace-guide');
  });

  it('removes duplicate URLs when launch and editorial routes overlap', () => {
    const entries = deduplicateSitemapEntries([
      { url: 'https://lunidex.app/en/guides/team-builder-guide', lastModified: '2026-08-18' },
      { url: 'https://lunidex.app/en/guides/team-builder-guide', lastModified: '2026-08-24' },
      { url: 'https://lunidex.app/en/faq' },
    ]);

    expect(entries).toHaveLength(2);
    expect(entries[0].lastModified).toBe('2026-08-24');
  });

  it('keeps guides out of the static family', () => {
    const urls = buildStaticSitemapEntries().map((entry) => entry.url);

    expect(urls).toContain('https://lunidex.app/en/tcg');
    expect(urls).not.toContain('https://lunidex.app/en/guides/team-builder-guide');
    expect(urls).not.toContain('https://lunidex.app/en/privacy');
  });

  it('publishes the anniversary landing only in English and French alternates', () => {
    const entry = buildStaticSitemapEntries().find((item) => item.url === 'https://lunidex.app/en/30e-anniversaire');

    expect(entry).toBeDefined();
    expect(entry?.alternates).toEqual({
      en: 'https://lunidex.app/en/30e-anniversaire',
      fr: 'https://lunidex.app/fr/30e-anniversaire',
      'x-default': 'https://lunidex.app/en/30e-anniversaire',
    });
    expect(entry?.lastModified).toBe('2026-08-26');
    expect(entry?.alternates).not.toHaveProperty('de');
  });

  it('renders a sitemap index and localized urlset without priority hints', () => {
    const index = renderSitemapIndex(sitemapIndexUrls());
    const urlset = renderUrlset([{
      url: 'https://lunidex.app/en/tcg',
      alternates: {
        en: 'https://lunidex.app/en/tcg',
        fr: 'https://lunidex.app/fr/tcg',
        'x-default': 'https://lunidex.app/en/tcg',
      },
    }]);

    expect(index).toContain('<sitemapindex');
    expect(index).toContain('https://lunidex.app/sitemaps/tcg-cards.xml');
    expect(urlset).toContain('xmlns:xhtml=');
    expect(urlset).toContain('hreflang="fr"');
    expect(urlset).not.toContain('<priority>');
  });

  it('keeps the guide family complete and locale-consistent', () => {
    const entries = buildGuidesSitemapEntries();

    expect(entries.length).toBeGreaterThan(5);
    expect(entries.every((entry) => entry.url.startsWith('https://lunidex.app/en/'))).toBe(true);
    expect(entries.every((entry) => Object.keys(entry.alternates ?? {}).sort().join(',') === 'en,fr,x-default')).toBe(true);
    expect(() => assertSitemapIntegrity(entries, 'guides')).not.toThrow();
  });
});
