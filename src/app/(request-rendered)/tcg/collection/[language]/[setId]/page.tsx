import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getServerLanguage, getServerT } from '@/lib/server-i18n';
import { buildSubpathLanguages, DEFAULT_OG_IMAGE } from '@/lib/seo';
import { isTCGCardLanguage, normalizeTCGCardLanguage } from '@/lib/tcg-language';
import { normalizeTCGCollectionReturnQuery } from '@/lib/tcg-collection-overview';
import { getCollectionSetAlbumCached } from '@/lib/api/server-cache';
import type { TCGSetAlbumData } from '@/types/tcg';
import { TCGSetAlbumPage } from '../TCGSetAlbumPage';

interface PageProps {
  params: Promise<{ language: string; setId: string }>;
  searchParams: Promise<{
    activation?: string | string[] | undefined;
    return?: string | string[] | undefined;
    source?: string | string[] | undefined;
    campaign?: string | string[] | undefined;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { language, setId } = await params;
  const appLanguage = await getServerLanguage();
  const tcgLanguage = normalizeTCGCardLanguage(language);
  if (!tcgLanguage) return {};
  const t = await getServerT();
  let album: TCGSetAlbumData | null | undefined;
  try {
    album = await getCollectionSetAlbumCached(setId, tcgLanguage);
  } catch {
    // Keep transient upstream failures recoverable; the page's client query
    // owns its retry state and should not show the identifier as a set name.
    album = undefined;
  }
  if (album === null) notFound();

  const collectionTitle = t('tcg.collection_title', { defaultValue: 'My Collection' });
  const title = album ? `${album.set.name} — ${collectionTitle}` : collectionTitle;
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
  let initialAlbum: TCGSetAlbumData | null | undefined;
  try {
    initialAlbum = await getCollectionSetAlbumCached(setId, language);
  } catch {
    // A transient upstream error is handled by the album's client query so the
    // existing retry state remains available. Only a confirmed missing set is
    // allowed to become a route-level 404.
    initialAlbum = undefined;
  }
  if (initialAlbum === null) notFound();

  const query = await searchParams;
  const activation = (Array.isArray(query.activation) ? query.activation[0] : query.activation) === '1';
  const rawReturn = Array.isArray(query.return) ? query.return[0] : query.return;
  const source = Array.isArray(query.source) ? query.source[0] : query.source;
  const campaign = Array.isArray(query.campaign) ? query.campaign[0] : query.campaign;
  const normalizedReturnQuery = normalizeTCGCollectionReturnQuery(rawReturn);
  const returnQuery = normalizedReturnQuery || undefined;
  return <TCGSetAlbumPage setId={setId} language={language} initialAlbum={initialAlbum} activation={activation} returnQuery={returnQuery} source={source} campaign={campaign} />;
}
