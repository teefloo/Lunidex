import type { Metadata, Viewport } from "next";
import { Fraunces, Manrope, JetBrains_Mono } from "next/font/google";
import Providers from "./providers";
import "./globals.css";
import "../styles/pokemon-cards-css.css";
import "../styles/tcg-card-overrides.css";
import { cn } from "@/lib/utils";
import { getServerT, getServerLanguage } from '@/lib/server-i18n';
import { AppContent } from "./AppContent";
import SiteFooter from "@/components/layout/SiteFooter";
import CookieBanner from "@/components/layout/CookieBanner";
import { languageToOpenGraphLocale, supportedLanguages } from "@/lib/languages";
import {
  SITE_URL,
  SITE_NAME,
  SITE_TAGLINE,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  GITHUB_ISSUES_URL,
  TWITTER_HANDLE,
  PRIMARY_COLOR,
  BACKGROUND_COLOR,
  SOCIAL_PROFILES,
  FEATURE_LIST,
} from "@/lib/site";

const displayFont = Fraunces({
  subsets: ["latin"],
  weight: "variable",
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
  preload: true,
  axes: ["opsz", "SOFT"],
});

const bodyFont = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-body",
  display: "swap",
  preload: true,
});

const monoFont = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono",
  display: "swap",
  preload: false,
});

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4ecd8' },
    { media: '(prefers-color-scheme: dark)', color: BACKGROUND_COLOR },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT();
  const lang = await getServerLanguage();
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: t("meta.title"),
      template: `%s | ${SITE_NAME}`,
    },
    description: t("meta.description"),
    keywords: t("meta.keywords", { returnObjects: true }) as unknown as string[],
    authors: [{ name: SITE_NAME, url: SITE_URL }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    applicationName: SITE_NAME,
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
    openGraph: {
      title: t("meta.og_title"),
      description: t("meta.og_description"),
      type: "website",
      siteName: SITE_NAME,
      locale: languageToOpenGraphLocale[lang],
      url: `/${lang}`,
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: `${SITE_NAME} — ${SITE_TAGLINE}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      site: TWITTER_HANDLE,
      creator: TWITTER_HANDLE,
      title: t("meta.twitter_title"),
      description: t("meta.twitter_description"),
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: `${SITE_NAME} — ${SITE_TAGLINE}`,
        },
      ],
    },
    icons: {
      icon: [
        { url: "/icon.svg", type: "image/svg+xml", sizes: "any" },
        { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
        { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      ],
      apple: [
        { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      ],
      other: [
        { rel: "mask-icon", url: "/icon.svg", color: PRIMARY_COLOR },
      ],
    },
    appLinks: {
      web: {
        url: `/${lang}`,
        should_fallback: false,
      },
    },
    other: {
      "google-site-verification": process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION || "pqXHKXVMghO__JyQJLu-0jC6jNnSgzAa_VsvtSrN_gg",
      "msvalidate.01": process.env.NEXT_PUBLIC_BING_VERIFICATION || "",
      "yandex-verification": process.env.NEXT_PUBLIC_YANDEX_VERIFICATION || "",
      "p:domain_verify": process.env.NEXT_PUBLIC_PINTEREST_VERIFICATION || "",
      "theme-color": PRIMARY_COLOR,
      "color-scheme": "light dark",
      "application-name": SITE_NAME,
      "apple-mobile-web-app-title": SITE_NAME,
      "apple-mobile-web-app-capable": "yes",
      "apple-mobile-web-app-status-bar-style": "black-translucent",
      "mobile-web-app-capable": "yes",
      "HandheldFriendly": "True",
      "MobileOptimized": "320",
      "og:locale:alternate": supportedLanguages
        .filter((l) => l !== lang)
        .map((l) => languageToOpenGraphLocale[l])
        .join(", "),
      "search": "/opensearch.xml",
      "geo.region": "US",
      "geo.placename": "Worldwide",
      "geo.position": "0;0",
      "ICBM": "0, 0",
      "rating": "general",
      "distribution": "global",
      "revisit-after": "1 day",
      "copyright": `© 2024–2026 ${SITE_NAME}. Pokémon data, names, and imagery are © Nintendo, Game Freak, The Pokémon Company.`,
      "author": SITE_NAME,
      "owner": SITE_NAME,
      "url": `${SITE_URL}/${lang}`,
      "identifier": "primedex",
      "category": "Games, Entertainment, Education",
      "target": "all",
      "audience": "all",
      "coverage": "Worldwide",
      "language": languageToOpenGraphLocale[lang],
      "robots": "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
      "googlebot": "index, follow",
      "slurp": "index, follow",
      "doc-type": "WebApplication",
      "doc-class": "Living Document",
      "doc-rights": "MIT Licensed source code; non-commercial fan project",
      "citation_title": `${SITE_NAME} — ${SITE_TAGLINE}`,
      "citation_publisher": SITE_NAME,
      "citation_author": SITE_NAME,
      "citation_language": languageToOpenGraphLocale[lang],
      "citation_release_date": "2024-01-15",
      "citation_online_date": "2026-06-04",
      "DC.title": `${SITE_NAME} — ${SITE_TAGLINE}`,
      "DC.creator": SITE_NAME,
      "DC.subject": SITE_KEYWORDS.join(', '),
      "DC.description": SITE_DESCRIPTION,
      "DC.publisher": SITE_NAME,
      "DC.contributor": "PokéAPI (https://pokeapi.co), TCGdex (https://www.tcgdex.net)",
      "DC.type": "InteractiveResource",
      "DC.format": "text/html",
      "DC.identifier": SITE_URL,
      "DC.source": "https://pokeapi.co",
      "DC.language": languageToOpenGraphLocale[lang],
      "DC.relation": "https://github.com/teefloo/Poke",
      "DC.coverage": "Worldwide",
      "DC.rights": "MIT (code); Pokémon data © Nintendo, Game Freak, The Pokémon Company",
      "DC.date": "2024-01-15",
      "twitter:label1": "Pokémon Count",
      "twitter:data1": "1,025",
      "twitter:label2": "Generations",
      "twitter:data2": "9",
      "apple-itunes-app": `app-id=primedex, app-argument=${SITE_URL}/${lang}`,
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const lang = await getServerLanguage();
  const baseUrl = SITE_URL;

  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${baseUrl}/#website`,
    name: SITE_NAME,
    alternateName: ['PrimeDex', 'Prime Dex', 'PrimeDex Pokédex'],
    url: baseUrl,
    description: SITE_DESCRIPTION,
    inLanguage: supportedInLanguage,
    keywords: SITE_KEYWORDS.join(', '),
    publisher: { '@id': `${baseUrl}/#organization` },
    potentialAction: [
      {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${baseUrl}/?search={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    ],
    mainEntity: { '@id': `${baseUrl}/#webapp` },
  };

  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${baseUrl}/#organization`,
    name: SITE_NAME,
    legalName: SITE_NAME,
    url: baseUrl,
    logo: {
      '@type': 'ImageObject',
      url: `${baseUrl}/icon-512.png`,
      width: 512,
      height: 512,
    },
    image: `${baseUrl}/opengraph-image`,
    description: SITE_DESCRIPTION,
    foundingDate: '2024',
    sameAs: SOCIAL_PROFILES,
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        url: GITHUB_ISSUES_URL,
        availableLanguage: ['en', 'fr', 'de', 'es', 'it', 'ja', 'ko', 'zh'],
      },
    ],
  };

  const webAppJsonLd = {
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
    description: SITE_DESCRIPTION,
    image: `${baseUrl}/opengraph-image`,
    screenshot: [
      `${baseUrl}/screenshot-desktop.png`,
      `${baseUrl}/screenshot-mobile.png`,
    ],
    featureList: FEATURE_LIST.join(', '),
    keywords: SITE_KEYWORDS.join(', '),
    inLanguage: supportedInLanguage,
    isAccessibleForFree: true,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
    },
    author: { '@id': `${baseUrl}/#organization` },
    publisher: { '@id': `${baseUrl}/#organization` },
    softwareVersion: '1.0.0',
  };

  const speakableJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${baseUrl}/#speakable`,
    url: baseUrl,
    name: SITE_NAME,
    inLanguage: lang,
    speakable: {
      '@type': 'SpeakableSpecification',
      xpath: [
        '/html/head/title',
        '/html/head/meta[@name="description"]/@content',
        '//h1',
        '//h2[contains(@class, "hero-title")]',
      ],
    },
  };

  return (
      <html lang={lang} suppressHydrationWarning className={cn("font-body", displayFont.variable, bodyFont.variable, monoFont.variable)}>
      <head>
        <link rel="preconnect" href="https://pokeapi.co" />
        <link rel="preconnect" href="https://raw.githubusercontent.com" />
        <link rel="dns-prefetch" href="https://pokeapi.co" />
        <link rel="dns-prefetch" href="https://raw.githubusercontent.com" />
      </head>
      <body className="antialiased bg-background text-foreground font-body">
        <script
          id="website-jsonld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <script
          id="organization-jsonld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          id="webapp-jsonld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }}
        />
        <script
          id="speakable-jsonld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(speakableJsonLd) }}
        />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:font-bold"
        >
          Skip to main content
        </a>
         <Providers>
           <AppContent>
             <div id="main-content">
               {children}
             </div>
             <SiteFooter />
             <CookieBanner />
           </AppContent>
         </Providers>
      </body>
    </html>
  );
}

const supportedInLanguage = ['en', 'fr', 'de', 'es', 'it', 'ja', 'ko', 'zh-CN'];
