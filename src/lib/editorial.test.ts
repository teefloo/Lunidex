import { describe, expect, it } from 'vitest';

import {
  COMPETITOR_ARTICLES,
  COMPARISON_ROW_KEYS,
  FEATURE_GUIDES,
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

const competitorRequiredFields = [
  'name',
  'nav_label',
  'heading',
  'meta_title',
  'meta_description',
  'intro',
  'answer',
  'scope',
  'shared',
  'difference',
  'fit',
  'faq_q1',
  'faq_a1',
  'faq_q2',
  'faq_a2',
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

    expect(getEditorialDates('/guides/pokemon-card-collection-tracker').updatedAt).toBe('2026-09-15');
  });

  it('dates the generic intent guides and links the TCG guide to the collection hub', () => {
    for (const path of [
      '/guides/pokemon-reference-guide',
      '/guides/team-tools-guide',
      '/guides/tcg-workspace-guide',
    ]) {
      expect(getEditorialDates(path).updatedAt).toBe('2026-09-14');
    }

    expect(FEATURE_GUIDES.find((guide) => guide.slug === 'tcg-workspace-guide')?.relatedPaths).toEqual([
      '/guides/pokemon-card-collection-tracker',
    ]);
  });

  it('keeps English and French competitor copy complete', () => {
    const localeCompetitors = [
      en.translation.editorial.competitors,
      fr.translation.editorial.competitors,
    ] as unknown as Array<Record<string, Record<string, unknown>>>;

    for (const competitors of localeCompetitors) {
      for (const article of COMPETITOR_ARTICLES) {
        const copy = competitors[article.slug.replaceAll('-', '_')];
        expect(copy).toBeDefined();

        for (const field of competitorRequiredFields) {
          expect(copy?.[field]).toEqual(expect.any(String));
          expect(String(copy?.[field] ?? '').trim()).not.toBe('');
        }

        if (article.comparisonRows) {
          const matrix = copy?.matrix as Record<string, Record<string, unknown>> | undefined;
          expect(matrix).toBeDefined();
          for (const row of COMPARISON_ROW_KEYS) {
            expect(matrix?.[row]?.label).toEqual(expect.any(String));
            expect(matrix?.[row]?.lunidex).toEqual(expect.any(String));
            expect(matrix?.[row]?.competitor).toEqual(expect.any(String));
          }
        }
      }
    }

    for (const locale of localeCompetitors) {
      for (const slug of ['pokellector', 'cardzia']) {
        expect(locale[slug]?.faq_q1).toEqual(expect.any(String));
        expect(locale[slug]?.faq_a1).toEqual(expect.any(String));
        expect(locale[slug]?.faq_q2).toEqual(expect.any(String));
        expect(locale[slug]?.faq_a2).toEqual(expect.any(String));
      }
    }
  });
});
