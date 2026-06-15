import { MetadataRoute } from 'next';
import { getAllPokemonNames } from '@/lib/api';
import { SITE_URL } from '@/lib/site';
import { supportedLanguages } from '@/lib/languages';

type StaticEntry = {
  path: string;
  changeFrequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  priority: number;
};

const STATIC_ROUTES: StaticEntry[] = [
  { path: '', changeFrequency: 'daily', priority: 1.0 },
  { path: 'team', changeFrequency: 'weekly', priority: 0.7 },
  { path: 'compare', changeFrequency: 'monthly', priority: 0.5 },
  { path: 'quiz', changeFrequency: 'monthly', priority: 0.6 },
  { path: 'types', changeFrequency: 'monthly', priority: 0.7 },
  { path: 'moves', changeFrequency: 'monthly', priority: 0.6 },
  { path: 'tcg', changeFrequency: 'weekly', priority: 0.6 },
  { path: 'faq', changeFrequency: 'monthly', priority: 0.7 },
  { path: 'about', changeFrequency: 'monthly', priority: 0.5 },
  { path: 'privacy', changeFrequency: 'yearly', priority: 0.2 },
  { path: 'terms', changeFrequency: 'yearly', priority: 0.2 },
  { path: 'cookies', changeFrequency: 'yearly', priority: 0.2 },
  { path: 'legal', changeFrequency: 'yearly', priority: 0.2 },
];

function buildLanguages(path: string): Record<string, string> {
  const normalized = path ? `/${path}` : '';
  const langs: Record<string, string> = {};
  for (const lang of supportedLanguages) {
    langs[lang] = `${SITE_URL}/${lang}${normalized}`;
  }
  return { ...langs, 'x-default': `${SITE_URL}/en${normalized}` };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SITE_URL;
  const lastmod = new Date();

  const pokemonList = await getAllPokemonNames();

  const pokemonUrls: MetadataRoute.Sitemap = pokemonList.map((pokemon) => {
    const id = pokemon.url.split('/').filter(Boolean).pop();
    return {
      url: `${baseUrl}/en/pokemon/${pokemon.name}`,
      lastModified: lastmod,
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

  const staticUrls: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => {
    const path = route.path ? `/${route.path}` : '';
    return {
      url: `${baseUrl}/en${path}`,
      lastModified: lastmod,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
      alternates: {
        languages: buildLanguages(route.path),
      },
    };
  });

  return [...staticUrls, ...pokemonUrls];
}
