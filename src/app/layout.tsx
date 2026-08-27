import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import { Pixelify_Sans, Nunito } from "next/font/google";
import Providers from "./providers";
import "./globals.css";
import { cn } from "@/lib/utils";
import { getServerT, getServerLanguage, getServerTranslations } from '@/lib/server-i18n';
import { AppContent } from "./AppContent";
import SiteFooter from "@/components/layout/SiteFooter";
import ClientCookieBanner from "@/components/layout/ClientCookieBanner";
import { SkipLink } from "@/components/layout/SkipLink";
import { serializeJsonLd } from "@/lib/json-ld";
import { languageToOpenGraphLocale, supportedLanguages } from "@/lib/languages";
import { buildOrganizationJsonLd, DEFAULT_OG_IMAGE } from '@/lib/seo';
import {
  SITE_URL,
  SITE_NAME,
  SITE_TAGLINE,
  SITE_DESCRIPTION,
  SITE_DISAMBIGUATION_DESCRIPTION,
  SITE_KEYWORDS,
  FEATURE_LIST,
} from "@/lib/site";

const displayFont = Pixelify_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
  display: "optional",
  preload: false,
});

const bodyFont = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-body",
  display: "optional",
  preload: false,
});

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F2F6FF' },
    { media: '(prefers-color-scheme: dark)', color: '#07144F' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const t = await getServerT();
  const lang = await getServerLanguage();
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
    keywords: t("meta.keywords", { returnObjects: true }) as unknown as string[],
    authors: [{ name: SITE_NAME, url: SITE_URL }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    applicationName: SITE_NAME,
    appleWebApp: {
      capable: true,
      title: SITE_NAME,
      statusBarStyle: 'black-translucent',
    },
    category: "games",
    classification: "Games, Entertainment, Education",
    referrer: "strict-origin-when-cross-origin",
    formatDetection: { email: false, address: false, telephone: false },
    alternates: {
      canonical: `/${lang}`,
      languages: {
        en: "/en",
        fr: "/fr",
        de: "/de",
        es: "/es",
        it: "/it",
        ja: "/ja",
        ko: "/ko",
        zh: "/zh",
        "x-default": "/en",
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
      type: "website",
      siteName: SITE_NAME,
      locale: languageToOpenGraphLocale[lang],
      url: `/${lang}`,
      images: [DEFAULT_OG_IMAGE],
    },
    twitter: {
      // Site-level fallback so routes without their own twitter metadata still
      // render a large share card instead of a bare summary.
      card: "summary_large_image",
      images: [DEFAULT_OG_IMAGE],
    },
    icons: {
      icon: [
        { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
        { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
        { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      ],
      apple: [
        { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      ],
    },
    appLinks: {
      web: {
        url: `/${lang}`,
        should_fallback: false,
      },
    },
    other: {
      // Array values render as repeated og:locale:alternate metatags, which is
      // the format social scrapers expect (one tag per alternate locale).
      "og:locale:alternate": supportedLanguages
        .filter((l) => l !== lang)
        .map((l) => languageToOpenGraphLocale[l]),
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await connection();
  const lang = await getServerLanguage();
  const t = await getServerT();
  const initialTranslations = getServerTranslations(lang);
  const baseUrl = SITE_URL;
  const description = t('lunidex_home.meta_description', { defaultValue: SITE_DESCRIPTION });

  const jsonLd = [
    buildOrganizationJsonLd(),
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': `${baseUrl}/#website`,
      name: SITE_NAME,
      alternateName: ['Lunidex', 'Luni Dex', 'Lunidex Pokédex'],
      url: baseUrl,
      description,
      disambiguatingDescription: SITE_DISAMBIGUATION_DESCRIPTION,
      inLanguage: supportedInLanguage,
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
      description,
      disambiguatingDescription: SITE_DISAMBIGUATION_DESCRIPTION,
      image: `${baseUrl}${DEFAULT_OG_IMAGE.url}`,
      featureList: FEATURE_LIST.join(', '),
      keywords: SITE_KEYWORDS.join(', '),
      inLanguage: supportedInLanguage,
      about: [
        { '@type': 'Thing', name: 'Pokémon reference data' },
        { '@type': 'Thing', name: 'Pokémon Trading Card Game collection tracking' },
      ],
      publisher: { '@id': `${baseUrl}/#organization` },
      softwareVersion: '0.1.0',
    },
  ];

  return (
      <html lang={lang} suppressHydrationWarning className={cn("font-body", displayFont.variable, bodyFont.variable)}>
      <head>
        {/* Autodiscovery for the OpenSearch description shipped at this path. */}
        <link
          rel="search"
          type="application/opensearchdescription+xml"
          title={SITE_NAME}
          href="/opensearch.xml"
        />
      </head>
      <body className="antialiased bg-background text-foreground font-body">
        <SkipLink>
          {t('common.skip_to_content')}
        </SkipLink>
         <Providers initialLanguage={lang} initialTranslations={initialTranslations}>
           <AppContent>
             <div id="main-content" tabIndex={-1}>
               {children}
             </div>
             <SiteFooter />
             <ClientCookieBanner />
           </AppContent>
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

const supportedInLanguage = ['en', 'fr', 'de', 'es', 'it', 'ja', 'ko', 'zh'];
