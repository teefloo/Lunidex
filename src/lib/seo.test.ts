import { describe, expect, it } from 'vitest';

import {
  buildArticleJsonLd,
  buildCreatorJsonLd,
  buildOrganizationJsonLd,
} from './seo';

describe('SEO entity graph', () => {
  it('exposes the verified Lunidex creator and connects the organization', () => {
    const creator = buildCreatorJsonLd();
    const organization = buildOrganizationJsonLd();

    expect(creator).toMatchObject({
      '@type': 'Person',
      '@id': 'https://lunidex.app/#person-esteban-deloge',
      name: 'Esteban Deloge',
      sameAs: ['https://github.com/teefloo'],
    });
    expect(organization).toMatchObject({
      founder: { '@id': 'https://lunidex.app/#person-esteban-deloge' },
    });
  });

  it('attributes editorial articles to the creator and publishes them through Lunidex', () => {
    const article = buildArticleJsonLd({
      lang: 'en',
      path: '/en/guides/example',
      name: 'Example guide',
      headline: 'Example guide',
      description: 'Example description',
      datePublished: '2026-09-21',
      dateModified: '2026-09-21',
    });

    expect(article.author).toEqual({ '@id': 'https://lunidex.app/#person-esteban-deloge' });
    expect(article.publisher).toEqual({ '@id': 'https://lunidex.app/#organization' });
  });
});
