import type { SupportedLanguage } from '@/lib/languages';
import { SITE_URL } from '@/lib/site';

type Translate = (key: string) => string;

const homeFaqKeys = [1, 2, 3, 4] as const;

const INTERNAL_ROUTE_PATTERN = /(^|[\s(])\/(pokemon|pokedex|team|compare|types|moves|abilities|items|tcg|quiz|breeding|ev-iv|battle|nuzlocke|dashboard|favorites)(?=\/|[\s).,;:!?]|$)/g;

/**
 * Translation copy occasionally names a public route in prose. Keep those
 * references aligned with the locale-prefixed URL scheme used by the proxy.
 */
export function localizeInternalRouteReferences(text: string, language: SupportedLanguage): string {
  return text.replace(INTERNAL_ROUTE_PATTERN, (_match, prefix: string, route: string) => `${prefix}/${language}/${route}`);
}

export function getLunidexHomeFaqs(t: Translate, language: SupportedLanguage = 'en') {
  return homeFaqKeys.map((index) => ({
    question: t(`lunidex_home.faq_q${index}`),
    answer: localizeInternalRouteReferences(t(`lunidex_home.faq_a${index}`), language),
  }));
}

export function buildLunidexHomeFaqJsonLd(t: Translate, language: SupportedLanguage) {
  const url = `${SITE_URL}/${language}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${url}#faq`,
    url,
    mainEntity: getLunidexHomeFaqs(t, language).map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
  };
}
