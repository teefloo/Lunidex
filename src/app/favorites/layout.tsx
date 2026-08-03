import type { Metadata } from "next";
import { getServerT, getServerLanguage } from '@/lib/server-i18n';
import { buildBreadcrumbJsonLd, buildSubpathLanguages, DEFAULT_OG_IMAGE } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT();
  const lang = await getServerLanguage();
  const title = t('meta.favorites_title');
  const description = t('meta.favorites_description');
  return {
    title,
    description,
    alternates: {
      canonical: `/${lang}/favorites`,
      languages: buildSubpathLanguages('/favorites'),
    },
    robots: {
      index: false,
      follow: true,
    },
    openGraph: {
      title,
      description,
      url: `/${lang}/favorites`,
      images: [DEFAULT_OG_IMAGE],
    },
    twitter: {
      title,
      description,
    },
  };
}

export default async function FavoritesLayout({ children }: { children: React.ReactNode }) {
  const lang = await getServerLanguage();
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: 'Lunidex', path: '/' },
    { name: 'Favorites', path: '/favorites' },
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
