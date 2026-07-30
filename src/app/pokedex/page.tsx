import type { Metadata } from 'next';
import Header from '@/components/layout/Header';
import PokemonList from '@/components/pokemon/PokemonList';
import ClientRecentlyViewed from '@/components/pokemon/ClientRecentlyViewed';
import PokedexHero from '@/components/pokemon/PokedexHero';
import PokemonOfTheDay from '@/components/pokemon/PokemonOfTheDay';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { getPokemonList } from '@/lib/api';
import { getPokemonSummarySlice } from '@/lib/api/graphql';
import { pokemonKeys } from '@/lib/api/keys';
import { SITE_URL } from '@/lib/site';
import { getServerLanguage, getServerT } from '@/lib/server-i18n';
import { buildSubpathLanguages, buildWebPageJsonLd } from '@/lib/seo';

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const [t, language] = await Promise.all([getServerT(), getServerLanguage()]);
  const title = t('home.hero_title', { defaultValue: 'Pokédex' });
  const description = t('home.hero_subtitle', { defaultValue: 'The Ultimate Pokémon Companion' });

  return {
    title,
    description,
    alternates: {
      canonical: `/${language}/pokedex`,
      languages: buildSubpathLanguages('/pokedex'),
    },
  };
}

export default async function PokedexPage() {
  const queryClient = new QueryClient();
  const [t, lang] = await Promise.all([getServerT(), getServerLanguage()]);
  const baseUrl = SITE_URL;
  const pokedexTitle = t('home.hero_title', { defaultValue: 'Pokédex' });

  await Promise.all([
    queryClient.prefetchInfiniteQuery({
      queryKey: pokemonKeys.lists(),
      queryFn: getPokemonList,
      initialPageParam: 0,
    }),
    queryClient.prefetchQuery({
      queryKey: pokemonKeys.summarySlice(0, 80),
      queryFn: () => getPokemonSummarySlice(80, 0),
    }),
  ]);

  const topPokemon = [
    'pikachu', 'charizard', 'mewtwo', 'rayquaza', 'arceus',
    'garchomp', 'lucario', 'eevee', 'snorlax', 'dragonite',
    'gengar', 'alakazam', 'machamp', 'lapras', 'gyarados',
  ];

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': `${baseUrl}/${lang}/pokedex#pokedex-list`,
    name: 'Complete Pokédex — All Pokémon',
    description: 'A complete Pokédex with Pokémon types, statistics, evolutions, and official artwork.',
    url: `${baseUrl}/${lang}/pokedex`,
    itemListOrder: 'https://schema.org/ItemListOrderAscending',
    itemListElement: topPokemon.map((slug, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: slug.charAt(0).toUpperCase() + slug.slice(1),
      url: `${baseUrl}/${lang}/pokemon/${slug}`,
      image: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${[25, 6, 150, 384, 493, 445, 448, 133, 143, 149, 94, 65, 68, 131, 130][index]}.png`,
    })),
  };

  const webPageJsonLd = buildWebPageJsonLd({
    lang,
    path: `/${lang}/pokedex`,
    name: pokedexTitle,
    description: t('home.hero_subtitle', { defaultValue: 'The Ultimate Pokémon Companion' }),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <script id="pokedex-item-list-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />
      <script id="pokedex-webpage-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }} />
      <div className="app-page">
        <Header />
        <main className="relative z-10 pt-28 pb-8 md:pt-32">
          <PokedexHero />
          <PokemonOfTheDay />
          <PokemonList />
          <ClientRecentlyViewed />
        </main>
      </div>
    </HydrationBoundary>
  );
}
