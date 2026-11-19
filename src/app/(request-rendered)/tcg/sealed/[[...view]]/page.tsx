import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SealedPortfolioPage } from '../SealedPortfolioPage';
import { SealedMarketPage } from '../SealedMarketPage';
import { getNeonClient } from '@/lib/neon/server';
import { searchPublicSealedCatalogue } from '@/lib/tcg-sealed-server';
import { parsePublicMarketFilters } from '@/lib/tcg-sealed-public-market';
import { getServerLanguage, getServerT } from '@/lib/server-i18n';
import { buildBreadcrumbJsonLd, buildSubpathLanguages, DEFAULT_OG_IMAGE } from '@/lib/seo';
import { serializeJsonLd } from '@/lib/json-ld';
import { isValidSealedRouteSegments } from '@/lib/tcg-sealed-navigation';

export const dynamic = 'force-dynamic';

interface SealedPageProps {
  params: Promise<{ view?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function routeTitle(view: string | undefined, t: (key: string, options?: Record<string, unknown>) => string): string {
  if (view === 'market') return t('tcg.sealed.public_market.title');
  if (view === 'collection') return t('tcg.sealed.my_products');
  if (view === 'catalogue') return t('tcg.sealed.reference_catalogue');
  if (view === 'journal' || view === 'sales' || view === 'cashflow' || view === 'analytics' || view === 'sources') return t(`tcg.sealed.${view}`);
  return t('tcg.sealed.title');
}

export async function generateMetadata({ params }: SealedPageProps): Promise<Metadata> {
  const [lang, t, route] = await Promise.all([getServerLanguage(), getServerT(), params]);
  if (!isValidSealedRouteSegments(route.view ?? [])) notFound();
  const publicMarket = route.view?.length === 1 && route.view[0] === 'market';
  const path = publicMarket ? '/tcg/sealed/market' : '/tcg/sealed';
  const title = routeTitle(publicMarket ? 'market' : undefined, t);
  const description = publicMarket ? t('tcg.sealed.public_market.subtitle') : t('tcg.sealed.subtitle');
  return {
    title,
    description,
    robots: { index: publicMarket, follow: true },
    alternates: { canonical: `/${lang}${path}`, languages: buildSubpathLanguages(path) },
    openGraph: { title, description, url: `/${lang}${path}`, images: [DEFAULT_OG_IMAGE] },
    twitter: { title, description },
  };
}

export default async function SealedPage({ params, searchParams }: SealedPageProps) {
  const [lang, t, route] = await Promise.all([getServerLanguage(), getServerT(), params]);
  const segments = route.view ?? [];
  if (!isValidSealedRouteSegments(segments)) notFound();
  const first = segments[0] ?? 'dashboard';
  if (first === 'market' && segments.length === 1) {
    const filters = parsePublicMarketFilters(await searchParams);
    const sql = getNeonClient();
    const data = sql ? await searchPublicSealedCatalogue(sql, filters.q, filters.page, 24, filters).catch(() => null) : null;
    return <SealedMarketPage data={data} filters={filters} lang={lang} t={t} />;
  }
  const parsedProductId = first === 'products' && /^\d+$/.test(segments[1] ?? '') ? Number(segments[1]) : NaN;
  const productId = Number.isSafeInteger(parsedProductId) && parsedProductId > 0 ? parsedProductId : undefined;
  const title = routeTitle(productId === undefined ? first : undefined, t);
  const breadcrumbItems = [
    { name: t('common.home', { defaultValue: 'Lunidex' }), path: '/' },
    { name: t('tcg.nav_collection', { defaultValue: 'Collection' }), path: '/tcg/collection' },
    { name: t('tcg.sealed.title', { defaultValue: 'Sealed portfolio' }), path: '/tcg/sealed' },
  ];
  if (productId !== undefined) {
    breadcrumbItems.push({ name: t('tcg.sealed.product', { defaultValue: 'Product detail' }), path: `/tcg/sealed/products/${productId}` });
  } else if (first !== 'dashboard') {
    breadcrumbItems.push({ name: title, path: `/tcg/sealed/${segments.join('/')}` });
  }
  const breadcrumb = buildBreadcrumbJsonLd(breadcrumbItems, lang);
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumb) }} />
    <SealedPortfolioPage view={productId === undefined ? first : 'product'} productId={productId} />
  </>;
}
