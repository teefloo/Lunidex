import { Metadata } from 'next';
import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import Header from '@/components/layout/Header';
import SiteFooter from '@/components/layout/SiteFooter';
import { BarChart3, Loader2 } from 'lucide-react';
import EVIVPageClient from './EVIVPageClient';

export const metadata: Metadata = {
  title: 'EV/IV Calculator — Competitive Stat Tool | PrimeDex',
  description:
    'Calculate the exact IV range for any Pokémon from in-game stats, and plan the perfect EV spread at level 50 or 100. Supports all 25 natures and Gen 9.',
  keywords: [
    'IV calculator', 'EV planner', 'Pokémon IVs', 'Pokémon EVs',
    'competitive pokemon', 'PrimeDex', 'stat calculator', 'nature multiplier',
  ],
  openGraph: {
    title: 'EV/IV Calculator | PrimeDex',
    description: 'Reverse-engineer IVs from in-game stats and plan your perfect EV spread.',
    type: 'website',
  },
};

function Loader() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
    </div>
  );
}

// Lazy-load client components (they depend on TanStack Query + browser APIs)
const EVIVCalculator = dynamic(
  () => import('@/components/ev-iv/EVIVCalculator'),
  { ssr: false, loading: () => <Loader /> }
);
const EVPlanner = dynamic(
  () => import('@/components/ev-iv/EVPlanner'),
  { ssr: false, loading: () => <Loader /> }
);

export default function EVIVPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen pt-24 pb-16 px-4 md:px-6">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Page header */}
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="p-3 bg-primary/10 rounded-sm border border-primary/20">
                <BarChart3 className="h-7 w-7 text-primary" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-foreground/90">
              EV / IV Calculator
            </h1>
            <p className="text-sm text-foreground/50 font-medium max-w-md mx-auto">
              Reverse-engineer IVs from your in-game stats, or plan the perfect EV spread at any level.
            </p>
          </div>

          <Suspense fallback={<Loader />}>
            <EVIVPageClient
              IVCalculator={<EVIVCalculator />}
              Planner={<EVPlanner />}
            />
          </Suspense>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
