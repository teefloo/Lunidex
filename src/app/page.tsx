import Header from '@/components/layout/Header';
import PokemonList from '@/components/pokemon/PokemonList';
import ClientRecentlyViewed from '@/components/pokemon/ClientRecentlyViewed';
import HeroSection from '@/components/layout/HeroSection';
import HomeFaqSection from '@/components/layout/HomeFaqSection';
import PokemonOfTheDay from '@/components/pokemon/PokemonOfTheDay';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { getPokemonList } from '@/lib/api';
import { getPokemonSummarySlice } from '@/lib/api/graphql';
import { pokemonKeys } from '@/lib/api/keys';
import { SITE_URL } from '@/lib/site';
import { getServerT } from '@/lib/server-i18n';

export const revalidate = 3600;

export default async function Home() {
  const queryClient = new QueryClient();
  const t = await getServerT();
  const baseUrl = SITE_URL;

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
    '@id': `${baseUrl}/#pokedex-list`,
    name: 'Complete Pokédex — All 1025 Pokémon',
    description: 'The complete National Pokédex listing all 1025 Pokémon across 9 generations with stats, types, and official artwork.',
    url: `${baseUrl}/en`,
    numberOfItems: 1025,
    itemListOrder: 'https://schema.org/ItemListOrderAscending',
    itemListElement: topPokemon.map((slug, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: slug.charAt(0).toUpperCase() + slug.slice(1),
      url: `${baseUrl}/en/pokemon/${slug}`,
      image: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${[25, 6, 150, 384, 493, 445, 448, 133, 143, 149, 94, 65, 68, 131, 130][index]}.png`,
    })),
  };

  const faqPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${baseUrl}/#faq`,
    url: `${baseUrl}/en`,
    name: t('home.faq_title'),
    inLanguage: 'en',
    mainEntity: [
      { '@type': 'Question', name: t('home.faq_q1'), acceptedAnswer: { '@type': 'Answer', text: t('home.faq_a1') } },
      { '@type': 'Question', name: t('home.faq_q2'), acceptedAnswer: { '@type': 'Answer', text: t('home.faq_a2') } },
      { '@type': 'Question', name: t('home.faq_q3'), acceptedAnswer: { '@type': 'Answer', text: t('home.faq_a3') } },
      { '@type': 'Question', name: t('home.faq_q4'), acceptedAnswer: { '@type': 'Answer', text: t('home.faq_a4') } },
      { '@type': 'Question', name: t('home.faq_q5'), acceptedAnswer: { '@type': 'Answer', text: t('home.faq_a5') } },
      { '@type': 'Question', name: t('home.faq_q6'), acceptedAnswer: { '@type': 'Answer', text: t('home.faq_a6') } },
    ],
  };

  const howToJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    '@id': `${baseUrl}/#howto-team-builder`,
    name: 'How to build a competitive Pokémon team with PrimeDex',
    description: 'Step-by-step guide to building a balanced 6-Pokémon team using the PrimeDex team builder tool, optimized for type coverage, stat synergy, and role distribution.',
    totalTime: 'PT5M',
    estimatedCost: { '@type': 'MonetaryAmount', currency: 'USD', value: '0' },
    tool: [
      { '@type': 'HowToTool', name: 'PrimeDex team builder' },
      { '@type': 'HowToTool', name: 'PokeAPI type data' },
    ],
    step: [
      {
        '@type': 'HowToStep',
        position: 1,
        name: 'Open the team builder',
        text: 'Navigate to /en/team to access the drag-and-drop team builder.',
        url: `${baseUrl}/en/team`,
      },
      {
        '@type': 'HowToStep',
        position: 2,
        name: 'Add 6 Pokémon',
        text: 'Add up to 6 Pokémon from the National Pokédex (all 1025 entries).',
      },
      {
        '@type': 'HowToStep',
        position: 3,
        name: 'Check type coverage',
        text: 'Review the live type coverage bar to identify weaknesses across 18 offensive types.',
      },
      {
        '@type': 'HowToStep',
        position: 4,
        name: 'Balance roles',
        text: 'Aim for at least one physical sweeper, one special wallbreaker, one tank, and one support/defensive pivot.',
      },
      {
        '@type': 'HowToStep',
        position: 5,
        name: 'Export and share',
        text: 'Save the team to your account or export it as a Showdown paste.',
      },
    ],
  };

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <script
        id="item-list-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <script
        id="faq-page-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPageJsonLd) }}
      />
      <script
        id="howto-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }}
      />
      <div className="app-page">
        <Header />

        <main id="main-content" className="relative z-10 pt-28 pb-8 md:pt-32">
          <HeroSection />
          <PokemonOfTheDay />

          <PokemonList />
          <ClientRecentlyViewed />
          <HomeFaqSection />
        </main>


      </div>
    </HydrationBoundary>
  );
}
