import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import { TCGPageTabs } from '@/components/tcg/TCGPageTabs';
import { PURCHASE_SAFETY_V1 } from '@/content/tcg/purchase-safety.v1';
import { getServerLanguage, getServerT } from '@/lib/server-i18n';
import { buildBreadcrumbJsonLd, buildSubpathLanguages, DEFAULT_OG_IMAGE } from '@/lib/seo';
import { serializeJsonLd } from '@/lib/json-ld';

const path = '/tcg/sealed/buy-safely';

export async function generateMetadata(): Promise<Metadata> {
  const [language, t] = await Promise.all([getServerLanguage(), getServerT()]);
  const title = t('tcg.editorial_sealed.safety.title');
  const description = t('tcg.editorial_sealed.safety.intro');
  return {
    title,
    description,
    alternates: { canonical: `/${language}${path}`, languages: buildSubpathLanguages(path) },
    openGraph: { title, description, url: `/${language}${path}`, images: [DEFAULT_OG_IMAGE] },
    twitter: { title, description },
    robots: { index: true, follow: true },
  };
}

export default async function BuySafelyPage() {
  const [language, t] = await Promise.all([getServerLanguage(), getServerT()]);
  const label = (key: string) => t(`tcg.editorial_sealed.labels.${key}`);
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: t('common.home'), path: '/' },
    { name: t('tcg.page_title'), path: '/tcg' },
    { name: t('tcg.editorial_sealed.safety.title'), path },
  ], language);

  return <div className="app-page">
    <Header />
    <main id="main-content" tabIndex={-1} className="page-shell page-shell--header-offset relative pb-32 outline-none">
      <TCGPageTabs />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumb) }} />
      <section className="page-header-surface mb-6 p-5 sm:p-7">
        <p className="page-eyebrow">{label('market_fr')}</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{t('tcg.editorial_sealed.safety.title')}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-foreground/65">{t('tcg.editorial_sealed.safety.intro')}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link className="inline-flex min-h-11 items-center rounded-sm border border-primary/40 px-4 text-sm font-bold text-primary hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" href={`/${language}/tcg/sealed/market`}>{label('market_link')}</Link>
          <Link className="inline-flex min-h-11 items-center rounded-sm border border-border px-4 text-sm font-bold hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" href={`/${language}/tcg/sealed/releases`}>{label('releases_link')}</Link>
        </div>
      </section>
      <ol className="grid gap-4 md:grid-cols-2">
        {PURCHASE_SAFETY_V1.topics.map((topic, index) => <li key={topic.id} className="rounded-xl border border-border/65 bg-card/65 p-5">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-primary">{String(index + 1).padStart(2, '0')}</p>
          <h2 className="mt-3 text-xl font-black">{label(`${topic.id}_title`)}</h2>
          <p className="mt-3 text-sm leading-6 text-foreground/65">{label(`${topic.id}_body`)}</p>
          <p className="mt-4 text-xs text-foreground/50">{t('tcg.editorial_sealed.labels.verified', { date: topic.source.verifiedAt })}</p>
          <a href={topic.source.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-11 items-center text-sm font-bold text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">{label('read_source')} · {topic.source.publisher}</a>
        </li>)}
      </ol>
      <section className="mt-6 rounded-xl border border-amber-300/30 bg-amber-300/[0.04] p-5">
        <h2 className="text-xl font-black">{label('report_title')}</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-foreground/65">{label('report_body')}</p>
        <p className="mt-3 text-xs text-foreground/50">{t('tcg.editorial_sealed.labels.verified', { date: PURCHASE_SAFETY_V1.report.verifiedAt })}</p>
        <a href={PURCHASE_SAFETY_V1.report.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-11 items-center text-sm font-bold text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">{label('report_link')}</a>
      </section>
    </main>
  </div>;
}
