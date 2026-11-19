import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import HomeArchiveExperience from '@/components/home/HomeArchiveExperience';
import { getServerTForLanguage } from '@/lib/server-i18n';
import { isSupportedLanguage, languageToOpenGraphLocale } from '@/lib/languages';
import { DEFAULT_OG_IMAGE, buildWebPageJsonLd } from '@/lib/seo';
import { SITE_NAME } from '@/lib/site';
import { buildLunidexHomeFaqJsonLd } from '@/lib/lunidex-home-content';
import { serializeJsonLd } from '@/lib/json-ld';

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isSupportedLanguage(locale)) notFound();

  const language = locale;
  const t = getServerTForLanguage(language);
  return {
    title: { absolute: t('lunidex_home.meta_title') },
    description: t('lunidex_home.meta_description'),
    alternates: {
      canonical: `/${language}`,
      languages: { en: '/en', fr: '/fr', es: '/es', de: '/de', it: '/it', ja: '/ja', ko: '/ko', zh: '/zh', 'x-default': '/en' },
    },
    openGraph: {
      title: t('lunidex_home.og_title'), description: t('lunidex_home.meta_description'), url: `/${language}`,
      locale: languageToOpenGraphLocale[language], type: 'website', siteName: SITE_NAME,
      images: [{ ...DEFAULT_OG_IMAGE, alt: t('lunidex_home.og_alt') }],
    },
    twitter: {
      card: 'summary_large_image', title: t('lunidex_home.og_title'), description: t('lunidex_home.meta_description'),
      images: [{ ...DEFAULT_OG_IMAGE, alt: t('lunidex_home.og_alt') }],
    },
  };
}

export default async function LocalizedHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isSupportedLanguage(locale)) notFound();
  const language = locale;
  const t = getServerTForLanguage(language);
  const jsonLd = [
    buildWebPageJsonLd({ lang: language, path: `/${language}`, name: t('lunidex_home.meta_title'), description: t('lunidex_home.meta_description') }),
    buildLunidexHomeFaqJsonLd(t, language),
  ];

  return (
    <div className="app-page">
      <HomeArchiveExperience
        language={locale}
        initialSignedIn={false}
        serviceAvailable={Boolean(process.env.NEXT_PUBLIC_NEON_AUTH_URL)}
      />
      <script id="lunidex-home-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd({ '@graph': jsonLd }) }} />
    </div>
  );
}
