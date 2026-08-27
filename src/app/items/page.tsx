import type { Metadata } from 'next';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import ItemsPageClient from './ItemsPageClient';
import { getServerT, getServerLanguage } from '@/lib/server-i18n';
import { buildSubpathLanguages, DEFAULT_OG_IMAGE } from '@/lib/seo';
import { getInitialItemsCached } from '@/lib/api/server-cache';
import { languageToPokemonLanguageId } from '@/lib/languages';
import { ServerIndexLinks } from '@/components/seo/ServerIndexLinks';

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
      images: [DEFAULT_OG_IMAGE],
      type: 'website',
    },
  };
}

export default async function ItemsPage() {
  const t = await getServerT();
  const lang = await getServerLanguage();
  const initialLanguageId = languageToPokemonLanguageId[lang];
  const initialItems = await getInitialItemsCached(initialLanguageId)
    .catch(() => []);
  const queryClient = new QueryClient();
  queryClient.setQueryData(['items', initialLanguageId], initialItems);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ItemsPageClient initialItems={initialItems} />
      <ServerIndexLinks
        title={t('items_page.title', { defaultValue: 'Items' })}
        links={initialItems.slice(0, 12).map((item) => ({
          href: `/${lang}/items/${item.name}`,
          label: item.pokemon_v2_itemnames?.[0]?.name || item.name,
        }))}
      />
    </HydrationBoundary>
  );
}
