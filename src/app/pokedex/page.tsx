import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import PokemonList from '@/components/pokemon/PokemonList';
import ClientRecentlyViewed from '@/components/pokemon/ClientRecentlyViewed';
import PokedexHero from '@/components/pokemon/PokedexHero';
import PokemonOfTheDay from '@/components/pokemon/PokemonOfTheDay';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { getPokemonListCached, getPokemonSummarySliceCached } from '@/lib/api/server-cache';
import { pokemonKeys } from '@/lib/api/keys';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import { getServerLanguage, getServerT } from '@/lib/server-i18n';
import { DEFAULT_OG_IMAGE, buildSubpathLanguages, buildWebPageJsonLd, localeHref } from '@/lib/seo';
import { languageToOpenGraphLocale } from '@/lib/languages';
import { serializeJsonLd } from '@/lib/json-ld';

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const [t, language] = await Promise.all([getServerT(), getServerLanguage()]);
  const title = t('pokedex.meta_title');
  const description = t('pokedex.meta_description');

  return {
    title,
    description,
    alternates: {
      canonical: `/${language}/pokedex`,
      languages: buildSubpathLanguages('/pokedex'),
    },
    openGraph: {
      title, description, url: `/${language}/pokedex`, locale: languageToOpenGraphLocale[language], type: 'website', siteName: SITE_NAME,
      images: [{ ...DEFAULT_OG_IMAGE, alt: t('pokedex.og_alt') }],
    },
    twitter: {
      card: 'summary_large_image', title, description,
      images: [{ ...DEFAULT_OG_IMAGE, alt: t('pokedex.og_alt') }],
    },
  };
}

export default async function PokedexPage() {
  const queryClient = new QueryClient();
  const [t, lang] = await Promise.all([getServerT(), getServerLanguage()]);
  const baseUrl = SITE_URL;
  const pokedexTitle = t('pokedex.title');

  // The page shell should remain usable when either upstream PokéAPI service
  // is temporarily unavailable. React Query will retry these requests in the
  // browser; a rejected server prefetch must not turn the whole route into a
  // navigation-level error page.
  await Promise.allSettled([
    queryClient.prefetchInfiniteQuery({
      queryKey: pokemonKeys.lists(),
      queryFn: ({ pageParam = 0 }) => getPokemonListCached(pageParam),
      initialPageParam: 0,
    }),
    queryClient.prefetchQuery({
      queryKey: pokemonKeys.summarySlice(0, 80),
      queryFn: () => getPokemonSummarySliceCached(80, 0),
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
    name: t('pokedex.item_list_name'),
    description: t('pokedex.item_list_description'),
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
    description: t('pokedex.meta_description'),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <script id="pokedex-item-list-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(itemListJsonLd) }} />
      <script id="pokedex-webpage-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(webPageJsonLd) }} />
      <div className="app-page pokedex-redesign">
        <Header />
        <main className="pokedex-redesign-main relative z-10 pt-28 pb-8 md:pt-32">
          <PokedexHero />
          <section className="page-shell mt-8" aria-labelledby="pokedex-priority-links-title">
            <div className="rounded-sm border border-border/50 bg-card/35 p-5 sm:p-7">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
                {t('pokedex.featured_eyebrow', { defaultValue: 'Explore the Pokédex' })}
              </p>
              <h2 id="pokedex-priority-links-title" className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
                {t('pokedex.featured_title', { defaultValue: 'Popular Pokémon and reference hubs' })}
              </h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {topPokemon.map((slug) => (
                  <Link
                    key={slug}
                    href={localeHref(`/pokemon/${slug}`, lang)}
                    className="rounded-sm border border-border/50 bg-background/40 px-3 py-2 text-sm font-bold text-foreground/70 transition-colors hover:border-primary/40 hover:text-primary"
                  >
                    {slug.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')}
                  </Link>
                ))}
              </div>
              <nav className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm font-bold text-primary" aria-label={t('pokedex.reference_hubs', { defaultValue: 'Pokédex reference hubs' })}>
                <Link href={localeHref('/types', lang)} className="underline-offset-4 hover:underline">{t('list.types', { defaultValue: 'Types' })}</Link>
                <Link href={localeHref('/moves', lang)} className="underline-offset-4 hover:underline">{t('list.moves', { defaultValue: 'Moves' })}</Link>
                <Link href={localeHref('/abilities', lang)} className="underline-offset-4 hover:underline">{t('list.abilities', { defaultValue: 'Abilities' })}</Link>
                <Link href={localeHref('/items', lang)} className="underline-offset-4 hover:underline">{t('list.items', { defaultValue: 'Items' })}</Link>
              </nav>
            </div>
          </section>
          <PokemonOfTheDay />
          <PokemonList />
          <ClientRecentlyViewed />
        </main>
      </div>
    </HydrationBoundary>
  );
}
