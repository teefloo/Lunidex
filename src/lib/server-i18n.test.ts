import { describe, expect, it } from 'vitest';

import { supportedLanguages } from './languages';
import {
  getEditorialClientTranslations,
  getPublicClientTranslations,
  getServerTranslations,
  isEditorialClientRoute,
} from './server-i18n';

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

  it('ships the compact dashboard and account copy in every client locale', () => {
    for (const language of supportedLanguages) {
      const publicTranslations = getPublicClientTranslations(language) as unknown as Record<string, unknown>;
      const dashboard = publicTranslations.dashboard as Record<string, unknown>;
      const account = publicTranslations.account as Record<string, unknown>;

      expect(dashboard.overview_heading).toEqual(expect.any(String));
      expect(dashboard.overview_heading).not.toBe('dashboard.overview_heading');
      expect(dashboard.account_section).toEqual(expect.any(String));
      expect(dashboard.account_section).not.toBe('dashboard.account_section');
      expect(account.data_title).toEqual(expect.any(String));
      expect(account.data_description).toEqual(expect.any(String));
    }
  });
});

describe('isEditorialClientRoute', () => {
  it('keeps the interactive comparison workspace on the full client translation bundle', () => {
    expect(isEditorialClientRoute('/fr/compare')).toBe(false);
    expect(isEditorialClientRoute('/fr/compare/')).toBe(false);
    expect(isEditorialClientRoute('/fr/compare/lunidex-vs-pokecardex-zebradex')).toBe(true);
    expect(isEditorialClientRoute('/fr/guides/quiz-guide')).toBe(true);
    expect(isEditorialClientRoute('/fr/tcg')).toBe(false);
  });
});

describe('getEditorialClientTranslations', () => {
  it('includes the catalog navigation label in every locale', () => {
    for (const language of supportedLanguages) {
      const editorialTranslations = getEditorialClientTranslations(language) as unknown as Record<string, unknown>;
      const serverTranslations = getServerTranslations(language) as unknown as Record<string, unknown>;
      const serverTcg = serverTranslations.tcg as Record<string, unknown>;

      expect(serverTcg.nav_catalog).toEqual(expect.any(String));
      expect(editorialTranslations).toHaveProperty('tcg.nav_catalog', serverTcg.nav_catalog);
    }
  });
});
