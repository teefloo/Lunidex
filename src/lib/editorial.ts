import type { SupportedLanguage } from '@/lib/languages';

/**
 * The first editorial wave is fully available in English and French. Other
 * UI locales still resolve the English fallback, but are kept out of the
 * index until the article body is translated rather than exposing thin
 * hreflang variants.
 */
export const EDITORIAL_INDEXABLE_LOCALES = ['en', 'fr'] as const;
export type EditorialLanguage = (typeof EDITORIAL_INDEXABLE_LOCALES)[number];

export type EditorialSource = {
  label: string;
  url: string;
};

export const COMPARISON_ROW_KEYS = [
  'platform',
  'scope',
  'scanner',
  'prices',
  'offline',
  'accountSync',
  'cost',
  'wishlist',
  'pokedex',
  'teamBuilder',
  'openSource',
  'limits',
] as const;

export type ComparisonRowKey = (typeof COMPARISON_ROW_KEYS)[number];

export const GUIDE_EVIDENCE_ROW_KEYS = [
  'cardEstimate',
  'sealedPortfolio',
  'priceHistory',
  'sourceFreshness',
  'marketLimits',
] as const;

export type GuideEvidenceRowKey = (typeof GUIDE_EVIDENCE_ROW_KEYS)[number];

export type EditorialDateDefinition = {
  publishedAt: string;
  updatedAt: string;
};

export type CompetitorArticleDefinition = {
  slug: string;
  path: string;
  sources: readonly EditorialSource[];
  productPath: string;
  comparisonRows?: readonly ComparisonRowKey[];
  relatedPaths?: readonly string[];
};

export type FeatureGuideDefinition = {
  slug: string;
  path: string;
  productPaths: string[];
  relatedPaths?: readonly string[];
  sources?: readonly EditorialSource[];
  evidenceRows?: readonly GuideEvidenceRowKey[];
  faqCount?: 2 | 4;
};

/**
 * Publication dates are intentionally explicit and unique. Keeping them in
 * one map prevents the blog cards, metadata and structured data from drifting
 * apart when an article is updated.
 */
export const EDITORIAL_ARTICLE_DATES = {
  '/guides/pokemon-card-collection-tracker': { publishedAt: '2026-08-08', updatedAt: '2026-09-21' },
  '/guides/team-builder-guide': { publishedAt: '2026-08-09', updatedAt: '2026-09-14' },
  '/guides/quiz-guide': { publishedAt: '2026-08-10', updatedAt: '2026-08-24' },
  '/guides/nuzlocke-guide': { publishedAt: '2026-08-11', updatedAt: '2026-08-24' },
  '/compare/lunidex-vs-pokecardex-zebradex': { publishedAt: '2026-08-12', updatedAt: '2026-08-19' },
  '/compare/lunidex-vs-pokemon-database': { publishedAt: '2026-08-13', updatedAt: '2026-08-22' },
  '/compare/lunidex-vs-bulbapedia': { publishedAt: '2026-08-14', updatedAt: '2026-08-22' },
  '/compare/lunidex-vs-pokemon-showdown': { publishedAt: '2026-08-15', updatedAt: '2026-08-22' },
  '/compare/lunidex-vs-pokecardex': { publishedAt: '2026-08-16', updatedAt: '2026-09-14' },
  '/compare/lunidex-vs-zebradex': { publishedAt: '2026-08-17', updatedAt: '2026-09-14' },
  '/compare/lunidex-vs-collectr': { publishedAt: '2026-08-18', updatedAt: '2026-09-14' },
  '/compare/lunidex-vs-pokellector': { publishedAt: '2026-09-14', updatedAt: '2026-09-14' },
  '/compare/lunidex-vs-cardzia': { publishedAt: '2026-09-14', updatedAt: '2026-09-14' },
  '/compare/lunidex-vs-cardmarket': { publishedAt: '2026-09-21', updatedAt: '2026-09-21' },
  '/guides/pokemon-reference-guide': { publishedAt: '2026-08-19', updatedAt: '2026-09-21' },
  '/guides/team-tools-guide': { publishedAt: '2026-08-20', updatedAt: '2026-09-21' },
  '/guides/tcg-workspace-guide': { publishedAt: '2026-08-21', updatedAt: '2026-09-14' },
  '/guides/progress-account-guide': { publishedAt: '2026-08-22', updatedAt: '2026-08-22' },
  '/guides/pokemon-card-collection-value': { publishedAt: '2026-09-21', updatedAt: '2026-09-21' },
} as const satisfies Record<string, EditorialDateDefinition>;

export const COMPETITOR_ARTICLES: CompetitorArticleDefinition[] = [
  {
    slug: 'pokemon-database',
    path: '/compare/lunidex-vs-pokemon-database',
    sources: [{ label: 'Pokémon Database Pokédex', url: 'https://pokemondb.net/pokedex' }],
    productPath: '/pokedex',
  },
  {
    slug: 'bulbapedia',
    path: '/compare/lunidex-vs-bulbapedia',
    sources: [{ label: 'Bulbapedia About page', url: 'https://bulbapedia.bulbagarden.net/wiki/Bulbapedia:About' }],
    productPath: '/pokedex',
  },
  {
    slug: 'pokemon-showdown',
    path: '/compare/lunidex-vs-pokemon-showdown',
    sources: [{ label: 'Pokémon Showdown simulator overview', url: 'https://www.smogon.com/sim/' }],
    productPath: '/team',
  },
  {
    slug: 'pokecardex',
    path: '/compare/lunidex-vs-pokecardex',
    sources: [
      { label: 'PokéCardex official application page', url: 'https://www.pokecardex.com/app' },
      { label: 'PokéCardex Google Play listing', url: 'https://play.google.com/store/apps/details?id=com.application.pokecardex' },
    ],
    productPath: '/tcg',
    comparisonRows: COMPARISON_ROW_KEYS,
    relatedPaths: ['/guides/pokemon-card-collection-tracker', '/guides/tcg-workspace-guide'],
  },
  {
    slug: 'zebradex',
    path: '/compare/lunidex-vs-zebradex',
    sources: [{ label: 'ZebraDex official site', url: 'https://zebradex.fr/index.php' }],
    productPath: '/tcg',
    comparisonRows: COMPARISON_ROW_KEYS,
    relatedPaths: ['/guides/pokemon-card-collection-tracker', '/guides/tcg-workspace-guide'],
  },
  {
    slug: 'collectr',
    path: '/compare/lunidex-vs-collectr',
    sources: [{ label: 'Collectr official site', url: 'https://www.getcollectr.com/' }],
    productPath: '/tcg',
    comparisonRows: COMPARISON_ROW_KEYS,
    relatedPaths: ['/guides/pokemon-card-collection-tracker', '/guides/tcg-workspace-guide'],
  },
  {
    slug: 'pokellector',
    path: '/compare/lunidex-vs-pokellector',
    sources: [{ label: 'Pokéllector official site', url: 'https://www.pokellector.com/' }],
    productPath: '/tcg',
    comparisonRows: COMPARISON_ROW_KEYS,
    relatedPaths: ['/guides/pokemon-card-collection-tracker', '/guides/tcg-workspace-guide'],
  },
  {
    slug: 'cardzia',
    path: '/compare/lunidex-vs-cardzia',
    sources: [
      { label: 'Cardzia official site', url: 'https://cardzia.fr/' },
      { label: 'Cardzia Google Play listing', url: 'https://play.google.com/store/apps/details?id=fr.cardzia.app' },
    ],
    productPath: '/tcg',
    comparisonRows: COMPARISON_ROW_KEYS,
    relatedPaths: ['/guides/pokemon-card-collection-tracker', '/guides/tcg-workspace-guide'],
  },
  {
    slug: 'cardmarket',
    path: '/compare/lunidex-vs-cardmarket',
    sources: [
      { label: 'Cardmarket Pokémon marketplace', url: 'https://www.cardmarket.com/en/Pokemon' },
      { label: 'Cardmarket product catalogue', url: 'https://downloads.s3.cardmarket.com/productCatalog/productList/products_nonsingles_6.json' },
      { label: 'Cardmarket price guide', url: 'https://downloads.s3.cardmarket.com/productCatalog/priceGuide/price_guide_6.json' },
    ],
    productPath: '/tcg',
    comparisonRows: COMPARISON_ROW_KEYS,
    relatedPaths: [
      '/guides/pokemon-card-collection-tracker',
      '/guides/pokemon-card-collection-value',
      '/guides/tcg-workspace-guide',
    ],
  },
];

export const FEATURE_GUIDES: FeatureGuideDefinition[] = [
  {
    slug: 'pokemon-reference-guide',
    path: '/guides/pokemon-reference-guide',
    productPaths: ['/pokedex', '/types', '/moves', '/abilities', '/items'],
  },
  {
    slug: 'team-tools-guide',
    path: '/guides/team-tools-guide',
    productPaths: ['/team', '/compare', '/ev-iv', '/breeding', '/battle'],
  },
  {
    slug: 'tcg-workspace-guide',
    path: '/guides/tcg-workspace-guide',
    productPaths: ['/tcg', '/tcg/start', '/tcg/collection', '/tcg/wishlist', '/tcg/deck-builder'],
    relatedPaths: ['/guides/pokemon-card-collection-tracker'],
  },
  {
    slug: 'progress-account-guide',
    path: '/guides/progress-account-guide',
    productPaths: ['/dashboard', '/favorites', '/friends', '/tcg/collection', '/tcg/wishlist'],
  },
  {
    slug: 'pokemon-card-collection-value',
    path: '/guides/pokemon-card-collection-value',
    productPaths: ['/tcg/collection', '/tcg/sealed'],
    relatedPaths: [
      '/guides/pokemon-card-collection-tracker',
      '/guides/tcg-workspace-guide',
      '/compare/lunidex-vs-cardmarket',
    ],
    sources: [
      { label: 'TCGdex', url: 'https://www.tcgdex.net/' },
      { label: 'Cardmarket product catalogue', url: 'https://downloads.s3.cardmarket.com/productCatalog/productList/products_nonsingles_6.json' },
      { label: 'Cardmarket price guide', url: 'https://downloads.s3.cardmarket.com/productCatalog/priceGuide/price_guide_6.json' },
    ],
    evidenceRows: GUIDE_EVIDENCE_ROW_KEYS,
    faqCount: 4,
  },
];

export const EDITORIAL_ROUTES = [
  ...COMPETITOR_ARTICLES.map(({ path }) => path),
  ...FEATURE_GUIDES.map(({ path }) => path),
] as const;

export function isEditorialIndexable(language: SupportedLanguage): language is EditorialLanguage {
  return (EDITORIAL_INDEXABLE_LOCALES as readonly string[]).includes(language);
}

export function getEditorialCanonicalLanguage(language: SupportedLanguage): EditorialLanguage {
  return isEditorialIndexable(language) ? language : 'en';
}

export function buildEditorialLanguages(path: string): Record<string, string> {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return {
    en: `/en${normalized}`,
    fr: `/fr${normalized}`,
    'x-default': `/en${normalized}`,
  };
}

export function getCompetitorArticle(slug: string): CompetitorArticleDefinition | undefined {
  return COMPETITOR_ARTICLES.find((article) => (
    article.slug === slug || article.path.split('/').filter(Boolean).at(-1) === slug
  ));
}

export function getFeatureGuide(slug: string): FeatureGuideDefinition | undefined {
  return FEATURE_GUIDES.find((guide) => guide.slug === slug);
}

export function getEditorialDates(path: string): EditorialDateDefinition {
  const dates = (EDITORIAL_ARTICLE_DATES as Record<string, EditorialDateDefinition | undefined>)[path];
  if (!dates) {
    throw new Error(`Missing editorial dates for ${path}`);
  }
  return dates;
}
