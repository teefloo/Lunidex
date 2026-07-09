'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  X,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';
import { useMounted } from '@/hooks/useMounted';
import { usePrimeDexStore } from '@/store/primedex';
import { cn } from '@/lib/utils';
import Header from '@/components/layout/Header';
import PageHeader from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getAllAbilities } from '@/lib/api/graphql';
import type { AbilityListItem, GraphQLAbilityData } from '@/types/pokemon';

type SortKey = 'name' | 'id';

export default function AbilitiesPageClient() {
  const { t } = useTranslation();
  const mounted = useMounted();
  const getLanguageId = usePrimeDexStore((state) => state.getLanguageId);
  const languageId = mounted ? getLanguageId() : 9;

  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('name');

  const {
    data: rawAbilities,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery<GraphQLAbilityData[]>({
    queryKey: ['abilities', languageId],
    queryFn: () => getAllAbilities(languageId),
    enabled: mounted,
    staleTime: 24 * 60 * 60 * 1000,
    retry: 2,
    refetchOnMount: 'always',
  });

  const abilities = useMemo<AbilityListItem[]>(() => {
    if (!rawAbilities) return [];
    return rawAbilities.map((ability) => ({
      id: ability.id,
      name: ability.name,
      localizedName: ability.pokemon_v2_abilitynames?.[0]?.name || ability.name,
      shortEffect:
        ability.pokemon_v2_abilityeffecttexts?.[0]?.short_effect?.replace(/\n|\f/g, ' ').trim() ||
        ability.pokemon_v2_abilityflavortexts?.[0]?.flavor_text?.replace(/\n|\f/g, ' ').trim() ||
        '',
      generationId: ability.generation_id,
      isMainSeries: ability.is_main_series,
    }));
  }, [rawAbilities]);

  const filteredAbilities = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const next = abilities.filter((ability) => {
      if (!normalizedSearch) return true;
      return (
        ability.localizedName.toLowerCase().includes(normalizedSearch) ||
        ability.name.toLowerCase().includes(normalizedSearch) ||
        ability.shortEffect.toLowerCase().includes(normalizedSearch)
      );
    });

    return [...next].sort((a, b) => {
      if (sortBy === 'name') return a.localizedName.localeCompare(b.localizedName);
      return a.id - b.id;
    });
  }, [abilities, searchTerm, sortBy]);

  const stats = {
    total: abilities.length,
    visible: filteredAbilities.length,
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSortBy('name');
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <BackgroundGlow />
      <Header />

      <main className="page-shell pb-20 pt-8">
        <PageHeader
          title={t('abilities_page.title', { defaultValue: 'Abilities' })}
          subtitle={t('abilities_page.subtitle', { defaultValue: 'Browse every Pokémon ability, its effect, and which Pokémon can have it' })}
          eyebrow={t('nav.abilities', { defaultValue: 'Abilities' })}
          icon={Sparkles}
          badge={<Badge variant="outline">{t('abilities_page.results_count', { count: stats.total, defaultValue: '{{count}} abilities' })}</Badge>}
        />

        <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="xl:sticky xl:top-24 xl:h-fit">
            <div className="page-surface p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-foreground/35">
                  <Filter className="h-3.5 w-3.5 text-primary" />
                  {t('abilities_page.filters', { defaultValue: 'Filters' })}
                </div>
                <Button variant="ghost" size="xs" onClick={clearFilters} className="h-8 px-2.5 text-[10px] uppercase tracking-[0.18em] text-foreground/50">
                  <RefreshCw className="h-3.5 w-3.5" />
                  {t('filters.reset', { defaultValue: 'Reset' })}
                </Button>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-4">
                    <Search className="h-4 w-4 text-foreground/30" />
                  </div>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={t('abilities_page.search_placeholder', { defaultValue: 'Search abilities...' })}
                    className="relative z-0 h-11 w-full rounded-sm border border-border/70 bg-muted/40 pl-11 pr-11 text-sm text-foreground placeholder:text-foreground/30 transition-all focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-sm p-1 text-foreground/30 transition-colors hover:text-foreground"
                      aria-label={t('search.clear', { defaultValue: 'Clear search' })}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {([
                    { key: 'name', label: t('abilities_page.sort_name', { defaultValue: 'Name' }) },
                    { key: 'id', label: t('abilities_page.sort_id', { defaultValue: 'ID' }) },
                  ] as const).map((option) => {
                    const active = sortBy === option.key;
                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => setSortBy(option.key)}
                        className={cn(
                          'inline-flex h-8 items-center justify-center rounded-sm border px-3 text-[10px] font-black uppercase tracking-[0.16em] transition-all',
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
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                  )}
                  {t('abilities_page.results_count', { count: filteredAbilities.length, defaultValue: '{{count}} abilities' })}
                </div>
              </div>

              {isError ? (
                <div className="glass-card flex flex-col items-center justify-center rounded-sm border-dashed px-6 py-16 text-center">
                  <AlertCircle className="mb-4 h-8 w-8 text-primary" />
                  <h3 className="text-xl font-black uppercase tracking-[0.2em] text-foreground/90">
                    {t('abilities_page.load_error', { defaultValue: 'Failed to load abilities' })}
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
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 12 }).map((_, index) => (
                    <div key={index} className="rounded-sm border border-border/70 bg-card/50 p-4">
                      <Skeleton className="h-3 w-12 rounded-full" />
                      <Skeleton className="mt-3 h-5 w-3/4 rounded-full" />
                      <Skeleton className="mt-4 h-14 w-full rounded-sm" />
                    </div>
                  ))}
                </div>
              ) : filteredAbilities.length === 0 ? (
                <div className="glass-card flex flex-col items-center justify-center rounded-sm border-dashed px-6 py-16 text-center">
                  <X className="mb-4 h-8 w-8 text-primary" />
                  <h3 className="text-xl font-black uppercase tracking-[0.2em] text-foreground/90">
                    {t('abilities_page.no_results', { defaultValue: 'No abilities found' })}
                  </h3>
                  <Button variant="outline" className="mt-6 h-11 px-5 uppercase tracking-[0.18em]" onClick={clearFilters}>
                    <RefreshCw className="h-4 w-4" />
                    {t('filters.reset', { defaultValue: 'Reset' })}
                  </Button>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <AnimatePresence mode="popLayout">
                    {filteredAbilities.map((ability, index) => (
                      <AbilityCard key={ability.id} ability={ability} index={index} t={t} />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function AbilityCard({
  ability,
  index,
  t,
}: {
  ability: AbilityListItem;
  index: number;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.02, 0.25) }}
    >
      <Link
        href={`/abilities/${ability.name}`}
        className="group relative block overflow-hidden rounded-sm border border-border/70 bg-card/50 p-4 text-left transition-all duration-300 hover:border-primary/40 hover:bg-card/60"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-foreground/30">
              #{String(ability.id).padStart(3, '0')}
            </p>
            <h3 className="mt-1 truncate text-sm font-black uppercase tracking-tight text-foreground/90 transition-colors group-hover:text-primary">
              {ability.localizedName}
            </h3>
          </div>
          <ExternalLink className="h-3.5 w-3.5 shrink-0 text-foreground/20 transition-colors group-hover:text-primary" />
        </div>

        <p className="mt-3 line-clamp-3 text-sm leading-6 text-foreground/45">
          {ability.shortEffect || t('moves_page.no_description')}
        </p>

        {ability.generationId !== null && (
          <div className="mt-3">
            <Badge variant="outline" className="border-border/70 text-[10px] text-foreground/55">
              {t('moves_page.generation')} {ability.generationId}
            </Badge>
          </div>
        )}
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
