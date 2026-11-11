import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Package, ExternalLink, Search, SlidersHorizontal } from 'lucide-react';
import type { SealedPriceSnapshot, SealedProduct } from '@primedex/core/types/sealed';
import Header from '@/components/layout/Header';
import { SealedWorkspaceNavigation, type SealedWorkspaceView } from '@/components/tcg/SealedWorkspaceNavigation';
import PublicSealedGuideSection from '@/components/tcg/PublicSealedGuideSection';
import { PublicExpansionFilter } from '@/components/tcg/PublicExpansionFilter';
import { hasPublicExpansionName, publicExpansionName, publicMarketContactHref, publicMarketHref, summarizePublicPrice, type PublicMarketFilters } from '@/lib/tcg-sealed-public-market';
import { formatPublicMarketReleaseDate, resolvePublicMarketReleaseDate } from '@/lib/tcg-sealed-market-releases';
import type { SupportedLanguage } from '@/lib/languages';
import { buildBreadcrumbJsonLd } from '@/lib/seo';
import { serializeJsonLd } from '@/lib/json-ld';

type Translate = (key: string, options?: Record<string, unknown>) => string;

export interface PublicMarketData {
  products: SealedProduct[];
  prices: SealedPriceSnapshot[];
  expansions: Array<{ id: number; productCount: number }>;
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

function marketSourceDate(value: string | null, lang: string): string | null {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp)
    ? new Intl.DateTimeFormat(lang, { dateStyle: 'medium', timeZone: 'UTC' }).format(timestamp)
    : null;
}

export function MarketFrame({
  children,
  view = 'market',
  currentLabel,
}: {
  children: React.ReactNode;
  view?: SealedWorkspaceView;
  currentLabel?: string;
}) {
  return (
    <div className="app-page">
      <Header />
      <main className="page-shell page-shell--header-offset relative pb-32 outline-none">
        <SealedWorkspaceNavigation view={view} currentLabel={currentLabel} />
        {children}
      </main>
    </div>
  );
}

export function MarketProductImage({ product, large = false, t }: { product: SealedProduct; large?: boolean; t: Translate }) {
  const classes = large
    ? 'h-52 w-40 rounded-sm border border-border/50 bg-muted/20 sm:h-72 sm:w-56'
    : 'h-full w-full';
  return product.imageAvailable
    ? <Image src={`/api/tcg/sealed/products/${product.cardmarketProductId}/image`} alt={t('tcg.sealed.image_alt', { name: product.name })} width={224} height={288} unoptimized className={`${classes} shrink-0 object-contain`} />
    : <div className={`${classes} flex shrink-0 items-center justify-center text-primary/45`}><Package aria-hidden="true" className={large ? 'h-8 w-8' : 'h-10 w-10'} /></div>;
}

function link(lang: SupportedLanguage, filters: PublicMarketFilters): string {
  return `/${lang}${publicMarketHref(filters)}`;
}

export function SealedMarketPage({ data, filters, lang, t }: { data: PublicMarketData | null; filters: PublicMarketFilters; lang: SupportedLanguage; t: Translate }) {
  const copy = (key: string, options?: Record<string, unknown>) => t(`tcg.sealed.public_market.${key}`, options);
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: t('common.home', { defaultValue: 'Home' }), path: '/' },
    { name: t('tcg.nav_catalog', { defaultValue: 'TCG catalog' }), path: '/tcg' },
    { name: copy('title'), path: '/tcg/sealed/market' },
  ], lang);
  const pricesById = new Map<number, SealedPriceSnapshot[]>();
  for (const price of data?.prices ?? []) pricesById.set(price.cardmarketProductId, [...(pricesById.get(price.cardmarketProductId) ?? []), price]);
  const today = new Date().toISOString().slice(0, 10);
  const pageCount = Math.max(1, Math.ceil((data?.total ?? 0) / (data?.pageSize ?? 24)));
  const hasActiveFilters = Boolean(filters.q || filters.category !== undefined || filters.expansion !== undefined || filters.minPriceCents !== undefined || filters.maxPriceCents !== undefined || filters.pricedOnly);
  const activeFilterCount = [filters.q, filters.category, filters.expansion, filters.minPriceCents, filters.maxPriceCents, filters.pricedOnly]
    .filter((value) => value !== undefined && value !== '' && value !== false).length;
  const hasNonDefaultSort = filters.sort !== undefined && filters.sort !== 'release-newest';
  const isReleaseSort = filters.sort === 'release-newest' || filters.sort === 'release-oldest';
  const sortTranslationKey = filters.sort === 'name-desc'
    ? 'sort_name_desc'
    : filters.sort === 'price-asc'
      ? 'sort_price_asc'
      : filters.sort === 'price-desc'
        ? 'sort_price_desc'
        : filters.sort === 'release-newest'
          ? 'sort_release_newest'
          : filters.sort === 'release-oldest'
            ? 'sort_release_oldest'
        : 'sort_release_newest';
  const expansionOptions = (data?.expansions ?? []).map(({ id }) => ({
    id,
    label: hasPublicExpansionName(id)
      ? `${publicExpansionName(id, lang)} · #${id}`
      : copy('unknown_expansion', { id }),
  }));
  if (filters.expansion !== undefined && !expansionOptions.some((option) => option.id === filters.expansion)) {
    const id = filters.expansion;
    expansionOptions.push({ id, label: copy('unknown_expansion', { id }) });
  }

  const categoryLabel = data?.categories.find((category) => category.id === filters.category)?.name;
  const expansionLabel = expansionOptions.find((option) => option.id === filters.expansion)?.label;
  const clearFiltersHref = `/${lang}/tcg/sealed/market`;

  return <MarketFrame>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumb) }} />
    <header className="page-header-surface mb-5 p-5 sm:mb-6 sm:p-7">
      <p className="page-eyebrow">{copy('eyebrow')}</p>
      <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">{copy('title')}</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-foreground/65">{copy('subtitle')}</p>
    </header>

    <section aria-label={t('tcg.sealed.search')} className="rounded-sm border border-border/60 bg-card/70 p-3 shadow-sm sm:p-4">
      <form action={`/${lang}/tcg/sealed/market`} method="get" autoComplete="off">
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">{copy('search_label')}</span>
            <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-foreground/45" />
            <input name="q" type="search" defaultValue={filters.q} maxLength={150} placeholder={copy('search_placeholder')} className="glass-control h-13 w-full pl-12 pr-4 text-base" />
          </label>
          <button type="submit" className="inline-flex min-h-13 shrink-0 items-center justify-center gap-2 rounded-sm border border-primary bg-primary px-5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            <span>{copy('search_action')}</span><ArrowRight aria-hidden="true" size={16} />
          </button>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(10rem,14rem)_minmax(0,1fr)] sm:items-start">
          <label className="space-y-1 text-xs font-bold text-foreground/65">
            <span>{copy('sort_label')}</span>
            <select name="sort" defaultValue={filters.sort ?? 'release-newest'} className="glass-control h-11 w-full px-3 text-sm">
              <option value="name-asc">{copy('sort_name_asc')}</option>
              <option value="name-desc">{copy('sort_name_desc')}</option>
              <option value="price-asc">{copy('sort_price_asc')}</option>
              <option value="price-desc">{copy('sort_price_desc')}</option>
              <option value="release-newest">{copy('sort_release_newest')}</option>
              <option value="release-oldest">{copy('sort_release_oldest')}</option>
            </select>
            <span className="block text-[0.68rem] font-normal leading-4 text-foreground/50">{copy('release_sort_hint')}</span>
          </label>
          <details open={hasActiveFilters} className="min-w-0 rounded-sm border border-border/50 bg-background/20 sm:mt-4">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-sm px-3 text-sm font-bold text-foreground/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
              <span className="inline-flex items-center gap-2"><SlidersHorizontal aria-hidden="true" size={16} />{copy('filters')}</span>
              {activeFilterCount > 0 ? <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs tabular-nums text-primary">{activeFilterCount}</span> : null}
            </summary>
            <div className="grid gap-3 border-t border-border/50 p-3 sm:grid-cols-2 xl:grid-cols-4">
              <label className="space-y-1 text-xs font-bold text-foreground/65">
                <span>{t('tcg.sealed.category')}</span>
                <select name="category" defaultValue={filters.category ?? ''} className="glass-control h-11 w-full px-3 text-sm">
                  <option value="">{copy('all_categories')}</option>
                  {data?.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
              </label>
              <PublicExpansionFilter key={filters.expansion ?? 'all'} options={expansionOptions} selectedId={filters.expansion} label={copy('expansion_id')} emptyLabel={copy('all_expansions')} hintId="sealed-market-expansion-hint" />
              <label className="space-y-1 text-xs font-bold text-foreground/65">
                <span>{copy('minimum_price')}</span>
                <input name="minPrice" type="number" inputMode="decimal" min="0" step="0.01" aria-describedby="sealed-market-price-hint" defaultValue={filters.minPriceCents === undefined ? '' : (filters.minPriceCents / 100).toFixed(2)} className="glass-control h-11 w-full px-3 text-sm" />
              </label>
              <label className="space-y-1 text-xs font-bold text-foreground/65">
                <span>{copy('maximum_price')}</span>
                <input name="maxPrice" type="number" inputMode="decimal" min="0" step="0.01" aria-describedby="sealed-market-price-hint" defaultValue={filters.maxPriceCents === undefined ? '' : (filters.maxPriceCents / 100).toFixed(2)} className="glass-control h-11 w-full px-3 text-sm" />
              </label>
              <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2 xl:col-span-4">
                <div>
                  <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold">
                    <input name="priced" type="checkbox" value="1" aria-describedby="sealed-market-price-hint" defaultChecked={filters.pricedOnly} className="h-4 w-4 rounded-sm accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" />
                    <span>{copy('priced_only')}</span>
                  </label>
                  <p id="sealed-market-expansion-hint" className="text-xs leading-5 text-foreground/55">{copy('expansion_hint')}</p>
                  <p id="sealed-market-price-hint" className="text-xs leading-5 text-foreground/55">{copy('price_filter_hint')}</p>
                </div>
                <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-sm border border-primary/50 px-4 text-sm font-bold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">{copy('apply_filters')}</button>
              </div>
            </div>
          </details>
        </div>
      </form>

      {hasActiveFilters || hasNonDefaultSort ? <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/50 pt-3">
        <span className="text-xs font-bold text-foreground/55">{copy('active_filters')}</span>
        {hasNonDefaultSort ? <Link href={link(lang, { ...filters, sort: 'release-newest', page: 0 })} className="inline-flex min-h-8 items-center gap-2 rounded-full border border-border/60 bg-background/30 px-3 text-xs hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-ring">{copy('sort_label')}: {copy(sortTranslationKey)}<span aria-hidden="true">×</span></Link> : null}
        {filters.q ? <Link href={link(lang, { ...filters, q: '', page: 0 })} className="inline-flex min-h-8 items-center gap-2 rounded-full border border-border/60 bg-background/30 px-3 text-xs hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-ring">{copy('search_label')}: {filters.q}<span aria-hidden="true">×</span></Link> : null}
        {filters.category !== undefined ? <Link href={link(lang, { ...filters, category: undefined, page: 0 })} className="inline-flex min-h-8 items-center gap-2 rounded-full border border-border/60 bg-background/30 px-3 text-xs hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-ring">{t('tcg.sealed.category')}: {categoryLabel ?? filters.category}<span aria-hidden="true">×</span></Link> : null}
        {filters.expansion !== undefined ? <Link href={link(lang, { ...filters, expansion: undefined, page: 0 })} className="inline-flex min-h-8 items-center gap-2 rounded-full border border-border/60 bg-background/30 px-3 text-xs hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-ring">{copy('expansion_id')}: {expansionLabel ?? filters.expansion}<span aria-hidden="true">×</span></Link> : null}
        {filters.minPriceCents !== undefined ? <Link href={link(lang, { ...filters, minPriceCents: undefined, page: 0 })} className="inline-flex min-h-8 items-center gap-2 rounded-full border border-border/60 bg-background/30 px-3 text-xs hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-ring">{copy('minimum_price')}: {marketMoney(filters.minPriceCents, lang)}<span aria-hidden="true">×</span></Link> : null}
        {filters.maxPriceCents !== undefined ? <Link href={link(lang, { ...filters, maxPriceCents: undefined, page: 0 })} className="inline-flex min-h-8 items-center gap-2 rounded-full border border-border/60 bg-background/30 px-3 text-xs hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-ring">{copy('maximum_price')}: {marketMoney(filters.maxPriceCents, lang)}<span aria-hidden="true">×</span></Link> : null}
        {filters.pricedOnly ? <Link href={link(lang, { ...filters, pricedOnly: false, page: 0 })} className="inline-flex min-h-8 items-center gap-2 rounded-full border border-border/60 bg-background/30 px-3 text-xs hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-ring">{copy('priced_only')}<span aria-hidden="true">×</span></Link> : null}
        <Link href={clearFiltersHref} className="inline-flex min-h-8 items-center px-2 text-xs font-bold text-primary underline-offset-4 hover:underline">{copy('clear_filters')}</Link>
      </div> : null}
    </section>

    {data ? <>
      <div className="mt-7 flex items-end justify-between gap-3"><h2 className="text-xl font-black">{copy('products')}</h2><span className="rounded-full border border-border/60 bg-card/50 px-3 py-1.5 text-sm font-semibold tabular-nums text-foreground/70">{new Intl.NumberFormat(lang).format(data.total)} {copy('products').toLocaleLowerCase(lang)}</span></div>
      {data.products.length ? <div className="mt-4 grid grid-cols-2 gap-3 min-[480px]:gap-4 sm:grid-cols-3 xl:grid-cols-4">{data.products.map((product) => {
        const summary = summarizePublicPrice(pricesById.get(product.cardmarketProductId) ?? [], today);
        const releaseDate = isReleaseSort ? resolvePublicMarketReleaseDate(product.cardmarketProductId, product.expansionId) : null;
        return <article key={product.cardmarketProductId} className="min-w-0">
          <Link href={`/${lang}/tcg/sealed/market/${product.cardmarketProductId}`} className="group flex h-full min-w-0 flex-col rounded-sm border border-border/60 bg-card/50 p-2.5 transition-colors hover:border-primary/55 hover:bg-card/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:p-3">
            <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-sm border border-border/40 bg-primary/[0.06] p-3 sm:p-5">
              <MarketProductImage product={product} t={t} />
            </div>
            <div className="mt-3 flex min-h-14 flex-col justify-center">
              <p className="truncate text-[0.68rem] font-bold uppercase tracking-wide text-primary/85">{product.categoryName}</p>
              <p className="mt-1 truncate text-xs text-foreground/55">{publicExpansionName(product.expansionId, lang, copy('unknown_expansion', { id: product.expansionId }))}</p>
            </div>
            <h3 className="mt-2 line-clamp-3 min-h-[3.75rem] text-sm font-black leading-snug sm:text-base">{product.name}</h3>
            {isReleaseSort ? <p className="mt-2 text-[0.68rem] leading-4 text-foreground/55">{releaseDate
              ? `${copy(releaseDate.source === 'product' ? 'release_product_date' : 'release_expansion_date')}: ${formatPublicMarketReleaseDate(releaseDate, lang)}`
              : copy('release_undated')}</p> : null}
            {summary.currentCents !== null ? <div className="mt-3 border-t border-border/50 pt-2.5">
              <p className="text-[0.68rem] font-semibold text-foreground/55">{copy('card_price_label')}</p>
              <p className="mt-0.5 truncate text-sm font-black tabular-nums sm:text-base">{marketMoney(summary.currentCents, lang)}</p>
              {summary.sourceAt ? <p className="mt-1 truncate text-[0.68rem] text-foreground/45">{marketSourceDate(summary.sourceAt, lang) ?? t('tcg.sealed.source_missing')}</p> : null}
            </div> : null}
            <span className="mt-auto inline-flex min-h-10 items-end gap-1.5 pt-2 text-xs font-bold text-primary underline-offset-4 group-hover:underline sm:text-sm">{copy('view_product')}<ArrowRight aria-hidden="true" size={14} /></span>
          </Link>
        </article>;
      })}</div> : <div className="mt-4 rounded-sm border border-dashed border-border/60 p-8 text-center sm:p-10"><p className="text-sm text-foreground/65">{t('tcg.sealed.no_catalogue')}</p>{hasActiveFilters ? <Link href={clearFiltersHref} className="mt-3 inline-flex min-h-11 items-center text-sm font-bold text-primary underline-offset-4 hover:underline">{copy('clear_filters')}</Link> : null}</div>}
      {pageCount > 1 ? <nav aria-label={copy('products')} className="mt-7 flex items-center justify-between gap-4"><Link aria-disabled={filters.page === 0} href={link(lang, { ...filters, page: Math.max(0, filters.page - 1) })} className={`text-sm font-bold text-primary ${filters.page === 0 ? 'pointer-events-none opacity-40' : ''}`}>{copy('previous')}</Link><span className="text-sm font-bold tabular-nums">{filters.page + 1} / {pageCount}</span><Link aria-disabled={filters.page + 1 >= pageCount} href={link(lang, { ...filters, page: filters.page + 1 })} className={`text-sm font-bold text-primary ${filters.page + 1 >= pageCount ? 'pointer-events-none opacity-40' : ''}`}>{copy('next')}</Link></nav> : null}
    </> : <div role="alert" className="mt-7 flex flex-wrap items-center justify-center gap-4 rounded-sm border border-dashed border-border/60 p-10 text-center text-sm text-foreground/60">
      <p>{copy('error')}</p>
      <a href={link(lang, filters)} className="inline-flex min-h-11 items-center rounded-sm border border-primary/40 px-4 font-bold text-primary hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">{t('common.retry', { defaultValue: 'Retry' })}</a>
    </div>}

    <nav aria-label={copy('title')} className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm font-bold text-primary">
      <Link href={`/${lang}/tcg/sealed/releases`} className="inline-flex min-h-11 items-center underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring">{t('tcg.editorial_sealed.releases.link')}</Link>
      <Link href={`/${lang}/tcg/sealed/buy-safely`} className="inline-flex min-h-11 items-center underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring">{t('tcg.editorial_sealed.safety.link')}</Link>
    </nav>

    <details className="mt-10 rounded-sm border border-border/60 bg-card/40 p-5 sm:p-7">
      <summary className="flex min-h-11 cursor-pointer items-center rounded-sm text-lg font-black focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">{t('tcg.sealed.analytics')}</summary>
      <div className="mt-5 space-y-9">
        <PublicSealedGuideSection />
        {data ? <>
          <section aria-label={copy('products')} className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-sm border border-border/60 bg-card/50 p-4"><p className="text-xs font-bold uppercase tracking-wider text-foreground/55">{copy('products')}</p><p className="mt-2 text-3xl font-black tabular-nums">{new Intl.NumberFormat(lang).format(data.total)}</p></div>
            <div className="rounded-sm border border-border/60 bg-card/50 p-4"><p className="text-xs font-bold uppercase tracking-wider text-foreground/55">{copy('priced_products')}</p><p className="mt-2 text-3xl font-black tabular-nums">{new Intl.NumberFormat(lang).format(data.pricedCount)}</p></div>
            <div className="rounded-sm border border-border/60 bg-card/50 p-4"><p className="text-xs font-bold uppercase tracking-wider text-foreground/55">{copy('median_price')}</p><p className="mt-2 text-3xl font-black tabular-nums">{marketMoney(data.medianCents, lang)}</p></div>
          </section>
          <section aria-labelledby="sealed-category-medians-heading">
            <h2 id="sealed-category-medians-heading" className="text-xl font-black">{copy('category_medians')}</h2>
            <div className="mt-3 flex gap-3 overflow-x-auto pb-2">{data.categories.map((category) => <Link key={category.id} href={link(lang, { q: '', page: 0, category: category.id })} className="min-w-44 rounded-sm border border-border/60 bg-card/50 p-4 hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-ring"><span className="block text-sm font-bold">{category.name}</span><span className="mt-2 block text-xl font-black tabular-nums">{marketMoney(category.medianCents, lang)}</span><span className="mt-1 block text-xs text-foreground/50">{category.productCount} {copy('products')}</span></Link>)}</div>
          </section>
        </> : null}
        <section aria-labelledby="sealed-market-methodology-heading">
          <h2 id="sealed-market-methodology-heading" className="text-xl font-black">{copy('methodology')}</h2>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-foreground/65">{copy('methodology_body')}</p>
          <p className="mt-3 text-xs text-foreground/50">{t('tcg.sealed.source_prices')} · Cardmarket</p>
        </section>
      </div>
    </details>
    <Link href={publicMarketContactHref(lang)} className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-primary underline-offset-4 hover:underline"><ExternalLink size={16} aria-hidden="true" />{copy('report_issue')}</Link>
  </MarketFrame>;
}
