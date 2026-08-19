import { describe, expect, it } from 'vitest';
import { buildTcgLanguages, LAUNCH_SITEMAP_ROUTES } from './sitemap';

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
});
