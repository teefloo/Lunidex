import { describe, expect, it } from 'vitest';
import { supportedLanguages } from '@/lib/languages';
import { tcgDemoTranslations } from './tcg-demo';
import en from './en';
import fr from './fr';
import es from './es';
import de from './de';
import itBundle from './it';
import ja from './ja';
import ko from './ko';
import zh from './zh';

const bundles = { en, fr, es, de, it: itBundle, ja, ko, zh };

describe('localized demo guidance', () => {
  it('provides every demo label and progress placeholder in all supported locales', () => {
    for (const locale of supportedLanguages) {
      const labels = tcgDemoTranslations[locale];
      expect(Object.keys(labels).sort()).toEqual(Object.keys(tcgDemoTranslations.en).sort());
      expect(Object.values(labels).every((label) => label.trim().length > 0)).toBe(true);
      expect(labels.progress).toContain('{{owned}}');
      expect(labels.progress).toContain('{{total}}');
      expect(labels.progress).toContain('{{percent}}');
      expect(bundles[locale].translation.tcg.demo).toEqual(labels);
    }
  });
});
