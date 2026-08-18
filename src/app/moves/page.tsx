import type { Metadata } from 'next';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import MovesPageClient from './MovesPageClient';
import { getServerT, getServerLanguage } from '@/lib/server-i18n';
import { buildSubpathLanguages, DEFAULT_OG_IMAGE } from '@/lib/seo';
import { getInitialMovesCached } from '@/lib/api/server-cache';
import { languageToPokemonLanguageId } from '@/lib/languages';
import { ServerIndexLinks } from '@/components/seo/ServerIndexLinks';

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT();
  const lang = await getServerLanguage();
  const title = t('moves_page.title');
  const description = t('moves_page.subtitle');

  return {
    title,
    description,
    alternates: {
      canonical: `/${lang}/moves`,
      languages: buildSubpathLanguages('/moves'),
    },
    openGraph: {
      title,
      description,
      url: `/${lang}/moves`,
      type: 'website',
      images: [DEFAULT_OG_IMAGE],
    },
  };
}

export default async function MovesPage() {
  const t = await getServerT();
  const lang = await getServerLanguage();
  const initialLanguageId = languageToPokemonLanguageId[lang];
  const queryClient = new QueryClient();
  const initialMoves = await getInitialMovesCached(initialLanguageId)
    .catch(() => []);
  queryClient.setQueryData(['moves', initialLanguageId], initialMoves);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <MovesPageClient initialMoves={initialMoves} initialLanguageId={initialLanguageId} />
      <ServerIndexLinks
        title={t('moves_page.title')}
        links={initialMoves.slice(0, 12).map((move) => ({
          href: `/${lang}/moves/${move.name}`,
          label: move.pokemon_v2_movenames?.[0]?.name || move.name,
        }))}
      />
    </HydrationBoundary>
  );
}
