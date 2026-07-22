import type { Metadata } from 'next';
import DeckBuilderClient from './DeckBuilderClient';
import { getServerT, getServerLanguage } from '@/lib/server-i18n';
import { buildSubpathLanguages, DEFAULT_OG_IMAGE } from '@/lib/seo';

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT();
  const lang = await getServerLanguage();
  const title = t('tcg.deck_builder.title', { defaultValue: 'Deck Builder' });
  const description = t('tcg.deck_builder.subtitle', { defaultValue: 'Build a 60-card Pokémon TCG deck (max 4 copies per card, except basic Energy)' });

  return {
    title,
    description,
    alternates: {
      canonical: `/${lang}/tcg/deck-builder`,
      languages: buildSubpathLanguages('/tcg/deck-builder'),
    },
    openGraph: {
      title,
      description,
      url: `/${lang}/tcg/deck-builder`,
      type: 'website',
      images: [DEFAULT_OG_IMAGE],
    },
  };
}

export default function DeckBuilderPage() {
  return <DeckBuilderClient />;
}
