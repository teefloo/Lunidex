import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getServerLanguage, getServerT } from '@/lib/server-i18n';
import { buildSubpathLanguages, DEFAULT_OG_IMAGE } from '@/lib/seo';
import { isTCGCardLanguage, normalizeTCGCardLanguage } from '@/lib/tcg-language';
import { TCGSetAlbumPage } from '../TCGSetAlbumPage';

interface PageProps {
  params: Promise<{ language: string; setId: string }>;
  searchParams: Promise<{ activation?: string | string[] | undefined }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { language, setId } = await params;
  const appLanguage = await getServerLanguage();
  const tcgLanguage = normalizeTCGCardLanguage(language);
  if (!tcgLanguage) return {};
  const t = await getServerT();
  const title = `${setId} — ${t('tcg.collection_title', { defaultValue: 'My Collection' })}`;
  const description = t('tcg.collection_subtitle', { defaultValue: 'Track your Pokémon TCG collection by set.' });
  const path = `/tcg/collection/${tcgLanguage}/${encodeURIComponent(setId)}`;
  return {
    title: { absolute: title },
    description,
    robots: { index: false, follow: true },
    alternates: {
      canonical: `/${appLanguage}${path}`,
      languages: buildSubpathLanguages(path),
    },
    openGraph: {
      title,
      description,
      url: `/${appLanguage}${path}`,
      images: [DEFAULT_OG_IMAGE],
    },
  };
}

export default async function LocalizedSetAlbumPage({ params, searchParams }: PageProps) {
  const { language, setId } = await params;
  if (!isTCGCardLanguage(language)) notFound();
  const query = await searchParams;
  const activation = (Array.isArray(query.activation) ? query.activation[0] : query.activation) === '1';
  return <TCGSetAlbumPage setId={setId} language={language} activation={activation} />;
}
