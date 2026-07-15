'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  Filter,
  Loader2,
  Package,
  RefreshCw,
  Search,
  X,
  ExternalLink,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';
import { useMounted } from '@/hooks/useMounted';
import { usePrimeDexStore } from '@/store/primedex';
import { cn, formatName } from '@/lib/utils';
import Header from '@/components/layout/Header';
import PageHeader from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getAllItems } from '@/lib/api/graphql';
import type { GraphQLItemData, ItemListItem } from '@/types/pokemon';
import { PokeballIcon } from '@/components/ui/PokeballIcon';

const itemSpriteUrl = (name: string) => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${name}.png`;

type SortKey = 'name' | 'id' | 'cost';

export default function ItemsPageClient() {
  const { t } = useTranslation();
  const mounted = useMounted();
  const getLanguageId = usePrimeDexStore((state) => state.getLanguageId);
  const languageId = mounted ? getLanguageId() : 9;

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>('name');
  const [visibleCount, setVisibleCount] = useState(48);

  const {
    data: rawItems,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery<GraphQLItemData[]>({
    queryKey: ['items', languageId],
    queryFn: () => getAllItems(languageId),
    enabled: mounted,
    staleTime: 24 * 60 * 60 * 1000,
    retry: 2,
    refetchOnMount: 'always',
  });

  const items = useMemo<ItemListItem[]>(() => {
    if (!rawItems) return [];
    return rawItems.map((item) => ({
      id: item.id,
      name: item.name,
      localizedName: item.pokemon_v2_itemnames?.[0]?.name || formatName(item.name),
      category: item.pokemon_v2_itemcategory?.name || null,
      cost: item.cost,
      shortEffect:
        item.pokemon_v2_itemeffecttexts?.[0]?.short_effect?.replace(/\n|\f/g, ' ').trim() ||
        item.pokemon_v2_itemflavortexts?.[0]?.flavor_text?.replace(/\n|\f/g, ' ').trim() ||
        '',
      spriteUrl: itemSpriteUrl(item.name),
    }));
  }, [rawItems]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => item.category && set.add(item.category));
    return Array.from(set).sort();
  }, [items]);

  const filteredItems = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const next = items.filter((item) => {
      const matchesSearch =
        !normalizedSearch ||
        item.localizedName.toLowerCase().includes(normalizedSearch) ||
        item.name.toLowerCase().includes(normalizedSearch) ||
        item.shortEffect.toLowerCase().includes(normalizedSearch);
      const matchesCategory = !selectedCategory || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    return [...next].sort((a, b) => {
      if (sortBy === 'name') return a.localizedName.localeCompare(b.localizedName);
      if (sortBy === 'cost') return b.cost - a.cost;
      return a.id - b.id;
    });
  }, [items, searchTerm, selectedCategory, sortBy]);

  useEffect(() => {
    // Reset pagination when a new filter result set is selected.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisibleCount(48);
  }, [searchTerm, selectedCategory, sortBy]);

  const visibleItems = filteredItems.slice(0, visibleCount);

  const stats = { total: items.length, visible: filteredItems.length };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory(null);
    setSortBy('name');
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <BackgroundGlow />
      <Header />

      <main className="page-shell pb-20 pt-8">
        <PageHeader
          title={t('items_page.title', { defaultValue: 'Items' })}
          subtitle={t('items_page.subtitle', { defaultValue: 'Browse held items, berries, evolution stones, and more' })}
          eyebrow={t('nav.items', { defaultValue: 'Items' })}
          icon={Package}
          badge={<Badge variant="outline">{t('items_page.results_count', { count: stats.total, defaultValue: '{{count}} items' })}</Badge>}
        />

        <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="xl:sticky xl:top-24 xl:h-[calc(100vh-7rem)]">
            <div className="page-surface h-full overflow-hidden p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-foreground/35">
                  <Filter className="h-3.5 w-3.5 text-primary" />
                  {t('items_page.filters', { defaultValue: 'Filters' })}
                </div>
                <Button type="button" variant="ghost" size="touch" onClick={clearFilters} className="text-[10px] uppercase tracking-[0.18em] text-foreground/60">
                  <RefreshCw className="h-3.5 w-3.5" />
                  {t('filters.reset', { defaultValue: 'Reset' })}
                </Button>
              </div>

              <div className="space-y-4 overflow-y-auto pr-1 scrollbar-premium xl:max-h-[calc(100vh-13rem)]">
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-4">
                    <Search className="h-4 w-4 text-foreground/30" />
                  </div>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={t('items_page.search_placeholder', { defaultValue: 'Search items...' })}
                    name="item-search"
                    autoComplete="off"
                    className="relative z-0 h-11 w-full rounded-sm border border-border/70 bg-muted/40 pl-11 pr-11 text-sm text-foreground placeholder:text-foreground/55 transition-[border-color,box-shadow] focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="touch-target absolute right-1 top-1/2 -translate-y-1/2 rounded-sm text-foreground/55 transition-colors hover:text-foreground"
                      aria-label={t('search.clear', { defaultValue: 'Clear search' })}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {([
                    { key: 'name', label: t('items_page.sort_name', { defaultValue: 'Name' }) },
                    { key: 'id', label: t('items_page.sort_id', { defaultValue: 'ID' }) },
                    { key: 'cost', label: t('items_page.sort_cost', { defaultValue: 'Cost' }) },
                  ] as const).map((option) => {
                    const active = sortBy === option.key;
                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => setSortBy(option.key)}
                        className={cn(
                          'touch-target inline-flex min-h-11 items-center justify-center rounded-sm border px-3 text-[10px] font-black uppercase tracking-[0.16em] transition-[color,background-color,border-color]',
                          active
                            ? 'border-primary/35 bg-primary/15 text-primary'
                            : 'border-border/60 bg-card/50 text-foreground/55 hover:border-border/90 hover:bg-card/65 hover:text-foreground',
                        )}
                        aria-pressed={active}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>

                <div className="rounded-sm border border-border/70 bg-card/35 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.18em] text-foreground/35">
                      {t('items_page.filter_by_category', { defaultValue: 'Category' })}
                    </h4>
                  </div>
                  <div className="flex max-h-64 flex-wrap gap-2 overflow-y-auto">
                    {categories.map((category) => {
                      const active = selectedCategory === category;
                      return (
                        <button
                          key={category}
                          type="button"
                          onClick={() => setSelectedCategory(active ? null : category)}
                          className={cn(
                            'touch-target inline-flex min-h-11 items-center justify-center rounded-sm border px-3 text-[10px] font-black uppercase tracking-[0.16em] transition-[color,background-color,border-color]',
                            active
                              ? 'border-primary/35 bg-primary/15 text-primary'
                              : 'border-border/60 bg-card/50 text-foreground/55 hover:border-border/90 hover:bg-card/65 hover:text-foreground',
                          )}
                          aria-pressed={active}
                        >
                          {formatName(category)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <section className="min-w-0 space-y-6">
            <div className="page-surface p-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-foreground/35">
                  {isFetching && !isLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  ) : (
                    <Package className="h-3.5 w-3.5 text-primary" />
                  )}
                  {t('items_page.results_count', { count: filteredItems.length, defaultValue: '{{count}} items' })}
                </div>
              </div>

              {isError ? (
                <div className="glass-card flex flex-col items-center justify-center rounded-sm border-dashed px-6 py-16 text-center">
                  <AlertCircle className="mb-4 h-8 w-8 text-primary" />
                  <h3 className="text-xl font-black uppercase tracking-[0.2em] text-foreground/90">
                    {t('items_page.load_error', { defaultValue: 'Failed to load items' })}
                  </h3>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-foreground/35">
                    {error instanceof Error ? error.message : ''}
                  </p>
                  <Button className="mt-6 h-11 px-5 uppercase tracking-[0.18em]" onClick={() => void refetch()}>
                    <RefreshCw className="h-4 w-4" />
                    {t('common.retry', { defaultValue: 'Retry' })}
                  </Button>
                </div>
              ) : isLoading ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {Array.from({ length: 12 }).map((_, index) => (
                    <div key={index} className="rounded-sm border border-border/70 bg-card/50 p-4">
                      <Skeleton className="h-10 w-10 rounded-sm" />
                      <Skeleton className="mt-3 h-5 w-3/4 rounded-full" />
                      <Skeleton className="mt-3 h-10 w-full rounded-sm" />
                    </div>
                  ))}
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="glass-card flex flex-col items-center justify-center rounded-sm border-dashed px-6 py-16 text-center">
                  <X className="mb-4 h-8 w-8 text-primary" />
                  <h3 className="text-xl font-black uppercase tracking-[0.2em] text-foreground/90">
                    {t('items_page.no_results', { defaultValue: 'No items found' })}
                  </h3>
                  <Button variant="outline" className="mt-6 h-11 px-5 uppercase tracking-[0.18em]" onClick={clearFilters}>
                    <RefreshCw className="h-4 w-4" />
                    {t('filters.reset', { defaultValue: 'Reset' })}
                  </Button>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  <AnimatePresence mode="popLayout">
                    {visibleItems.map((item, index) => (
                      <ItemCard key={item.id} item={item} index={index} t={t} />
                    ))}
                  </AnimatePresence>
                  {visibleCount < filteredItems.length && (
                    <div className="col-span-full flex flex-col items-center gap-2 pt-3">
                      <p className="text-xs text-muted-foreground" aria-live="polite">
                        {t('items_page.showing_results', { defaultValue: `Showing ${visibleItems.length} of ${filteredItems.length}` })}
                      </p>
                      <Button type="button" size="touch" variant="outline" onClick={() => setVisibleCount((count) => count + 48)}>
                        {t('common.show_more', { defaultValue: 'Show more' })}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function ItemCard({
  item,
  index,
  t,
}: {
  item: ItemListItem;
  index: number;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  const [imgError, setImgError] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.02, 0.25) }}
    >
      <Link
        href={`/items/${item.name}`}
        className="group relative flex h-full flex-col overflow-hidden rounded-sm border border-border/70 bg-card/50 p-4 text-left transition-all duration-300 hover:border-primary/40 hover:bg-card/60"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border border-border/40 bg-background/50 p-1.5">
            {!imgError ? (
              <Image
                src={item.spriteUrl}
                alt={item.localizedName}
                width={32}
                height={32}
                className="h-full w-full object-contain"
                onError={() => setImgError(true)}
                unoptimized
              />
            ) : (
              <PokeballIcon className="h-4 w-4 text-foreground/30" aria-hidden="true" />
            )}
          </div>
          <ExternalLink className="h-3.5 w-3.5 shrink-0 text-foreground/20 transition-colors group-hover:text-primary" />
        </div>

        <h3 className="mt-3 truncate text-sm font-black uppercase tracking-tight text-foreground/90 transition-colors group-hover:text-primary">
          {item.localizedName}
        </h3>

        <p className="mt-2 line-clamp-2 flex-1 text-xs leading-5 text-foreground/45">
          {item.shortEffect || t('items_page.no_description', { defaultValue: 'No description available.' })}
        </p>

        <div className="mt-3 flex items-center justify-between gap-2">
          {item.category && (
            <Badge variant="outline" className="border-border/70 text-[10px] text-foreground/55">
              {formatName(item.category)}
            </Badge>
          )}
          {item.cost > 0 && (
            <span className="text-[10px] font-black text-foreground/40">₽{item.cost.toLocaleString()}</span>
          )}
        </div>
      </Link>
    </motion.div>
  );
}

function BackgroundGlow() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(145deg,color-mix(in_oklab,var(--primary)_12%,transparent),transparent_32%),linear-gradient(315deg,rgba(125,185,176,0.12),transparent_34%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,var(--background)_86%)] opacity-80" />
    </div>
  );
}
