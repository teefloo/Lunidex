import { describe, expect, it } from 'vitest';
import { tcgInvestmentsTranslations } from './tcg-investments';

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
});
