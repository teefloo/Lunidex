import { SITE_URL } from './site';
import { supportedLanguages, languageToMetadataLocale, type SupportedLanguage } from '@/lib/languages';

type BreadcrumbItem = {
  name: string;
  path: string;
};

function normalizePath(item: { path: string; lang?: SupportedLanguage }): string {
  const raw = item.path.startsWith('/') ? item.path : `/${item.path}`;
  if (raw === '/') {
    return item.lang ? `/${item.lang}` : '/';
  }
  return item.lang ? `/${item.lang}${raw}` : raw;
}

export function buildBreadcrumbJsonLd(items: BreadcrumbItem[], lang?: SupportedLanguage) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${normalizePath({ path: item.path, lang })}`,
    })),
  };
}

export function buildSubpathLanguages(path: string) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const languages = Object.fromEntries(
    supportedLanguages.map((locale) => [locale, `/${locale}${normalized}`])
  ) as Record<SupportedLanguage, string>;
  return { ...languages, 'x-default': `/en${normalized}` };
}

export function buildInLanguage(lang: SupportedLanguage) {
  return languageToMetadataLocale[lang];
}

export function localeHref(path: string, lang: SupportedLanguage): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (normalized === '/') return `/${lang}`;
  return `/${lang}${normalized}`;
}

export function buildWebPageJsonLd({
  lang,
  path,
  name,
  headline,
  description,
  inLanguage,
  about,
  keywords,
}: {
  lang: SupportedLanguage;
  path: string;
  name: string;
  headline?: string;
  description: string;
  inLanguage?: string;
  about?: string;
  keywords?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${SITE_URL}${path}#webpage`,
    name,
    headline: headline ?? name,
    description,
    url: `${SITE_URL}${path}`,
    inLanguage: inLanguage ?? languageToMetadataLocale[lang],
    ...(about ? { about: { '@type': 'Thing', name: about } } : {}),
    ...(keywords ? { keywords } : {}),
    isPartOf: { '@id': `${SITE_URL}/#website` },
    author: { '@id': `${SITE_URL}/#organization` },
    publisher: { '@id': `${SITE_URL}/#organization` },
  };
}
