import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTCGSetCached } from '@/lib/api/server-cache';
import { SITE_URL } from '@/lib/site';
import { getServerLanguage, getServerT } from '@/lib/server-i18n';
import { buildSubpathLanguages, buildBreadcrumbJsonLd, DEFAULT_OG_IMAGE } from '@/lib/seo';
import { serializeJsonLd } from '@/lib/json-ld';
import { TCGSetAlbumPage } from './TCGSetAlbumPage';

interface PageProps {
  params: Promise<{ setId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { setId } = await params;
  const currentLang = await getServerLanguage();
  const t = await getServerT();
  const tcgSet = await getTCGSetCached(setId, currentLang).catch(() => null);
  if (!tcgSet) notFound();
  const releaseDate = tcgSet.releaseDate || t('tcg.unknown', { defaultValue: 'unknown date' });
  const title = t('tcg.set_meta_title', {
    name: tcgSet.name,
    defaultValue: `${tcgSet.name} — Pokémon TCG Set | Lunidex`,
  });
  const description = t('tcg.set_meta_description', {
    name: tcgSet.name,
    releaseDate,
    defaultValue: `Browse the ${tcgSet.name} Pokémon TCG set, released ${releaseDate}. Explore cards and track your collection on Lunidex.`,
  });
  return {
    title,
    description,
    robots: {
      index: false,
      follow: true,
    },
    alternates: {
      canonical: `/${currentLang}/tcg/collection/${setId}`,
      languages: buildSubpathLanguages(`/tcg/collection/${setId}`),
    },
    openGraph: {
      title,
      description,
      url: `/${currentLang}/tcg/collection/${setId}`,
      images: [DEFAULT_OG_IMAGE],
    },
    twitter: {
      title,
      description,
    },
  };
}

export default async function SetAlbumPage({ params }: PageProps) {
  const { setId } = await params;
  const lang = await getServerLanguage();
  const t = await getServerT();
  const tcgSet = await getTCGSetCached(setId, lang).catch(() => null);
  if (!tcgSet) notFound();
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: t('common.home', { defaultValue: 'Lunidex' }), path: '/' },
    { name: t('tcg.page_heading', { defaultValue: 'TCG Catalog' }), path: '/tcg' },
    { name: t('tcg.collection_title', { defaultValue: 'Collection' }), path: '/tcg/collection' },
    { name: tcgSet?.name ?? setId, path: `/tcg/collection/${setId}` },
  ], lang);
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumb) }}
      />
      {tcgSet ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd({
              '@context': 'https://schema.org',
              '@type': 'CollectionPage',
              name: t('tcg.set_meta_title', {
                name: tcgSet.name,
                defaultValue: `${tcgSet.name} — Pokémon TCG Set | Lunidex`,
              }),
              description: t('tcg.set_meta_description', {
                name: tcgSet.name,
                releaseDate: tcgSet.releaseDate || t('tcg.unknown', { defaultValue: 'unknown date' }),
                defaultValue: `Browse the ${tcgSet.name} Pokémon TCG set on Lunidex.`,
              }),
              url: `${SITE_URL}/${lang}/tcg/collection/${setId}`,
              isPartOf: { '@id': `${SITE_URL}/${lang}/tcg` },
              about: { '@type': 'ProductGroup', name: tcgSet.name },
              keywords: `${tcgSet.name}, Pokémon TCG, ${t('tcg.cards', { defaultValue: 'cards' })}`,
            }),
          }}
        />
      ) : null}
      <TCGSetAlbumPage />
    </>
  );
}
