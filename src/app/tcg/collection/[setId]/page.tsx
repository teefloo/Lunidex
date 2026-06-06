import type { Metadata } from 'next';
import { getSetById } from '@/lib/api/tcg';
import { SITE_URL } from '@/lib/site';
import { getServerLanguage } from '@/lib/server-i18n';
import { buildSubpathLanguages, buildBreadcrumbJsonLd } from '@/lib/seo';
import { TCGSetAlbumPage } from './TCGSetAlbumPage';

interface PageProps {
  params: Promise<{ setId: string }>;
  searchParams: Promise<{ lang?: string }>;
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { setId } = await params;
  const { lang } = await searchParams;
  const currentLang = await getServerLanguage();
  const tcgSet = await getSetById(setId, lang ?? currentLang ?? 'en').catch(() => null);
  const title = tcgSet
    ? `${tcgSet.name} — Pokémon TCG Set | PrimeDex`
    : 'TCG Set | PrimeDex';
  const description = tcgSet
    ? `${tcgSet.name} Pokémon TCG set, released ${tcgSet.releaseDate || 'TBA'}. Browse cards, track progress, mark cards as owned or wishlisted.`
    : 'Browse a Pokémon TCG set on PrimeDex.';
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
  const tcgSet = await getSetById(setId).catch(() => null);
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: 'PrimeDex', path: '/' },
    { name: 'TCG', path: '/tcg' },
    { name: 'Collection', path: '/tcg/collection' },
    { name: tcgSet?.name ?? setId, path: `/tcg/collection/${setId}` },
  ], lang);
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      {tcgSet ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'CollectionPage',
              name: `${tcgSet.name} — Pokémon TCG Set`,
              description: `Browse all cards from the ${tcgSet.name} Pokémon TCG set.`,
              url: `${SITE_URL}/${lang}/tcg/collection/${setId}`,
              isPartOf: { '@id': `${SITE_URL}/tcg#collectionpage` },
              about: { '@type': 'ProductGroup', name: tcgSet.name },
              keywords: `${tcgSet.name}, Pokemon TCG set, TCG cards`,
            }),
          }}
        />
      ) : null}
      <TCGSetAlbumPage />
    </>
  );
}
