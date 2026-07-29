import type { Metadata } from 'next';
import { TCGStartPage } from './TCGStartPage';
import { getServerLanguage, getServerT } from '@/lib/server-i18n';

export async function generateMetadata(): Promise<Metadata> {
  const [t, language] = await Promise.all([getServerT(), getServerLanguage()]);
  const title = t('tcg.activation.start_title', { defaultValue: 'Start your collection' });
  const description = t('tcg.activation.start_description', { defaultValue: 'Choose a Pokémon TCG set and start tracking your cards.' });

  return {
    title,
    description,
    alternates: { canonical: `/${language}/tcg/start` },
    robots: { index: false, follow: true },
  };
}

export default function TCGStartRoute() {
  return <TCGStartPage />;
}
