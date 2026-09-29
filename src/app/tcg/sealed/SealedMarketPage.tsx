import Image from 'next/image';
import Link from 'next/link';
import { Package, ExternalLink } from 'lucide-react';
import type { SealedPriceSnapshot, SealedProduct } from '@primedex/core/types/sealed';
import Header from '@/components/layout/Header';
import { TCGPageTabs } from '@/components/tcg/TCGPageTabs';
import { publicExpansionName, publicMarketContactHref, publicMarketHref, summarizePublicPrice, type PublicMarketFilters } from '@/lib/tcg-sealed-public-market';
import type { SupportedLanguage } from '@/lib/languages';

type Translate = (key: string, options?: Record<string, unknown>) => string;

export interface PublicMarketData {
  products: SealedProduct[];
  prices: SealedPriceSnapshot[];
  categories: Array<{ id: number; name: string; productCount: number; pricedCount: number; medianCents: number | null }>;
  total: number;
  pricedCount: number;
  medianCents: number | null;
  page: number;
  pageSize: number;
}

export function marketMoney(cents: number | null, lang: string): string {
  return cents === null ? '—' : new Intl.NumberFormat(lang, { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

export function marketPercent(value: number | null, lang: string): string {
  return value === null ? '—' : `${value > 0 ? '+' : ''}${new Intl.NumberFormat(lang, { maximumFractionDigits: 1 }).format(value)}%`;
}

export function MarketFrame({ children }: { children: React.ReactNode }) {
  return <div className="app-page"><Header /><main id="main-content" tabIndex={-1} className="page-shell page-shell--header-offset relative pb-32 outline-none"><TCGPageTabs />{children}</main></div>;
}

export function MarketProductImage({ product, large = false, t }: { product: SealedProduct; large?: boolean; t: Translate }) {
  const classes = large ? 'h-52 w-40 sm:h-72 sm:w-56' : 'h-32 w-24';
  return product.imageAvailable
    ? <Image src={`/api/tcg/sealed/products/${product.cardmarketProductId}/image`} alt={t('tcg.sealed.image_alt', { name: product.name })} width={large ? 224 : 96} height={large ? 288 : 128} unoptimized className={`${classes} shrink-0 rounded-sm border border-border/50 bg-muted/20 object-contain`} />
    : <div className={`${classes} flex shrink-0 items-center justify-center rounded-sm border border-border/50 bg-muted/20 text-primary/45`}><Package aria-hidden="true" /></div>;
}

function link(lang: SupportedLanguage, filters: PublicMarketFilters): string {
  return `/${lang}${publicMarketHref(filters)}`;
}

export function SealedMarketPage({ data, filters, lang, t }: { data: PublicMarketData | null; filters: PublicMarketFilters; lang: SupportedLanguage; t: Translate }) {
  const copy = (key: string, options?: Record<string, unknown>) => t(`tcg.sealed.public_market.${key}`, options);
  const pricesById = new Map<number, SealedPriceSnapshot[]>();
  for (const price of data?.prices ?? []) pricesById.set(price.cardmarketProductId, [...(pricesById.get(price.cardmarketProductId) ?? []), price]);
  const today = new Date().toISOString().slice(0, 10);
  const pageCount = Math.max(1, Math.ceil((data?.total ?? 0) / (data?.pageSize ?? 24)));

  return <MarketFrame>
    <header className="page-header-surface mb-7 p-6 sm:p-9">
      <p className="page-eyebrow">{copy('eyebrow')}</p>
      <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">{copy('title')}</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-foreground/65">{copy('subtitle')}</p>
    </header>

    <form action={`/${lang}/tcg/sealed/market`} method="get" className="grid gap-3 rounded-sm border border-border/60 bg-card/60 p-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
      <label className="space-y-1 text-xs font-bold text-foreground/65"><span>{t('tcg.sealed.search')}</span><input name="q" type="search" defaultValue={filters.q} maxLength={150} className="glass-control h-11 w-full px-3 text-sm" /></label>
      <label className="space-y-1 text-xs font-bold text-foreground/65"><span>{t('tcg.sealed.category')}</span><select name="category" defaultValue={filters.category ?? ''} className="glass-control h-11 w-full px-3 text-sm"><option value="">{copy('all_categories')}</option>{data?.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
      <label className="space-y-1 text-xs font-bold text-foreground/65"><span>{copy('expansion_id')}</span><input name="expansion" type="number" min="0" step="1" defaultValue={filters.expansion ?? ''} placeholder={copy('all_expansions')} className="glass-control h-11 w-full px-3 text-sm" /></label>
      <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-sm border border-primary bg-primary px-4 text-sm font-bold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">{copy('apply_filters')}</button>
    </form>
    {(filters.q || filters.category || filters.expansion) ? <Link href={`/${lang}/tcg/sealed/market`} className="mt-3 inline-block text-sm font-bold text-primary underline-offset-4 hover:underline">{copy('clear_filters')}</Link> : null}

    {data ? <>
      <div className="mt-7 grid gap-3 sm:grid-cols-3">
        <div className="rounded-sm border border-border/60 bg-card/50 p-4"><p className="text-xs font-bold uppercase tracking-wider text-foreground/55">{copy('products')}</p><p className="mt-2 text-3xl font-black tabular-nums">{new Intl.NumberFormat(lang).format(data.total)}</p></div>
        <div className="rounded-sm border border-border/60 bg-card/50 p-4"><p className="text-xs font-bold uppercase tracking-wider text-foreground/55">{copy('priced_products')}</p><p className="mt-2 text-3xl font-black tabular-nums">{new Intl.NumberFormat(lang).format(data.pricedCount)}</p></div>
        <div className="rounded-sm border border-border/60 bg-card/50 p-4"><p className="text-xs font-bold uppercase tracking-wider text-foreground/55">{copy('median_price')}</p><p className="mt-2 text-3xl font-black tabular-nums">{marketMoney(data.medianCents, lang)}</p></div>
      </div>
      <h2 className="mt-9 text-xl font-black">{copy('category_medians')}</h2>
      <div className="mt-3 flex gap-3 overflow-x-auto pb-2">{data.categories.map((category) => <Link key={category.id} href={link(lang, { q: '', page: 0, category: category.id })} className="min-w-44 rounded-sm border border-border/60 bg-card/50 p-4 hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-ring"><span className="block text-sm font-bold">{category.name}</span><span className="mt-2 block text-xl font-black tabular-nums">{marketMoney(category.medianCents, lang)}</span><span className="mt-1 block text-xs text-foreground/50">{category.productCount} {copy('products')}</span></Link>)}</div>

      <div className="mt-9 flex items-end justify-between gap-3"><h2 className="text-xl font-black">{copy('products')}</h2><span className="text-sm text-foreground/55">{new Intl.NumberFormat(lang).format(data.total)}</span></div>
      {data.products.length ? <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{data.products.map((product) => {
        const summary = summarizePublicPrice(pricesById.get(product.cardmarketProductId) ?? [], today);
        return <article key={product.cardmarketProductId} className="flex gap-4 rounded-sm border border-border/60 bg-card/50 p-4">
          <MarketProductImage product={product} t={t} />
          <div className="flex min-w-0 flex-1 flex-col"><p className="text-xs font-bold text-primary">{product.categoryName} · {publicExpansionName(product.expansionId, lang, copy('unknown_expansion', { id: product.expansionId }))}</p><h3 className="mt-1 line-clamp-3 text-base font-black leading-snug">{product.name}</h3><p className="mt-3 text-xs text-foreground/50">{copy('latest_trend')}</p><p className="text-xl font-black tabular-nums">{marketMoney(summary.currentCents, lang)}</p><p className="mt-1 text-xs text-foreground/55">{copy('change_7d')}: {marketPercent(summary.sevenDayPercent, lang)} · {copy('change_30d')}: {marketPercent(summary.thirtyDayPercent, lang)}</p><Link href={`/${lang}/tcg/sealed/market/products/${product.cardmarketProductId}`} className="mt-auto inline-flex min-h-11 items-center font-bold text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring">{copy('view_product')} →</Link></div>
        </article>;
      })}</div> : <p className="mt-4 rounded-sm border border-dashed border-border/60 p-10 text-center text-sm text-foreground/60">{t('tcg.sealed.no_catalogue')}</p>}
      {pageCount > 1 ? <nav aria-label={copy('products')} className="mt-7 flex items-center justify-between gap-4"><Link aria-disabled={filters.page === 0} href={link(lang, { ...filters, page: Math.max(0, filters.page - 1) })} className={`text-sm font-bold text-primary ${filters.page === 0 ? 'pointer-events-none opacity-40' : ''}`}>{copy('previous')}</Link><span className="text-sm font-bold tabular-nums">{filters.page + 1} / {pageCount}</span><Link aria-disabled={filters.page + 1 >= pageCount} href={link(lang, { ...filters, page: filters.page + 1 })} className={`text-sm font-bold text-primary ${filters.page + 1 >= pageCount ? 'pointer-events-none opacity-40' : ''}`}>{copy('next')}</Link></nav> : null}
    </> : <p role="alert" className="mt-7 rounded-sm border border-dashed border-border/60 p-10 text-center text-sm text-foreground/60">{copy('error')}</p>}

    <section className="mt-12 rounded-sm border border-border/60 bg-card/40 p-5 sm:p-7"><h2 className="text-xl font-black">{copy('methodology')}</h2><p className="mt-3 max-w-4xl text-sm leading-7 text-foreground/65">{copy('methodology_body')}</p><p className="mt-3 text-xs text-foreground/50">{t('tcg.sealed.source_prices')} · Cardmarket</p></section>
    <Link href={publicMarketContactHref(lang)} className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-primary underline-offset-4 hover:underline"><ExternalLink size={16} aria-hidden="true" />{copy('report_issue')}</Link>
  </MarketFrame>;
}
