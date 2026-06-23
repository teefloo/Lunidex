import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import Header from '@/components/layout/Header';
import PageHeader from '@/components/layout/PageHeader';
import { Swords, Wifi, type LucideIcon } from 'lucide-react';

const SwordsIcon = Swords as LucideIcon;

export const metadata: Metadata = {
  title: 'Battle Simulator — PrimeDex',
  description:
    'Simulate Pokémon battles with Gen 9 damage formula. Calculate damage, OHKO/2HKO chances, and run full AI duels.',
};

// Client components — loaded dynamically to keep the server shell minimal
const BattleSimulator = dynamic(() => import('@/components/battle/BattleSimulator'), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 items-center justify-center">
      <div className="flex items-center gap-2 font-mono text-sm text-muted-foreground">
        <Swords className="h-4 w-4 animate-pulse" /> Loading simulator…
      </div>
    </div>
  ),
});

const BattleRoomSection = dynamic(() => import('./BattleRoomSection'), {
  ssr: false,
  loading: () => (
    <div className="flex h-32 items-center justify-center">
      <div className="flex items-center gap-2 font-mono text-sm text-muted-foreground">
        <Wifi className="h-4 w-4 animate-pulse" /> Loading PvP…
      </div>
    </div>
  ),
});

export default function BattlePage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-5xl px-4 pb-16 pt-24 md:px-6 md:pt-28">
        <PageHeader
          icon={SwordsIcon}
          title="Battle Simulator"
          description="Gen 9 damage calculator · AI duel mode · PvP via Realtime"
        />

        <div className="mt-8 flex flex-col gap-10">
          {/* Damage calculator + AI duel */}
          <section>
            <h2 className="mb-4 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
              Damage Calculator
            </h2>
            <Suspense>
              <BattleSimulator />
            </Suspense>
          </section>

          {/* PvP room */}
          <section>
            <h2 className="mb-4 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
              PvP Battle Room
            </h2>
            <Suspense>
              <BattleRoomSection />
            </Suspense>
          </section>
        </div>
      </main>
    </>
  );
}
