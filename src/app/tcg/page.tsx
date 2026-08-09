import type { Metadata } from 'next';
import { Suspense } from 'react';
import Header from '@/components/layout/Header';
import { TCGResearchDesk } from '@/components/tcg/TCGResearchDesk';
import { TCGPageTabs } from '@/components/tcg/TCGPageTabs';
import { TCGCompareTrigger } from '@/components/tcg/TCGCompareTrigger';
import { DEFAULT_LATEST_TCG_SET } from '@/lib/tcg-default-latest-set';
import { DEFAULT_TCG_CARD_FILTERS, searchCards } from '@/lib/api/tcg';
import { getServerT, getServerLanguage } from '@/lib/server-i18n';
import { Loader2 } from 'lucide-react';
import { buildSubpathLanguages, DEFAULT_OG_IMAGE } from '@/lib/seo';

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT();
  const lang = await getServerLanguage();
  const title = t('tcg.page_title');
  const description = t('tcg.page_description');
  return {
    title,
    description,
    alternates: {
      canonical: `/${lang}/tcg`,
      languages: buildSubpathLanguages('/tcg'),
    },
    openGraph: {
      title,
      description,
      url: `/${lang}/tcg`,
      type: 'website',
      images: [DEFAULT_OG_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function TCGPage() {
  const t = await getServerT();
  const lang = await getServerLanguage();
  const initialCatalog = await searchCards(
    { ...DEFAULT_TCG_CARD_FILTERS, selectedSet: DEFAULT_LATEST_TCG_SET.id },
    lang,
    1,
    24,
  ).catch(() => null);
  const initialTabLabels = {
    'tcg.nav_catalog': t('tcg.nav_catalog'),
    'tcg.nav_collection': t('tcg.nav_collection'),
    'tcg.nav_wishlist': t('tcg.nav_wishlist'),
    'tcg.nav_deck_builder': t('tcg.nav_deck_builder'),
    'friends.title': t('friends.title', { defaultValue: 'Friends' }),
  } as const;

  return (
    <div className="app-page">
      <Header />
      <main className="page-shell pt-24 pb-24 relative">
        <Suspense fallback={<div className="h-12 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-primary/30" /></div>}>
          <TCGPageTabs initialLabels={initialTabLabels} />
        </Suspense>
        <Suspense fallback={<div className="h-96 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary/30" /></div>}>
          <TCGResearchDesk
            initialLatestSet={DEFAULT_LATEST_TCG_SET}
            initialCards={initialCatalog?.cards ?? []}
            initialHasMore={initialCatalog?.hasMore ?? false}
            initialLanguage={lang}
          />
        </Suspense>
        <TCGCompareTrigger />
      </main>
    </div>
  );
}
