import { isTcgLangSupported } from '@/lib/api/tcg';
import { supportedLanguages } from '@/lib/languages';
import {
  EDITORIAL_ROUTES,
  buildEditorialLanguages,
  getEditorialDates,
} from '@/lib/editorial';
import {
  ANNIVERSARY_30_INDEXABLE_LANGUAGES,
  ANNIVERSARY_30_LAST_MODIFIED_DATE,
  ANNIVERSARY_30_PATH,
} from '@/lib/anniversary-30';
import { SITE_URL } from '@/lib/site';
import type { SupportedLanguage } from '@/lib/languages';

export const SITEMAP_FAMILIES = [
  'static',
  'guides',
  'pokemon',
  'tcg-sets',
  'tcg-cards',
  'moves',
  'abilities',
  'items',
] as const;

export type SitemapFamily = (typeof SITEMAP_FAMILIES)[number];

export type SitemapEntry = {
  url: string;
  lastModified?: string | Date;
  alternates?: Record<string, string>;
};

export const SITEMAP_REVALIDATE_SECONDS = 6 * 60 * 60;

/**
 * These are deliberately conservative lower bounds, not targets. They turn
 * an empty or obviously truncated upstream response into a failed sitemap
 * response instead of publishing a valid-looking partial file.
 */
export const SITEMAP_MINIMUM_ENTRIES: Record<SitemapFamily, number> = {
  static: 1,
  guides: 1,
  pokemon: 900,
  'tcg-sets': 50,
  'tcg-cards': 10_000,
  moves: 500,
  abilities: 150,
  items: 500,
};

type StaticEntry = {
  path: string;
  changeFrequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  priority: number;
  lastModified?: string;
  indexableLanguages?: readonly SupportedLanguage[];
};

export const LAUNCH_SITEMAP_ROUTES: StaticEntry[] = [
  { path: '', changeFrequency: 'weekly', priority: 1.0 },
  { path: 'pokedex', changeFrequency: 'weekly', priority: 0.9 },
  { path: 'team', changeFrequency: 'weekly', priority: 0.7 },
  { path: 'compare', changeFrequency: 'monthly', priority: 0.5 },
  { path: 'quiz', changeFrequency: 'monthly', priority: 0.6 },
  { path: 'types', changeFrequency: 'monthly', priority: 0.7 },
  { path: 'moves', changeFrequency: 'monthly', priority: 0.6 },
  { path: 'abilities', changeFrequency: 'monthly', priority: 0.5 },
  { path: 'items', changeFrequency: 'monthly', priority: 0.5 },
  { path: 'breeding', changeFrequency: 'monthly', priority: 0.4 },
  { path: 'ev-iv', changeFrequency: 'monthly', priority: 0.4 },
  { path: 'battle', changeFrequency: 'monthly', priority: 0.5 },
  { path: 'nuzlocke', changeFrequency: 'monthly', priority: 0.5 },
  { path: 'tcg', changeFrequency: 'weekly', priority: 0.6 },
  {
    path: ANNIVERSARY_30_PATH.slice(1),
    changeFrequency: 'weekly',
    priority: 0.8,
    lastModified: ANNIVERSARY_30_LAST_MODIFIED_DATE,
    indexableLanguages: ANNIVERSARY_30_INDEXABLE_LANGUAGES,
  },
  { path: 'tcg/deck-builder', changeFrequency: 'monthly', priority: 0.5 },
  {
    path: 'compare/lunidex-vs-pokecardex-zebradex',
    changeFrequency: 'monthly',
    priority: 0.75,
    lastModified: getEditorialDates('/compare/lunidex-vs-pokecardex-zebradex').updatedAt,
  },
  {
    path: 'guides/pokemon-card-collection-tracker',
    changeFrequency: 'monthly',
    priority: 0.72,
    lastModified: getEditorialDates('/guides/pokemon-card-collection-tracker').updatedAt,
  },
  {
    path: 'guides/team-builder-guide',
    changeFrequency: 'monthly',
    priority: 0.72,
    lastModified: getEditorialDates('/guides/team-builder-guide').updatedAt,
  },
  {
    path: 'guides/quiz-guide',
    changeFrequency: 'monthly',
    priority: 0.72,
    lastModified: getEditorialDates('/guides/quiz-guide').updatedAt,
  },
  {
    path: 'guides/nuzlocke-guide',
    changeFrequency: 'monthly',
    priority: 0.72,
    lastModified: getEditorialDates('/guides/nuzlocke-guide').updatedAt,
  },
  { path: 'blog', changeFrequency: 'monthly', priority: 0.65 },
  { path: 'faq', changeFrequency: 'monthly', priority: 0.7 },
  { path: 'about', changeFrequency: 'monthly', priority: 0.5 },
  { path: 'contact', changeFrequency: 'monthly', priority: 0.5 },
];

export const EDITORIAL_SITEMAP_ROUTES = EDITORIAL_ROUTES;

const GUIDE_AND_COMPARISON_PATHS = Array.from(new Set([
  ...EDITORIAL_SITEMAP_ROUTES,
  ...LAUNCH_SITEMAP_ROUTES
    .filter((route) => route.path.startsWith('guides/') || route.path.startsWith('compare/'))
    .map((route) => `/${route.path}`),
]));

function absolutePath(path: string): string {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

function buildLanguages(
  path: string,
  indexableLanguages: readonly SupportedLanguage[] = supportedLanguages,
): Record<string, string> {
  const normalized = path ? `/${path.replace(/^\//, '')}` : '';
  const languages: Record<string, string> = {};

  for (const language of indexableLanguages) {
    languages[language] = `${SITE_URL}/${language}${normalized}`;
  }

  return { ...languages, 'x-default': `${SITE_URL}/en${normalized}` };
}

export function buildTcgLanguages(path: string): Record<string, string> {
  const normalized = path ? `/${path.replace(/^\//, '')}` : '';
  const languages = supportedLanguages
    .filter(isTcgLangSupported)
    .reduce<Record<string, string>>((result, language) => {
      result[language] = `${SITE_URL}/${language}${normalized}`;
      return result;
    }, {});

  return { ...languages, 'x-default': `${SITE_URL}/en${normalized}` };
}

/** Keep overlapping legacy declarations from emitting duplicate URLs. */
export function deduplicateSitemapEntries(entries: SitemapEntry[]): SitemapEntry[] {
  return Array.from(new Map(entries.map((entry) => [entry.url, entry])).values());
}

function toAbsoluteAlternates(alternates: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(alternates).map(([language, path]) => [language, absolutePath(path)]),
  );
}

export function buildStaticSitemapEntries(): SitemapEntry[] {
  const editorialPaths = new Set(GUIDE_AND_COMPARISON_PATHS);

  return deduplicateSitemapEntries(
    LAUNCH_SITEMAP_ROUTES
      // Guide and comparison pages have their own family. Keeping them out of
      // this file prevents the old launch/editorial overlap from returning.
      .filter((route) => !editorialPaths.has(`/${route.path}`))
      .map((route) => ({
        url: `${SITE_URL}/en${route.path ? `/${route.path}` : ''}`,
        lastModified: route.lastModified,
        alternates: buildLanguages(route.path, route.indexableLanguages),
      })),
  );
}

export function buildGuidesSitemapEntries(): SitemapEntry[] {
  return deduplicateSitemapEntries(
    GUIDE_AND_COMPARISON_PATHS.map((route) => ({
      url: absolutePath(`/en${route}`),
      lastModified: getEditorialDates(route).updatedAt,
      alternates: toAbsoluteAlternates(buildEditorialLanguages(route)),
    })),
  );
}

function buildReferenceEntries(
  family: 'moves' | 'abilities' | 'items',
  names: string[],
): SitemapEntry[] {
  return deduplicateSitemapEntries(
    names
      .filter((name) => /^[a-z0-9][a-z0-9-]*$/i.test(name))
      .map((name) => ({
        url: absolutePath(`/en/${family}/${encodeURIComponent(name)}`),
        alternates: buildLanguages(`${family}/${encodeURIComponent(name)}`),
      })),
  );
}

export function buildPokemonSitemapEntries(
  pokemon: { name: string; url: string }[],
): SitemapEntry[] {
  return deduplicateSitemapEntries(
    pokemon
      .filter((entry) => /^[a-z0-9][a-z0-9-]*$/i.test(entry.name))
      .map((entry) => ({
        url: absolutePath(`/en/pokemon/${encodeURIComponent(entry.name)}`),
        alternates: buildLanguages(`pokemon/${encodeURIComponent(entry.name)}`),
      })),
  );
}

export function buildTcgSetSitemapEntries(
  sets: { id: string }[],
): SitemapEntry[] {
  return deduplicateSitemapEntries(
    sets
      .filter((set) => /^[a-z0-9][a-z0-9._-]*$/i.test(set.id))
      .map((set) => ({
        url: absolutePath(`/en/tcg/sets/${encodeURIComponent(set.id)}`),
        alternates: buildTcgLanguages(`tcg/sets/${encodeURIComponent(set.id)}`),
      })),
  );
}

export function buildTcgCardSitemapEntries(cardIds: string[]): SitemapEntry[] {
  return deduplicateSitemapEntries(
    cardIds
      .filter((id) => /^[a-z0-9][a-z0-9._:-]*-[a-z0-9][a-z0-9._:-]*$/i.test(id))
      .map((id) => ({
        url: absolutePath(`/en/tcg/cards/${encodeURIComponent(id)}`),
        alternates: buildTcgLanguages(`tcg/cards/${encodeURIComponent(id)}`),
      })),
  );
}

export function buildMovesSitemapEntries(names: string[]): SitemapEntry[] {
  return buildReferenceEntries('moves', names);
}

export function buildAbilitiesSitemapEntries(names: string[]): SitemapEntry[] {
  return buildReferenceEntries('abilities', names);
}

export function buildItemsSitemapEntries(names: string[]): SitemapEntry[] {
  return buildReferenceEntries('items', names);
}

function assertValidAbsoluteUrl(value: string, label: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`Invalid ${label} in sitemap: ${value}`);
  }

  if (parsed.origin !== new URL(SITE_URL).origin || parsed.protocol !== 'https:') {
    throw new Error(`Non-canonical ${label} in sitemap: ${value}`);
  }
  if (parsed.search || parsed.hash) {
    throw new Error(`Query or fragment in sitemap ${label}: ${value}`);
  }

  return parsed;
}

const PRIVATE_PATH_PREFIXES = [
  '/dashboard',
  '/favorites',
  '/friends',
  '/tcg/collection',
  '/tcg/wishlist',
  '/tcg/start',
  '/auth',
  '/u',
];

const INVALID_PATH_MARKERS = ['/types-Types', '/blog-博客', '/team-Team-Builder', '/pokedex-Pokédex', '/en-0', '/zh-0'];

export function assertSitemapIntegrity(
  entries: SitemapEntry[],
  family: SitemapFamily,
): void {
  if (entries.length < SITEMAP_MINIMUM_ENTRIES[family]) {
    throw new Error(
      `Sitemap ${family} contains ${entries.length} URLs; expected at least ${SITEMAP_MINIMUM_ENTRIES[family]}.`,
    );
  }

  const seen = new Set<string>();
  const validLocalePattern = new RegExp(`^/(${supportedLanguages.join('|')})(?:/|$)`);

  for (const entry of entries) {
    const url = assertValidAbsoluteUrl(entry.url, 'URL');
    if (seen.has(entry.url)) throw new Error(`Duplicate URL in sitemap ${family}: ${entry.url}`);
    seen.add(entry.url);

    if (!validLocalePattern.test(url.pathname)) {
      throw new Error(`Missing or invalid locale in sitemap ${family}: ${entry.url}`);
    }
    if (PRIVATE_PATH_PREFIXES.some((prefix) => url.pathname === prefix || url.pathname.startsWith(`${prefix}/`))) {
      throw new Error(`Private URL in sitemap ${family}: ${entry.url}`);
    }
    if (INVALID_PATH_MARKERS.some((marker) => url.pathname.includes(marker))) {
      throw new Error(`Invalid legacy URL in sitemap ${family}: ${entry.url}`);
    }

    for (const [language, alternate] of Object.entries(entry.alternates ?? {})) {
      if (language !== 'x-default' && !supportedLanguages.includes(language as (typeof supportedLanguages)[number])) {
        throw new Error(`Invalid hreflang ${language} in sitemap ${family}: ${entry.url}`);
      }
      const alternateUrl = assertValidAbsoluteUrl(alternate, 'alternate URL');
      if (!validLocalePattern.test(alternateUrl.pathname)) {
        throw new Error(`Invalid alternate locale in sitemap ${family}: ${alternate}`);
      }
    }
  }
}

export function sitemapIndexUrls(): string[] {
  return SITEMAP_FAMILIES.map((family) => `${SITE_URL}/sitemaps/${family}.xml`);
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function formatLastModified(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : value;
}

export function renderSitemapIndex(urls: string[]): string {
  const locations = urls.map((url) => `  <sitemap><loc>${escapeXml(url)}</loc></sitemap>`).join('\n');
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    locations,
    '</sitemapindex>',
  ].join('\n');
}

export function renderUrlset(entries: SitemapEntry[]): string {
  const urls = entries.map((entry) => {
    const alternates = Object.entries(entry.alternates ?? {})
      .map(([language, url]) => `    <xhtml:link rel="alternate" hreflang="${escapeXml(language)}" href="${escapeXml(url)}" />`)
      .join('\n');
    const lastModified = entry.lastModified
      ? `    <lastmod>${escapeXml(formatLastModified(entry.lastModified))}</lastmod>\n`
      : '';

    return [
      '  <url>',
      `    <loc>${escapeXml(entry.url)}</loc>`,
      lastModified.trimEnd(),
      alternates,
      '  </url>',
    ].filter(Boolean).join('\n');
  }).join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    urls,
    '</urlset>',
  ].join('\n');
}
