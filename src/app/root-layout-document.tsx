import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import localFont from 'next/font/local';
import Providers from './providers';
import { cn } from '@/lib/utils';
import {
  getEditorialClientTranslations,
  getPublicClientTranslations,
  getServerTForLanguage,
  isEditorialClientRoute,
} from '@/lib/server-i18n';
import type { SupportedLanguage } from '@/lib/languages';
import { AppContent } from './AppContent';
import SiteFooter from '@/components/layout/SiteFooter';
import ClientCookieBanner from '@/components/layout/ClientCookieBanner';
import { SkipLink } from '@/components/layout/SkipLink';
import { serializeJsonLd } from '@/lib/json-ld';
import { languageToOpenGraphLocale, supportedLanguages } from '@/lib/languages';
import { buildCreatorJsonLd, buildOrganizationJsonLd, DEFAULT_OG_IMAGE } from '@/lib/seo';
import {
  SITE_URL,
  SITE_NAME,
  SITE_TAGLINE,
  SITE_DESCRIPTION,
  SITE_DISAMBIGUATION_DESCRIPTION,
  SITE_KEYWORDS,
  FEATURE_LIST,
} from '@/lib/site';

const displayFont = localFont({
  src: '../lib/fonts/Nunito[wght].ttf',
  weight: '200 1000',
  variable: '--font-nunito',
  display: 'optional',
  preload: false,
});

const brandPixelFont = localFont({
  src: '../lib/fonts/PixelifySans[wght].ttf',
  weight: '400 700',
  variable: '--font-pixel',
  display: 'optional',
  preload: false,
});

export interface RootLayoutDocumentProps {
  children: ReactNode;
  lang: SupportedLanguage;
  requestPathname?: string;
  modal?: ReactNode;
}

export function buildRootMetadata(lang: SupportedLanguage): Metadata {
  const t = getServerTForLanguage(lang);
  const title = t('lunidex_home.meta_title', { defaultValue: t('meta.title') });
  const description = t('lunidex_home.meta_description', { defaultValue: SITE_DESCRIPTION });
  const openGraphTitle = t('lunidex_home.og_title', { defaultValue: title });

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: title,
      template: `%s | ${SITE_NAME}`,
    },
    description,
    authors: [{ name: SITE_NAME, url: SITE_URL }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    applicationName: SITE_NAME,
    appleWebApp: {
      capable: true,
      title: SITE_NAME,
      statusBarStyle: 'black-translucent',
    },
    category: 'games',
    classification: 'Games, Entertainment, Education',
    referrer: 'strict-origin-when-cross-origin',
    formatDetection: { email: false, address: false, telephone: false },
    alternates: {
      canonical: `/${lang}`,
      languages: {
        en: '/en',
        fr: '/fr',
        de: '/de',
        es: '/es',
        it: '/it',
        ja: '/ja',
        ko: '/ko',
        zh: '/zh',
        'x-default': '/en',
      },
    },
    robots: {
      index: true,
      follow: true,
      nocache: false,
      googleBot: {
        index: true,
        follow: true,
        noimageindex: false,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    verification: {
      google: [
        process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION ?? 'pqXHKXVMghO__JyQJLu-0jC6jNnSgzAa_VsvtSrN_gg',
        'OlofqSclwmIgxXtYfQ9NKsg6bf4jieDY_4P2b4xn8uc',
      ],
    },
    openGraph: {
      title: openGraphTitle,
      description,
      type: 'website',
      siteName: SITE_NAME,
      locale: languageToOpenGraphLocale[lang],
      url: `/${lang}`,
      images: [DEFAULT_OG_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      images: [DEFAULT_OG_IMAGE],
    },
    icons: {
      icon: [
        { url: '/icon-512.png?v=3', sizes: '512x512', type: 'image/png' },
        { url: '/icon-192.png?v=3', sizes: '192x192', type: 'image/png' },
        { url: '/favicon-32x32.png?v=3', sizes: '32x32', type: 'image/png' },
        { url: '/favicon-16x16.png?v=3', sizes: '16x16', type: 'image/png' },
      ],
      apple: [
        { url: '/apple-touch-icon.png?v=3', sizes: '180x180', type: 'image/png' },
      ],
    },
    appLinks: {
      web: {
        url: `/${lang}`,
        should_fallback: false,
      },
    },
    other: {
      'og:locale:alternate': supportedLanguages
        .filter((language) => language !== lang)
        .map((language) => languageToOpenGraphLocale[language]),
    },
  };
}

export default function RootLayoutDocument({
  children,
  lang,
  requestPathname = '',
  modal = null,
}: RootLayoutDocumentProps) {
  const t = getServerTForLanguage(lang);
  const isHomeRoute = /^\/(?:en|fr|es|de|it|ja|ko|zh)\/?$/.test(requestPathname);
  const isEditorialRoute = isEditorialClientRoute(requestPathname);
  const initialTranslations = isEditorialRoute
    ? getEditorialClientTranslations(lang)
    : getPublicClientTranslations(lang);
  const baseUrl = SITE_URL;
  const description = t('lunidex_home.meta_description', { defaultValue: SITE_DESCRIPTION });

  const jsonLd = [
    buildOrganizationJsonLd(),
    buildCreatorJsonLd(),
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': `${baseUrl}/#website`,
      name: SITE_NAME,
      alternateName: ['Lunidex', 'Luni Dex', 'Lunidex Pokédex'],
      url: baseUrl,
      description,
      disambiguatingDescription: SITE_DISAMBIGUATION_DESCRIPTION,
      inLanguage: ['en', 'fr', 'de', 'es', 'it', 'ja', 'ko', 'zh'],
      keywords: SITE_KEYWORDS.join(', '),
      publisher: { '@id': `${baseUrl}/#organization` },
      mainEntity: { '@id': `${baseUrl}/#webapp` },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      '@id': `${baseUrl}/#webapp`,
      name: `${SITE_NAME} — ${SITE_TAGLINE}`,
      alternateName: SITE_NAME,
      url: baseUrl,
      applicationCategory: ['GameApplication', 'EducationalApplication'],
      applicationSubCategory: 'GameDatabase',
      operatingSystem: 'All',
      browserRequirements: 'Requires modern browser with JavaScript enabled',
      isAccessibleForFree: true,
      description,
      disambiguatingDescription: SITE_DISAMBIGUATION_DESCRIPTION,
      image: `${baseUrl}${DEFAULT_OG_IMAGE.url}`,
      featureList: FEATURE_LIST.join(', '),
      keywords: SITE_KEYWORDS.join(', '),
      inLanguage: ['en', 'fr', 'de', 'es', 'it', 'ja', 'ko', 'zh'],
      about: [
        { '@type': 'Thing', name: 'Pokémon reference data' },
        { '@type': 'Thing', name: 'Pokémon Trading Card Game collection tracking' },
      ],
      publisher: { '@id': `${baseUrl}/#organization` },
      softwareVersion: '0.1.0',
    },
  ];

  return (
    <html lang={lang} suppressHydrationWarning className={cn('font-body', displayFont.variable, brandPixelFont.variable)}>
      <head>
        <link
          rel="search"
          type="application/opensearchdescription+xml"
          title={SITE_NAME}
          href="/opensearch.xml"
        />
      </head>
      <body className="antialiased bg-background text-foreground font-body">
        <SkipLink>{t('common.skip_to_content')}</SkipLink>
        <Providers
          initialLanguage={lang}
          initialTranslations={initialTranslations}
          initialTranslationsPartial={isEditorialRoute}
        >
          <AppContent>
            <div id="main-content" tabIndex={-1}>
              {children}
            </div>
            <SiteFooter compact={isHomeRoute} />
            <ClientCookieBanner />
          </AppContent>
          {modal}
        </Providers>
        <script
          id="primedex-jsonld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
        />
      </body>
    </html>
  );
}
