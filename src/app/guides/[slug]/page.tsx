import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import EditorialGuidePage from '@/components/editorial/EditorialGuidePage';
import {
  FEATURE_GUIDES,
  buildEditorialLanguages,
  getEditorialDates,
  getEditorialCanonicalLanguage,
  getFeatureGuide,
  isEditorialIndexable,
} from '@/lib/editorial';
import { getServerLanguage, getServerTForLanguage } from '@/lib/server-i18n';
import { buildInLanguage, localeHref, DEFAULT_OG_IMAGE } from '@/lib/seo';

export const revalidate = 86400;

export function generateStaticParams() {
  return FEATURE_GUIDES.map(({ slug }) => ({ slug }));
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getPageContext(slug: string) {
  const guide = getFeatureGuide(slug);
  if (!guide) notFound();

  const requestedLanguage = await getServerLanguage();
  const language = getEditorialCanonicalLanguage(requestedLanguage);
  const t = getServerTForLanguage(language);
  const canonicalPath = localeHref(guide.path, language);
  const { publishedAt, updatedAt } = getEditorialDates(guide.path);

  return { guide, requestedLanguage, language, t, canonicalPath, publishedAt, updatedAt };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { guide, requestedLanguage, language, t, canonicalPath, publishedAt, updatedAt } = await getPageContext(slug);
  const key = `editorial.guides.${guide.slug.replace(/-guide$/, '').replaceAll('-', '_')}`;
  const title = t(`${key}.meta_title`);
  const description = t(`${key}.meta_description`);

  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical: canonicalPath,
      languages: buildEditorialLanguages(guide.path),
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
      section: t('editorial.guide.eyebrow'),
      images: [DEFAULT_OG_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function EditorialFeatureGuidePage({ params }: PageProps) {
  const { slug } = await params;
  const { guide, language, t, canonicalPath, publishedAt, updatedAt } = await getPageContext(slug);
  const dateFormatter = new Intl.DateTimeFormat(buildInLanguage(language), {
    dateStyle: 'medium',
  });

  return (
    <EditorialGuidePage
      guide={guide}
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
