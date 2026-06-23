import { Metadata } from 'next';
import Header from '@/components/layout/Header';
import { BreedingPageClient } from './BreedingPageClient';

export const metadata: Metadata = {
  title: 'Breeding Calculator | PrimeDex',
  description: 'Calculate IV inheritance probability, egg moves, and optimal breeding chains for any Pokémon. Gen 6+ Destiny Knot & Everstone mechanics.',
  keywords: ['Pokémon breeding', 'IV calculator', 'Destiny Knot', 'Everstone', 'egg moves', 'breeding chain', 'PrimeDex'],
  openGraph: {
    title: 'Breeding Calculator | PrimeDex',
    description: 'Calculate IV inheritance probability, egg moves, and optimal breeding chains.',
    type: 'website',
  },
};

interface Props {
  searchParams: Promise<{ pokemon?: string; tab?: string }>;
}

export default async function BreedingPage({ searchParams }: Props) {
  const { pokemon, tab } = await searchParams;

  return (
    <>
      <Header />
      <main className="min-h-screen pt-24 pb-16 px-4 md:px-6">
        <div className="max-w-4xl mx-auto">
          <BreedingPageClient initialPokemon={pokemon} initialTab={tab} />
        </div>
      </main>
    </>
  );
}
