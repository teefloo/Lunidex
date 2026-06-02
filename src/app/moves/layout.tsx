import type { Metadata } from 'next';
import { getServerT } from '@/lib/server-i18n';
import { SITE_URL } from '@/lib/site';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT();
  const title = t('moves_page.title');
  const description = t('moves_page.subtitle');
  return {
    title,
    description,
    alternates: {
      canonical: '/moves',
    },
    openGraph: {
      title,
      description,
      url: '/moves',
      type: 'website',
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
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            name: t('moves_page.title'),
            applicationCategory: 'GameApplication',
            operatingSystem: 'All',
            description: t('moves_page.subtitle'),
            url: `${SITE_URL}/moves`,
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
          }),
        }}
      />
      {children}
    </>
  );
}
