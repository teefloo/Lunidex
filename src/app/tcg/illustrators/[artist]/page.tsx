import type { Metadata } from 'next';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import Header from '@/components/layout/Header';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { TCGIllustratorPageClient } from '@/components/tcg/TCGIllustratorPageClient';
import { loadTCGIllustratorGallery, type TCGIllustratorGallery } from '@/lib/tcg-illustrator-gallery';
import { buildTCGIllustratorPath, parseTCGIllustratorPage } from '@/lib/tcg-illustrators';
import { normalizeTCGCardLanguage, type TCGCardLanguage } from '@/lib/tcg-language';
import { getServerLanguage, getServerT } from '@/lib/server-i18n';
import { supportedLanguages } from '@/lib/languages';
import { SITE_URL } from '@/lib/site';
import { DEFAULT_OG_IMAGE } from '@/lib/seo';
import { serializeJsonLd } from '@/lib/json-ld';

interface PageProps {
  params: Promise<{ artist: string }>;
  searchParams: Promise<{ tcgLang?: string | string[]; page?: string | string[] }>;
}

type RouteData = {
  currentLanguage: Awaited<ReturnType<typeof getServerLanguage>>;
  tcgLanguage: TCGCardLanguage;
  page: number;
  gallery: TCGIllustratorGallery;
};

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { artist } = await params;
  const query = await searchParams;
  const route = await getRouteData(artist, query);
  const t = await getServerT();
  const title = t('tcg.illustrator_meta_title', { artist: route.gallery.artist });
  const description = route.gallery.total > 0
    ? t('tcg.illustrator_meta_description', {
      artist: route.gallery.artist,
      count: route.gallery.total,
    })
    : t('tcg.illustrator_meta_description_empty', { artist: route.gallery.artist });
  const path = buildTCGIllustratorPath(route.gallery.identity, route.tcgLanguage, route.page);
  const canonical = `/${route.currentLanguage}${path}`;
  const ogImage = `${SITE_URL}${DEFAULT_OG_IMAGE.url}`;
  const languages = Object.fromEntries(supportedLanguages.map((language) => [
    language,
    `/${language}${path}`,
  ]));
  const indexable = route.gallery.total > 0;

  return {
    title: { absolute: title },
    description,
    robots: indexable
      ? { index: true, follow: true }
      : { index: false, follow: true },
    alternates: {
      canonical,
      languages: { ...languages, 'x-default': `/en${path}` },
    },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'website',
      images: [{ url: ogImage, width: DEFAULT_OG_IMAGE.width, height: DEFAULT_OG_IMAGE.height, alt: route.gallery.artist }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function TCGIllustratorPage({ params, searchParams }: PageProps) {
  const { artist } = await params;
  const query = await searchParams;
  const route = await getRouteData(artist, query);
  const t = await getServerT();
  const path = buildTCGIllustratorPath(route.gallery.identity, route.tcgLanguage, route.page);
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: t('common.home'), item: `${SITE_URL}/${route.currentLanguage}` },
      { '@type': 'ListItem', position: 2, name: t('tcg.page_title'), item: `${SITE_URL}/${route.currentLanguage}/tcg` },
      {
        '@type': 'ListItem',
        position: 3,
        name: route.gallery.artist,
        item: `${SITE_URL}/${route.currentLanguage}${path}`,
      },
    ],
  };

  return (
    <div className="app-page">
      <Header />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }} />
      <Breadcrumbs
        items={[
          { label: t('common.home'), href: `/${route.currentLanguage}` },
          { label: t('tcg.page_title'), href: `/${route.currentLanguage}/tcg?tcgLang=${encodeURIComponent(route.tcgLanguage)}` },
          { label: route.gallery.artist },
        ]}
        homeLabel={t('common.home')}
      />
      <TCGIllustratorPageClient gallery={route.gallery} />
    </div>
  );
}

const getGalleryCached = cache(loadTCGIllustratorGallery);

async function getRouteData(
  artist: string,
  query: Awaited<PageProps['searchParams']>,
): Promise<RouteData> {
  const requestedLanguage = Array.isArray(query.tcgLang) ? query.tcgLang[0] : query.tcgLang;
  const tcgLanguage = normalizeTCGCardLanguage(requestedLanguage, 'en') as TCGCardLanguage;
  const page = parseTCGIllustratorPage(query.page);
  if (page === null) notFound();

  let gallery = await getGalleryCached(artist, tcgLanguage, page);
  if (!gallery) {
    const decodedArtist = decodeArtistSegment(artist);
    if (decodedArtist !== artist) gallery = await getGalleryCached(decodedArtist, tcgLanguage, page);
  }
  if (!gallery || (gallery.total === 0 && page !== 1) || (gallery.total > 0 && page > gallery.pageCount)) {
    notFound();
  }

  return {
    currentLanguage: await getServerLanguage(),
    tcgLanguage,
    page,
    gallery,
  };
}

function decodeArtistSegment(artist: string): string {
  try {
    return decodeURIComponent(artist);
  } catch {
    return artist;
  }
}
