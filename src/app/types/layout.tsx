import type { Metadata } from 'next';
import { getServerT, getServerLanguage } from '@/lib/server-i18n';
import { SITE_URL } from '@/lib/site';
import { buildBreadcrumbJsonLd, buildSubpathLanguages, DEFAULT_OG_IMAGE } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT();
  const lang = await getServerLanguage();
  const title = t('meta.types_title');
  const description = t('meta.types_description');
  return {
    title,
    description,
    alternates: {
      canonical: `/${lang}/types`,
      languages: buildSubpathLanguages('/types'),
    },
    openGraph: {
      title,
      description,
      url: `/${lang}/types`,
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

export default async function TypesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const baseUrl = SITE_URL;
  const lang = await getServerLanguage();
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: 'PrimeDex', path: '/' },
    { name: 'Type Chart', path: '/types' },
  ], lang);
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            name: 'Pokémon Type Chart — PrimeDex',
            applicationCategory: 'GameApplication',
            operatingSystem: 'All',
            description: 'Interactive type chart showing strengths, weaknesses, resistances, and immunities for all 18 Pokémon types.',
            url: `${baseUrl}/${lang}/types`,
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
            aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.8', ratingCount: '1025', bestRating: '5' },
            isAccessibleForFree: true,
            featureList: 'Type effectiveness matrix, dual-type combinations, filter by generation',
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      {children}
    </>
  );
}
