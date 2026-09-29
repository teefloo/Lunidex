import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import { buildBreadcrumbJsonLd, buildSubpathLanguages, DEFAULT_OG_IMAGE, localeHref } from '@/lib/seo';
import { serializeJsonLd } from '@/lib/json-ld';
import { getServerLanguage, getServerT } from '@/lib/server-i18n';

type GuideKind = 'pull' | 'value';

const guidePaths: Record<GuideKind, string> = {
  pull: '/tcg/pull-rates',
  value: '/tcg/booster-value',
};

export async function boosterGuideMetadata(kind: GuideKind): Promise<Metadata> {
  const [t, language] = await Promise.all([getServerT(), getServerLanguage()]);
  const title = t(`booster_guides.${kind}.title`);
  const description = t(`booster_guides.${kind}.description`);
  const path = guidePaths[kind];
  return {
    title,
    description,
    alternates: { canonical: `/${language}${path}`, languages: buildSubpathLanguages(path) },
    openGraph: { title, description, url: `/${language}${path}`, type: 'article', images: [DEFAULT_OG_IMAGE] },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export async function BoosterExplainer({ kind }: { kind: GuideKind }) {
  const [t, language] = await Promise.all([getServerT(), getServerLanguage()]);
  const prefix = `booster_guides.${kind}`;
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: t('common.home'), path: '/' },
    { name: t('tcg.page_title'), path: '/tcg' },
    { name: t(`${prefix}.title`), path: guidePaths[kind] },
  ], language);

  return (
    <div className="app-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumb) }} />
      <Header />
      <main className="page-shell page-shell--header-offset mx-auto max-w-5xl pb-24">
        <nav aria-label={t('tcg.page_title')} className="mb-8 flex flex-wrap gap-3 text-sm font-semibold">
          <Link href={localeHref('/tcg', language)} className="glass-btn inline-flex min-h-11 items-center px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">{t('booster_guides.links.catalog')}</Link>
          <Link href={localeHref('/tcg/pull-rates', language)} aria-current={kind === 'pull' ? 'page' : undefined} className="glass-btn inline-flex min-h-11 items-center px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">{t('booster_guides.links.pull')}</Link>
          <Link href={localeHref('/tcg/booster-value', language)} aria-current={kind === 'value' ? 'page' : undefined} className="glass-btn inline-flex min-h-11 items-center px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">{t('booster_guides.links.value')}</Link>
        </nav>
        <article className="space-y-10">
          <header className="max-w-3xl">
            <h1 className="text-4xl font-black tracking-tight text-foreground sm:text-5xl">{t(`${prefix}.title`)}</h1>
            <p className="mt-5 text-lg leading-8 text-foreground/70">{t(`${prefix}.description`)}</p>
          </header>
          <section aria-labelledby="booster-data-status" className="rounded-sm border border-primary/35 bg-primary/5 p-6">
            <h2 id="booster-data-status" className="text-lg font-bold">{t('booster_guides.status')}</h2>
            <p className="mt-2 leading-7 text-foreground/75">{t(`${prefix}.unavailable`)}</p>
          </section>
          {(['method', 'evidence', 'limit'] as const).map((section) => (
            <section key={section} className="max-w-3xl">
              <h2 className="text-2xl font-bold tracking-tight">{t(`${prefix}.${section}Title`)}</h2>
              <p className="mt-3 leading-8 text-foreground/75">{t(`${prefix}.${section}`)}</p>
            </section>
          ))}
        </article>
      </main>
    </div>
  );
}
