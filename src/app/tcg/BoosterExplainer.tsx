import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import { buildBreadcrumbJsonLd, buildSubpathLanguages, DEFAULT_OG_IMAGE, localeHref } from '@/lib/seo';
import { serializeJsonLd } from '@/lib/json-ld';
import { getServerLanguage, getServerT } from '@/lib/server-i18n';
import { PUBLISHED_PULL_STUDIES_V1 } from '@/content/tcg/published-pull-studies.v1';
import { publishedPullStudyCopy } from '@/lib/i18n/booster-guides';

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
  const studyCopy = publishedPullStudyCopy[language];
  const formatStudyPercent = new Intl.NumberFormat(language, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatStudyDate = new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeZone: 'UTC' });
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
          {kind === 'pull' && <section aria-labelledby="published-opening-studies" className="space-y-5">
            <div className="max-w-3xl">
              <h2 id="published-opening-studies" className="text-2xl font-bold tracking-tight">{studyCopy.title}</h2>
              <p className="mt-3 leading-7 text-foreground/75">{studyCopy.intro}</p>
            </div>
            <div className="flex flex-col gap-4 rounded-xl border border-border/65 bg-card/65 p-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-3xl text-sm leading-6 text-foreground/70">{studyCopy.contributeIntro}</p>
              <Link href={`/${language}/contact?topic=booster-sample`} className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-sm border border-primary/40 px-4 text-sm font-bold text-primary hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                {studyCopy.contributeSample}
              </Link>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {PUBLISHED_PULL_STUDIES_V1.map((study) => <article key={study.id} className="rounded-xl border border-border/65 bg-card/65 p-5">
                <h3 className="text-lg font-bold">{study.setNames.join(' + ')}</h3>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-foreground/65">
                  <span className="rounded-full border border-border px-2.5 py-1">{studyCopy.sourceLanguage}</span>
                  <span className="rounded-full border border-border px-2.5 py-1">{studyCopy.sourceMarket}</span>
                </div>
                <p className="mt-2 text-xs text-foreground/55">
                  {studyCopy.sourceAttribution
                    .replace('{{publisher}}', study.source.publisher)
                    .replace(
                      '{{collector}}',
                      study.source.collector === 'not-reported'
                        ? studyCopy.collectorNotReported
                        : study.source.collector ?? study.source.publisher,
                    )}
                </p>
                <p className="mt-3 text-xs leading-5 text-foreground/55">
                  {studyCopy.boosterPackType} · {studyCopy.samplePeriodNotReported}
                </p>
                <p className="mt-3 text-sm text-foreground/75">
                  {(() => {
                    const count = study.sample.packCount.toLocaleString(language);
                    if (study.sample.packCountQualifier === 'exact') {
                      return (study.sample.scope === 'each-set' ? studyCopy.packsExactEachSet : studyCopy.packsExact).replace('{{count}}', count);
                    }
                    return (study.sample.scope === 'each-set' ? studyCopy.packsMoreThanEachSet : studyCopy.packsMoreThan).replace('{{count}}', count);
                  })()}
                </p>
                <p className="mt-4 text-xs font-bold uppercase tracking-[0.08em] text-foreground/55">{studyCopy.metricLabel}</p>
                <dl className="mt-2 divide-y divide-border/65">
                  {study.rates.map((rate) => <div key={rate.rarity} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-2.5">
                    <dt className="text-sm font-semibold">
                      {studyCopy.rarityLabels[rate.rarity]}
                      {rate.note === 'multi-hit-packs' && <span className="mt-1 block text-xs font-normal leading-5 text-foreground/65">{studyCopy.multiHitNote}</span>}
                    </dt>
                    <dd className="text-right">
                      {rate.packsPerHit !== undefined
                        ? <span className="block text-sm font-bold tabular-nums">{studyCopy.approximateOneIn.replace('{{count}}', rate.packsPerHit.toLocaleString(language))}</span>
                        : <>
                          <span className="block text-sm font-bold tabular-nums">{formatStudyPercent.format(rate.ratePercent ?? 0)}% ± {formatStudyPercent.format(rate.marginOfError95Percent ?? 0)}%</span>
                          <span className="block text-xs text-foreground/55">{studyCopy.confidenceLabel}</span>
                        </>}
                    </dd>
                  </div>)}
                </dl>
                {study.notes?.includes('pooled-set-assumption') && <p className="mt-3 text-xs leading-5 text-foreground/65">{studyCopy.pooledSetNote}</p>}
                {study.notes?.includes('unmeasured-rarities') && <p className="mt-3 text-xs leading-5 text-foreground/65">{studyCopy.unmeasuredRaritiesNote}</p>}
                {study.notes?.includes('god-packs-excluded') && <p className="mt-3 text-xs leading-5 text-foreground/65">{studyCopy.godPacksExcludedNote}</p>}
                <a href={study.source.url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-11 items-center text-sm font-bold text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                  {studyCopy.readSource}
                </a>
                <p className="mt-1 text-xs text-foreground/50">{studyCopy.sourceChecked.replace('{{date}}', formatStudyDate.format(new Date(`${study.source.verifiedAt}T12:00:00Z`)))}</p>
              </article>)}
            </div>
          </section>}
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
