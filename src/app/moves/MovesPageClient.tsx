'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  Filter,
  Gauge,
  Loader2,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Swords,
  Target,
  Trophy,
  X,
  Zap,
  ExternalLink,
} from 'lucide-react';
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
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
import { getAllMoves } from '@/lib/api/graphql';
import { TYPE_COLORS, type GraphQLMoveData, type MoveListItem } from '@/types/pokemon';
import MoveDetailModal from './MoveDetailModal';

const ALL_TYPES = [
  'normal',
  'fire',
  'water',
  'electric',
  'grass',
  'ice',
  'fighting',
  'poison',
  'ground',
  'flying',
  'psychic',
  'bug',
  'rock',
  'ghost',
  'dragon',
  'dark',
  'steel',
  'fairy',
] as const;

const DAMAGE_CLASSES = ['physical', 'special', 'status'] as const;

type SortKey = 'name' | 'id' | 'power';

export default function MovesPageClient() {
  const { t } = useTranslation();
  const mounted = useMounted();
  const getLanguageId = usePrimeDexStore((state) => state.getLanguageId);
  const languageId = mounted ? getLanguageId() : 9;

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>('name');
  const [selectedMove, setSelectedMove] = useState<MoveListItem | null>(null);
  const [visibleCount, setVisibleCount] = useState(48);

  const {
    data: rawMoves,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery<GraphQLMoveData[]>({
    queryKey: ['moves', languageId],
    queryFn: () => getAllMoves(languageId),
    enabled: mounted,
    staleTime: 24 * 60 * 60 * 1000,
    retry: 2,
    refetchOnMount: 'always',
  });

  const moves = useMemo<MoveListItem[]>(() => {
    if (!rawMoves) return [];

    return rawMoves.map((move) => ({
      id: move.id,
      name: move.name,
      power: move.power,
      accuracy: move.accuracy,
      pp: move.pp,
      priority: move.priority,
      type: move.pokemon_v2_type?.name || 'normal',
      damage_class: move.pokemon_v2_movedamageclass?.name || 'status',
      localizedName: move.pokemon_v2_movenames?.[0]?.name || move.name,
      description: getMoveDescription(move),
      generation_id: move.generation_id,
    }));
  }, [rawMoves]);

  const filteredMoves = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    const nextMoves = moves.filter((move) => {
      const matchesSearch =
        !normalizedSearch ||
        move.localizedName.toLowerCase().includes(normalizedSearch) ||
        move.name.toLowerCase().includes(normalizedSearch) ||
        move.description.toLowerCase().includes(normalizedSearch);

      const matchesType = !selectedType || move.type === selectedType;
      const matchesClass = !selectedClass || move.damage_class === selectedClass;

      return matchesSearch && matchesType && matchesClass;
    });

    return [...nextMoves].sort((a, b) => {
      if (sortBy === 'name') {
        return a.localizedName.localeCompare(b.localizedName);
      }

      if (sortBy === 'power') {
        const powerA = a.power ?? -1;
        const powerB = b.power ?? -1;
        if (powerA !== powerB) return powerB - powerA;
        return a.localizedName.localeCompare(b.localizedName);
      }

      return a.id - b.id;
    });
  }, [moves, searchTerm, selectedType, selectedClass, sortBy]);

  useEffect(() => {
    // Reset pagination when a new filter result set is selected.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisibleCount(48);
  }, [searchTerm, selectedType, selectedClass, sortBy]);

  const visibleMoves = filteredMoves.slice(0, visibleCount);

  const stats = useMemo(() => ({
    total: moves.length,
    visible: filteredMoves.length,
    physical: moves.filter((move) => move.damage_class === 'physical').length,
    special: moves.filter((move) => move.damage_class === 'special').length,
    status: moves.filter((move) => move.damage_class === 'status').length,
  }), [filteredMoves.length, moves]);

  const activeFiltersCount =
    Number(Boolean(searchTerm)) +
    Number(Boolean(selectedType)) +
    Number(Boolean(selectedClass)) +
    Number(sortBy !== 'name');

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedType(null);
    setSelectedClass(null);
    setSortBy('name');
  };

  if (!mounted) {
    return (
      <MovesPageShell
        loading
        title={t('moves_page.title')}
        subtitle={t('moves_page.subtitle')}
        eyebrow={t('nav.moves')}
      />
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <BackgroundGlow />
      <Header />

      <main className="page-shell pb-20 pt-8">
        <PageHeader
          title={t('moves_page.title')}
          subtitle={t('moves_page.subtitle')}
          eyebrow={t('nav.moves')}
          icon={Swords}
          badge={<Badge variant="outline">{t('moves_page.results_count', { count: stats.total })}</Badge>}
        />

        <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="xl:sticky xl:top-24 xl:h-[calc(100vh-7rem)]">
            <div className="page-surface h-full overflow-hidden p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-foreground/35">
                  <Filter className="h-3.5 w-3.5 text-primary" />
                  {t('moves_page.catalog_filters')}
                </div>
                <Button type="button" variant="ghost" size="touch" onClick={clearFilters} className="text-[11px] uppercase tracking-[0.18em] text-foreground/60">
                  <RefreshCw className="h-3.5 w-3.5" />
                  {t('filters.reset')}
                </Button>
              </div>

              <div className="space-y-4 overflow-y-auto pr-1 scrollbar-premium xl:max-h-[calc(100vh-13rem)]">
                <SearchInput
                  value={searchTerm}
                  onChange={setSearchTerm}
                  onClear={() => setSearchTerm('')}
                  placeholder={t('moves_page.search_placeholder')}
                  clearLabel={t('search.clear')}
                />

                <FilterSection
                  title={t('moves_page.sort_by')}
                  icon={SlidersHorizontal}
                  badge={sortBy === 'name' ? t('moves_page.sort_name') : t(`moves_page.sort_${sortBy}`)}
                >
                  <div className="flex flex-wrap gap-2">
                    {([
                      { key: 'name', label: t('moves_page.sort_name') },
                      { key: 'id', label: t('moves_page.sort_id') },
                      { key: 'power', label: t('moves_page.sort_power') },
                    ] as const).map((option) => {
                      const active = sortBy === option.key;
                      return (
                        <button
                          key={option.key}
                          type="button"
                          onClick={() => setSortBy(option.key)}
                          className={cn(
                            'touch-target inline-flex min-h-11 items-center justify-center rounded-sm border px-3 text-[11px] font-black uppercase tracking-[0.16em] transition-[color,background-color,border-color]',
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
                </FilterSection>

                <FilterSection
                  title={t('moves_page.filter_by_type')}
                  icon={Sparkles}
                  badge={selectedType ? t(`types.${selectedType}`) : t('moves_page.all_types')}
                >
                  <div className="flex flex-wrap gap-2">
                    {ALL_TYPES.map((type) => {
                      const active = selectedType === type;
                      const typeColor = TYPE_COLORS[type] || '#6B7280';
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setSelectedType(active ? null : type)}
                          className={cn(
                            'touch-target inline-flex min-h-11 items-center justify-center rounded-sm border px-3 text-[11px] font-black uppercase tracking-[0.16em] transition-[color,background-color,border-color]',
                            active
                              ? 'border-transparent text-primary-foreground shadow-[0_0_16px_rgba(227,53,13,0.14)]'
                              : 'border-border/60 bg-card/50 text-foreground/55 hover:border-border/90 hover:bg-card/65 hover:text-foreground',
                          )}
                          style={active ? { backgroundColor: typeColor } : undefined}
                          aria-pressed={active}
                          aria-label={t(`types.${type}`)}
                        >
                          {t(`types.${type}`)}
                        </button>
                      );
                    })}
                  </div>
                </FilterSection>

                <FilterSection
                  title={t('moves_page.filter_by_class')}
                  icon={Trophy}
                  badge={selectedClass ? t(`moves.damage_class.${selectedClass}`) : t('moves_page.all_classes')}
                >
                  <div className="flex flex-wrap gap-2">
                    {DAMAGE_CLASSES.map((damageClass) => {
                      const active = selectedClass === damageClass;
                      return (
                        <button
                          key={damageClass}
                          type="button"
                          onClick={() => setSelectedClass(active ? null : damageClass)}
                          className={cn(
                            'touch-target inline-flex min-h-11 items-center justify-center rounded-sm border px-3 text-[11px] font-black uppercase tracking-[0.16em] transition-[color,background-color,border-color]',
                            active
                              ? 'border-primary/35 bg-primary/15 text-primary'
                              : 'border-border/60 bg-card/50 text-foreground/55 hover:border-border/90 hover:bg-card/65 hover:text-foreground',
                          )}
                          aria-pressed={active}
                        >
                          {t(`moves.damage_class.${damageClass}`)}
                        </button>
                      );
                    })}
                  </div>
                </FilterSection>

              <div className="rounded-sm border border-border/70 bg-background/60 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-foreground/35">
                    {t('moves_page.catalog_filters_hint')}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-foreground/45">
                    {t('moves_page.results_count', { count: stats.visible })}
                  </p>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <SmallStat label={t('moves.damage_class.physical')} value={stats.physical} />
                    <SmallStat label={t('moves.damage_class.special')} value={stats.special} />
                    <SmallStat label={t('moves.damage_class.status')} value={stats.status} />
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <section className="min-w-0 space-y-6">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatTile icon={Swords} label={t('moves_page.results_count', { count: stats.total })} value={stats.total} />
              <StatTile icon={Target} label={t('moves_page.results_count', { count: stats.visible })} value={stats.visible} />
              <StatTile icon={Zap} label={t('moves.damage_class.physical')} value={stats.physical} />
              <StatTile icon={Gauge} label={t('moves.damage_class.special')} value={stats.special} />
            </div>

            <div className="page-surface p-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-foreground/35">
                  {isFetching && !isLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  ) : (
                    <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
                  )}
                  {isFetching && !isLoading ? t('moves_page.loading') : t('moves_page.results_count', { count: filteredMoves.length })}
                </div>
                <div className="flex items-center gap-2">
                  {activeFiltersCount > 0 && (
                    <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary">
                      {t('moves_page.active_filters', { count: activeFiltersCount })}
                    </Badge>
                  )}
                  <Badge variant="ghost" className="text-[11px] text-foreground/45">
                    {selectedType ? t(`types.${selectedType}`) : t('moves_page.all_types')}
                  </Badge>
                </div>
              </div>

              {isError ? (
                <ErrorState
                  title={t('moves_page.load_error')}
                  description={t('moves_page.load_error_desc')}
                  details={error instanceof Error ? error.message : null}
                  retryLabel={t('common.retry')}
                  onRetry={() => void refetch()}
                />
              ) : isLoading ? (
                <MovesGridSkeleton />
              ) : filteredMoves.length === 0 ? (
                <NoResults
                  title={t('moves_page.no_results')}
                  description={t('moves_page.no_results_desc')}
                  onClear={clearFilters}
                  clearLabel={t('filters.reset')}
                />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  <AnimatePresence mode="popLayout">
                    {visibleMoves.map((move, index) => (
                      <MoveCard
                        key={move.id}
                        move={move}
                        index={index}
                        onClick={() => setSelectedMove(move)}
                        t={t}
                      />
                    ))}
                  </AnimatePresence>
                  {visibleCount < filteredMoves.length && (
                    <div className="col-span-full flex flex-col items-center gap-2 pt-3">
                      <p className="text-xs text-muted-foreground" aria-live="polite">
                        {t('moves_page.showing_results', { defaultValue: `Showing ${visibleMoves.length} of ${filteredMoves.length}` })}
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

      <MoveDetailModal move={selectedMove} open={!!selectedMove} onClose={() => setSelectedMove(null)} />
    </div>
  );
}

export function MoveCard({
  move,
  index,
  onClick,
  t,
}: {
  move: MoveListItem;
  index: number;
  onClick: () => void;
  t: (key: string, options?: { count?: number; defaultValue?: string }) => string;
}) {
  const typeColor = TYPE_COLORS[move.type] || '#6B7280';

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.02, 0.25) }}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.98 }}
      className="group relative overflow-hidden rounded-sm border border-border/70 bg-card/50 p-4 text-left transition-[border-color,background-color,transform,opacity] duration-300 hover:border-border/90 hover:bg-card/60"
    >
      <div
        className="absolute inset-x-0 top-0 h-1.5 rounded-t-[1.5rem]"
        style={{ backgroundColor: typeColor }}
      />

      <div className="flex items-start justify-between gap-3 pt-1.5">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-foreground/30">
            #{String(move.id).padStart(3, '0')}
          </p>
          <h3 className="mt-1 truncate text-sm font-black uppercase tracking-tight text-foreground/90 transition-colors group-hover:text-primary">
            {move.localizedName}
          </h3>
        </div>

        <Badge className="shrink-0 text-primary-foreground" style={{ backgroundColor: typeColor }}>
          {t(`types.${move.type}`)}
        </Badge>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="border-border/70 text-[11px] text-foreground/55">
          {t(`moves.damage_class.${move.damage_class}`)}
        </Badge>
        {move.generation_id !== null && (
          <Badge variant="ghost" className="text-[11px] text-foreground/45">
            {t('moves_page.generation')} {move.generation_id}
          </Badge>
        )}
      </div>

      <p className="mt-3 line-clamp-3 text-sm leading-6 text-foreground/45">
        {move.description || t('moves_page.no_description')}
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <MiniStat label={t('moves.power_short')} value={move.power !== null ? String(move.power) : '—'} />
        <MiniStat label={t('moves.accuracy_short')} value={move.accuracy !== null ? `${move.accuracy}%` : '—'} />
        <MiniStat label={t('moves_page.pp')} value={move.pp !== null ? String(move.pp) : '—'} />
      </div>

      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          size="touch"
          variant="ghost"
          onClick={onClick}
          className="h-11 text-[11px] font-black uppercase tracking-[0.16em] text-foreground/65 hover:text-primary"
        >
          {t('moves_page.preview', { defaultValue: 'Preview' })}
        </Button>
        <Link
          href={`/moves/${move.name}`}
          className="touch-target inline-flex items-center gap-1 rounded-sm border border-border/60 bg-background/50 px-3 text-[11px] font-black uppercase tracking-[0.16em] text-foreground/65 transition-[border-color,background-color,color] hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
          aria-label={`View details for ${move.localizedName}`}
        >
          <ExternalLink className="h-2.5 w-2.5" />
          {t('moves_page.detail_title')}
        </Link>
      </div>
    </motion.article>
  );
}

function SmallStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-sm border border-border/70 bg-muted/40 px-3 py-2 text-center">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-foreground/30">{label}</p>
      <p className="mt-1 text-sm font-black text-foreground/80">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-border/70 bg-muted/40 px-3 py-2 text-center">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-foreground/30">{label}</p>
      <p className="mt-1 text-sm font-black text-foreground/80">{value}</p>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
}) {
  return (
    <div className="page-surface flex items-center gap-3 p-4">
      <div className="flex h-11 w-11 items-center justify-center rounded-sm border border-primary/20 bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-foreground/35">{label}</p>
        <p className="mt-1 truncate text-lg font-black text-foreground/90">{value}</p>
      </div>
    </div>
  );
}

function FilterSection({
  title,
  icon: Icon,
  badge,
  children,
}: {
  title: string;
  icon: LucideIcon;
  badge?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-sm border border-border/70 bg-card/35 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <h4 className="text-[11px] font-black uppercase tracking-[0.18em] text-foreground/35">{title}</h4>
        </div>
        {badge && (
          <span className="rounded-sm border border-primary/20 bg-primary/10 px-2 py-0.5 text-[11px] font-black uppercase tracking-[0.18em] text-primary">
            {badge}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

function SearchInput({
  value,
  onChange,
  onClear,
  placeholder,
  clearLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  placeholder: string;
  clearLabel: string;
}) {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-4">
        <Search className="h-4 w-4 text-foreground/30" />
      </div>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="relative z-0 h-11 w-full rounded-sm border border-border/70 bg-muted/40 pl-11 pr-11 text-sm text-foreground placeholder:text-foreground/30 transition-all focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20"
      />
      {value && (
        <button
          type="button"
          onClick={onClear}
          className="touch-target absolute right-1 top-1/2 -translate-y-1/2 rounded-sm text-foreground/55 transition-colors hover:text-foreground"
          aria-label={clearLabel}
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function MovesGridSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {Array.from({ length: 12 }).map((_, index) => (
        <div key={index} className="rounded-sm border border-border/70 bg-card/50 p-4">
          <Skeleton className="h-3 w-12 rounded-full" />
          <Skeleton className="mt-3 h-5 w-3/4 rounded-full" />
          <Skeleton className="mt-3 h-7 w-24 rounded-full" />
          <Skeleton className="mt-4 h-14 w-full rounded-sm" />
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Skeleton className="h-12 rounded-sm" />
            <Skeleton className="h-12 rounded-sm" />
            <Skeleton className="h-12 rounded-sm" />
          </div>
        </div>
      ))}
    </div>
  );
}

function MovesPageShell({
  loading = false,
  title,
  subtitle,
  eyebrow,
}: {
  loading?: boolean;
  title: string;
  subtitle: string;
  eyebrow: string;
}) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <BackgroundGlow />
      <Header />

      <main className="page-shell pb-20 pt-8">
        <PageHeader
          title={title}
          subtitle={subtitle}
          eyebrow={eyebrow}
          icon={Swords}
        />

        {loading ? <MovesSkeleton /> : null}
      </main>
    </div>
  );
}

function MovesSkeleton() {
  return (
    <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
      <div className="page-surface h-[60vh] p-4">
        <Skeleton className="h-11 w-full rounded-sm" />
        <Skeleton className="mt-4 h-16 w-full rounded-sm" />
        <Skeleton className="mt-3 h-24 w-full rounded-sm" />
        <Skeleton className="mt-3 h-24 w-full rounded-sm" />
      </div>
      <div className="page-surface min-h-[60vh] p-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-44 rounded-sm" />
          ))}
        </div>
      </div>
    </div>
  );
}

function ErrorState({
  title,
  description,
  details,
  retryLabel,
  onRetry,
}: {
  title: string;
  description: string;
  details: string | null;
  retryLabel: string;
  onRetry: () => void;
}) {
  return (
    <div className="glass-card flex flex-col items-center justify-center rounded-sm border-dashed px-6 py-16 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <AlertCircle className="h-8 w-8 text-primary" />
      </div>
      <h3 className="text-xl font-black uppercase tracking-[0.2em] text-foreground/90">{title}</h3>
      <p className="mt-3 max-w-xl text-sm leading-6 text-foreground/35">{description}</p>
      {details && (
        <p className="mt-3 max-w-xl rounded-sm border border-border/70 bg-muted/40 px-4 py-3 font-mono text-[11px] leading-5 text-foreground/45">
          {details}
        </p>
      )}
      <Button className="mt-6 h-11 px-5 uppercase tracking-[0.18em]" onClick={onRetry}>
        <RefreshCw className="h-4 w-4" />
        {retryLabel}
      </Button>
    </div>
  );
}

function NoResults({
  title,
  description,
  onClear,
  clearLabel,
}: {
  title: string;
  description: string;
  onClear: () => void;
  clearLabel: string;
}) {
  return (
    <div className="glass-card flex flex-col items-center justify-center rounded-sm border-dashed px-6 py-16 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <X className="h-8 w-8 text-primary" />
      </div>
      <h3 className="text-xl font-black uppercase tracking-[0.2em] text-foreground/90">{title}</h3>
      <p className="mt-3 max-w-xl text-sm leading-6 text-foreground/35">{description}</p>
      <Button variant="outline" className="mt-6 h-11 px-5 uppercase tracking-[0.18em]" onClick={onClear}>
        <RefreshCw className="h-4 w-4" />
        {clearLabel}
      </Button>
    </div>
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

function getMoveDescription(move: GraphQLMoveData) {
  const flavorText = move.pokemon_v2_moveflavortexts?.[0]?.flavor_text?.replace(/\n/g, ' ').trim();
  const shortEffect = move.pokemon_v2_moveeffect?.pokemon_v2_moveeffecteffecttexts?.[0]?.short_effect?.replace(/\n/g, ' ').trim();
  const effect = move.pokemon_v2_moveeffect?.pokemon_v2_moveeffecteffecttexts?.[0]?.effect?.replace(/\n/g, ' ').trim();

  return flavorText || shortEffect || effect || '';
}
