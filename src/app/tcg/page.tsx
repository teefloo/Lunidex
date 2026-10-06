import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import Header from '@/components/layout/Header';
import { TCGResearchDesk } from '@/components/tcg/TCGResearchDesk';
import { TCGPageTabs } from '@/components/tcg/TCGPageTabs';
import { TCGCompareTrigger } from '@/components/tcg/TCGCompareTrigger';
import { getInitialTcgCatalogCached } from '@/lib/api/server-cache';
import { getServerT, getServerLanguage } from '@/lib/server-i18n';
import { Loader2 } from 'lucide-react';
import { buildBreadcrumbJsonLd, buildInLanguage, buildSubpathLanguages, DEFAULT_OG_IMAGE, localeHref } from '@/lib/seo';
import { serializeJsonLd } from '@/lib/json-ld';
import { SITE_URL } from '@/lib/site';
import { resolveRequestedTCGCardLanguage, type TCGCardLanguage } from '@/lib/tcg-language';

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
  const initialTcgLanguage: TCGCardLanguage = resolveRequestedTCGCardLanguage(requestedTcgLanguage) ?? 'en';
  const initialCatalog = await getInitialTcgCatalogCached(initialTcgLanguage).catch(() => null);
  const initialTabLabels = {
    'tcg.nav_catalog': t('tcg.nav_catalog'),
    'tcg.nav_collection': t('tcg.nav_collection'),
    'tcg.nav_wishlist': t('tcg.nav_wishlist'),
    'tcg.nav_sealed_market': t('tcg.nav_sealed_market', { defaultValue: 'Sealed market' }),
    'booster_guides.links.pull': t('booster_guides.links.pull'),
    'booster_guides.links.value': t('booster_guides.links.value'),
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
        <main className="page-shell page-shell--header-offset relative pb-24">
          <Suspense fallback={<div className="h-12 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-primary/30" /></div>}>
            <TCGPageTabs initialLabels={initialTabLabels} />
          </Suspense>
          <nav className="mx-auto flex max-w-7xl flex-wrap justify-center gap-x-6 gap-y-2 px-4 py-4 text-sm" aria-label={t('lunidex_home.guides_title')}>
            <Link href={localeHref('/guides/pokemon-card-collection-tracker', lang)} className="inline-flex min-h-11 items-center font-bold text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary">
              {t('collection_guide.nav_label')}
            </Link>
            <Link href={localeHref('/guides/pokemon-card-collection-value', lang)} className="inline-flex min-h-11 items-center font-bold text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary">
              {t('lunidex_home.guide_value_label')}
            </Link>
          </nav>
          <Suspense fallback={<div className="h-96 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary/30" /></div>}>
            <TCGResearchDesk
              initialLatestSet={initialCatalog?.latestSet ?? null}
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
