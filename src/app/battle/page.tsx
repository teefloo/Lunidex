import type { Metadata } from 'next';
import Header from '@/components/layout/Header';
import PageHeader from '@/components/layout/PageHeader';
import { Swords, type LucideIcon } from 'lucide-react';
import BattleClient from './BattleClient';

const SwordsIcon = Swords as LucideIcon;

export const metadata: Metadata = {
  title: 'Battle Simulator — PrimeDex',
  description:
    'Simulate Pokémon battles with Gen 9 damage formula. Calculate damage, OHKO/2HKO chances, and run full AI duels.',
};

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
        <BattleClient />
      </main>
    </>
  );
}
