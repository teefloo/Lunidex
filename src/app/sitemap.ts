import { MetadataRoute } from 'next';
import { getAllPokemonNames } from '@/lib/api';
import { SITE_URL } from '@/lib/site';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SITE_URL;

  // Get all pokemon names to generate dynamic routes
  const pokemonList = await getAllPokemonNames();

  const pokemonUrls: MetadataRoute.Sitemap = pokemonList.map((pokemon) => ({
    url: `${baseUrl}/pokemon/${pokemon.name}`,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
    images: [
      `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemon.url.split('/').filter(Boolean).pop()}.png`,
    ],
  }));

  // Static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/types`,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/compare`,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/quiz`,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/tcg`,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/moves`,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
  ];

  return [...staticRoutes, ...pokemonUrls];
}
