import { describe, expect, it } from 'vitest';

import en from './i18n/en';
import fr from './i18n/fr';
import {
  COMPETITOR_ARTICLES,
  EDITORIAL_ARTICLE_DATES,
  EDITORIAL_INDEXABLE_LOCALES,
  FEATURE_GUIDES,
  buildEditorialLanguages,
} from './editorial';

describe('editorial content inventory', () => {
  it('keeps one dedicated article route per retained competitor', () => {
    const slugs = COMPETITOR_ARTICLES.map(({ slug }) => slug);
    const paths = COMPETITOR_ARTICLES.map(({ path }) => path);

    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(paths).size).toBe(paths.length);
    expect(COMPETITOR_ARTICLES).toHaveLength(6);
  });

  it('keeps feature guides grouped by distinct product workflows', () => {
    expect(FEATURE_GUIDES).toHaveLength(4);
    expect(new Set(FEATURE_GUIDES.map(({ path }) => path)).size).toBe(FEATURE_GUIDES.length);
    expect(FEATURE_GUIDES.flatMap(({ productPaths }) => productPaths)).toEqual(
      expect.arrayContaining([
        '/pokedex',
        '/types',
        '/moves',
        '/abilities',
        '/items',
        '/team',
        '/compare',
        '/ev-iv',
        '/breeding',
        '/battle',
        '/tcg',
        '/tcg/start',
        '/tcg/collection',
        '/tcg/wishlist',
        '/tcg/deck-builder',
        '/dashboard',
        '/favorites',
        '/friends',
      ]),
    );
  });

  it('assigns a unique publication date to every blog article', () => {
    const articlePaths = [
      '/guides/pokemon-card-collection-tracker',
      '/guides/team-builder-guide',
      '/guides/quiz-guide',
      '/guides/nuzlocke-guide',
      '/compare/lunidex-vs-pokecardex-zebradex',
      ...COMPETITOR_ARTICLES.map(({ path }) => path),
      ...FEATURE_GUIDES.map(({ path }) => path),
    ];
    const dateEntries = Object.entries(EDITORIAL_ARTICLE_DATES);
    const publishedDates = dateEntries.map(([, dates]) => dates.publishedAt);

    expect(dateEntries.map(([path]) => path).sort()).toEqual(articlePaths.sort());
    expect(new Set(publishedDates).size).toBe(publishedDates.length);
    for (const [, dates] of dateEntries) {
      expect(dates.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(dates.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(dates.publishedAt <= dates.updatedAt).toBe(true);
    }
  });

  it('publishes hreflang only for fully translated editorial locales', () => {
    expect(EDITORIAL_INDEXABLE_LOCALES).toEqual(['en', 'fr']);
    expect(buildEditorialLanguages('/guides/tcg-workspace-guide')).toEqual({
      en: '/en/guides/tcg-workspace-guide',
      fr: '/fr/guides/tcg-workspace-guide',
      'x-default': '/en/guides/tcg-workspace-guide',
    });
  });

  it('provides the core answer and metadata fields in both editorial locales', () => {
    const locales = [en.translation, fr.translation];
    for (const locale of locales) {
      for (const article of COMPETITOR_ARTICLES) {
        const key = article.slug.replaceAll('-', '_') as keyof typeof locale.editorial.competitors;
        const content = locale.editorial.competitors[key];
        expect(content.heading).toBeTruthy();
        expect(content.meta_description).toBeTruthy();
        expect(content.answer).toBeTruthy();
      }
      for (const guide of FEATURE_GUIDES) {
        const key = guide.slug.replace(/-guide$/, '').replaceAll('-', '_') as keyof typeof locale.editorial.guides;
        const content = locale.editorial.guides[key];
        expect(content.heading).toBeTruthy();
        expect(content.meta_description).toBeTruthy();
        expect(content.answer).toBeTruthy();
      }
    }
  });
});
