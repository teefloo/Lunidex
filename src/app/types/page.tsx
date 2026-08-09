'use client';

import Header from '@/components/layout/Header';
import PageHeader from '@/components/layout/PageHeader';
import { TYPE_COLORS } from '@/types/pokemon';
import { useQuery } from '@tanstack/react-query';
import { getTypeRelations } from '@/lib/api';
import { getPokemonDetailedByType } from '@/lib/api/graphql';
import {
  ShieldCheck,
  ShieldAlert,
  Info,
  Flame,
  Target,
  Sword,
  Star
} from 'lucide-react';
import { TYPE_ICONS } from '@/lib/pokemon-utils';
import { useState, useMemo, type CSSProperties } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import { useLocaleHref } from '@/hooks/useLocaleHref';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

function TypeChartSkeleton() {
  return (
    <div className="glass-surface rounded-sm overflow-hidden p-5 md:p-6 min-h-[44rem] animate-pulse">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-11 w-11 rounded-sm" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-44 rounded-sm" />
            <Skeleton className="h-3 w-64 rounded-sm" />
          </div>
        </div>
        <Skeleton className="h-10 w-10 rounded-sm" />
      </div>

      <Skeleton className="mt-4 h-14 w-full rounded-sm" />

      <div className="mt-4 flex flex-wrap gap-3">
        {Array.from({ length: 4 }).map((_, idx) => (
          <Skeleton key={idx} className="h-4 w-24 rounded-sm" />
        ))}
      </div>

      <div className="mt-5 rounded-sm border border-border/40 bg-background/40 p-3 md:p-5">
        <div className="min-w-[750px] space-y-2">
          {Array.from({ length: 19 }).map((_, rowIdx) => (
            <div key={rowIdx} className="grid grid-cols-[80px_repeat(18,minmax(0,1fr))] gap-[2px]">
              <Skeleton className="h-10 rounded-lg" />
              {Array.from({ length: 18 }).map((__, colIdx) => (
                <Skeleton key={colIdx} className="h-10 rounded-md" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const TypeChart = dynamic(() => import('@/components/pokemon/TypeChart'), {
  ssr: false,
  loading: () => <TypeChartSkeleton />,
});

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } }
};

const typeBadgeClassName = 'glass-tag type-accent px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.06em]';

function typeBadgeStyle(type: string): CSSProperties {
  return { '--type-color': TYPE_COLORS[type] ?? 'var(--primary)' } as CSSProperties;
}

export default function TypesPage() {
  const { t } = useTranslation();
  const localeHref = useLocaleHref();
  const [selectedType, setSelectedType] = useState<string>('fire');

  const { data: typeRels, isLoading: isTypeRelationsLoading } = useQuery({
    queryKey: ['typeRelations', selectedType],
    queryFn: () => getTypeRelations(selectedType),
    staleTime: 24 * 60 * 60 * 1000,
  });

  const { data: allPokemon, isLoading: isPokemonLoading } = useQuery({
    queryKey: ['pokemonDetailedByType', selectedType],
    queryFn: () => getPokemonDetailedByType(selectedType),
    staleTime: 30 * 60 * 1000,
  });
  const isLoadingPage = isTypeRelationsLoading || isPokemonLoading;

  const emblematicPokemon = useMemo(() => {
    if (!allPokemon) return [];
    return allPokemon
      .filter(p => p.pokemon_v2_pokemontypes.some(t => t.pokemon_v2_type.name === selectedType))
      .sort((a, b) => {
        const totalA = a.pokemon_v2_pokemonstats.reduce((sum, s) => sum + s.base_stat, 0);
        const totalB = b.pokemon_v2_pokemonstats.reduce((sum, s) => sum + s.base_stat, 0);
        return totalB - totalA;
      })
      .slice(0, 6);
  }, [allPokemon, selectedType]);

  if (isLoadingPage) {
    return (
      <div className="app-page text-foreground pb-20 overflow-x-hidden relative">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[34rem] opacity-55"
          style={{
            background: `linear-gradient(180deg, ${TYPE_COLORS[selectedType]}22, transparent 70%), linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)`,
          }}
        >
          <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,var(--background)_100%)]" />
        </div>

        <Header />

        <main className="page-shell py-8 relative z-10">
          <PageHeader
            icon={Target}
            title={t('types_page.title')}
            subtitle={t('types_page.subtitle')}
            eyebrow={null}
            className="mt-16 md:mt-20"
          />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-8"
          >
            <div className="page-surface p-4 md:p-6 rounded-sm relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-foreground/10 to-transparent" />
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-secondary/30 rounded-sm">
                  <Flame className="w-4 h-4 text-foreground/60" />
                </div>
                <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground/50">{t('types_page.select_type')}</h2>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {Object.keys(TYPE_COLORS).map((type) => (
                  <button
                    key={type}
                    type="button"
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-sm border transition-all duration-300",
                      selectedType === type
                        ? "bg-card/70 border-border/70 shadow-lg"
                        : "bg-secondary/20 border-border/40 opacity-60 hover:opacity-100 hover:bg-secondary/30"
                    )}
                    aria-label={t(`types.${type}`)}
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-sm shadow-sm"
                      style={{ backgroundColor: TYPE_COLORS[type] }}
                    />
                    <span className="text-[11px] font-black uppercase tracking-wider">{t(`types.${type}`)}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>

          <div className="mb-10">
            <TypeChartSkeleton />
          </div>

          <div className="space-y-8">
            <div className="page-surface p-6 md:p-8 rounded-sm relative overflow-hidden group">
              <Skeleton className="h-5 w-48 rounded-sm mb-6" />
              <div className="flex items-center gap-4 mb-8">
                <Skeleton className="h-16 w-16 rounded-sm" />
                <div className="space-y-3">
                  <Skeleton className="h-10 w-48 rounded-sm" />
                  <Skeleton className="h-3 w-36 rounded-sm" />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {Array.from({ length: 2 }).map((_, idx) => (
                  <div key={idx} className="space-y-3">
                    <Skeleton className="h-3 w-32 rounded-sm" />
                    <div className="flex flex-wrap gap-2">
                      {Array.from({ length: 5 }).map((__, pillIdx) => (
                        <Skeleton key={pillIdx} className="h-8 w-20 rounded-sm" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {Array.from({ length: 2 }).map((_, idx) => (
                <div key={idx} className="bg-card/30 border border-border/40  p-5 rounded-sm">
                  <Skeleton className="h-3 w-24 rounded-sm mb-3" />
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from({ length: 4 }).map((__, pillIdx) => (
                      <Skeleton key={pillIdx} className="h-6 w-16 rounded-lg" />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-6">
              <Skeleton className="h-6 w-48 rounded-sm" />
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div key={idx} className="bg-card/50 border border-border/50 p-4 rounded-sm flex flex-col items-center gap-3">
                    <Skeleton className="h-20 w-20 rounded-sm" />
                    <Skeleton className="h-4 w-16 rounded-sm" />
                    <Skeleton className="h-3 w-10 rounded-sm" />
                  </div>
                ))}
              </div>
            </div>

            <div className="page-surface p-6 md:p-8 rounded-sm relative overflow-hidden">
              <Skeleton className="h-6 w-40 rounded-sm mb-4" />
              <div className="space-y-3">
                {Array.from({ length: 2 }).map((_, idx) => (
                  <div key={idx} className="flex gap-4 p-4 rounded-sm bg-background/40 border border-border/40">
                    <Skeleton className="h-9 w-9 rounded-sm" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-28 rounded-sm" />
                      <Skeleton className="h-3 w-full rounded-sm" />
                      <Skeleton className="h-3 w-5/6 rounded-sm" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-page text-foreground pb-20 overflow-x-hidden relative">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[34rem] opacity-55"
        style={{
          background: `linear-gradient(180deg, ${TYPE_COLORS[selectedType]}22, transparent 70%), linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)`,
        }}
      >
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,var(--background)_100%)]" />
      </div>

      <Header />

      <main className="page-shell py-8 relative z-10">
        <PageHeader
          icon={Target}
          title={t('types_page.title')}
          subtitle={t('types_page.subtitle')}
          eyebrow={null}
          className="mt-16 md:mt-20"
        />

        {/* Type Selector - Horizontal Pills */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-8"
        >
          <div className="page-surface p-4 md:p-6 rounded-sm relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-foreground/10 to-transparent" />
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-secondary/30 rounded-sm">
                <Flame className="w-4 h-4 text-foreground/60" />
              </div>
              <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground/50">{t('types_page.select_type')}</h2>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {Object.keys(TYPE_COLORS).map((type) => (
                <motion.button
                  key={type}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedType(type)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-sm border transition-all duration-300",
                    selectedType === type
                      ? "bg-card/70 border-border/70 shadow-lg"
                      : "bg-secondary/20 border-border/40 opacity-60 hover:opacity-100 hover:bg-secondary/30"
                  )}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-sm shadow-sm"
                    style={{ backgroundColor: TYPE_COLORS[type] }}
                  />
                  <span className="text-[11px] font-black uppercase tracking-wider">{t(`types.${type}`)}</span>
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Full-width Type Chart Matrix */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mb-10"
        >
          <TypeChart onTypeClick={(type) => setSelectedType(type)} />
        </motion.div>

        {/* Main Analysis Section */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedType}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            {/* Type Header Card */}
            <motion.div variants={itemVariants} className="page-surface p-6 md:p-8 rounded-sm relative overflow-hidden group">
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-foreground/10 to-transparent" />
              <div
                className="absolute inset-x-0 top-0 h-32 opacity-60 transition-opacity duration-700 group-hover:opacity-80"
                style={{ background: `linear-gradient(180deg, ${TYPE_COLORS[selectedType]}18, transparent)` }}
              />

              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-8">
                  <div
                    className="p-4 rounded-sm text-primary-foreground shadow-xl"
                    style={{ backgroundColor: TYPE_COLORS[selectedType] }}
                  >
                    {(() => {
                      const IconComponent = TYPE_ICONS[selectedType];
                      return IconComponent ? <IconComponent className="w-7 h-7 fill-current" /> : null;
                    })()}
                  </div>
                  <div>
                    <h2 className="text-3xl md:text-4xl font-black capitalize tracking-tight">{t(`types.${selectedType}`)}</h2>
                    <p className="text-foreground/40 font-bold uppercase tracking-widest text-[11px] mt-1">{t('types_page.elemental_mastery')}</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Offensive strengths */}
                  <div className="space-y-3">
                    <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-yellow-500/60 flex items-center gap-2">
                      <Sword className="w-3.5 h-3.5" /> {t('types_page.strong_against')}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {typeRels?.damage_relations.double_damage_to.map(t_rel => (
                        <motion.div
                          key={t_rel.name}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.1 }}
                          className={typeBadgeClassName}
                          style={typeBadgeStyle(t_rel.name)}
                        >
                          {t(`types.${t_rel.name}`)}
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Defensive strengths */}
                  <div className="space-y-3">
                    <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-green-500/60 flex items-center gap-2">
                      <ShieldCheck className="w-3.5 h-3.5" /> {t('types_page.resists')}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {typeRels?.damage_relations.half_damage_from.map(t_rel => (
                        <motion.div
                          key={t_rel.name}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.15 }}
                          className={typeBadgeClassName}
                          style={typeBadgeStyle(t_rel.name)}
                        >
                          {t(`types.${t_rel.name}`)}
                        </motion.div>
                      ))}
                      {typeRels?.damage_relations.no_damage_from.map(t_rel => (
                        <motion.div
                          key={t_rel.name}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.2 }}
                          className={typeBadgeClassName}
                          style={typeBadgeStyle(t_rel.name)}
                        >
                          {t(`types.${t_rel.name}`)} ({t('types_page.immune')})
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Weaknesses Warning */}
            <motion.div variants={itemVariants} className="grid md:grid-cols-2 gap-4">
              <div className="bg-red-500/5 border border-red-500/10  p-5 rounded-sm flex gap-4 items-start">
                <div className="p-2 bg-red-500/10 rounded-sm h-fit flex-shrink-0">
                  <ShieldAlert className="w-4 h-4 text-red-500" />
                </div>
                <div>
                  <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-red-500/60 mb-2">{t('types_page.weak_to')}</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {typeRels?.damage_relations.double_damage_from.map(t_rel => (
                      <span key={t_rel.name} className={typeBadgeClassName} style={typeBadgeStyle(t_rel.name)}>
                        {t(`types.${t_rel.name}`)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="bg-blue-500/5 border border-blue-500/10  p-5 rounded-sm flex gap-4 items-start">
                <div className="p-2 bg-blue-500/10 rounded-sm h-fit flex-shrink-0">
                  <Sword className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-500/60 mb-2">{t('types_page.not_effective_against')}</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {typeRels?.damage_relations.half_damage_to.map(t_rel => (
                      <span key={t_rel.name} className={typeBadgeClassName} style={typeBadgeStyle(t_rel.name)}>
                        {t(`types.${t_rel.name}`)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Emblematic Pokemon */}
            <motion.div variants={itemVariants} className="space-y-6">
              <h2 className="text-xl font-black px-2 flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-sm">
                  <Star className="w-5 h-5 text-primary" />
                </div>
                {t('types_page.emblematic')}
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {emblematicPokemon.map((p, idx) => (
                  <Link key={p.id} href={localeHref(`/pokemon/${p.name}`)}>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="bg-card/50 dark:bg-card/35 border border-border/50 dark:border-border/40 p-4 rounded-sm flex flex-col items-center group hover:border-primary/30 hover:bg-primary/5 transition-all duration-300 active:scale-95 relative overflow-hidden"
                    >
                      <div
                        className="absolute inset-x-0 top-0 h-12 opacity-0 transition-opacity duration-500 group-hover:opacity-70"
                        style={{ background: `linear-gradient(180deg, ${TYPE_COLORS[selectedType]}16, transparent)` }}
                      />
                      <div className="relative w-20 h-20 mb-3">
                        <Image
                          src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${p.id}.png`}
                          alt={p.name}
                          width={80}
                          height={80}
                          className="w-full h-full object-contain relative z-10"
                          unoptimized
                        />
                      </div>
                      <span className="font-black capitalize text-xs group-hover:text-primary transition-colors text-center truncate w-full">{p.name}</span>
                      <span className="text-[11px] font-bold text-foreground/40 mt-0.5 tracking-widest">{p.pokemon_v2_pokemonstats.reduce((s, curr) => s + curr.base_stat, 0)}</span>
                    </motion.div>
                  </Link>
                ))}
              </div>
            </motion.div>

            {/* Learning Tips */}
            <motion.div variants={itemVariants} className="page-surface p-6 md:p-8 rounded-sm relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-foreground/10 to-transparent" />
              <h2 className="text-lg font-black mb-4 flex items-center gap-2">
                <Info className="w-5 h-5 text-primary" />
                {t('types_page.tips_title', { type: t(`types.${selectedType}`) })}
              </h2>
              <div className="space-y-3">
                <div className="flex min-w-0 gap-4 py-2">
                  <div className="p-2 bg-red-500/10 rounded-sm h-fit flex-shrink-0">
                    <ShieldAlert className="w-4 h-4 text-red-500" />
                  </div>
                  <p className="min-w-0 max-w-prose flex-1 text-xs text-foreground/60 leading-relaxed">
                    {t('types_page.watch_out', {
                      types: typeRels?.damage_relations.double_damage_from.map(t_rel => t(`types.${t_rel.name}`)).join(', '),
                      type: t(`types.${selectedType}`)
                    })}
                  </p>
                </div>
                <div className="flex min-w-0 gap-4 py-2">
                  <div className="p-2 bg-blue-500/10 rounded-sm h-fit flex-shrink-0">
                    <Sword className="w-4 h-4 text-blue-500" />
                  </div>
                  <p className="min-w-0 max-w-prose flex-1 text-xs text-foreground/60 leading-relaxed">
                    {t('types_page.not_effective', {
                      type: t(`types.${selectedType}`),
                      types: typeRels?.damage_relations.half_damage_to.map(t_rel => t(`types.${t_rel.name}`)).join(', ')
                    })}
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
