import { describe, expect, it } from 'vitest';
import en from './i18n/en';
import { buildLunidexHomeFaqJsonLd, getLunidexHomeFaqs, localizeInternalRouteReferences } from './lunidex-home-content';
import { SITE_URL } from './site';

const t = (key: string) => {
  const [, field] = key.split('.');
  return en.translation.lunidex_home[field as keyof typeof en.translation.lunidex_home];
};

describe('Lunidex home FAQ content', () => {
  it('uses the same visible questions and answers in FAQPage JSON-LD', () => {
    const visible = getLunidexHomeFaqs(t, 'fr');
    const jsonLd = buildLunidexHomeFaqJsonLd(t, 'fr');

    expect(jsonLd['@id']).toBe(`${SITE_URL}/fr#faq`);
    expect(jsonLd.mainEntity).toEqual(visible.map(({ question, answer }) => ({
      '@type': 'Question', name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })));
  });

  it('localizes route references used inside translated answer copy', () => {
    expect(localizeInternalRouteReferences('Open /team and compare it with /types.', 'ja'))
      .toBe('Open /ja/team and compare it with /ja/types.');
    expect(localizeInternalRouteReferences('Use https://lunidex.app/en/team.', 'ja'))
      .toBe('Use https://lunidex.app/en/team.');
  });
});
