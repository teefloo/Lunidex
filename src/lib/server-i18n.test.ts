import { describe, expect, it } from 'vitest';

import { supportedLanguages } from './languages';
import { getPublicClientTranslations, getServerTranslations } from './server-i18n';

const serverOnlyNamespaces = ['editorial', 'anniversary_30', 'faq', 'about', 'quiz_guide'] as const;

describe('getPublicClientTranslations', () => {
  it('omits server-rendered namespaces while retaining client strings in every locale', () => {
    for (const language of supportedLanguages) {
      const publicTranslations = getPublicClientTranslations(language) as unknown as Record<string, unknown>;
      const serverTranslations = getServerTranslations(language) as unknown as Record<string, unknown>;

      for (const namespace of serverOnlyNamespaces) {
        expect(publicTranslations).not.toHaveProperty(namespace);
      }

      expect(Object.keys(publicTranslations)).toEqual(
        Object.keys(serverTranslations).filter((namespace) => !serverOnlyNamespaces.includes(namespace as typeof serverOnlyNamespaces[number])),
      );
      expect(publicTranslations.common).toEqual(serverTranslations.common);
      expect(publicTranslations.pwa).toEqual(serverTranslations.pwa);
      expect(publicTranslations.tcg).toEqual(serverTranslations.tcg);
      expect(publicTranslations.pokemon).toEqual(serverTranslations.pokemon);
    }
  });
});
