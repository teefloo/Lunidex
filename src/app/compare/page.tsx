'use client';

import Header from '@/components/layout/Header';
import PageHeader from '@/components/layout/PageHeader';
import { usePrimeDexStore } from '@/store/primedex';
import { useQueries, useQuery } from '@tanstack/react-query';
import { getAllPokemonSearchIndex, getPokemonDetail, getPokemonSpecies, getTypeRelations } from '@/lib/api';
import { TypeRelations } from '@/lib/api/rest';
import { TYPE_COLORS, PokemonDetail, PokemonSpecies } from '@/types/pokemon';
import { analyzeTeam } from '@/lib/team-analysis';
import { getCompareSuggestions } from '@/lib/counter-suggestions';
import { 
  ArrowLeft, 
  Loader2, 
  Scale, 
  Swords, 
  Ruler, 
  Weight,
  Search,
  Copy,
  Plus,
  Sparkles,
  X,
  Trash2,
  Trophy,
  ShieldAlert,
  Heart,
  AlertTriangle,
  Zap
} from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { cn, formatId } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { useLocaleHref } from '@/hooks/useLocaleHref';
import { resolveLanguage } from '@/lib/languages';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';

// Dynamic imports for heavy charting library
const RadarChart = dynamic(
  () => import('recharts').then(m => m.RadarChart),
  { ssr: false, loading: () => <div className="h-[400px] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary/40" /></div> }
);
const Radar = dynamic(() => import('recharts').then(m => m.Radar), { ssr: false });
const PolarGrid = dynamic(() => import('recharts').then(m => m.PolarGrid), { ssr: false });
const PolarAngleAxis = dynamic(() => import('recharts').then(m => m.PolarAngleAxis), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false });
const Legend = dynamic(() => import('recharts').then(m => m.Legend), { ssr: false });
const STAT_KEYS = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'] as const;

import Image from 'next/image';

export default function ComparePage() {
  const { language, systemLanguage, compareList, addToCompare, removeFromCompare, clearCompare } = usePrimeDexStore();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const localeHref = useLocaleHref();
  const [compareSearch, setCompareSearch] = useState('');

  const resolvedLang = resolveLanguage(language, systemLanguage);
  const { data: allPokemon } = useQuery({
    queryKey: ['compare-search-index'],
    queryFn: getAllPokemonSearchIndex,
    staleTime: 24 * 60 * 60 * 1000,
  });

  const sharedCompareIds = useMemo(() => {
    const raw = searchParams.get('ids');
    if (!raw) return [];
    return raw
      .split(',')
      .map((value) => Number.parseInt(value, 10))
      .filter((value) => Number.isFinite(value) && value > 0)
      .slice(0, 3);
  }, [searchParams]);

  const isSharedCompare = sharedCompareIds.length > 0;
  const activeCompareIds = isSharedCompare ? sharedCompareIds : compareList;

  const buildCompareUrl = useCallback((ids: number[]) => {
    if (ids.length === 0) return pathname;
    return `${pathname}?ids=${ids.join(',')}`;
  }, [pathname]);

  const copyCompareLink = useCallback(async () => {
    try {
      if (typeof window === 'undefined') return;
      const url = `${window.location.origin}${buildCompareUrl(activeCompareIds)}`;
      await navigator.clipboard.writeText(url);
      toast.success(t('detail.copied'));
    } catch (error) {
      console.error('Failed to copy compare link:', error);
    }
  }, [activeCompareIds, buildCompareUrl, t]);

  const handleAddToCompare = useCallback((id: number) => {
    if (activeCompareIds.includes(id) || activeCompareIds.length >= 3) return;
    if (isSharedCompare) {
      router.replace(buildCompareUrl([...activeCompareIds, id]));
      return;
    }
    addToCompare(id);
  }, [activeCompareIds, addToCompare, buildCompareUrl, isSharedCompare, router]);

  const handleRemoveFromCompare = useCallback((id: number) => {
    if (isSharedCompare) {
      router.replace(buildCompareUrl(activeCompareIds.filter((currentId) => currentId !== id)));
      return;
    }
    removeFromCompare(id);
  }, [activeCompareIds, buildCompareUrl, isSharedCompare, removeFromCompare, router]);

  const handleClearCompare = useCallback(() => {
    if (isSharedCompare) {
      router.replace(pathname);
      return;
    }
    clearCompare();
  }, [clearCompare, isSharedCompare, pathname, router]);

  const searchResults = useMemo(() => {
    if (!allPokemon || !compareSearch.trim()) return [];
    const term = compareSearch.toLowerCase();

    return allPokemon
      .filter((pokemon) => {
        const speciesNames = pokemon.pokemon_v2_pokemonspecy?.pokemon_v2_pokemonspeciesnames || [];
        const localized = speciesNames.find((entry) => entry.pokemon_v2_language?.name === resolvedLang);
        const displayName = (localized?.name || pokemon.name).toLowerCase();
        return displayName.includes(term) || pokemon.name.includes(term) || pokemon.id.toString().includes(term);
      })
      .filter((pokemon) => !activeCompareIds.includes(pokemon.id))
      .slice(0, 6);
  }, [activeCompareIds, allPokemon, compareSearch, resolvedLang]);

  const statLabels: Record<string, string> = useMemo(() => ({
    'hp': t('stats.hp_short'),
    'attack': t('stats.attack_short'),
    'defense': t('stats.defense_short'),
    'special-attack': t('stats.special_attack_short'),
    'special-defense': t('stats.special_defense_short'),
    'speed': t('stats.speed_short'),
  }), [t]);

  const pokemonQueries = useQueries({
    queries: activeCompareIds.map(id => ({
      queryKey: ['pokemon-compare', id],
      queryFn: async () => {
        const [pokemon, species] = await Promise.all([
          getPokemonDetail(id.toString()),
          getPokemonSpecies(id.toString()).catch(() => null)
        ]);
        return { pokemon, species };
      },
      staleTime: 10 * 60 * 1000,
    }))
  });

  const isLoading = pokemonQueries.some(q => q.isLoading);
  const compareData = useMemo(() => 
    pokemonQueries.map(q => q.data).filter((d): d is { pokemon: PokemonDetail, species: PokemonSpecies | null } => !!d),
    [pokemonQueries]
  );

  const chartData = useMemo(() => {
    if (compareData.length === 0) return [];
    
    return STAT_KEYS.map((stat) => {
      const data: Record<string, string | number> = { 
        stat: statLabels[stat],
        fullMark: 255 
      };
      compareData.forEach(d => {
        if (d.pokemon) {
          const s = d.pokemon.stats.find((st) => st.stat.name === stat);
          data[d.pokemon.name] = s ? s.base_stat : 0;
        }
      });
      return data;
    });
  }, [compareData, statLabels]);

  const bestStats = useMemo(() => {
    if (compareData.length === 0) return {};
    
    const stats: Record<string, { val: number, index: number }> = {
      total: { val: -1, index: -1 },
      hp: { val: -1, index: -1 },
      attack: { val: -1, index: -1 },
      defense: { val: -1, index: -1 },
      'special-attack': { val: -1, index: -1 },
      'special-defense': { val: -1, index: -1 },
      speed: { val: -1, index: -1 },
    };

    compareData.forEach((d, idx) => {
      if (!d.pokemon) return;
      const total = d.pokemon.stats.reduce((acc: number, s) => acc + s.base_stat, 0);
      if (total > stats.total.val) stats.total = { val: total, index: idx };

      d.pokemon.stats.forEach((s) => {
        if (s.base_stat > (stats[s.stat.name]?.val || -1)) {
          stats[s.stat.name] = { val: s.base_stat, index: idx };
        }
      });
    });

    return stats;
  }, [compareData]);

  const typeRelationsQueries = useQueries({
    queries: Object.keys(TYPE_COLORS).map(typeName => ({
      queryKey: ['typeRelations', typeName],
      queryFn: () => getTypeRelations(typeName),
      staleTime: 24 * 60 * 60 * 1000,
    }))
  });

  const analysis = useMemo(() => {
    if (compareData.length === 0 || typeRelationsQueries.some(q => q.isLoading)) return null;
    const pokemonDataList = compareData.map(d => d.pokemon);
    const relationsMap: Record<string, TypeRelations> = {};
    Object.keys(TYPE_COLORS).forEach((typeName, i) => {
      const data = typeRelationsQueries[i]?.data;
      if (data) relationsMap[typeName] = data;
    });
    return analyzeTeam(pokemonDataList, relationsMap);
  }, [compareData, typeRelationsQueries]);

  const suggestions = useMemo(() => {
    if (!analysis) return null;
    const relationsMap: Record<string, TypeRelations> = {};
    Object.keys(TYPE_COLORS).forEach((typeName, i) => {
      const data = typeRelationsQueries[i]?.data;
      if (data) relationsMap[typeName] = data;
    });
    const teamTypes = compareData.flatMap(d => d.pokemon.types.map(t => t.type.name));
    return getCompareSuggestions(analysis, relationsMap, [...new Set(teamTypes)]);
  }, [analysis, compareData, typeRelationsQueries]);

  return (
    <div className="app-page text-foreground pb-20 overflow-x-hidden">
      <Header />
      
      <main className="page-shell py-8 relative z-10">
        <PageHeader
          icon={Scale}
          title={t('compare.title')}
          subtitle={t('compare.comparing', { count: activeCompareIds.length })}
          eyebrow={t('compare.eyebrow', { defaultValue: 'PrimeDex' })}
          className="mt-16 md:mt-20"
          badge={(
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
                className="rounded-sm bg-background/80 border border-border/70"
                aria-label={t('common.back')}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <Button
                variant="destructive"
                onClick={handleClearCompare}
                className="rounded-sm font-black uppercase tracking-widest gap-2"
              >
                <Trash2 className="w-4 h-4" />
                {t('compare.clear')}
              </Button>
            </div>
          )}
        />

        <section className="page-surface mb-8 rounded-sm p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="w-full lg:max-w-xl">
              <div className="flex h-12 items-center gap-3 rounded-sm border border-border/50 bg-card/55 px-4 transition focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10">
                <Search className="h-4 w-4 shrink-0 text-foreground/35" />
                <input
                  type="search"
                  value={compareSearch}
                  onChange={(event) => setCompareSearch(event.target.value)}
                  placeholder={t('search.placeholder')}
                  aria-label={t('search.placeholder')}
                  className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-foreground placeholder:text-foreground/30 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="secondary"
                onClick={copyCompareLink}
                disabled={activeCompareIds.length === 0}
                className="rounded-sm font-black uppercase tracking-widest gap-2"
              >
                <Copy className="h-4 w-4" />
                {t('compare.copy_link')}
              </Button>
              <Button
                variant="outline"
                onClick={handleClearCompare}
                disabled={activeCompareIds.length === 0}
                className="rounded-sm font-black uppercase tracking-widest gap-2"
              >
                <Trash2 className="h-4 w-4" />
                {t('compare.clear')}
              </Button>
            </div>
          </div>

          {compareSearch.trim().length > 0 && (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {searchResults.length > 0 ? searchResults.map((pokemon) => {
                const speciesNames = pokemon.pokemon_v2_pokemonspecy?.pokemon_v2_pokemonspeciesnames || [];
                const localized = speciesNames.find((entry) => entry.pokemon_v2_language?.name === resolvedLang);
                const displayName = pokemon.name.includes('-')
                  ? pokemon.name.replace(/-/g, ' ')
                  : localized?.name || pokemon.name;

                return (
                  <button
                    key={pokemon.id}
                    type="button"
                    onClick={() => handleAddToCompare(pokemon.id)}
                    disabled={activeCompareIds.length >= 3}
                    className="flex items-center gap-3 rounded-sm border border-border/50 bg-card/50 p-3 text-left transition-all hover:border-primary/30 hover:bg-card/60 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <div className="relative h-12 w-12 flex-shrink-0 rounded-full bg-card/55 p-1">
                      <Image
                        src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`}
                        alt={displayName}
                        fill
                        sizes="48px"
                        className="object-contain"
                        unoptimized
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black capitalize">{displayName}</p>
                      <p className="text-[11px] font-bold uppercase tracking-widest text-foreground/35">
                        {formatId(pokemon.id)}
                      </p>
                    </div>
                    <Plus className="h-4 w-4 text-primary" />
                  </button>
                );
                }) : (
                <div className="rounded-sm border-2 border-dashed border-border/60 bg-card px-4 py-6 text-sm font-medium text-muted-foreground">
                  {t('list.no_results')}
                </div>
              )}
              </div>
          )}
        </section>

        {isLoading ? (
          <div className="flex flex-col justify-center items-center h-96 gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <p className="text-foreground/40 font-semibold tracking-widest uppercase text-sm">{t('list.loading')}</p>
          </div>
        ) : compareData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-muted-foreground rounded-sm border-2 border-dashed border-border/60 bg-card">
            <Scale className="w-16 h-16 text-foreground/20 mb-6" />
            <h3 className="text-2xl font-black mb-2 text-foreground">{t('compare.no_compare')}</h3>
            <p className="text-base text-muted-foreground font-medium mb-8">{t('compare.no_compare_desc')}</p>
            <Button onClick={() => router.push(localeHref('/'))} className="rounded-sm font-black uppercase px-8">{t('compare.browse_pokedex')}</Button>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Radar Chart Section */}
            {compareData.length > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="page-surface p-4 md:p-8 rounded-sm overflow-hidden"
              >
                <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
                  <div className="h-[280px] sm:h-[350px] md:h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                        <PolarGrid stroke="var(--border)" />
                        <PolarAngleAxis
                          dataKey="stat"
                          tick={{ fill: 'color-mix(in oklab, var(--foreground) 55%, transparent)', fontSize: 12, fontWeight: 'bold' }}
                        />
                        {compareData.map((d) => d.pokemon && (
                          <Radar
                            key={d.pokemon.id}
                            name={d.species?.names?.find((n) => n.language.name === resolvedLang)?.name || d.pokemon.name}
                            dataKey={d.pokemon.name}
                            stroke={TYPE_COLORS[d.pokemon.types[0].type.name]}
                            fill={TYPE_COLORS[d.pokemon.types[0].type.name]}
                            fillOpacity={0.3}
                          />
                        ))}
                        <Legend />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-6">
                  <div>
                      <h3 className="text-2xl font-black mb-2 tracking-tight">{t('compare.stat_winners')}</h3>
                      <p className="text-sm text-foreground/40 font-bold uppercase tracking-widest mb-6">{t('compare.top_performers')}</p>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {Object.entries(bestStats).map(([key, info]) => {
                        if (key === 'total') return null;
                        const winner = compareData[info.index];
                        if (!winner || !winner.pokemon) return null;
                        const winnerName = winner.species?.names?.find((n) => n.language.name === resolvedLang)?.name || winner.pokemon.name;
                        return (
                          <div key={key} className="bg-secondary/20 p-4 rounded-sm border border-border/40 flex flex-col gap-1 hover:border-primary/30 transition-all">
                            <span className="text-[11px] font-black uppercase text-muted-foreground">{statLabels[key]}</span>
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-black text-sm capitalize truncate">{winnerName}</span>
                              <span className="font-black text-primary bg-primary/10 px-2 py-0.5 rounded-sm text-xs">{info.val}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {bestStats.total && (
                      <div className="bg-primary/10 p-6 rounded-sm border border-primary/20 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-primary rounded-sm text-primary-foreground shadow-lg shadow-primary/20">
                            <Trophy className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-[11px] font-black uppercase text-primary tracking-widest">{t('compare.overall_champion')}</p>
                            <h4 className="text-xl font-black capitalize">
                              {compareData[bestStats.total.index]?.species?.names?.find((n) => n.language.name === resolvedLang)?.name || compareData[bestStats.total.index]?.pokemon?.name}
                            </h4>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] font-black uppercase text-muted-foreground mb-1">{t('compare.total_stats')}</p>
                          <p className="text-2xl font-black text-primary">{bestStats.total.val}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Suggestions Section */}
            {suggestions && (suggestions.counters.length > 0 || suggestions.partners.length > 0 || suggestions.sharedWeaknesses.length > 0) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="page-surface p-4 md:p-8 rounded-sm"
              >
                <div className="mb-8">
                  <h3 className="text-2xl font-black mb-2 tracking-tight flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-sm">
                      <Sparkles className="w-5 h-5 text-primary" />
                    </div>
                    {t('compare.suggestions_title')}
                  </h3>
                  <p className="text-sm text-muted-foreground font-bold uppercase tracking-widest">{t('compare.suggestions_subtitle')}</p>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  {/* Threats / Counters */}
                  {suggestions.counters.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="text-sm font-black uppercase tracking-widest text-red-500/60 flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4" /> {t('compare.counters_title')}
                      </h4>
                      <p className="text-[11px] text-muted-foreground font-bold">{t('compare.counters_desc')}</p>
                      <div className="space-y-3">
                        {suggestions.counters.map(counter => (
                          <div key={counter.type} className="p-4 rounded-sm bg-red-500/5 border border-red-500/10 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span
                                  className="glass-tag type-accent px-3 py-1 text-[11px]"
                                  style={{ '--type-color': TYPE_COLORS[counter.type] } as React.CSSProperties}
                                >
                                  {t(`types.${counter.type}`)}
                                </span>
                                <span className="text-[11px] text-muted-foreground font-bold">
                                  {t('compare.threat_severity', { severity: counter.severity })}
                                </span>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {counter.threatTypes.map(threat => (
                                <span
                                  key={threat}
                                  className="px-2 py-0.5 rounded-sm text-[11px] font-black uppercase bg-red-500/10 border border-red-500/15"
                                  style={{ color: TYPE_COLORS[threat] }}
                                >
                                  {t(`types.${threat}`)}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommended Partners */}
                  {suggestions.partners.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="text-sm font-black uppercase tracking-widest text-green-500/60 flex items-center gap-2">
                        <Heart className="w-4 h-4" /> {t('compare.partners_title')}
                      </h4>
                      <p className="text-[11px] text-muted-foreground font-bold">{t('compare.partners_desc')}</p>
                      <div className="space-y-3">
                        {suggestions.partners.map(partner => (
                          <div key={partner.type} className="p-4 rounded-sm bg-green-500/5 border border-green-500/10 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <span
                                className="glass-tag type-accent px-3 py-1 text-[11px]"
                                style={{ '--type-color': TYPE_COLORS[partner.type] } as React.CSSProperties}
                              >
                                {t(`types.${partner.type}`)}
                              </span>
                              <span className="text-[11px] text-muted-foreground font-bold">
                                {partner.reason === 'both'
                                  ? t('compare.covers_both')
                                  : partner.reason === 'covers_weakness'
                                  ? t('compare.covers_weakness', { types: partner.coversTypes.map(ct => t(`types.${ct}`)).join(', ') })
                                  : t('compare.fills_coverage')}
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const term = partner.type;
                                setCompareSearch(term);
                              }}
                              className="rounded-sm text-[11px] font-black uppercase gap-1 text-primary hover:bg-primary/10 shrink-0"
                              aria-label={t('compare.add_to_compare')}
                            >
                              <Plus className="w-3 h-3" />
                              {t('compare.add_to_compare')}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Shared Weaknesses */}
                {suggestions.sharedWeaknesses.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-border/40">
                    <h4 className="text-sm font-black uppercase tracking-widest text-orange-500/60 flex items-center gap-2 mb-4">
                      <AlertTriangle className="w-4 h-4" /> {t('compare.shared_weaknesses')}
                    </h4>
                    <p className="text-[11px] text-muted-foreground font-bold mb-4">{t('compare.shared_weaknesses_desc')}</p>
                    <div className="flex flex-wrap gap-2">
                      {suggestions.sharedWeaknesses.map(type => (
                        <span
                          key={type}
                          className="px-3 py-1.5 rounded-sm border border-orange-500/10 bg-orange-500/5 text-[11px] font-black uppercase"
                          style={{ color: TYPE_COLORS[type] }}
                        >
                          {t(`types.${type}`)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stat Deficiencies */}
                {suggestions.statDeficiencies.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-border/40">
                    <h4 className="text-sm font-black uppercase tracking-widest text-yellow-500/60 flex items-center gap-2 mb-4">
                      <Zap className="w-4 h-4" /> {t('compare.stat_deficiencies')}
                    </h4>
                    <p className="text-[11px] text-muted-foreground font-bold mb-4">{t('compare.stat_deficiencies_desc')}</p>
                    <div className="flex flex-wrap gap-2">
                      {suggestions.statDeficiencies.map(stat => (
                        <span
                          key={stat}
                          className="px-3 py-1.5 rounded-sm bg-yellow-500/5 border border-yellow-500/10 text-[11px] font-black uppercase text-yellow-500"
                        >
                          {t(`stats.${stat}`)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            <div className={cn(
              "grid gap-6",
              compareData.length === 1 ? "grid-cols-1 max-w-md mx-auto" : 
              compareData.length === 2 ? "grid-cols-1 md:grid-cols-2" : 
              "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
            )}>
              {compareData.map((d, idx) => {
                if (!d.pokemon) return null;
                const p = d.pokemon;
                const s_data = d.species;
                const color = TYPE_COLORS[p.types[0].type.name];
                const totalStats = p.stats.reduce((acc: number, s) => acc + s.base_stat, 0);
                const isOverallBest = bestStats.total?.index === idx;
                const displayName = s_data?.names?.find((n) => n.language.name === resolvedLang)?.name || p.name;

                return (
                  <motion.div 
                    key={p.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="glass-panel p-6 rounded-sm relative overflow-hidden flex flex-col group"
                    style={{ '--type-color': `${color}20` } as React.CSSProperties}
                  >
                    <button 
                      onClick={() => handleRemoveFromCompare(p.id)}
                      className="absolute top-4 right-4 z-20 p-2 rounded-full bg-secondary/50 hover:bg-destructive/20 hover:text-destructive transition-colors"
                      aria-label={t('card.remove_compare')}
                    >
                      <X className="w-4 h-4" />
                    </button>

                    <div className="flex flex-col items-center text-center mb-8 relative z-10">
                      <div className="text-xs font-black text-muted-foreground mb-2">{formatId(p.id)}</div>
                      <div className="relative w-40 h-40 mb-4">
                        <div className="absolute inset-x-6 bottom-4 top-12 rounded-sm bg-gradient-to-t from-primary/10 to-transparent transition-opacity group-hover:opacity-80" />
                        <Image 
                          src={p.sprites.other['official-artwork'].front_default || p.sprites.front_default} 
                          alt={displayName} 
                          width={160}
                          height={160}
                          sizes="160px"
                          className="w-full h-full object-contain relative z-10 drop-shadow-2xl group-hover:scale-110 transition-transform"
                          unoptimized
                        />
                      </div>
                      <h3 className="text-2xl font-black capitalize mb-4">{displayName}</h3>
                      <div className="flex gap-2 justify-center">
                        {p.types.map((typeItem) => (
                          <span 
                            key={typeItem.type.name} 
                            className="glass-tag type-accent px-4 py-1 text-[11px]"
                            style={{ '--type-color': TYPE_COLORS[typeItem.type.name] } as React.CSSProperties}
                          >
                            {t(`types.${typeItem.type.name}`)}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-8 flex-1">
                      {/* Size & Weight */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-secondary/20 p-3 rounded-sm flex flex-col items-center">
                          <Ruler className="w-4 h-4 text-foreground/30 mb-1" />
                          <span className="text-[11px] font-bold text-foreground/40 uppercase mb-1">{t('compare.height')}</span>
                          <span className="font-black text-sm">{p.height / 10} m</span>
                        </div>
                        <div className="bg-secondary/20 p-3 rounded-sm flex flex-col items-center">
                          <Weight className="w-4 h-4 text-foreground/30 mb-1" />
                          <span className="text-[11px] font-bold text-foreground/40 uppercase mb-1">{t('compare.weight')}</span>
                          <span className="font-black text-sm">{p.weight / 10} kg</span>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-[11px] font-black uppercase tracking-widest text-foreground/40 flex items-center gap-2">
                            <Swords className="w-3 h-3" /> {t('compare.stats')}
                          </h4>
                          <div className={cn(
                            "px-2 py-0.5 rounded-sm text-[11px] sm:text-[11px] font-black uppercase tracking-tighter",
                            isOverallBest ? "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400" : "bg-secondary/50 text-muted-foreground"
                          )}>
                            {t('compare.total')}: {totalStats} {isOverallBest ? t('compare.best') : ''}
                          </div>
                        </div>
                        <div className="space-y-3">
                          {p.stats.map((s) => {
                            const isBest = bestStats[s.stat.name]?.index === idx;
                            return (
                              <div key={s.stat.name} className="space-y-1">
                                <div className="flex justify-between items-center text-[11px] sm:text-[11px] font-bold uppercase tracking-wider">
                                  <span className={cn(isBest ? "text-primary" : "text-muted-foreground")}>
                                    {statLabels[s.stat.name]}
                                  </span>
                                  <span className={cn(isBest ? "text-primary font-black" : "text-foreground/70")}>
                                    {s.base_stat} {isBest ? t('compare.best') : ''}
                                  </span>
                                </div>
                                <div className="h-1.5 rounded-full bg-secondary/50 overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(s.base_stat / 255) * 100}%` }}
                                    className="h-full rounded-sm"
                                    style={{ backgroundColor: isBest ? 'var(--primary)' : color }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Abilities */}
                      <div className="space-y-3">
                        <h4 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                          <Sparkles className="w-3 h-3" /> {t('detail.abilities')}
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {p.abilities.map((a) => (
                            <div 
                              key={a.ability.name} 
                              className="px-3 py-1.5 bg-secondary/20 border border-border/40 rounded-sm text-[11px] font-bold capitalize"
                            >
                              {a.ability.name.replace('-', ' ')}
                              {a.is_hidden && <span className="ml-1 opacity-40 text-[11px] sm:text-[11px]">{t('detail.hidden')}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

