import type { Metadata } from 'next';
import { getServerT, getServerLanguage } from '@/lib/server-i18n';
import { SITE_URL } from '@/lib/site';
import { buildBreadcrumbJsonLd, buildSubpathLanguages, DEFAULT_OG_IMAGE } from '@/lib/seo';
import { serializeJsonLd } from '@/lib/json-ld';

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
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function MovesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getServerT();
  const lang = await getServerLanguage();
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: 'Lunidex', path: '/' },
    { name: t('moves_page.title'), path: '/moves' },
  ], lang);
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd({
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            name: t('moves_page.title'),
            applicationCategory: 'GameApplication',
            operatingSystem: 'All',
            description: t('moves_page.subtitle'),
            url: `${SITE_URL}/${lang}/moves`,
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
            isAccessibleForFree: true,
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumb) }}
      />
      {children}
    </>
  );
}
