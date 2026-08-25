import {
  GITHUB_REPO_URL,
  SITE_DESCRIPTION,
  SITE_DISAMBIGUATION_DESCRIPTION,
  SITE_NAME,
  SITE_TAGLINE,
  SITE_URL,
} from './site';
import { OG_SIZE } from '@/lib/og/theme';
import { supportedLanguages, languageToMetadataLocale, type SupportedLanguage } from '@/lib/languages';

type BreadcrumbItem = {
  name: string;
  path: string;
};

export const DEFAULT_OG_IMAGE = {
  url: '/og/lunidex-og.jpg',
  width: OG_SIZE.width,
  height: OG_SIZE.height,
  alt: `${SITE_NAME} — ${SITE_TAGLINE}`,
} as const;

/**
 * Shared entity node used by page schemas that identify Lunidex as the
 * publisher or author. Keeping one stable @id makes those references
 * resolvable when a crawler reads only one page instead of the whole site.
 */
export function buildOrganizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    disambiguatingDescription: SITE_DISAMBIGUATION_DESCRIPTION,
    knowsAbout: [
      'Pokémon video game reference data',
      'Pokémon Trading Card Game collecting',
      'Pokémon team building',
    ],
    logo: {
      '@type': 'ImageObject',
      url: `${SITE_URL}/icon-512.png`,
      width: 512,
      height: 512,
    },
    sameAs: [GITHUB_REPO_URL],
  };
}

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

export function buildLocalizedLanguages(
  path: string,
  languages: readonly SupportedLanguage[],
): Record<string, string> {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const alternates = Object.fromEntries(
    languages.map((locale) => [locale, `/${locale}${normalized}`]),
  );
  return { ...alternates, 'x-default': `/en${normalized}` };
}

export function buildInLanguage(lang: SupportedLanguage) {
  return languageToMetadataLocale[lang];
}

export type DefinedTermProperty = {
  name: string;
  value: string | number | boolean;
  unitText?: string;
};

/**
 * Describes a reference entry such as a move, ability, or item as a
 * machine-readable term while keeping the page itself as the canonical URL.
 * These entries are sourced from PokéAPI and are not original Lunidex claims.
 */
export function buildDefinedTermJsonLd({
  lang,
  path,
  name,
  description,
  identifier,
  setName,
  setPath,
  image,
  additionalProperty,
}: {
  lang: SupportedLanguage;
  path: string;
  name: string;
  description: string;
  identifier: string | number;
  setName: string;
  setPath: string;
  image?: string;
  additionalProperty?: DefinedTermProperty[];
}) {
  const url = `${SITE_URL}${path}`;

  return {
    '@context': 'https://schema.org',
    '@type': 'DefinedTerm',
    '@id': `${url}#term`,
    name,
    description,
    identifier: String(identifier),
    termCode: String(identifier),
    url,
    inLanguage: buildInLanguage(lang),
    inDefinedTermSet: {
      '@type': 'DefinedTermSet',
      name: setName,
      url: `${SITE_URL}${localeHref(setPath, lang)}`,
    },
    ...(image ? { image } : {}),
    ...(additionalProperty && additionalProperty.length > 0
      ? {
          additionalProperty: additionalProperty.map((property) => ({
            '@type': 'PropertyValue',
            ...property,
          })),
        }
      : {}),
  };
}

export function localeHref(path: string, lang: SupportedLanguage): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (normalized === '/') return `/${lang}`;
  return `/${lang}${normalized}`;
}

// ─── Social / OG share meta helpers ──────────────────────────────────────

interface PokemonShareData {
  type: 'pokemon';
  name: string;
  lang?: SupportedLanguage;
}

interface TeamShareData {
  type: 'team';
  code: string;
  lang?: SupportedLanguage;
}

interface QuizShareData {
  type: 'quiz';
  score: number;
  total: number;
  mode: string;
  challenge: string;
  streak?: number;
  badges?: number;
  lang?: SupportedLanguage;
}

interface ProfileShareData {
  type: 'profile';
  trainer?: string;
  level?: number;
  badges?: number;
  caught?: number;
  quiz?: number;
  lang?: SupportedLanguage;
}

interface TcgCardShareData {
  type: 'tcg-card';
  id: string;
  lang?: SupportedLanguage;
}

type ShareData =
  | PokemonShareData
  | TeamShareData
  | QuizShareData
  | ProfileShareData
  | TcgCardShareData;

/**
 * Generates the `og:image`, `twitter:card`, and `twitter:image` meta values
 * for a given share context, pointing at the `/api/og/*` routes.
 *
 * Returns a plain object suitable for spreading into a Next.js `Metadata`
 * `openGraph.images` / `twitter.images` array.
 */
export function buildShareMeta(data: ShareData): {
  ogImage: { url: string; width: number; height: number; alt: string };
  twitterCard: 'summary_large_image';
  twitterImage: string;
} {
  const { width, height } = OG_SIZE;

  let url: string;
  let alt: string;

  switch (data.type) {
    case 'pokemon': {
      const params = new URLSearchParams({ name: data.name });
      if (data.lang) params.set('lang', data.lang);
      url = `${SITE_URL}/api/og/pokemon?${params.toString()}`;
      alt = `${data.name} — ${SITE_NAME} Pokémon card`;
      break;
    }
    case 'team': {
      const params = new URLSearchParams({ code: data.code });
      if (data.lang) params.set('lang', data.lang);
      url = `${SITE_URL}/api/og/team?${params.toString()}`;
      alt = `My ${SITE_NAME} team`;
      break;
    }
    case 'quiz': {
      const params = new URLSearchParams({
        score: String(data.score),
        total: String(data.total),
        mode: data.mode,
        challenge: data.challenge,
      });
      if (data.streak !== undefined) params.set('streak', String(data.streak));
      if (data.badges !== undefined) params.set('badges', String(data.badges));
      if (data.lang) params.set('lang', data.lang);
      url = `${SITE_URL}/api/og/quiz-result?${params.toString()}`;
      alt = `Quiz result — ${data.score}/${data.total} on ${SITE_NAME}`;
      break;
    }
    case 'profile': {
      const params = new URLSearchParams();
      if (data.trainer) params.set('trainer', data.trainer);
      if (data.level !== undefined) params.set('level', String(data.level));
      if (data.badges !== undefined) params.set('badges', String(data.badges));
      if (data.caught !== undefined) params.set('caught', String(data.caught));
      if (data.quiz !== undefined) params.set('quiz', String(data.quiz));
      if (data.lang) params.set('lang', data.lang);
      url = `${SITE_URL}/api/og/profile?${params.toString()}`;
      alt = `${data.trainer ?? 'Trainer'} — ${SITE_NAME} profile`;
      break;
    }
    case 'tcg-card': {
      const params = new URLSearchParams({ id: data.id });
      if (data.lang) params.set('lang', data.lang);
      url = `${SITE_URL}/api/og/tcg-card?${params.toString()}`;
      alt = `Pokémon TCG card — ${SITE_NAME}`;
      break;
    }
  }

  return {
    ogImage: { url, width, height, alt },
    twitterCard: 'summary_large_image',
    twitterImage: url,
  };
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
  };
}

export function buildArticleJsonLd({
  lang,
  path,
  name,
  headline,
  description,
  datePublished,
  dateModified,
  about,
  keywords,
}: {
  lang: SupportedLanguage;
  path: string;
  name: string;
  headline?: string;
  description: string;
  datePublished: string;
  dateModified: string;
  about?: string;
  keywords?: string;
}) {
  return {
    ...buildWebPageJsonLd({
      lang,
      path,
      name,
      headline,
      description,
      about,
      keywords,
    }),
    '@type': 'Article',
    '@id': `${SITE_URL}${path}#article`,
    datePublished,
    dateModified,
    author: { '@id': `${SITE_URL}/#organization` },
    publisher: { '@id': `${SITE_URL}/#organization` },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE_URL}${path}#webpage` },
    image: [`${SITE_URL}${DEFAULT_OG_IMAGE.url}`],
  };
}
