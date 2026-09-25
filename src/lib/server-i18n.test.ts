import { describe, expect, it } from 'vitest';

import {
  getInitialClientTranslations,
  getServerTranslations,
} from './server-i18n';

const locales = ['en', 'fr', 'es', 'de', 'it', 'ja', 'ko', 'zh'] as const;

describe('initial client translations for TCG card details', () => {
  it.each(locales)('keeps the first-render namespaces and reduces the %s payload', (locale) => {
    const selection = getInitialClientTranslations(locale, `/${locale}/tcg/cards/sv01-001`);
    const full = getServerTranslations(locale);

    expect(selection.partial).toBe(true);
    expect(selection.translations).toMatchObject({
      common: expect.any(Object),
      nav: expect.any(Object),
      tcg: full.tcg,
      stats: full.stats,
      detail: full.detail,
    });
    expect(JSON.stringify(selection.translations).length)
      .toBeLessThan(JSON.stringify(full).length * 0.5);
  });

  it.each([
    '/en/tcg/cards',
    '/en/tcg/cards/id/extra',
    '/tcg/cards/sv01-001',
    '/en/tcg/sets/sv01',
  ])('does not select the TCG detail bundle for %s', (pathname) => {
    expect(getInitialClientTranslations('en', pathname).partial).toBe(false);
  });
});
