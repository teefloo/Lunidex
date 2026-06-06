import type { Metadata } from 'next';
import { getServerT, getServerLanguage } from '@/lib/server-i18n';
import { buildBreadcrumbJsonLd, buildSubpathLanguages } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT();
  const lang = await getServerLanguage();
  const title = t('tcg.collection_title');
  const description = t('tcg.collection_subtitle');
  return {
    title,
    description,
    robots: {
      index: false,
      follow: true,
    },
    alternates: {
      canonical: `/${lang}/tcg/collection`,
      languages: buildSubpathLanguages('/tcg/collection'),
    },
    openGraph: {
      title,
      description,
      url: `/${lang}/tcg/collection`,
    },
    twitter: {
      title,
      description,
    },
  };
}

export default async function CollectionLayout({ children }: { children: React.ReactNode }) {
  const lang = await getServerLanguage();
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: 'PrimeDex', path: '/' },
    { name: 'TCG', path: '/tcg' },
    { name: 'Collection', path: '/tcg/collection' },
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
