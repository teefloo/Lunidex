import { describe, expect, it } from 'vitest';

import {
  COMPETITOR_ARTICLES,
  COMPARISON_ROW_KEYS,
  buildEditorialLanguages,
  getCompetitorArticle,
  getEditorialDates,
  isEditorialIndexable,
} from './editorial';

describe('editorial SEO registry', () => {
  it('registers the new source-backed competitor pages', () => {
    for (const slug of ['pokellector', 'cardzia']) {
      const article = getCompetitorArticle(slug);
      expect(article).toBeDefined();
      expect(article?.sources.length).toBeGreaterThan(0);
      expect(article?.sources.every((source) => source.url.startsWith('https://'))).toBe(true);
      expect(article?.comparisonRows).toEqual([...COMPARISON_ROW_KEYS]);
    }
  });

  it('keeps editorial paths unique and dated', () => {
    const paths = COMPETITOR_ARTICLES.map((article) => article.path);
    expect(new Set(paths).size).toBe(paths.length);
    expect(getEditorialDates('/compare/lunidex-vs-pokellector')).toEqual({
      publishedAt: '2026-09-14',
      updatedAt: '2026-09-14',
    });
    expect(getEditorialDates('/compare/lunidex-vs-cardzia')).toEqual({
      publishedAt: '2026-09-14',
      updatedAt: '2026-09-14',
    });
  });

  it('keeps the editorial locale policy explicit', () => {
    const path = '/compare/lunidex-vs-cardzia';
    expect(buildEditorialLanguages(path)).toEqual({
      en: '/en/compare/lunidex-vs-cardzia',
      fr: '/fr/compare/lunidex-vs-cardzia',
      'x-default': '/en/compare/lunidex-vs-cardzia',
    });
    expect(isEditorialIndexable('en')).toBe(true);
    expect(isEditorialIndexable('fr')).toBe(true);
    expect(isEditorialIndexable('de')).toBe(false);
  });

  it('connects TCG comparisons to the collection intent hub', () => {
    for (const slug of ['pokecardex', 'zebradex', 'collectr', 'pokellector', 'cardzia']) {
      const article = getCompetitorArticle(slug);
      expect(article?.relatedPaths).toEqual([
        '/guides/pokemon-card-collection-tracker',
        '/guides/tcg-workspace-guide',
      ]);
    }
  });
});
