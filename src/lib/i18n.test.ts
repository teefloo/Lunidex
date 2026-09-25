import { describe, expect, it } from 'vitest';

import {
  createClientI18n,
  isLanguageBundlePartial,
  loadLanguage,
} from './i18n';
import { getInitialClientTranslations } from './server-i18n';

const locales = ['en', 'fr', 'es', 'de', 'it', 'ja', 'ko', 'zh'] as const;

describe('deferred client translations for TCG card details', () => {
  it.each(locales)('hydrates the full %s bundle after rendering its initial selection', async (locale) => {
    const initial = getInitialClientTranslations(locale, `/${locale}/tcg/cards/sv01-001`);
    const instance = createClientI18n(locale, initial.translations, {
      initialTranslationsPartial: initial.partial,
    });

    expect(initial.partial).toBe(true);
    expect(isLanguageBundlePartial(instance, locale)).toBe(true);
    expect(instance.getResource(locale, 'translation', 'pokedex_page')).toBeUndefined();
    const initialMarketPrice = instance.getResource(locale, 'translation', 'tcg.market_price');
    expect(initialMarketPrice).toBeDefined();

    await loadLanguage(instance, locale);

    expect(isLanguageBundlePartial(instance, locale)).toBe(false);
    expect(instance.getResource(locale, 'translation', 'pokedex_page')).toBeDefined();
    expect(instance.getResource(locale, 'translation', 'tcg.market_price')).toBe(initialMarketPrice);
  });
});
