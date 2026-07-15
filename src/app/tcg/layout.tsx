import type { Metadata } from 'next';
import { getServerT, getServerLanguage } from '@/lib/server-i18n';
import { buildBreadcrumbJsonLd, buildSubpathLanguages } from '@/lib/seo';
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
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: 'PrimeDex', path: '/' },
    { name: 'TCG Catalog', path: '/tcg' },
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
            name: 'PrimeDex Pokémon TCG Catalog',
            description: 'Complete Pokémon Trading Card Game catalog. Search Pokémon, Trainer, and Energy cards, filter by set, rarity, type, stage, and HP.',
            url: `${SITE_URL}/${lang}/tcg`,
            isPartOf: { '@id': `${SITE_URL}/#website` },
            about: { '@type': 'Thing', name: 'Pokémon Trading Card Game' },
            keywords: 'Pokemon TCG, Pokemon cards, TCG catalog, Pokemon sets, Pokemon rarities',
            inLanguage: 'en-US',
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
