import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/site';
import { getServerLanguage, getServerT } from '@/lib/server-i18n';
import { buildSubpathLanguages, buildBreadcrumbJsonLd, DEFAULT_OG_IMAGE } from '@/lib/seo';
import { serializeJsonLd } from '@/lib/json-ld';
import { TCGLegacySetAlbumResolver } from '@/components/tcg/TCGLegacySetAlbumResolver';

interface PageProps {
  params: Promise<{ language: string }>;
  searchParams: Promise<{ activation?: string | string[] | undefined }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { language: setId } = await params;
  const currentLang = await getServerLanguage();
  const t = await getServerT();
  const collectionTitle = t('tcg.collection_title', { defaultValue: 'My Collection' });
  const description = t('tcg.collection_subtitle', {
    defaultValue: 'Track your Pokémon TCG collection by set.',
  });
  const title = `${setId} — ${collectionTitle}`;
  const canonicalPath = `/tcg/collection/en/${encodeURIComponent(setId)}`;
  return {
    title: { absolute: title },
    description,
    robots: { index: false, follow: true },
    alternates: {
      canonical: `/${currentLang}${canonicalPath}`,
      languages: buildSubpathLanguages(canonicalPath),
    },
    openGraph: {
      title,
      description,
      url: `/${currentLang}${canonicalPath}`,
      images: [DEFAULT_OG_IMAGE],
    },
    twitter: { title, description },
  };
}

export default async function SetAlbumPage({ params, searchParams }: PageProps) {
  const { language: setId } = await params;
  const query = await searchParams;
  const lang = await getServerLanguage();
  const t = await getServerT();
  const collectionTitle = t('tcg.collection_title', { defaultValue: 'My Collection' });
  const collectionDescription = t('tcg.collection_subtitle', {
    defaultValue: 'Track your Pokémon TCG collection by set.',
  });
  const title = `${setId} — ${collectionTitle}`;
  const canonicalPath = `/tcg/collection/en/${encodeURIComponent(setId)}`;
  const activationValue = Array.isArray(query.activation) ? query.activation[0] : query.activation;
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: t('common.home', { defaultValue: 'Lunidex' }), path: '/' },
    { name: t('tcg.page_heading', { defaultValue: 'TCG Catalog' }), path: '/tcg' },
    { name: t('tcg.collection_title', { defaultValue: 'Collection' }), path: '/tcg/collection' },
    { name: setId, path: canonicalPath },
  ], lang);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumb) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: title,
            description: collectionDescription,
            url: `${SITE_URL}/${lang}${canonicalPath}`,
            isPartOf: { '@id': `${SITE_URL}/${lang}/tcg` },
            about: { '@type': 'ProductGroup', name: setId },
            keywords: `${setId}, Pokémon TCG, ${t('tcg.cards', { defaultValue: 'cards' })}`,
          }),
        }}
      />
      <TCGLegacySetAlbumResolver setId={setId} activation={activationValue === '1'} />
    </>
  );
}
