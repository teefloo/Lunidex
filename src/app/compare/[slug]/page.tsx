import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import EditorialArticlePage from '@/components/editorial/EditorialArticlePage';
import {
  COMPETITOR_ARTICLES,
  buildEditorialLanguages,
  getEditorialDates,
  getCompetitorArticle,
  getEditorialCanonicalLanguage,
  isEditorialIndexable,
} from '@/lib/editorial';
import { getServerLanguage, getServerTForLanguage } from '@/lib/server-i18n';
import { buildInLanguage, localeHref, DEFAULT_OG_IMAGE } from '@/lib/seo';

export const revalidate = 86400;

export function generateStaticParams() {
  return COMPETITOR_ARTICLES.map(({ path }) => ({ slug: path.split('/').filter(Boolean).at(-1) }));
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getPageContext(slug: string) {
  const article = getCompetitorArticle(slug);
  if (!article) notFound();

  const requestedLanguage = await getServerLanguage();
  const language = getEditorialCanonicalLanguage(requestedLanguage);
  const t = getServerTForLanguage(language);
  const canonicalPath = localeHref(article.path, language);
  const { publishedAt, updatedAt } = getEditorialDates(article.path);

  return { article, requestedLanguage, language, t, canonicalPath, publishedAt, updatedAt };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { article, requestedLanguage, language, t, canonicalPath, publishedAt, updatedAt } = await getPageContext(slug);
  const key = `editorial.competitors.${article.slug.replaceAll('-', '_')}`;
  const title = t(`${key}.meta_title`);
  const description = t(`${key}.meta_description`);

  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical: canonicalPath,
      languages: buildEditorialLanguages(article.path),
    },
    robots: {
      index: isEditorialIndexable(requestedLanguage),
      follow: true,
    },
    openGraph: {
      title,
      description,
      url: canonicalPath,
      type: 'article',
      locale: buildInLanguage(language),
      publishedTime: publishedAt,
      modifiedTime: updatedAt,
      section: t('editorial.article.eyebrow'),
      images: [DEFAULT_OG_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function EditorialComparisonPage({ params }: PageProps) {
  const { slug } = await params;
  const { article, language, t, canonicalPath, publishedAt, updatedAt } = await getPageContext(slug);
  const dateFormatter = new Intl.DateTimeFormat(buildInLanguage(language), {
    dateStyle: 'medium',
  });

  return (
    <EditorialArticlePage
      article={article}
      language={language}
      t={t}
      canonicalPath={canonicalPath}
      publishedAt={publishedAt}
      publishedDate={dateFormatter.format(new Date(`${publishedAt}T00:00:00Z`))}
      lastUpdated={updatedAt}
      formattedDate={dateFormatter.format(new Date(`${updatedAt}T00:00:00Z`))}
    />
  );
}
