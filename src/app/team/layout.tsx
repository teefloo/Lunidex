import type { Metadata } from 'next';
import { getServerT, getServerLanguage } from '@/lib/server-i18n';
import { SITE_URL } from '@/lib/site';
import { buildBreadcrumbJsonLd, buildSubpathLanguages, DEFAULT_OG_IMAGE } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT();
  const lang = await getServerLanguage();
  const title = t('meta.team_title');
  const description = t('meta.team_description');
  return {
    title,
    description,
    robots: {
      index: true,
      follow: true,
    },
    alternates: {
      canonical: `/${lang}/team`,
      languages: buildSubpathLanguages('/team'),
    },
    openGraph: {
      title,
      description,
      url: `/${lang}/team`,
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

export default async function TeamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const baseUrl = SITE_URL;
  const lang = await getServerLanguage();
  const t = await getServerT();
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: 'Lunidex', path: '/' },
    { name: 'Team Builder', path: '/team' },
  ], lang);
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            name: t('meta.team_title'),
            applicationCategory: 'GameApplication',
            operatingSystem: 'All',
            description: t('meta.team_description'),
            url: `${baseUrl}/${lang}/team`,
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
            isAccessibleForFree: true,
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
