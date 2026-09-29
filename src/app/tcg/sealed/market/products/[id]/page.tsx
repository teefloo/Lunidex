import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ExternalLink } from 'lucide-react';
import { getNeonClient } from '@/lib/neon/server';
import { getPublicSealedProduct, SealedNotFoundError } from '@/lib/tcg-sealed-server';
import { buildPublicPriceChartPoints, publicExpansionName, publicMarketContactHref, summarizePublicPrice } from '@/lib/tcg-sealed-public-market';
import { getServerLanguage, getServerT } from '@/lib/server-i18n';
import { buildBreadcrumbJsonLd, buildSubpathLanguages, DEFAULT_OG_IMAGE } from '@/lib/seo';
import { serializeJsonLd } from '@/lib/json-ld';
import { MarketFrame, MarketProductImage, marketMoney, marketPercent } from '../../../SealedMarketPage';

interface ProductPageProps { params: Promise<{ id: string }> }

function productId(value: string): number | null {
  if (!/^[1-9]\d{0,9}$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id <= 2_147_483_647 ? id : null;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const [lang, t, { id }] = await Promise.all([getServerLanguage(), getServerT(), params]);
  const path = `/tcg/sealed/market/products/${id}`;
  const idValue = productId(id);
  const sql = idValue === null ? null : getNeonClient();
  const detail = sql && idValue !== null ? await getPublicSealedProduct(sql, idValue).catch(() => null) : null;
  const title = detail ? `${detail.product.name} — ${t('tcg.sealed.public_market.title')}` : t('tcg.sealed.public_market.title');
  const description = t('tcg.sealed.public_market.subtitle');
  return {
    title,
    description,
    robots: { index: detail !== null, follow: true },
    alternates: { canonical: `/${lang}${path}`, languages: buildSubpathLanguages(path) },
    openGraph: { title, description, url: `/${lang}${path}`, images: [DEFAULT_OG_IMAGE] },
    twitter: { title, description },
  };
}

export default async function PublicSealedProductPage({ params }: ProductPageProps) {
  const [lang, t, { id: rawId }] = await Promise.all([getServerLanguage(), getServerT(), params]);
  const id = productId(rawId);
  if (id === null) notFound();
  const sql = getNeonClient();
  const detail = sql ? await getPublicSealedProduct(sql, id).catch((error: unknown) => {
    if (error instanceof SealedNotFoundError) notFound();
    return null;
  }) : null;
  const copy = (key: string, options?: Record<string, unknown>) => t(`tcg.sealed.public_market.${key}`, options);
  if (!detail) return <MarketFrame><div role="alert" className="rounded-sm border border-dashed border-border/60 p-10 text-center text-foreground/60">{copy('error')}</div></MarketFrame>;

  const { product, prices } = detail;
  const latest = summarizePublicPrice(prices, new Date().toISOString().slice(0, 10));
  const chartPoints = buildPublicPriceChartPoints(prices).slice(-120);
  const dateTimeLabel = (value: string) => {
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp)
      ? new Intl.DateTimeFormat(lang, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(timestamp)
      : '—';
  };
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: t('common.home', { defaultValue: 'Lunidex' }), path: '/' },
    { name: copy('title'), path: '/tcg/sealed/market' },
    { name: product.name, path: `/tcg/sealed/market/products/${id}` },
  ], lang);

  return <MarketFrame>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumb) }} />
    <Link href={`/${lang}/tcg/sealed/market`} className="inline-flex min-h-11 items-center text-sm font-bold text-primary underline-offset-4 hover:underline">← {copy('back_to_market')}</Link>
    <article className="mt-4 grid gap-8 rounded-sm border border-border/60 bg-card/50 p-5 sm:p-8 md:grid-cols-[auto_1fr]">
      <MarketProductImage product={product} large t={t} />
      <div className="min-w-0"><p className="page-eyebrow">{product.categoryName} · {publicExpansionName(product.expansionId, lang, copy('unknown_expansion', { id: product.expansionId }))}</p><h1 className="mt-3 text-2xl font-black tracking-tight sm:text-4xl">{product.name}</h1><p className="mt-2 text-xs text-foreground/45">{t('tcg.sealed.id')} {id}</p>
        <p className="mt-7 text-xs font-bold uppercase tracking-wider text-foreground/55">{copy('latest_trend')}</p><p className="mt-1 text-4xl font-black tabular-nums">{marketMoney(latest.currentCents, lang)}</p><p className="mt-2 text-xs text-foreground/55">{copy('updated')}: {latest.sourceAt ? dateTimeLabel(latest.sourceAt) : '—'}</p>
        <div className="mt-6 grid max-w-lg gap-3 sm:grid-cols-2"><div className="rounded-sm border border-border/60 p-3"><p className="text-xs text-foreground/55">{copy('change_7d')}</p><p className="mt-1 text-lg font-black tabular-nums">{marketPercent(latest.sevenDayPercent, lang)}</p></div><div className="rounded-sm border border-border/60 p-3"><p className="text-xs text-foreground/55">{copy('change_30d')}</p><p className="mt-1 text-lg font-black tabular-nums">{marketPercent(latest.thirtyDayPercent, lang)}</p></div></div>
        <div className="mt-6 grid max-w-lg gap-3 text-sm sm:grid-cols-2"><p><span className="text-foreground/55">{copy('release_date')}:</span> {detail.releaseDate ?? copy('source_unavailable')}</p><p><span className="text-foreground/55">{copy('msrp')}:</span> {detail.msrpCents === null ? copy('source_unavailable') : marketMoney(detail.msrpCents, lang)}</p></div>
        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1"><a href={product.cardmarketUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-sm border border-border px-4 text-sm font-bold hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-ring">Cardmarket <ExternalLink size={16} aria-hidden="true" /></a><Link href={`/${lang}/tcg/sealed/buy-safely`} className="inline-flex min-h-11 items-center text-sm font-bold text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring">{t('tcg.editorial_sealed.labels.safety_link')}</Link><p className="basis-full text-xs text-foreground/50">{t('tcg.editorial_sealed.labels.external_note')}</p></div>
      </div>
    </article>

    <section className="mt-8 rounded-sm border border-border/60 bg-card/40 p-5 sm:p-8"><h2 className="text-xl font-black">{copy('price_observations')}</h2>{chartPoints.length ? <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={copy('price_observations')} className="mt-5 h-56 w-full overflow-visible rounded-sm bg-background/30 p-2">{chartPoints.map((point) => <circle key={point.sourceAt} cx={point.x} cy={point.y} r="1.4" fill="currentColor" className="text-primary" />)}</svg> : <p className="mt-5 text-sm text-foreground/55">{t('tcg.sealed.no_history')}</p>}
      <div className="mt-5 grid gap-2 sm:grid-cols-3">{prices.slice(-9).reverse().map((entry) => <div key={entry.day} className="flex items-center justify-between gap-3 border-b border-border/50 py-2 text-sm"><span className="text-foreground/55">{dateTimeLabel(entry.sourceAt)}</span><strong className="tabular-nums">{marketMoney(entry.metrics.trendCents, lang)}</strong></div>)}</div></section>
    <section className="mt-8 rounded-sm border border-border/60 bg-card/40 p-5 sm:p-8"><h2 className="text-xl font-black">{copy('methodology')}</h2><p className="mt-3 max-w-4xl text-sm leading-7 text-foreground/65">{copy('methodology_body')}</p><p className="mt-3 text-xs text-foreground/50">{t('tcg.sealed.source_prices')} · Cardmarket</p></section>
    <div className="mt-6"><Link href={publicMarketContactHref(lang, id)} className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-primary underline-offset-4 hover:underline">{copy('report_issue')} <ExternalLink size={16} aria-hidden="true" /></Link><p className="text-xs text-foreground/50">{copy('report_hint')}</p></div>
  </MarketFrame>;
}
