import { describe, expect, it } from 'vitest';
import {
  buildTcgLanguages,
  deduplicateSitemapEntries,
  EDITORIAL_SITEMAP_ROUTES,
  LAUNCH_SITEMAP_ROUTES,
} from './sitemap';

describe('launch sitemap routes', () => {
  it('keeps indexable product pages while excluding legal and pre-launch pages', () => {
    const paths = LAUNCH_SITEMAP_ROUTES.map((route) => route.path);

    expect(paths).toContain('tcg');
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
      { url: 'https://lunidex.app/en/guides/team-builder-guide', priority: 0.5 },
      { url: 'https://lunidex.app/en/guides/team-builder-guide', priority: 0.72 },
      { url: 'https://lunidex.app/en/faq', priority: 0.7 },
    ]);

    expect(entries).toHaveLength(2);
    expect(entries[0].priority).toBe(0.72);
  });
});
