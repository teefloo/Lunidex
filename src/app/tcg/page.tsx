import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import Header from '@/components/layout/Header';
import { TCGResearchDesk } from '@/components/tcg/TCGResearchDesk';
import { TCGPageTabs } from '@/components/tcg/TCGPageTabs';
import { TCGCompareTrigger } from '@/components/tcg/TCGCompareTrigger';
import { DEFAULT_LATEST_TCG_SET } from '@/lib/tcg-default-latest-set';
import { getInitialTcgCatalogCached } from '@/lib/api/server-cache';
import { getServerT, getServerLanguage } from '@/lib/server-i18n';
import { Loader2 } from 'lucide-react';
import { buildBreadcrumbJsonLd, buildInLanguage, buildSubpathLanguages, localeHref, DEFAULT_OG_IMAGE } from '@/lib/seo';
import { serializeJsonLd } from '@/lib/json-ld';
import { SITE_URL } from '@/lib/site';

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
  const initialCatalog = await getInitialTcgCatalogCached(lang).catch(() => null);
  const initialTabLabels = {
    'tcg.nav_catalog': t('tcg.nav_catalog'),
    'tcg.nav_collection': t('tcg.nav_collection'),
    'tcg.nav_wishlist': t('tcg.nav_wishlist'),
    'tcg.nav_deck_builder': t('tcg.nav_deck_builder'),
    'friends.title': t('friends.title', { defaultValue: 'Friends' }),
  } as const;
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: t('common.home', { defaultValue: 'Lunidex' }), path: '/' },
    { name: t('tcg.page_title'), path: '/tcg' },
  ], lang);
  const collectionPage = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: t('tcg.page_title'),
    description: t('tcg.page_description'),
    url: `${SITE_URL}/${lang}/tcg`,
    isPartOf: { '@id': `${SITE_URL}/#website` },
    about: { '@type': 'Thing', name: 'Pokémon Trading Card Game' },
    inLanguage: buildInLanguage(lang),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(collectionPage) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumb) }} />
      <div className="app-page">
        <Header />
        <main className="page-shell pt-24 pb-24 relative">
          <Suspense fallback={<div className="h-12 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-primary/30" /></div>}>
            <TCGPageTabs initialLabels={initialTabLabels} />
          </Suspense>
          <aside className="mx-auto mt-6 w-full max-w-6xl px-5 md:px-8" aria-label={t('collection_guide.nav_label')}>
            <Link
              href={localeHref('/guides/pokemon-card-collection-tracker', lang)}
              className="block rounded-sm border border-primary/25 bg-primary/5 p-5 transition-colors hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              <span className="block text-sm font-black text-primary">{t('collection_guide.nav_label')}</span>
              <span className="mt-1 block text-sm leading-6 text-foreground/70">{t('collection_guide.intro')}</span>
            </Link>
          </aside>
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
    </>
  );
}
