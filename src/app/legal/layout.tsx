import type { Metadata } from 'next';
import { getServerLanguage, getServerT } from '@/lib/server-i18n';
import { buildBreadcrumbJsonLd, buildSubpathLanguages } from '@/lib/seo';
import { serializeJsonLd } from '@/lib/json-ld';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT();
  const lang = await getServerLanguage();
  return {
    title: t('legal.legal_notice.title'),
    description: t('legal.legal_notice.meta_description'),
    alternates: {
      canonical: `/${lang}/legal`,
      languages: buildSubpathLanguages('/legal'),
    },
    robots: {
      index: false,
      follow: true,
    },
  };
}

export default async function LegalNoticeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const lang = await getServerLanguage();
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: 'Lunidex', path: '/' },
    { name: 'Legal Notice', path: '/legal' },
  ], lang);
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumb) }}
      />
      {children}
    </>
  );
}
