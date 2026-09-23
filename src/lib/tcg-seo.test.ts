import { describe, expect, it } from 'vitest';

import { supportedLanguages } from './languages';
import { getServerTForLanguage } from './server-i18n';
import { getTCGCardMetaDescriptionKey, PUBLIC_TCG_CARD_ROBOTS } from './tcg-seo';

describe('public TCG card robots policy', () => {
  it('keeps every valid public card URL indexable for web search', () => {
    expect(PUBLIC_TCG_CARD_ROBOTS).toEqual({
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
      },
    });
  });
});

describe('TCG card metadata descriptions', () => {
  it('omits missing rarity values from the description', () => {
    const missingValues = ['', '  ', 'none', 'N/A', 'Unknown', null, undefined];

    expect(missingValues.map(getTCGCardMetaDescriptionKey)).toEqual(
      missingValues.map(() => 'tcg.card_meta_description_no_rarity'),
    );
  });

  it('includes a known rarity in the description', () => {
    expect(getTCGCardMetaDescriptionKey('Rare Holo')).toBe('tcg.card_meta_description');
  });

  it('renders the missing-rarity description in every supported locale', () => {
    const variables = { name: 'Snivy', set: "McDonald's Collection 2011", hp: '60' };
    const englishDescription = getServerTForLanguage('en')(
      'tcg.card_meta_description_no_rarity',
      variables,
    );

    for (const language of supportedLanguages) {
      const description = getServerTForLanguage(language)(
        'tcg.card_meta_description_no_rarity',
        variables,
      );

      expect(description).toContain('Snivy');
      expect(description).not.toContain('{{');
      expect(description).not.toMatch(/unknown/i);
      if (language !== 'en') expect(description).not.toBe(englishDescription);
    }
  });
});
