import type { Metadata } from 'next';
import { getServerT, getServerLanguage } from '@/lib/server-i18n';
import { buildBreadcrumbJsonLd, buildSubpathLanguages } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT();
  const lang = await getServerLanguage();
  const title = t('tcg.wishlist_title');
  const description = t('tcg.wishlist_title') + ' — ' + t('tcg.collection_subtitle');
  return {
    title,
    description,
    robots: {
      index: false,
      follow: true,
    },
    alternates: {
      canonical: `/${lang}/tcg/wishlist`,
      languages: buildSubpathLanguages('/tcg/wishlist'),
    },
    openGraph: {
      title,
      description,
      url: `/${lang}/tcg/wishlist`,
    },
    twitter: {
      title,
      description,
    },
  };
}

export default async function WishlistLayout({ children }: { children: React.ReactNode }) {
  const lang = await getServerLanguage();
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: 'PrimeDex', path: '/' },
    { name: 'TCG', path: '/tcg' },
    { name: 'Wishlist', path: '/tcg/wishlist' },
  ], lang);
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      {children}
    </>
  );
}
