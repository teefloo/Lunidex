import type { Metadata } from "next";
import { getServerT, getServerLanguage } from '@/lib/server-i18n';
import { buildBreadcrumbJsonLd, buildSubpathLanguages } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT();
  const lang = await getServerLanguage();
  const title = t('meta.quiz_title');
  const description = t('meta.quiz_description');
  return {
    title,
    description,
    alternates: {
      canonical: `/${lang}/quiz`,
      languages: buildSubpathLanguages('/quiz'),
    },
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title,
      description,
      url: `/${lang}/quiz`,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function QuizLayout({ children }: { children: React.ReactNode }) {
  const lang = await getServerLanguage();
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: 'PrimeDex', path: '/' },
    { name: 'Quiz', path: '/quiz' },
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
