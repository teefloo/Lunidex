import { describe, it, expect } from 'vitest';
import {
  buildBreadcrumbJsonLd,
  buildSubpathLanguages,
  buildInLanguage,
  localeHref,
  buildWebPageJsonLd,
  buildOrganizationJsonLd,
  buildDefinedTermJsonLd,
  DEFAULT_OG_IMAGE,
} from './seo';
import { GITHUB_REPO_URL, SITE_URL } from './site';
import { supportedLanguages } from '@/lib/languages';

describe('buildBreadcrumbJsonLd', () => {
  it('builds a position-ordered BreadcrumbList', () => {
    const ld = buildBreadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: 'Team', path: '/team' },
    ]);
    expect(ld['@type']).toBe('BreadcrumbList');
    expect(ld.itemListElement).toHaveLength(2);
    expect(ld.itemListElement[0].position).toBe(1);
    expect(ld.itemListElement[1].position).toBe(2);
  });

  it('prefixes the locale when provided', () => {
    const ld = buildBreadcrumbJsonLd([{ name: 'Home', path: '/' }], 'fr');
    expect(ld.itemListElement[0].item).toBe(`${SITE_URL}/fr`);
  });

  it('builds absolute URLs from the site origin', () => {
    const ld = buildBreadcrumbJsonLd([{ name: 'Team', path: '/team' }], 'de');
    expect(ld.itemListElement[0].item).toBe(`${SITE_URL}/de/team`);
  });
});

describe('buildSubpathLanguages', () => {
  it('produces an entry for every locale plus x-default', () => {
    const langs = buildSubpathLanguages('/tcg');
    expect(Object.keys(langs)).toHaveLength(supportedLanguages.length + 1);
    expect(langs.en).toBe('/en/tcg');
    expect(langs['x-default']).toBe('/en/tcg');
  });

  it('normalizes a path missing its leading slash', () => {
    const langs = buildSubpathLanguages('quiz');
    expect(langs.fr).toBe('/fr/quiz');
  });
});

describe('buildInLanguage', () => {
  it('returns the metadata locale for a language', () => {
    expect(buildInLanguage('ja')).toBe('ja-JP');
  });
});

describe('localeHref', () => {
  it('returns the locale root for "/"', () => {
    expect(localeHref('/', 'es')).toBe('/es');
  });

  it('prefixes the locale onto a subpath', () => {
    expect(localeHref('/compare', 'es')).toBe('/es/compare');
  });

  it('normalizes a path missing its leading slash', () => {
    expect(localeHref('favorites', 'it')).toBe('/it/favorites');
  });
});

describe('buildWebPageJsonLd', () => {
  it('uses the language metadata locale by default', () => {
    const ld = buildWebPageJsonLd({
      lang: 'en',
      path: '/en/about',
      name: 'About',
      description: 'About page',
    });
    expect(ld.inLanguage).toBe('en-US');
    expect(ld.headline).toBe('About');
    expect(ld['@id']).toBe(`${SITE_URL}/en/about#webpage`);
  });

  it('honors optional about/keywords/headline overrides', () => {
    const ld = buildWebPageJsonLd({
      lang: 'fr',
      path: '/fr/types',
      name: 'Types',
      headline: 'Type Chart',
      description: 'desc',
      about: 'Pokémon types',
      keywords: 'types, chart',
    });
    expect(ld.headline).toBe('Type Chart');
    expect(ld.about).toEqual({ '@type': 'Thing', name: 'Pokémon types' });
    expect(ld.keywords).toBe('types, chart');
  });

  it('omits optional fields when not provided', () => {
    const ld = buildWebPageJsonLd({
      lang: 'de',
      path: '/de/faq',
      name: 'FAQ',
      description: 'desc',
    });
    expect(ld).not.toHaveProperty('about');
    expect(ld).not.toHaveProperty('keywords');
  });
});

describe('DEFAULT_OG_IMAGE', () => {
  it('points to the selected 1200x630 Lunidex artwork', () => {
    expect(DEFAULT_OG_IMAGE).toMatchObject({
      url: '/og/lunidex-og.jpg',
      width: 1200,
      height: 630,
    });
  });
});

describe('buildOrganizationJsonLd', () => {
  it('publishes one stable Lunidex organization entity', () => {
    const ld = buildOrganizationJsonLd();

    expect(ld).toMatchObject({
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: 'Lunidex',
      url: SITE_URL,
      sameAs: [GITHUB_REPO_URL],
    });
    expect(ld.logo).toMatchObject({
      '@type': 'ImageObject',
      url: `${SITE_URL}/icon-512.png`,
    });
  });
});

describe('buildDefinedTermJsonLd', () => {
  it('links a reference term to its localized catalog and page', () => {
    const ld = buildDefinedTermJsonLd({
      lang: 'fr',
      path: '/fr/moves/thunderbolt',
      name: 'Tonnerre',
      description: 'A move description.',
      identifier: 85,
      setName: 'Moves',
      setPath: '/moves',
      additionalProperty: [{ name: 'Power', value: 90 }],
    });

    expect(ld).toMatchObject({
      '@type': 'DefinedTerm',
      '@id': `${SITE_URL}/fr/moves/thunderbolt#term`,
      url: `${SITE_URL}/fr/moves/thunderbolt`,
      inLanguage: 'fr-FR',
      identifier: '85',
      termCode: '85',
      inDefinedTermSet: {
        '@type': 'DefinedTermSet',
        url: `${SITE_URL}/fr/moves`,
      },
    });
    expect(ld.additionalProperty).toEqual([
      { '@type': 'PropertyValue', name: 'Power', value: 90 },
    ]);
  });
});
