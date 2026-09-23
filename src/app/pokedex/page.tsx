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
import { DEFAULT_OG_IMAGE, buildBreadcrumbJsonLd, buildSubpathLanguages, buildWebPageJsonLd, localeHref } from '@/lib/seo';
import { languageToOpenGraphLocale } from '@/lib/languages';
import { serializeJsonLd } from '@/lib/json-ld';
import { FEATURED_POKEMON } from '@/lib/pokemon-featured';

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
  const featuredPokemon = FEATURED_POKEMON.map((pokemon) => ({
    ...pokemon,
    displayName: t(`pokedex_page.featured_pokemon.${pokemon.slug}`, {
      defaultValue: pokemon.slug.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' '),
    }),
  }));

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': `${baseUrl}/${lang}/pokedex#pokedex-list`,
    name: t('pokedex.item_list_name'),
    description: t('pokedex.item_list_description'),
    url: `${baseUrl}/${lang}/pokedex`,
    itemListOrder: 'https://schema.org/ItemListOrderAscending',
    itemListElement: featuredPokemon.map((pokemon, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: pokemon.displayName,
      url: `${baseUrl}/${lang}/pokemon/${pokemon.slug}`,
      image: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemon.id}.png`,
    })),
  };

  const webPageJsonLd = buildWebPageJsonLd({
    lang,
    path: `/${lang}/pokedex`,
    name: pokedexTitle,
    description: t('pokedex.meta_description'),
    about: pokedexTitle,
    keywords: t('pokedex.meta_title'),
  });
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: t('common.home', { defaultValue: 'Lunidex' }), path: '/' },
    { name: pokedexTitle, path: '/pokedex' },
  ], lang);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <script id="pokedex-item-list-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(itemListJsonLd) }} />
      <script id="pokedex-webpage-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(webPageJsonLd) }} />
      <script id="pokedex-breadcrumb-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumb) }} />
      <div className="app-page pokedex-redesign">
        <Header />
        <main className="pokedex-redesign-main relative z-10 pt-28 pb-8 md:pt-32">
          <PokedexHero />
          <PokemonList />
          <section className="page-shell mt-8" aria-labelledby="pokedex-priority-links-title">
            <div className="rounded-sm border border-border/50 bg-card/35 p-5 sm:p-7">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
                {t('pokedex_page.featured_eyebrow', { defaultValue: 'Explore the Pokédex' })}
              </p>
              <h2 id="pokedex-priority-links-title" className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
                {t('pokedex_page.featured_title', { defaultValue: 'Popular Pokémon and reference hubs' })}
              </h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {featuredPokemon.map((pokemon) => (
                  <Link
                    key={pokemon.slug}
                    href={localeHref(`/pokemon/${pokemon.slug}`, lang)}
                    className="inline-flex min-h-11 items-center rounded-sm border border-border/50 bg-background/40 px-3 py-2 text-sm font-bold text-foreground/70 transition-colors hover:border-primary/40 hover:text-primary"
                  >
                    {pokemon.displayName}
                  </Link>
                ))}
              </div>
              <nav className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm font-bold text-primary" aria-label={t('pokedex_page.reference_hubs', { defaultValue: 'Pokédex reference hubs' })}>
                <Link href={localeHref('/types', lang)} className="inline-flex min-h-11 items-center underline-offset-4 hover:underline">{t('list.types', { defaultValue: 'Types' })}</Link>
                <Link href={localeHref('/moves', lang)} className="inline-flex min-h-11 items-center underline-offset-4 hover:underline">{t('list.moves', { defaultValue: 'Moves' })}</Link>
                <Link href={localeHref('/abilities', lang)} className="inline-flex min-h-11 items-center underline-offset-4 hover:underline">{t('list.abilities', { defaultValue: 'Abilities' })}</Link>
                <Link href={localeHref('/items', lang)} className="inline-flex min-h-11 items-center underline-offset-4 hover:underline">{t('list.items', { defaultValue: 'Items' })}</Link>
              </nav>
              <nav className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm font-bold text-primary" aria-label={t('team_guide.cta_title')}>
                <Link href={localeHref('/team', lang)} className="inline-flex min-h-11 items-center underline-offset-4 hover:underline">{t('team.title')}</Link>
                <Link href={localeHref('/nuzlocke', lang)} className="inline-flex min-h-11 items-center underline-offset-4 hover:underline">{t('nuzlocke.title')}</Link>
                <Link href={localeHref('/tcg', lang)} className="inline-flex min-h-11 items-center underline-offset-4 hover:underline">{t('tcg.page_heading')}</Link>
              </nav>
            </div>
          </section>
          <PokemonOfTheDay />
          <ClientRecentlyViewed />
        </main>
      </div>
    </HydrationBoundary>
  );
}
