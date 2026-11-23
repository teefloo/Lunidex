import type { Metadata } from 'next';
import { buildSubpathLanguages, DEFAULT_OG_IMAGE } from '@/lib/seo';
import { languageToOpenGraphLocale } from '@/lib/languages';
import { getServerLanguage, getServerT } from '@/lib/server-i18n';
import { TCGCollectionShowcasePage } from '@/components/tcg/TCGCollectionShowcasePage';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const [{ token }, language, t] = await Promise.all([params, getServerLanguage(), getServerT()]);
  const path = `/tcg/showcase/${token}`;
  return {
    title: t('tcg.custom_collections.showcase_title'),
    description: t('tcg.custom_collections.share_description'),
    alternates: {
      canonical: `/${language}${path}`,
      languages: buildSubpathLanguages(path),
    },
    openGraph: {
      title: t('tcg.custom_collections.showcase_title'),
      description: t('tcg.custom_collections.share_description'),
      url: `/${language}${path}`,
      type: 'website',
      locale: languageToOpenGraphLocale[language],
      images: [DEFAULT_OG_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title: t('tcg.custom_collections.showcase_title'),
      description: t('tcg.custom_collections.share_description'),
      images: [DEFAULT_OG_IMAGE],
    },
    robots: {
      index: false,
      follow: false,
      noarchive: true,
      googleBot: { index: false, follow: false, noimageindex: true, noarchive: true },
    },
  };
}

export default async function TCGCollectionShowcaseRoute({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <TCGCollectionShowcasePage token={token} />;
}
