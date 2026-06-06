import type { Metadata } from 'next';
import { getServerT, getServerLanguage } from '@/lib/server-i18n';
import { buildBreadcrumbJsonLd, buildSubpathLanguages } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT();
  const lang = await getServerLanguage();
  return {
    title: t('legal.privacy.title'),
    description: t('legal.privacy.meta_description'),
    alternates: {
      canonical: `/${lang}/privacy`,
      languages: buildSubpathLanguages('/privacy'),
    },
    robots: {
      index: false,
      follow: true,
    },
  };
}

export default async function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const lang = await getServerLanguage();
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: 'PrimeDex', path: '/' },
    { name: 'Privacy Policy', path: '/privacy' },
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
