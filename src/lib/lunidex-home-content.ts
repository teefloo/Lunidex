import type { SupportedLanguage } from '@/lib/languages';
import { SITE_URL } from '@/lib/site';

type Translate = (key: string) => string;

const homeFaqKeys = [1, 2, 3, 4] as const;

export function getLunidexHomeFaqs(t: Translate) {
  return homeFaqKeys.map((index) => ({
    question: t(`lunidex_home.faq_q${index}`),
    answer: t(`lunidex_home.faq_a${index}`),
  }));
}

export function buildLunidexHomeFaqJsonLd(t: Translate, language: SupportedLanguage) {
  const url = `${SITE_URL}/${language}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${url}#faq`,
    url,
    mainEntity: getLunidexHomeFaqs(t).map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
  };
}
