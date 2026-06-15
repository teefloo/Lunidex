import type { Metadata } from 'next';
import { getServerT, getServerLanguage } from '@/lib/server-i18n';
import Header from '@/components/layout/Header';
import { SITE_URL, SITE_NAME, SITE_TAGLINE, GITHUB_REPO_URL, GITHUB_ISSUES_URL, TWITTER_HANDLE, DISCORD_URL } from '@/lib/site';
import { buildBreadcrumbJsonLd, buildSubpathLanguages } from '@/lib/seo';

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT();
  const lang = await getServerLanguage();
  const title = t('about.meta_title');
  const description = t('about.meta_description');
  return {
    title,
    description,
    alternates: {
      canonical: `/${lang}/about`,
      languages: buildSubpathLanguages('/about'),
    },
    openGraph: {
      title,
      description,
      url: `/${lang}/about`,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function AboutPage() {
  const t = await getServerT();
  const lang = await getServerLanguage();
  const baseUrl = SITE_URL;
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: SITE_NAME, path: '/' },
    { name: t('about.heading'), path: '/about' },
  ], lang);

  const aboutPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    '@id': `${baseUrl}/${lang}/about#aboutpage`,
    url: `${baseUrl}/${lang}/about`,
    name: `${t('about.heading')} — ${SITE_NAME}`,
    description: t('about.meta_description'),
    isPartOf: { '@id': `${baseUrl}/#website` },
    about: { '@id': `${baseUrl}/#organization` },
    primaryImageOfPage: { '@type': 'ImageObject', url: `${baseUrl}/opengraph-image` },
  };

  const aboutSection = [
    { id: 'mission', title: t('about.mission_title'), body: t('about.mission_body') },
    { id: 'data-sources', title: t('about.data_sources_title'), body: t('about.data_sources_body') },
    { id: 'features', title: t('about.features_title'), body: t('about.features_body') },
    { id: 'open-source', title: t('about.opensource_title'), body: t('about.opensource_body') },
    { id: 'contact', title: t('about.contact_title'), body: t('about.contact_body') },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutPageJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <div className="app-page">
        <Header />
        <main className="page-shell pt-28 pb-24 relative">
          <article className="mx-auto w-full max-w-4xl px-5 md:px-8">
            <header className="mb-10 md:mb-14 text-center">
              <p className="page-eyebrow justify-center">{t('about.eyebrow')}</p>
              <h1
                id="hero-title"
                className="mt-3 text-4xl md:text-6xl font-extrabold tracking-tight"
              >
                {t('about.heading')}
              </h1>
              <p className="mt-4 text-base md:text-lg text-foreground/70 max-w-2xl mx-auto">
                {t('about.subtitle')}
              </p>
            </header>

            <div className="space-y-8">
              {aboutSection.map((section) => (
                <section
                  key={section.id}
                  id={section.id}
                  aria-labelledby={`${section.id}-title`}
                  className="section-frame p-6 md:p-8"
                >
                  <h2
                    id={`${section.id}-title`}
                    className="text-2xl md:text-3xl font-extrabold tracking-tight mb-3"
                  >
                    {section.title}
                  </h2>
                  <div className="text-foreground/80 leading-relaxed whitespace-pre-line">
                    {section.body}
                  </div>
                </section>
              ))}
            </div>

            <aside className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <a
                href={GITHUB_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="section-frame p-5 hover:border-primary transition-colors"
              >
                <p className="text-xs font-bold uppercase tracking-wider text-foreground/50">GitHub</p>
                <p className="mt-1 text-base font-bold">{t('about.cards.github')}</p>
              </a>
              <a
                href={GITHUB_ISSUES_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="section-frame p-5 hover:border-primary transition-colors"
              >
                <p className="text-xs font-bold uppercase tracking-wider text-foreground/50">Issues</p>
                <p className="mt-1 text-base font-bold">{t('about.cards.issues')}</p>
              </a>
              <a
                href={`https://twitter.com/${TWITTER_HANDLE.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="section-frame p-5 hover:border-primary transition-colors"
              >
                <p className="text-xs font-bold uppercase tracking-wider text-foreground/50">Twitter / X</p>
                <p className="mt-1 text-base font-bold">{TWITTER_HANDLE}</p>
              </a>
              <a
                href={DISCORD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="section-frame p-5 hover:border-primary transition-colors"
              >
                <p className="text-xs font-bold uppercase tracking-wider text-foreground/50">Discord</p>
                <p className="mt-1 text-base font-bold">{t('about.cards.discord')}</p>
              </a>
            </aside>

            <footer className="mt-12 text-center text-sm text-foreground/50">
              <p>{SITE_NAME} — {SITE_TAGLINE}</p>
              <p className="mt-1">{t('about.footer_license')}</p>
            </footer>
          </article>
        </main>
      </div>
    </>
  );
}
