import type { Metadata } from 'next';
import HomeHero from '@/components/home/HomeHero';
import HomeGameTools from '@/components/home/HomeGameTools';
import HomeCollectionSteps from '@/components/home/HomeCollectionSteps';
import HomeTrustSection from '@/components/home/HomeTrustSection';
import HomeFaqSection from '@/components/layout/HomeFaqSection';
import Header from '@/components/layout/Header';
import { getServerLanguage, getServerT } from '@/lib/server-i18n';
import { DEFAULT_OG_IMAGE, buildWebPageJsonLd } from '@/lib/seo';
import { SITE_NAME } from '@/lib/site';
import { languageToOpenGraphLocale } from '@/lib/languages';
import { buildLunidexHomeFaqJsonLd } from '@/lib/lunidex-home-content';

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

  return <div className="app-page"><Header /><main className="relative z-10 pt-28 md:pt-32"><HomeHero /><HomeGameTools /><HomeCollectionSteps /><HomeTrustSection /><HomeFaqSection /></main><script id="lunidex-home-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /></div>;
}
