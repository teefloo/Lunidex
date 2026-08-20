import { MetadataRoute } from 'next';
import { getAllAbilityNamesCached, getAllItemNamesCached, getAllMoveNamesCached, getAllPokemonNamesCached } from '../lib/api/server-cache';
import { isTcgLangSupported } from '@/lib/api/tcg';
import { SITE_URL } from '@/lib/site';
import { supportedLanguages } from '@/lib/languages';
import { unstable_cache } from 'next/cache';

const TCG_CARD_LIST_URL = 'https://api.tcgdex.net/v2/en/cards';
const TCG_CARD_PAGE_SIZE = 250;
const TCG_CARD_MAX_PAGES = 200;
const TCG_CARD_BATCH_SIZE = 10;
const TCG_CARD_PAGE_RETRIES = 3;
const TCG_CARD_PAGE_TIMEOUT_MS = 8000;

export const revalidate = 86400;

type StaticEntry = {
  path: string;
  changeFrequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  priority: number;
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
  { path: 'compare/lunidex-vs-pokecardex-zebradex', changeFrequency: 'monthly', priority: 0.75 },
  { path: 'guides/pokemon-card-collection-tracker', changeFrequency: 'monthly', priority: 0.72 },
  { path: 'guides/team-builder-guide', changeFrequency: 'monthly', priority: 0.72 },
  { path: 'guides/quiz-guide', changeFrequency: 'monthly', priority: 0.72 },
  { path: 'guides/nuzlocke-guide', changeFrequency: 'monthly', priority: 0.72 },
  { path: 'blog', changeFrequency: 'monthly', priority: 0.65 },
  { path: 'faq', changeFrequency: 'monthly', priority: 0.7 },
  { path: 'about', changeFrequency: 'monthly', priority: 0.5 },
  { path: 'contact', changeFrequency: 'monthly', priority: 0.5 },
];

function buildLanguages(path: string): Record<string, string> {
  const normalized = path ? `/${path}` : '';
  const langs: Record<string, string> = {};
  for (const lang of supportedLanguages) {
    langs[lang] = `${SITE_URL}/${lang}${normalized}`;
  }
  return { ...langs, 'x-default': `${SITE_URL}/en${normalized}` };
}

export function buildTcgLanguages(path: string): Record<string, string> {
  const normalized = path ? `/${path}` : '';
  const langs = supportedLanguages
    .filter(isTcgLangSupported)
    .reduce<Record<string, string>>((result, lang) => {
      result[lang] = `${SITE_URL}/${lang}${normalized}`;
      return result;
    }, {});

  return { ...langs, 'x-default': `${SITE_URL}/en${normalized}` };
}

async function getTcgCardPage(page: number): Promise<string[] | null> {
  const params = new URLSearchParams({
    'pagination:page': String(page),
    'pagination:itemsPerPage': String(TCG_CARD_PAGE_SIZE),
    'sort:field': 'id',
    'sort:order': 'ASC',
  });
  for (let attempt = 0; attempt < TCG_CARD_PAGE_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TCG_CARD_PAGE_TIMEOUT_MS);

    try {
      const response = await fetch(`${TCG_CARD_LIST_URL}?${params.toString()}`, {
        next: { revalidate: 86400 },
        signal: controller.signal,
      });
      if (!response.ok) {
        if (attempt === TCG_CARD_PAGE_RETRIES - 1) return null;
        continue;
      }

      const data = await response.json() as unknown;
      if (!Array.isArray(data)) return [];

      return data.flatMap((card) => {
        if (!card || typeof card !== 'object' || !('id' in card)) return [];
        const id = (card as { id?: unknown }).id;
        return typeof id === 'string' && id.length > 0 ? [id] : [];
      });
    } catch {
      if (attempt === TCG_CARD_PAGE_RETRIES - 1) return null;
    } finally {
      clearTimeout(timeoutId);
    }

    await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
  }

  return null;
}

async function getTcgCardIds(): Promise<string[]> {
  const ids: string[] = [];

  for (let batchStart = 1; batchStart <= TCG_CARD_MAX_PAGES; batchStart += TCG_CARD_BATCH_SIZE) {
    const batchEnd = Math.min(batchStart + TCG_CARD_BATCH_SIZE - 1, TCG_CARD_MAX_PAGES);
    const pages = await Promise.all(
      Array.from({ length: batchEnd - batchStart + 1 }, (_, index) => getTcgCardPage(batchStart + index)),
    );

    if (pages.some((page) => page === null)) {
      console.warn('sitemap: TCGdex card listing was incomplete; keeping the cards fetched so far');
      break;
    }

    for (const page of pages) {
      ids.push(...(page ?? []));
    }

    if (pages.some((page) => (page?.length ?? 0) < TCG_CARD_PAGE_SIZE)) break;
  }

  return [...new Set(ids)];
}

const getTcgCardIdsCached = unstable_cache(
  getTcgCardIds,
  ['lunidex:sitemap:tcg-card-ids:v1'],
  { revalidate: 86400 },
);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SITE_URL;

  let pokemonList: { name: string; url: string }[] = [];
  let tcgCardIds: string[] = [];
  let moveNames: string[] = [];
  let abilityNames: string[] = [];
  let itemNames: string[] = [];

  const [pokemonResult, tcgResult, moveResult, abilityResult, itemResult] = await Promise.allSettled([
    getAllPokemonNamesCached(),
    getTcgCardIdsCached(),
    getAllMoveNamesCached(),
    getAllAbilityNamesCached(),
    getAllItemNamesCached(),
  ]);

  if (pokemonResult.status === 'fulfilled') {
    pokemonList = pokemonResult.value;
  } else {
    console.warn('sitemap: failed to fetch pokemon list, generating static routes only', pokemonResult.reason);
  }

  if (tcgResult.status === 'fulfilled') {
    tcgCardIds = tcgResult.value;
  } else {
    console.warn('sitemap: failed to fetch TCG card list, generating without TCG card routes', tcgResult.reason);
  }

  if (moveResult.status === 'fulfilled') {
    moveNames = moveResult.value;
  } else {
    console.warn('sitemap: failed to fetch move list, generating without move detail routes', moveResult.reason);
  }

  if (abilityResult.status === 'fulfilled') {
    abilityNames = abilityResult.value;
  } else {
    console.warn('sitemap: failed to fetch ability list, generating without ability detail routes', abilityResult.reason);
  }

  if (itemResult.status === 'fulfilled') {
    itemNames = itemResult.value;
  } else {
    console.warn('sitemap: failed to fetch item list, generating without item detail routes', itemResult.reason);
  }

  const pokemonUrls: MetadataRoute.Sitemap = pokemonList.map((pokemon) => {
    const id = pokemon.url.split('/').filter(Boolean).pop();
    return {
      url: `${baseUrl}/en/pokemon/${pokemon.name}`,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
      images: [
        `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`,
      ],
      alternates: {
        languages: buildLanguages(`pokemon/${pokemon.name}`),
      },
    };
  });

  const staticUrls: MetadataRoute.Sitemap = LAUNCH_SITEMAP_ROUTES.map((route) => {
    const path = route.path ? `/${route.path}` : '';
    return {
      url: `${baseUrl}/en${path}`,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
      alternates: {
        languages: buildLanguages(route.path),
      },
    };
  });

  const tcgCardUrls: MetadataRoute.Sitemap = tcgCardIds.map((cardId) => ({
    url: `${baseUrl}/en/tcg/cards/${encodeURIComponent(cardId)}`,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
    alternates: {
      languages: buildTcgLanguages(`tcg/cards/${cardId}`),
    },
  }));

  const referenceUrls: MetadataRoute.Sitemap = [
    ...moveNames.map((name) => ({
      url: `${baseUrl}/en/moves/${name}`,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
      alternates: { languages: buildLanguages(`moves/${name}`) },
    })),
    ...abilityNames.map((name) => ({
      url: `${baseUrl}/en/abilities/${name}`,
      changeFrequency: 'monthly' as const,
      priority: 0.5,
      alternates: { languages: buildLanguages(`abilities/${name}`) },
    })),
    ...itemNames.map((name) => ({
      url: `${baseUrl}/en/items/${name}`,
      changeFrequency: 'monthly' as const,
      priority: 0.5,
      alternates: { languages: buildLanguages(`items/${name}`) },
    })),
  ];

  return [...staticUrls, ...pokemonUrls, ...referenceUrls, ...tcgCardUrls];
}
