import { Metadata } from 'next';
import { t } from '@/lib/server-i18n';
import { SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  title: t('moves_page.title'),
  description: t('moves_page.subtitle'),
  alternates: {
    canonical: '/moves',
  },
  openGraph: {
    title: t('moves_page.title'),
    description: t('moves_page.subtitle'),
    url: '/moves',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: t('moves_page.title'),
    description: t('moves_page.subtitle'),
  },
};

export default function MovesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
