import { describe, expect, it } from 'vitest';
import { tcgInvestmentsTranslations } from './tcg-investments';
import en from './en';
import fr from './fr';
import es from './es';
import de from './de';
import itBundle from './it';
import ja from './ja';
import ko from './ko';
import zh from './zh';

describe('investment translations', () => {
  it('keeps all eight locales complete with matching interpolation variables', () => {
    for (const labels of Object.values(tcgInvestmentsTranslations)) {
      expect(Object.keys(labels).sort()).toEqual(Object.keys(tcgInvestmentsTranslations.en).sort());
      for (const [key, value] of Object.entries(labels)) {
        expect(value.trim()).not.toBe('');
        expect(value.match(/\{\{\w+\}\}/g)?.sort()).toEqual(tcgInvestmentsTranslations.en[key as keyof typeof labels].match(/\{\{\w+\}\}/g)?.sort());
      }
    }
  });

  it('provides actionable purchase feedback and the history qualification explanation in every bundle', () => {
    const bundles = { en, fr, es, de, it: itBundle, ja, ko, zh };
    const required = [
      'choose_finish', 'reference_loading', 'reference_error', 'reference_special', 'reference_source_missing',
      'detail_optional', 'known_editions', 'reference_date', 'reference_limits', 'reference_preview_missing', 'use_reference', 'more_details',
      'saving', 'saving_note', 'save_failed', 'discard_confirm', 'error_amount', 'error_quantity', 'error_date',
      'error_confirm', 'error_printing', 'error_variant', 'no_cards', 'search_hint', 'no_purchases', 'partial_one',
    ];
    for (const [language, bundle] of Object.entries(bundles)) {
      const labels = bundle.translation.investments;
      for (const key of required) {
        expect(labels, `${language}: ${key}`).toHaveProperty(key, expect.any(String));
      }
      expect(bundle.translation.tcg).toHaveProperty('price_history_unqualified', expect.any(String));
      expect(labels.partial_one.match(/\{\{\w+\}\}/g)?.sort()).toEqual(['{{amount}}', '{{count}}']);
      if (language !== 'en') {
        for (const key of required) {
          expect(labels[key as keyof typeof labels]).not.toBe(tcgInvestmentsTranslations.en[key as keyof typeof labels]);
        }
        expect(bundle.translation.tcg.price_history_unqualified).not.toBe(en.translation.tcg.price_history_unqualified);
      }
      expect(labels).toEqual(tcgInvestmentsTranslations[language as keyof typeof tcgInvestmentsTranslations]);
    }
  });
});
