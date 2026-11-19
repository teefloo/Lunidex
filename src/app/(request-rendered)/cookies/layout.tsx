import type { Metadata } from 'next';
import { getServerLanguage, getServerT } from '@/lib/server-i18n';
import { buildBreadcrumbJsonLd, buildSubpathLanguages } from '@/lib/seo';
import { serializeJsonLd } from '@/lib/json-ld';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT();
  const lang = await getServerLanguage();
  return {
    title: t('legal.cookies.title'),
    description: t('legal.cookies.meta_description'),
    alternates: {
      canonical: `/${lang}/cookies`,
      languages: buildSubpathLanguages('/cookies'),
    },
    robots: {
      index: false,
      follow: true,
    },
  };
}

export default async function CookiePolicyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const lang = await getServerLanguage();
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: 'Lunidex', path: '/' },
    { name: 'Cookie Policy', path: '/cookies' },
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
