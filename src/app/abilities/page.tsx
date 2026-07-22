import type { Metadata } from 'next';
import AbilitiesPageClient from './AbilitiesPageClient';
import { getServerT, getServerLanguage } from '@/lib/server-i18n';
import { buildSubpathLanguages, DEFAULT_OG_IMAGE } from '@/lib/seo';

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT();
  const lang = await getServerLanguage();
  const title = t('abilities_page.title');
  const description = t('abilities_page.subtitle');

  return {
    title,
    description,
    alternates: {
      canonical: `/${lang}/abilities`,
      languages: buildSubpathLanguages('/abilities'),
    },
    openGraph: {
      title,
      description,
      url: `/${lang}/abilities`,
      type: 'website',
      images: [DEFAULT_OG_IMAGE],
    },
  };
}

export default function AbilitiesPage() {
  return <AbilitiesPageClient />;
}
