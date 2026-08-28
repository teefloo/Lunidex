import type { Metadata } from 'next';
import { getServerT, getServerLanguage } from '@/lib/server-i18n';
import { buildSubpathLanguages, DEFAULT_OG_IMAGE } from '@/lib/seo';
import Header from '@/components/layout/Header';
import { BreedingPageClient } from './BreedingPageClient';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT();
  const lang = await getServerLanguage();
  const title = t('breeding.meta_title') || 'Breeding Calculator';
  const description = t('breeding.meta_description') || 'Calculate IV inheritance probability, egg moves, and optimal breeding chains for any Pokémon. Gen 6+ Destiny Knot & Everstone mechanics.';
  return {
    title,
    description,
    alternates: {
      canonical: `/${lang}/breeding`,
      languages: buildSubpathLanguages('/breeding'),
    },
    openGraph: {
      title,
      description,
      type: 'website',
      images: [DEFAULT_OG_IMAGE],
    },
  };
}

type SearchParamValue = string | string[] | undefined;

interface Props {
  searchParams: Promise<{ pokemon?: SearchParamValue; tab?: SearchParamValue }>;
}

function firstSearchParam(value: SearchParamValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function BreedingPage({ searchParams }: Props) {
  const { pokemon, tab } = await searchParams;
  const initialPokemon = firstSearchParam(pokemon);
  const initialTab = firstSearchParam(tab);

  return (
    <>
      <Header />
      <main className="min-h-dvh pt-24 pb-16 px-4 md:px-6">
        <div className="max-w-4xl mx-auto">
          <BreedingPageClient initialPokemon={initialPokemon} initialTab={initialTab} />
        </div>
      </main>
    </>
  );
}
