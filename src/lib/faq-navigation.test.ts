import { describe, expect, it } from 'vitest';
import en from './i18n/en';
import fr from './i18n/fr';
import es from './i18n/es';
import de from './i18n/de';
import itLocale from './i18n/it';
import ja from './i18n/ja';
import ko from './i18n/ko';
import zh from './i18n/zh';
import { FAQ_LINK_DEFINITIONS } from './faq-navigation';

describe('FAQ navigation destinations', () => {
  it('routes the mobile installation answer to its guide and keeps the offline answer separate', () => {
    expect(FAQ_LINK_DEFINITIONS.installation).toEqual({
      path: '/guides/progress-account-guide',
      labelKey: 'pwa.install_title',
    });
    expect(FAQ_LINK_DEFINITIONS.offline).toEqual({
      path: '/offline',
      labelKey: 'offline.title',
    });
  });

  it('uses the existing translated Cardmarket navigation label', () => {
    expect(FAQ_LINK_DEFINITIONS.cardmarket).toEqual({
      path: '/compare/lunidex-vs-cardmarket',
      labelKey: 'editorial.competitors.cardmarket.nav_label',
    });
    expect(fr.translation.editorial.competitors.cardmarket.nav_label).toBe('Lunidex face à Cardmarket');
    expect(en.translation.editorial.competitors.cardmarket.nav_label).toBe('Lunidex vs Cardmarket');
  });

  it('has an installation label in every supported locale', () => {
    const labels = [en, fr, es, de, itLocale, ja, ko, zh]
      .map(({ translation }) => translation.pwa.install_title);

    expect(labels).toHaveLength(8);
    expect(labels.every((label) => label.trim().length > 0)).toBe(true);
  });
});
