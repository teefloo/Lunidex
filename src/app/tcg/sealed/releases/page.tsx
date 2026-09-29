import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import { TCGPageTabs } from '@/components/tcg/TCGPageTabs';
import { SEALED_RELEASES_V1 } from '@/content/tcg/sealed-releases.v1';
import { formatReleaseWindow } from '@/lib/tcg-release-calendar';
import { getServerLanguage, getServerT } from '@/lib/server-i18n';
import { buildBreadcrumbJsonLd, buildSubpathLanguages, DEFAULT_OG_IMAGE } from '@/lib/seo';
import { serializeJsonLd } from '@/lib/json-ld';

const path = '/tcg/sealed/releases';

export async function generateMetadata(): Promise<Metadata> {
  const [language, t] = await Promise.all([getServerLanguage(), getServerT()]);
  const title = t('tcg.editorial_sealed.releases.title');
  const description = t('tcg.editorial_sealed.releases.intro');
  return {
    title,
    description,
    alternates: { canonical: `/${language}${path}`, languages: buildSubpathLanguages(path) },
    openGraph: { title, description, url: `/${language}${path}`, images: [DEFAULT_OG_IMAGE] },
    twitter: { title, description },
    robots: { index: true, follow: true },
  };
}

export default async function SealedReleasesPage() {
  const [language, t] = await Promise.all([getServerLanguage(), getServerT()]);
  const label = (key: string) => t(`tcg.editorial_sealed.labels.${key}`);
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: t('common.home'), path: '/' },
    { name: t('tcg.page_title'), path: '/tcg' },
    { name: t('tcg.editorial_sealed.releases.title'), path },
  ], language);

  return <div className="app-page">
    <Header />
    <main id="main-content" tabIndex={-1} className="page-shell page-shell--header-offset relative pb-32 outline-none">
      <TCGPageTabs />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumb) }} />
      <section className="page-header-surface mb-6 p-5 sm:p-7">
        <p className="page-eyebrow">{label('market_fr')}</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{t('tcg.editorial_sealed.releases.title')}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-foreground/65">{t('tcg.editorial_sealed.releases.intro')}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link className="inline-flex min-h-11 items-center rounded-sm border border-primary/40 px-4 text-sm font-bold text-primary hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" href={`/${language}/tcg/sealed/market`}>{label('market_link')}</Link>
          <Link className="inline-flex min-h-11 items-center rounded-sm border border-border px-4 text-sm font-bold hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" href={`/${language}/tcg/sealed/buy-safely`}>{label('safety_link')}</Link>
        </div>
      </section>
      <p className="mb-5 text-sm text-foreground/55">{label('date_note')}</p>
      <ol className="grid gap-4 md:grid-cols-2">
        {SEALED_RELEASES_V1.map((release) => <li key={release.id} className="rounded-xl border border-border/65 bg-card/65 p-5">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.1em]">
            <span className="rounded-sm border border-primary/30 bg-primary/10 px-2 py-1 text-primary">{label(release.status)}</span>
            <span className="text-foreground/50">{label(release.kind === 'expansion' ? 'expansion' : 'sealed_product')}</span>
          </div>
          <h2 className="mt-4 text-xl font-black">{release.titleFr}</h2>
          <p className="mt-2 text-lg font-bold">{formatReleaseWindow(release.window, language)}</p>
          <p className="mt-4 text-xs text-foreground/55">{t('tcg.editorial_sealed.labels.verified', { date: release.source.verifiedAt })}</p>
          <a href={release.source.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-11 items-center text-sm font-bold text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">{label('read_source')} · {release.source.publisher}</a>
          {!('cardmarketProductId' in release) && <p className="mt-2 text-xs text-foreground/45">{label('no_match')}</p>}
        </li>)}
      </ol>
    </main>
  </div>;
}
