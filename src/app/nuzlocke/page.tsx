import type { Metadata } from 'next';
import NuzlockeClient from './NuzlockeClient';
import { getServerT, getServerLanguage } from '@/lib/server-i18n';
import { buildBreadcrumbJsonLd, buildSubpathLanguages, DEFAULT_OG_IMAGE } from '@/lib/seo';
import { serializeJsonLd } from '@/lib/json-ld';
import { SITE_URL } from '@/lib/site';

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT();
  const lang = await getServerLanguage();
  const title = t('nuzlocke.title', { defaultValue: 'Nuzlocke Tracker' });
  const description = t('nuzlocke_guide.meta_description', { defaultValue: 'How to use the Lunidex Nuzlocke tracker: create runs, record one encounter per route, follow Pokémon statuses, and read run statistics.' });

  return {
    title,
    description,
    robots: { index: true, follow: true },
    alternates: {
      canonical: `/${lang}/nuzlocke`,
      languages: buildSubpathLanguages('/nuzlocke'),
    },
    openGraph: {
      title,
      description,
      url: `/${lang}/nuzlocke`,
      images: [DEFAULT_OG_IMAGE],
      type: 'website',
    },
  };
}

export default async function NuzlockePage() {
  const [t, lang] = await Promise.all([getServerT(), getServerLanguage()]);
  const title = t('nuzlocke.title', { defaultValue: 'Nuzlocke Tracker' });
  const description = t('nuzlocke_guide.meta_description', { defaultValue: 'How to use the Lunidex Nuzlocke tracker: create runs, record one encounter per route, follow Pokémon statuses, and read run statistics.' });
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: t('common.home', { defaultValue: 'Lunidex' }), path: '/' },
    { name: title, path: '/nuzlocke' },
  ], lang);
  const application = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: title,
    applicationCategory: 'GameApplication',
    operatingSystem: 'All',
    description,
    url: `${SITE_URL}/${lang}/nuzlocke`,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    isAccessibleForFree: true,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(application) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumb) }} />
      <NuzlockeClient />
    </>
  );
}
