import type { Metadata } from 'next';
import NuzlockeClient from './NuzlockeClient';
import { getServerT, getServerLanguage } from '@/lib/server-i18n';
import { buildSubpathLanguages } from '@/lib/seo';

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT();
  const lang = await getServerLanguage();
  const title = t('nuzlocke.title', { defaultValue: 'Nuzlocke Tracker' });
  const description = t('nuzlocke.subtitle', { defaultValue: 'Track your Nuzlocke run: one catch per route, permadeath on faint' });

  return {
    title,
    description,
    alternates: {
      canonical: `/${lang}/nuzlocke`,
      languages: buildSubpathLanguages('/nuzlocke'),
    },
    openGraph: {
      title,
      description,
      url: `/${lang}/nuzlocke`,
      type: 'website',
    },
  };
}

export default function NuzlockePage() {
  return <NuzlockeClient />;
}
