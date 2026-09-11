import type { Metadata } from 'next';
import { SealedPortfolioPage } from '../SealedPortfolioPage';
import { getServerLanguage, getServerT } from '@/lib/server-i18n';
import { buildBreadcrumbJsonLd, buildSubpathLanguages, DEFAULT_OG_IMAGE } from '@/lib/seo';
import { serializeJsonLd } from '@/lib/json-ld';

export const dynamic = 'force-dynamic';

interface SealedPageProps {
  params: Promise<{ view?: string[] }>;
}

function routeTitle(view: string | undefined, t: (key: string, options?: Record<string, unknown>) => string): string {
  if (view === 'collection' || view === 'journal' || view === 'sales' || view === 'cashflow' || view === 'analytics' || view === 'catalogue' || view === 'sources') return t(`tcg.sealed.${view}`);
  return t('tcg.sealed.title');
}

export async function generateMetadata(): Promise<Metadata> {
  const [lang, t] = await Promise.all([getServerLanguage(), getServerT()]);
  const title = routeTitle(undefined, t);
  const description = t('tcg.sealed.subtitle');
  return {
    title,
    description,
    robots: { index: false, follow: true },
    alternates: { canonical: `/${lang}/tcg/sealed`, languages: buildSubpathLanguages('/tcg/sealed') },
    openGraph: { title, description, url: `/${lang}/tcg/sealed`, images: [DEFAULT_OG_IMAGE] },
    twitter: { title, description },
  };
}

export default async function SealedPage({ params }: SealedPageProps) {
  const [lang, t, route] = await Promise.all([getServerLanguage(), getServerT(), params]);
  const segments = route.view ?? [];
  const first = segments[0] ?? 'dashboard';
  const parsedProductId = first === 'products' && /^\d+$/.test(segments[1] ?? '') ? Number(segments[1]) : NaN;
  const productId = Number.isSafeInteger(parsedProductId) && parsedProductId > 0 ? parsedProductId : undefined;
  const title = routeTitle(productId === undefined ? first : undefined, t);
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: t('common.home', { defaultValue: 'Lunidex' }), path: '/' },
    { name: t('tcg.page_title', { defaultValue: 'Pokémon TCG' }), path: '/tcg' },
    { name: title, path: productId === undefined ? '/tcg/sealed' : `/tcg/sealed/products/${productId}` },
  ], lang);
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumb) }} />
    <SealedPortfolioPage view={productId === undefined ? first : 'product'} productId={productId} />
  </>;
}
