import { describe, expect, it } from 'vitest';
import en from './i18n/en';
import { buildLunidexHomeFaqJsonLd, getLunidexHomeFaqs } from './lunidex-home-content';
import { SITE_URL } from './site';

const t = (key: string) => {
  const [, field] = key.split('.');
  return en.translation.lunidex_home[field as keyof typeof en.translation.lunidex_home];
};

describe('Lunidex home FAQ content', () => {
  it('uses the same four visible questions and answers in FAQPage JSON-LD', () => {
    const visible = getLunidexHomeFaqs(t);
    const jsonLd = buildLunidexHomeFaqJsonLd(t, 'fr');

    expect(jsonLd['@id']).toBe(`${SITE_URL}/fr#faq`);
    expect(jsonLd.mainEntity).toEqual(visible.map(({ question, answer }) => ({
      '@type': 'Question', name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })));
  });
});
