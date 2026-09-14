import { describe, expect, it } from 'vitest';

import {
  COMPETITOR_ARTICLES,
  COMPARISON_ROW_KEYS,
  buildEditorialLanguages,
  getCompetitorArticle,
  getEditorialDates,
  isEditorialIndexable,
} from './editorial';
import de from './i18n/de';
import en from './i18n/en';
import es from './i18n/es';
import fr from './i18n/fr';
import itLocale from './i18n/it';
import ja from './i18n/ja';
import ko from './i18n/ko';
import zh from './i18n/zh';

const localizedCollectionGuides: Array<Record<string, string>> = [
  en.translation.collection_guide,
  fr.translation.collection_guide,
  es.translation.collection_guide,
  de.translation.collection_guide,
  itLocale.translation.collection_guide,
  ja.translation.collection_guide,
  ko.translation.collection_guide,
  zh.translation.collection_guide,
];

const collectionGuideMatrixKeys = [
  'matrix_title',
  'matrix_intro',
  'matrix_criterion',
  'matrix_lunidex',
  'matrix_catalog_value',
  'matrix_ownership_value',
  'matrix_progress_value',
  'matrix_sync_value',
  'matrix_scanner_label',
  'matrix_scanner_value',
  'matrix_market_label',
  'matrix_market_value',
  'matrix_platform_label',
  'matrix_platform_value',
  'cta_workspace',
  'cta_collectr',
  'cta_pokellector',
  'cta_cardzia',
] as const;

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

  it('keeps the collection matrix complete in every supported locale', () => {
    for (const guide of localizedCollectionGuides) {
      for (const key of collectionGuideMatrixKeys) {
        expect(guide[key]).toBeTruthy();
      }
    }

    expect(getEditorialDates('/guides/pokemon-card-collection-tracker').updatedAt).toBe('2026-09-14');
  });
});
