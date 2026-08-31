import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import Header from '@/components/layout/Header';
import { TCGResearchDesk } from '@/components/tcg/TCGResearchDesk';
import { TCGPageTabs } from '@/components/tcg/TCGPageTabs';
import { TCGCompareTrigger } from '@/components/tcg/TCGCompareTrigger';
import { DEFAULT_LATEST_TCG_SET } from '@/lib/tcg-default-latest-set';
import { ANNIVERSARY_30_PATH, isAnniversary30Language } from '@/lib/anniversary-30';
import { getInitialTcgCatalogCached } from '@/lib/api/server-cache';
import { getServerT, getServerLanguage } from '@/lib/server-i18n';
import { Loader2 } from 'lucide-react';
import { buildBreadcrumbJsonLd, buildInLanguage, buildSubpathLanguages, localeHref, DEFAULT_OG_IMAGE } from '@/lib/seo';
import { serializeJsonLd } from '@/lib/json-ld';
import { SITE_URL } from '@/lib/site';
import { isTCGCardLanguage, type TCGCardLanguage } from '@/lib/tcg-language';

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

interface TCGPageProps {
  searchParams: Promise<{ tcgLang?: string | string[] | undefined }>;
}

export default async function TCGPage({ searchParams }: TCGPageProps) {
  const t = await getServerT();
  const lang = await getServerLanguage();
  const query = await searchParams;
  const requestedTcgLanguage = Array.isArray(query.tcgLang) ? query.tcgLang[0] : query.tcgLang;
  const initialTcgLanguage: TCGCardLanguage = isTCGCardLanguage(requestedTcgLanguage) ? requestedTcgLanguage : 'en';
  const initialCatalog = await getInitialTcgCatalogCached(initialTcgLanguage).catch(() => null);
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
          {isAnniversary30Language(lang) ? (
            <section className="mx-auto mt-8 w-full max-w-6xl rounded-sm border border-primary/30 bg-primary/5 p-6 md:flex md:items-center md:justify-between md:gap-8" aria-labelledby="tcg-anniversary-30-title">
              <div>
                <p className="page-eyebrow">{t('anniversary_30.eyebrow')}</p>
                <h2 id="tcg-anniversary-30-title" className="mt-2 text-2xl font-extrabold tracking-tight">
                  {t('anniversary_30.heading')}
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-foreground/70">
                  {t('anniversary_30.intro')}
                </p>
              </div>
              <Link href={`${localeHref(ANNIVERSARY_30_PATH, lang)}#tracker`} className="glass-btn glass-btn-active mt-5 inline-flex min-h-11 shrink-0 items-center px-4 py-3 text-sm font-bold md:mt-0">
                {t('anniversary_30.cta_tracker')}
              </Link>
            </section>
          ) : null}
          <Suspense fallback={<div className="h-96 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary/30" /></div>}>
            <TCGResearchDesk
              initialLatestSet={DEFAULT_LATEST_TCG_SET}
              initialCards={initialCatalog?.cards ?? []}
              initialHasMore={initialCatalog?.hasMore ?? false}
              initialLanguage={initialTcgLanguage}
            />
          </Suspense>
          <TCGCompareTrigger />
        </main>
      </div>
    </>
  );
}
