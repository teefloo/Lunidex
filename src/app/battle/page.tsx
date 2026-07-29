import type { Metadata } from 'next';
import { getServerT, getServerLanguage } from '@/lib/server-i18n';
import { buildSubpathLanguages, DEFAULT_OG_IMAGE } from '@/lib/seo';
import Header from '@/components/layout/Header';
import PageHeader from '@/components/layout/PageHeader';
import { Swords, type LucideIcon } from 'lucide-react';
import BattleClient from './BattleClient';

const SwordsIcon = Swords as LucideIcon;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT();
  const lang = await getServerLanguage();
  const title = t('battle.meta_title') || 'Battle Simulator — PrimeDex';
  const description = t('battle.meta_description') || 'Simulate Pokémon battles with Gen 9 damage formula. Calculate damage, OHKO/2HKO chances, and run full AI duels.';
  return {
    title,
    description,
    alternates: {
      canonical: `/${lang}/battle`,
      languages: buildSubpathLanguages('/battle'),
    },
    openGraph: {
      title,
      description,
      type: 'website',
      images: [DEFAULT_OG_IMAGE],
    },
  };
}

export default function BattlePage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-5xl px-4 pb-16 pt-24 md:px-6 md:pt-28">
        <PageHeader
          icon={SwordsIcon}
          title="Battle Simulator"
          description="Gen 9 damage calculator and AI duel mode"
        />
        <BattleClient />
      </main>
    </>
  );
}
