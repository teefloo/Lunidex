import type { Metadata } from 'next';
import { getServerT, getServerLanguage } from '@/lib/server-i18n';
import { buildSubpathLanguages } from '@/lib/seo';
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
    },
  };
}

interface Props {
  searchParams: Promise<{ pokemon?: string; tab?: string }>;
}

export default async function BreedingPage({ searchParams }: Props) {
  const { pokemon, tab } = await searchParams;

  return (
    <>
      <Header />
      <main className="min-h-dvh pt-24 pb-16 px-4 md:px-6">
        <div className="max-w-4xl mx-auto">
          <BreedingPageClient initialPokemon={pokemon} initialTab={tab} />
        </div>
      </main>
    </>
  );
}
