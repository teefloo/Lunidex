import type { Metadata } from 'next';
import ItemsPageClient from './ItemsPageClient';
import { getServerT, getServerLanguage } from '@/lib/server-i18n';
import { buildSubpathLanguages } from '@/lib/seo';

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT();
  const lang = await getServerLanguage();
  const title = t('items_page.title', { defaultValue: 'Items' });
  const description = t('items_page.subtitle', { defaultValue: 'Browse held items, berries, evolution stones, and more' });

  return {
    title,
    description,
    alternates: {
      canonical: `/${lang}/items`,
      languages: buildSubpathLanguages('/items'),
    },
    openGraph: {
      title,
      description,
      url: `/${lang}/items`,
      type: 'website',
    },
  };
}

export default function ItemsPage() {
  return <ItemsPageClient />;
}
