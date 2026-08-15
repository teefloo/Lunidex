import type { Metadata, Viewport } from 'next';
import HomeArchiveExperience from '@/components/home/HomeArchiveExperience';
import { getServerLanguage, getServerT } from '@/lib/server-i18n';
import { DEFAULT_OG_IMAGE, buildWebPageJsonLd } from '@/lib/seo';
import { SITE_NAME } from '@/lib/site';
import { languageToOpenGraphLocale } from '@/lib/languages';
import { buildLunidexHomeFaqJsonLd } from '@/lib/lunidex-home-content';
import { serializeJsonLd } from '@/lib/json-ld';

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#F4EAD5',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export async function generateMetadata(): Promise<Metadata> {
  const [t, language] = await Promise.all([getServerT(), getServerLanguage()]);
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
      images: [{ ...DEFAULT_OG_IMAGE, alt: t('lunidex_home.og_title') }],
    },
    twitter: {
      card: 'summary_large_image', title: t('lunidex_home.og_title'), description: t('lunidex_home.meta_description'),
      images: [{ ...DEFAULT_OG_IMAGE, alt: t('lunidex_home.og_title') }],
    },
  };
}

export default async function Home() {
  const [t, language] = await Promise.all([getServerT(), getServerLanguage()]);
  const jsonLd = [
    buildWebPageJsonLd({ lang: language, path: `/${language}`, name: t('lunidex_home.meta_title'), description: t('lunidex_home.meta_description') }),
    buildLunidexHomeFaqJsonLd(t, language),
  ];

  return (
    <div className="app-page">
      <HomeArchiveExperience />
      <script id="lunidex-home-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd({ '@graph': jsonLd }) }} />
    </div>
  );
}
