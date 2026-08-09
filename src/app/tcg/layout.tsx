import type { Metadata } from 'next';
import { getServerT, getServerLanguage } from '@/lib/server-i18n';
import { buildBreadcrumbJsonLd, buildInLanguage, buildSubpathLanguages, DEFAULT_OG_IMAGE } from '@/lib/seo';
import { SITE_URL } from '@/lib/site';

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

export default async function TcgLayout({ children }: { children: React.ReactNode }) {
  const lang = await getServerLanguage();
  const t = await getServerT();
  const title = t('tcg.page_title');
  const description = t('tcg.page_description');
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: t('common.home', { defaultValue: 'Lunidex' }), path: '/' },
    { name: title, path: '/tcg' },
  ], lang);
  return (
    <>
      {/* Resource hints for the TCG card-image CDN and the heavy card CSS.
          Lives here (not in a head.tsx — unsupported in the App Router) so it
          renders into <head> for every /tcg route. */}
      <link rel="preconnect" href="https://api.tcgdex.net" />
      <link rel="preconnect" href="https://assets.tcgdex.net" />
      <link rel="dns-prefetch" href="https://api.tcgdex.net" />
      <link rel="dns-prefetch" href="https://assets.tcgdex.net" />
      {/* eslint-disable-next-line @next/next/no-css-tags -- required for the upstream effect stylesheet */}
      <link rel="stylesheet" href="/pokemon-cards/css/all-cards.css" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: title,
            description,
            url: `${SITE_URL}/${lang}/tcg`,
            isPartOf: { '@id': `${SITE_URL}/#website` },
            about: { '@type': 'Thing', name: 'Pokémon Trading Card Game' },
            inLanguage: buildInLanguage(lang),
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
