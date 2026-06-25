'use client';

import { useQuery, useQueries } from '@tanstack/react-query';
import { AlertCircle, ArrowRight, Loader2, Layers } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useMemo } from 'react';

import Image from 'next/image';

import { REST_API_BASE } from '@/lib/api/client';
import apiClient from '@/lib/api/client';
import { usePrimeDexStore } from '@/store/primedex';
import { getPokemonDetail, getPokemonSpecies } from '@/lib/api';
import { getFormDisplayName, getBaseSpeciesName } from '@/lib/form-names';
import { cn, formatId } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';

interface EvolutionChainProps {
  url: string;
  currentSpeciesName?: string;
  speciesData?: { varieties: { pokemon: { name: string; url: string } }[] } | null;
}

interface ChainLink {
  species: { name: string; url: string };
  evolves_to: ChainLink[];
}

interface ChainResponse {
  chain: ChainLink;
}

interface AlternateForm {
  name: string;
  id: number;
  formType: string;
}

function collectAllSpeciesNames(node: ChainLink): string[] {
  const baseName = getBaseSpeciesName(node.species.name);
  const names = [baseName];
  for (const child of node.evolves_to) {
    names.push(...collectAllSpeciesNames(child));
  }
  return [...new Set(names)];
}

function detectFormType(formName: string): string {
  const lower = formName.toLowerCase();
  if (lower.includes('-mega')) return 'mega';
  if (lower.includes('-gmax') || lower.includes('-gigantamax')) return 'gmax';
  if (lower.includes('-primal')) return 'primal';
  if (lower.includes('-ultra')) return 'ultra';
  if (lower.includes('-alola')) return 'alola';
  if (lower.includes('-galar')) return 'galar';
  if (lower.includes('-hisui')) return 'hisui';
  if (lower.includes('-paldea')) return 'paldea';
  if (lower.includes('-therian')) return 'therian';
  if (lower.includes('-origin')) return 'origin';
  if (lower.includes('-sky')) return 'sky';
  if (lower.includes('-school')) return 'school';
  if (lower.includes('-ash')) return 'ash';
  if (lower.includes('-hero')) return 'hero';
  if (lower.includes('-complete')) return 'complete';
  if (lower.includes('-terastal')) return 'terastal';
  if (lower.includes('-stellar')) return 'stellar';
  if (lower.includes('-spring')) return 'seasonal_spring';
  if (lower.includes('-summer')) return 'seasonal_summer';
  if (lower.includes('-autumn')) return 'seasonal_autumn';
  if (lower.includes('-winter')) return 'seasonal_winter';
  if (lower.includes('-pirouette')) return 'pirouette';
  if (lower.includes('-rock-star')) return 'rock_star';
  if (lower.includes('-pop-star')) return 'pop_star';
  if (lower.includes('-cosplay')) return 'cosplay';
  if (lower.includes('-partner')) return 'partner';
  if (lower.includes('-original')) return 'original';
  if (lower.includes('-original-cap') || lower.includes('-hoenn-cap') || lower.includes('-sinnoh-cap') || lower.includes('-unova-cap') || lower.includes('-kalos-cap') || lower.includes('-alola-cap') || lower.includes('-partner-cap') || lower.includes('-world-cap') || lower.includes('-starter')) return 'original';
  if (lower.includes('-belle') || lower.includes('-phd') || lower.includes('-libre')) return 'cosplay';
  if (lower.includes('-unbound')) return 'unbound';
  if (lower.includes('-confined')) return 'confined';
  if (lower.includes('-ice')) return 'ice';
  if (lower.includes('-shadow')) return 'shadow';
  if (lower.includes('-plant')) return 'plant';
  if (lower.includes('-sandy')) return 'sandy';
  if (lower.includes('-trash')) return 'trash';
  if (lower.includes('-sun')) return 'sun';
  if (lower.includes('-moon')) return 'moon';
  if (lower.includes('-stand')) return 'stand';
  if (lower.includes('-believe')) return 'believe';
  if (lower.includes('-await')) return 'await';
  if (lower.includes('-grow')) return 'grow';
  if (lower.includes('-protag')) return 'protag';
  if (lower.includes('-legend')) return 'legend';
  if (lower.includes('-world')) return 'world';
  if (lower.includes('-baile')) return 'baile';
  if (lower.includes('-pompom')) return 'pompom';
  if (lower.includes('-pawget')) return 'pawget';
  if (lower.includes('-bravel')) return 'bravel';
  if (lower.includes('-dusk') || lower.includes('-dusk-mane')) return 'dusk';
  if (lower.includes('-dawn') || lower.includes('-dawn-mane')) return 'dawn';
  if (lower.includes('-midnight')) return 'midnight';
  if (lower.includes('-erosion')) return 'erosion';
  if (lower.includes('-valiant')) return 'valiant';
  if (lower.includes('-blade')) return 'blade';
  return 'standard';
}

function EvolutionItem({ name, isCurrent }: { name: string; isCurrent?: boolean }) {
  const { language, systemLanguage } = usePrimeDexStore();
  const resolvedLang = language === 'auto' ? systemLanguage : language;

  const { data: pokemonData, isError: pokemonError } = useQuery({
    queryKey: ['pokemon-evolution-item', name, resolvedLang],
    queryFn: () => getPokemonDetail(name),
    staleTime: Infinity,
  });

  const { data: speciesData, isError: speciesError } = useQuery({
    queryKey: ['species-evolution-item', name, resolvedLang],
    queryFn: () => getPokemonSpecies(name),
    staleTime: Infinity,
  });

  const sprite = pokemonData?.sprites.other['official-artwork'].front_default || pokemonData?.sprites.front_default;
  const baseLocalizedName = speciesData?.names?.find(n => n.language.name === resolvedLang)?.name
    || speciesData?.names?.find(n => n.language.name === 'en')?.name
    || name;
  const displayName = name.includes('-')
    ? getFormDisplayName(name, baseLocalizedName, resolvedLang)
    : baseLocalizedName;

  const hasError = pokemonError || speciesError;
  const hasPartialData = pokemonData || speciesData;

  return (
    <Link href={`/pokemon/${name}`} className="relative z-10 hover:z-20">
      <motion.div
        whileHover={{ y: -5, scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={cn(
          "flex flex-col items-center cursor-pointer group",
          isCurrent && "scale-110"
        )}
      >
        <div className={cn(
          "w-24 h-24 md:w-32 md:h-32 bg-secondary/30 border border-border/40 rounded-sm flex items-center justify-center p-4 group-hover:bg-primary/10 group-hover:border-primary/30 transition-all duration-500 relative overflow-hidden shadow-sm",
          isCurrent && "bg-primary/10 border-primary/40 ring-2 ring-primary/30 shadow-lg shadow-primary/20"
        )}>
          <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          {!hasPartialData && hasError ? (
            <div className="text-center">
              <span className="text-xs font-black capitalize text-foreground/60">{displayName}</span>
            </div>
          ) : sprite ? (
            <Image
              src={sprite}
              alt={displayName}
              width={128}
              height={128}
              className="w-full h-full object-contain filter drop-shadow-md group-hover:scale-110 transition-transform duration-500 relative z-10"
            />
          ) : (
            <Loader2 className="w-6 h-6 animate-spin text-foreground/20" />
          )}
        </div>
        <div className="mt-4 text-center">
          <span className="text-[10px] font-black text-foreground/30 uppercase tracking-[0.2em] block mb-0.5">
            {pokemonData ? formatId(pokemonData.id) : ''}
          </span>
          <span className={cn(
            "text-sm font-black capitalize text-foreground/80 group-hover:text-primary transition-colors tracking-tight",
            isCurrent && "text-foreground font-black"
          )}>
            {displayName}
          </span>
          {isCurrent && (
            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-foreground mt-1 block">
              Current
            </span>
          )}
        </div>
      </motion.div>
    </Link>
  );
}

function AlternateFormItem({ form }: { form: AlternateForm }) {
  const store = usePrimeDexStore();
  const resolvedLang = store.language === 'auto' ? store.systemLanguage : store.language;
  const { t } = useTranslation();

  const { data: pokemonData, isLoading, isError } = useQuery({
    queryKey: ['pokemon-alternate-form', form.name, resolvedLang],
    queryFn: () => getPokemonDetail(form.name),
    staleTime: Infinity,
  });

  const baseName = getBaseSpeciesName(form.name);
  const { data: speciesData } = useQuery({
    queryKey: ['species-alternate-form', baseName, resolvedLang],
    queryFn: () => getPokemonSpecies(baseName),
    staleTime: Infinity,
  });

  const sprite = pokemonData?.sprites.other['official-artwork'].front_default || pokemonData?.sprites.front_default;
  
  const baseLocalizedName = speciesData?.names?.find(n => n.language.name === resolvedLang)?.name
    || speciesData?.names?.find(n => n.language.name === 'en')?.name
    || baseName;
  const displayName = form.name.includes('-')
    ? getFormDisplayName(form.name, baseLocalizedName, resolvedLang)
    : baseLocalizedName;

  const formConfig = useMemo((): Record<string, {
    badge: string;
    gradient: string;
    border: string;
    borderHover: string;
    shadow: string;
    innerGradient: string;
    dropShadow: string;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    textHover: string;
  }> => ({
    mega: {
      badge: t('detail.alternate_badge_mega'),
      gradient: 'from-purple-500/20 to-yellow-500/20',
      border: 'border-purple-400/30',
      borderHover: 'group-hover:border-purple-400/60',
      shadow: 'group-hover:shadow-[0_0_20px_rgba(168,85,247,0.3)]',
      innerGradient: 'from-purple-400/10 to-yellow-400/10',
      dropShadow: 'drop-shadow-[0_0_10px_rgba(168,85,247,0.4)]',
      badgeBg: 'bg-purple-500/20',
      badgeText: 'text-purple-400',
      badgeBorder: 'border-purple-500/30',
      textHover: 'group-hover:text-purple-400',
    },
    primal: {
      badge: t('detail.alternate_badge_primal'),
      gradient: 'from-orange-500/20 to-red-500/20',
      border: 'border-orange-400/30',
      borderHover: 'group-hover:border-orange-400/60',
      shadow: 'group-hover:shadow-[0_0_20px_rgba(249,115,22,0.3)]',
      innerGradient: 'from-orange-400/10 to-red-400/10',
      dropShadow: 'drop-shadow-[0_0_10px_rgba(249,115,22,0.4)]',
      badgeBg: 'bg-orange-500/20',
      badgeText: 'text-orange-400',
      badgeBorder: 'border-orange-500/30',
      textHover: 'group-hover:text-orange-400',
    },
    ultra: {
      badge: t('detail.alternate_badge_ultra'),
      gradient: 'from-yellow-500/20 to-amber-500/20',
      border: 'border-yellow-400/30',
      borderHover: 'group-hover:border-yellow-400/60',
      shadow: 'group-hover:shadow-[0_0_20px_rgba(234,179,8,0.3)]',
      innerGradient: 'from-yellow-400/10 to-amber-400/10',
      dropShadow: 'drop-shadow-[0_0_10px_rgba(234,179,8,0.4)]',
      badgeBg: 'bg-yellow-500/20',
      badgeText: 'text-yellow-400',
      badgeBorder: 'border-yellow-500/30',
      textHover: 'group-hover:text-yellow-400',
    },
    gmax: {
      badge: t('detail.alternate_badge_gmax') || 'G-Max',
      gradient: 'from-pink-500/20 to-rose-500/20',
      border: 'border-pink-400/30',
      borderHover: 'group-hover:border-pink-400/60',
      shadow: 'group-hover:shadow-[0_0_20px_rgba(244,63,94,0.3)]',
      innerGradient: 'from-pink-400/10 to-rose-400/10',
      dropShadow: 'drop-shadow-[0_0_10px_rgba(244,63,94,0.4)]',
      badgeBg: 'bg-pink-500/20',
      badgeText: 'text-pink-400',
      badgeBorder: 'border-pink-500/30',
      textHover: 'group-hover:text-pink-400',
    },
    alola: {
      badge: t('detail.alternate_badge_alola') || 'Alola',
      gradient: 'from-teal-500/20 to-emerald-500/20',
      border: 'border-teal-400/30',
      borderHover: 'group-hover:border-teal-400/60',
      shadow: 'group-hover:shadow-[0_0_20px_rgba(20,184,166,0.3)]',
      innerGradient: 'from-teal-400/10 to-emerald-400/10',
      dropShadow: 'drop-shadow-[0_0_10px_rgba(20,184,166,0.4)]',
      badgeBg: 'bg-teal-500/20',
      badgeText: 'text-teal-400',
      badgeBorder: 'border-teal-500/30',
      textHover: 'group-hover:text-teal-400',
    },
    galar: {
      badge: t('detail.alternate_badge_galar') || 'Galar',
      gradient: 'from-indigo-500/20 to-violet-500/20',
      border: 'border-indigo-400/30',
      borderHover: 'group-hover:border-indigo-400/60',
      shadow: 'group-hover:shadow-[0_0_20px_rgba(99,102,241,0.3)]',
      innerGradient: 'from-indigo-400/10 to-violet-400/10',
      dropShadow: 'drop-shadow-[0_0_10px_rgba(99,102,241,0.4)]',
      badgeBg: 'bg-indigo-500/20',
      badgeText: 'text-indigo-400',
      badgeBorder: 'border-indigo-500/30',
      textHover: 'group-hover:text-indigo-400',
    },
    hisui: {
      badge: t('detail.alternate_badge_hisui') || 'Hisui',
      gradient: 'from-stone-500/20 to-neutral-500/20',
      border: 'border-stone-400/30',
      borderHover: 'group-hover:border-stone-400/60',
      shadow: 'group-hover:shadow-[0_0_20px_rgba(168,162,158,0.3)]',
      innerGradient: 'from-stone-400/10 to-neutral-400/10',
      dropShadow: 'drop-shadow-[0_0_10px_rgba(168,162,158,0.4)]',
      badgeBg: 'bg-stone-500/20',
      badgeText: 'text-stone-400',
      badgeBorder: 'border-stone-500/30',
      textHover: 'group-hover:text-stone-400',
    },
    paldea: {
      badge: t('detail.alternate_badge_paldea') || 'Paldea',
      gradient: 'from-orange-500/20 to-amber-500/20',
      border: 'border-orange-400/30',
      borderHover: 'group-hover:border-orange-400/60',
      shadow: 'group-hover:shadow-[0_0_20px_rgba(249,115,22,0.3)]',
      innerGradient: 'from-orange-400/10 to-amber-400/10',
      dropShadow: 'drop-shadow-[0_0_10px_rgba(249,115,22,0.4)]',
      badgeBg: 'bg-orange-500/20',
      badgeText: 'text-orange-400',
      badgeBorder: 'border-orange-500/30',
      textHover: 'group-hover:text-orange-400',
    },
    therian: {
      badge: t('detail.alternate_badge_therian') || 'Therian',
      gradient: 'from-amber-500/20 to-yellow-500/20',
      border: 'border-amber-400/30',
      borderHover: 'group-hover:border-amber-400/60',
      shadow: 'group-hover:shadow-[0_0_20px_rgba(245,158,11,0.3)]',
      innerGradient: 'from-amber-400/10 to-yellow-400/10',
      dropShadow: 'drop-shadow-[0_0_10px_rgba(245,158,11,0.4)]',
      badgeBg: 'bg-amber-500/20',
      badgeText: 'text-amber-400',
      badgeBorder: 'border-amber-500/30',
      textHover: 'group-hover:text-amber-400',
    },
    origin: {
      badge: t('detail.alternate_badge_origin') || 'Origin',
      gradient: 'from-cyan-500/20 to-blue-500/20',
      border: 'border-cyan-400/30',
      borderHover: 'group-hover:border-cyan-400/60',
      shadow: 'group-hover:shadow-[0_0_20px_rgba(6,182,212,0.3)]',
      innerGradient: 'from-cyan-400/10 to-blue-400/10',
      dropShadow: 'drop-shadow-[0_0_10px_rgba(6,182,212,0.4)]',
      badgeBg: 'bg-cyan-500/20',
      badgeText: 'text-cyan-400',
      badgeBorder: 'border-cyan-500/30',
      textHover: 'group-hover:text-cyan-400',
    },
    sky: {
      badge: t('detail.alternate_badge_sky') || 'Sky',
      gradient: 'from-sky-500/20 to-indigo-500/20',
      border: 'border-sky-400/30',
      borderHover: 'group-hover:border-sky-400/60',
      shadow: 'group-hover:shadow-[0_0_20px_rgba(14,165,233,0.3)]',
      innerGradient: 'from-sky-400/10 to-indigo-400/10',
      dropShadow: 'drop-shadow-[0_0_10px_rgba(14,165,233,0.4)]',
      badgeBg: 'bg-sky-500/20',
      badgeText: 'text-sky-400',
      badgeBorder: 'border-sky-500/30',
      textHover: 'group-hover:text-sky-400',
    },
    school: {
      badge: t('detail.alternate_badge_school') || 'School',
      gradient: 'from-blue-500/20 to-cyan-500/20',
      border: 'border-blue-400/30',
      borderHover: 'group-hover:border-blue-400/60',
      shadow: 'group-hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]',
      innerGradient: 'from-blue-400/10 to-cyan-400/10',
      dropShadow: 'drop-shadow-[0_0_10px_rgba(59,130,246,0.4)]',
      badgeBg: 'bg-blue-500/20',
      badgeText: 'text-blue-400',
      badgeBorder: 'border-blue-500/30',
      textHover: 'group-hover:text-blue-400',
    },
    ash: {
      badge: t('detail.alternate_badge_ash') || 'Ash',
      gradient: 'from-red-500/20 to-orange-500/20',
      border: 'border-red-400/30',
      borderHover: 'group-hover:border-red-400/60',
      shadow: 'group-hover:shadow-[0_0_20px_rgba(239,68,68,0.3)]',
      innerGradient: 'from-red-400/10 to-orange-400/10',
      dropShadow: 'drop-shadow-[0_0_10px_rgba(239,68,68,0.4)]',
      badgeBg: 'bg-red-500/20',
      badgeText: 'text-red-400',
      badgeBorder: 'border-red-500/30',
      textHover: 'group-hover:text-red-400',
    },
    hero: {
      badge: t('detail.alternate_badge_hero') || 'Hero',
      gradient: 'from-violet-500/20 to-purple-500/20',
      border: 'border-violet-400/30',
      borderHover: 'group-hover:border-violet-400/60',
      shadow: 'group-hover:shadow-[0_0_20px_rgba(139,92,246,0.3)]',
      innerGradient: 'from-violet-400/10 to-purple-400/10',
      dropShadow: 'drop-shadow-[0_0_10px_rgba(139,92,246,0.4)]',
      badgeBg: 'bg-violet-500/20',
      badgeText: 'text-violet-400',
      badgeBorder: 'border-violet-500/30',
      textHover: 'group-hover:text-violet-400',
    },
    complete: {
      badge: t('detail.alternate_badge_complete') || 'Complete',
      gradient: 'from-emerald-500/20 to-teal-500/20',
      border: 'border-emerald-400/30',
      borderHover: 'group-hover:border-emerald-400/60',
      shadow: 'group-hover:shadow-[0_0_20px_rgba(16,185,129,0.3)]',
      innerGradient: 'from-emerald-400/10 to-teal-400/10',
      dropShadow: 'drop-shadow-[0_0_10px_rgba(16,185,129,0.4)]',
      badgeBg: 'bg-emerald-500/20',
      badgeText: 'text-emerald-400',
      badgeBorder: 'border-emerald-500/30',
      textHover: 'group-hover:text-emerald-400',
    },
    terastal: {
      badge: t('detail.alternate_badge_terastal') || 'Terastal',
      gradient: 'from-rose-500/20 to-pink-500/20',
      border: 'border-rose-400/30',
      borderHover: 'group-hover:border-rose-400/60',
      shadow: 'group-hover:shadow-[0_0_20px_rgba(244,63,94,0.3)]',
      innerGradient: 'from-rose-400/10 to-pink-400/10',
      dropShadow: 'drop-shadow-[0_0_10px_rgba(244,63,94,0.4)]',
      badgeBg: 'bg-rose-500/20',
      badgeText: 'text-rose-400',
      badgeBorder: 'border-rose-500/30',
      textHover: 'group-hover:text-rose-400',
    },
    stellar: {
      badge: t('detail.alternate_badge_stellar') || 'Stellar',
      gradient: 'from-indigo-500/20 to-purple-500/20',
      border: 'border-indigo-400/30',
      borderHover: 'group-hover:border-indigo-400/60',
      shadow: 'group-hover:shadow-[0_0_20px_rgba(99,102,241,0.3)]',
      innerGradient: 'from-indigo-400/10 to-purple-400/10',
      dropShadow: 'drop-shadow-[0_0_10px_rgba(99,102,241,0.4)]',
      badgeBg: 'bg-indigo-500/20',
      badgeText: 'text-indigo-400',
      badgeBorder: 'border-indigo-500/30',
      textHover: 'group-hover:text-indigo-400',
    },
    seasonal_spring: {
      badge: t('detail.alternate_badge_seasonal_spring') || 'Spring',
      gradient: 'from-green-500/20 to-emerald-500/20',
      border: 'border-green-400/30',
      borderHover: 'group-hover:border-green-400/60',
      shadow: 'group-hover:shadow-[0_0_20px_rgba(34,197,94,0.3)]',
      innerGradient: 'from-green-400/10 to-emerald-400/10',
      dropShadow: 'drop-shadow-[0_0_10px_rgba(34,197,94,0.4)]',
      badgeBg: 'bg-green-500/20',
      badgeText: 'text-green-400',
      badgeBorder: 'border-green-500/30',
      textHover: 'group-hover:text-green-400',
    },
    seasonal_summer: {
      badge: t('detail.alternate_badge_seasonal_summer') || 'Summer',
      gradient: 'from-yellow-500/20 to-orange-500/20',
      border: 'border-yellow-400/30',
      borderHover: 'group-hover:border-yellow-400/60',
      shadow: 'group-hover:shadow-[0_0_20px_rgba(234,179,8,0.3)]',
      innerGradient: 'from-yellow-400/10 to-orange-400/10',
      dropShadow: 'drop-shadow-[0_0_10px_rgba(234,179,8,0.4)]',
      badgeBg: 'bg-yellow-500/20',
      badgeText: 'text-yellow-400',
      badgeBorder: 'border-yellow-500/30',
      textHover: 'group-hover:text-yellow-400',
    },
    seasonal_autumn: {
      badge: t('detail.alternate_badge_seasonal_autumn') || 'Autumn',
      gradient: 'from-orange-500/20 to-red-500/20',
      border: 'border-orange-400/30',
      borderHover: 'group-hover:border-orange-400/60',
      shadow: 'group-hover:shadow-[0_0_20px_rgba(249,115,22,0.3)]',
      innerGradient: 'from-orange-400/10 to-red-400/10',
      dropShadow: 'drop-shadow-[0_0_10px_rgba(249,115,22,0.4)]',
      badgeBg: 'bg-orange-500/20',
      badgeText: 'text-orange-400',
      badgeBorder: 'border-orange-500/30',
      textHover: 'group-hover:text-orange-400',
    },
    seasonal_winter: {
      badge: t('detail.alternate_badge_seasonal_winter') || 'Winter',
      gradient: 'from-sky-500/20 to-blue-500/20',
      border: 'border-sky-400/30',
      borderHover: 'group-hover:border-sky-400/60',
      shadow: 'group-hover:shadow-[0_0_20px_rgba(14,165,233,0.3)]',
      innerGradient: 'from-sky-400/10 to-blue-400/10',
      dropShadow: 'drop-shadow-[0_0_10px_rgba(14,165,233,0.4)]',
      badgeBg: 'bg-sky-500/20',
      badgeText: 'text-sky-400',
      badgeBorder: 'border-sky-500/30',
      textHover: 'group-hover:text-sky-400',
    },
    pirouette: {
      badge: t('detail.alternate_badge_pirouette') || 'Pirouette',
      gradient: 'from-pink-500/20 to-rose-500/20',
      border: 'border-pink-400/30',
      borderHover: 'group-hover:border-pink-400/60',
      shadow: 'group-hover:shadow-[0_0_20px_rgba(236,72,153,0.3)]',
      innerGradient: 'from-pink-400/10 to-rose-400/10',
      dropShadow: 'drop-shadow-[0_0_10px_rgba(236,72,153,0.4)]',
      badgeBg: 'bg-pink-500/20',
      badgeText: 'text-pink-400',
      badgeBorder: 'border-pink-500/30',
      textHover: 'group-hover:text-pink-400',
    },
    rock_star: {
      badge: t('detail.alternate_badge_rock_star') || 'Rock Star',
      gradient: 'from-gray-500/20 to-zinc-500/20',
      border: 'border-gray-400/30',
      borderHover: 'group-hover:border-gray-400/60',
      shadow: 'group-hover:shadow-[0_0_20px_rgba(107,114,128,0.3)]',
      innerGradient: 'from-gray-400/10 to-zinc-400/10',
      dropShadow: 'drop-shadow-[0_0_10px_rgba(107,114,128,0.4)]',
      badgeBg: 'bg-gray-500/20',
      badgeText: 'text-gray-400',
      badgeBorder: 'border-gray-500/30',
      textHover: 'group-hover:text-gray-400',
    },
    pop_star: {
      badge: t('detail.alternate_badge_pop_star') || 'Pop Star',
      gradient: 'from-pink-500/20 to-fuchsia-500/20',
      border: 'border-pink-400/30',
      borderHover: 'group-hover:border-pink-400/60',
      shadow: 'group-hover:shadow-[0_0_20px_rgba(236,72,153,0.3)]',
      innerGradient: 'from-pink-400/10 to-fuchsia-400/10',
      dropShadow: 'drop-shadow-[0_0_10px_rgba(236,72,153,0.4)]',
      badgeBg: 'bg-pink-500/20',
      badgeText: 'text-pink-400',
      badgeBorder: 'border-pink-500/30',
      textHover: 'group-hover:text-pink-400',
    },
    cosplay: {
      badge: t('detail.alternate_badge_cosplay') || 'Cosplay',
      gradient: 'from-purple-500/20 to-pink-500/20',
      border: 'border-purple-400/30',
      borderHover: 'group-hover:border-purple-400/60',
      shadow: 'group-hover:shadow-[0_0_20px_rgba(168,85,247,0.3)]',
      innerGradient: 'from-purple-400/10 to-pink-400/10',
      dropShadow: 'drop-shadow-[0_0_10px_rgba(168,85,247,0.4)]',
      badgeBg: 'bg-purple-500/20',
      badgeText: 'text-purple-400',
      badgeBorder: 'border-purple-500/30',
      textHover: 'group-hover:text-purple-400',
    },
    partner: {
      badge: t('detail.alternate_badge_partner') || 'Partner',
      gradient: 'from-rose-500/20 to-pink-500/20',
      border: 'border-rose-400/30',
      borderHover: 'group-hover:border-rose-400/60',
      shadow: 'group-hover:shadow-[0_0_20px_rgba(244,63,94,0.3)]',
      innerGradient: 'from-rose-400/10 to-pink-400/10',
      dropShadow: 'drop-shadow-[0_0_10px_rgba(244,63,94,0.4)]',
      badgeBg: 'bg-rose-500/20',
      badgeText: 'text-rose-400',
      badgeBorder: 'border-rose-500/30',
      textHover: 'group-hover:text-rose-400',
    },
    original: {
      badge: t('detail.alternate_badge_original') || 'Original',
      gradient: 'from-blue-500/20 to-indigo-500/20',
      border: 'border-blue-400/30',
      borderHover: 'group-hover:border-blue-400/60',
      shadow: 'group-hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]',
      innerGradient: 'from-blue-400/10 to-indigo-400/10',
      dropShadow: 'drop-shadow-[0_0_10px_rgba(59,130,246,0.4)]',
      badgeBg: 'bg-blue-500/20',
      badgeText: 'text-blue-400',
      badgeBorder: 'border-blue-500/30',
      textHover: 'group-hover:text-blue-400',
    },
    unbound: {
      badge: t('detail.alternate_badge_unbound') || 'Unbound',
      gradient: 'from-red-500/20 to-orange-500/20',
      border: 'border-red-400/30',
      borderHover: 'group-hover:border-red-400/60',
      shadow: 'group-hover:shadow-[0_0_20px_rgba(239,68,68,0.3)]',
      innerGradient: 'from-red-400/10 to-orange-400/10',
      dropShadow: 'drop-shadow-[0_0_10px_rgba(239,68,68,0.4)]',
      badgeBg: 'bg-red-500/20',
      badgeText: 'text-red-400',
      badgeBorder: 'border-red-500/30',
      textHover: 'group-hover:text-red-400',
    },
    confined: {
      badge: t('detail.alternate_badge_confined') || 'Confined',
      gradient: 'from-slate-500/20 to-gray-500/20',
      border: 'border-slate-400/30',
      borderHover: 'group-hover:border-slate-400/60',
      shadow: 'group-hover:shadow-[0_0_20px_rgba(100,116,139,0.3)]',
      innerGradient: 'from-slate-400/10 to-gray-400/10',
      dropShadow: 'drop-shadow-[0_0_10px_rgba(100,116,139,0.4)]',
      badgeBg: 'bg-slate-500/20',
      badgeText: 'text-slate-400',
      badgeBorder: 'border-slate-500/30',
      textHover: 'group-hover:text-slate-400',
    },
    ice: {
      badge: t('detail.alternate_badge_ice') || 'Ice',
      gradient: 'from-cyan-500/20 to-sky-500/20',
      border: 'border-cyan-400/30',
      borderHover: 'group-hover:border-cyan-400/60',
      shadow: 'group-hover:shadow-[0_0_20px_rgba(6,182,212,0.3)]',
      innerGradient: 'from-cyan-400/10 to-sky-400/10',
      dropShadow: 'drop-shadow-[0_0_10px_rgba(6,182,212,0.4)]',
      badgeBg: 'bg-cyan-500/20',
      badgeText: 'text-cyan-400',
      badgeBorder: 'border-cyan-500/30',
      textHover: 'group-hover:text-cyan-400',
    },
    shadow: {
      badge: t('detail.alternate_badge_shadow') || 'Shadow',
      gradient: 'from-violet-500/20 to-purple-500/20',
      border: 'border-violet-400/30',
      borderHover: 'group-hover:border-violet-400/60',
      shadow: 'group-hover:shadow-[0_0_20px_rgba(139,92,246,0.3)]',
      innerGradient: 'from-violet-400/10 to-purple-400/10',
      dropShadow: 'drop-shadow-[0_0_10px_rgba(139,92,246,0.4)]',
      badgeBg: 'bg-violet-500/20',
      badgeText: 'text-violet-400',
      badgeBorder: 'border-violet-500/30',
      textHover: 'group-hover:text-violet-400',
    },
    plant: {
      badge: t('detail.alternate_badge_plant') || 'Plant',
      gradient: 'from-green-500/20 to-emerald-500/20',
      border: 'border-green-400/30',
      borderHover: 'group-hover:border-green-400/60',
      shadow: 'group-hover:shadow-[0_0_20px_rgba(34,197,94,0.3)]',
      innerGradient: 'from-green-400/10 to-emerald-400/10',
      dropShadow: 'drop-shadow-[0_0_10px_rgba(34,197,94,0.4)]',
      badgeBg: 'bg-green-500/20',
      badgeText: 'text-green-400',
      badgeBorder: 'border-green-500/30',
      textHover: 'group-hover:text-green-400',
    },
    sandy: {
      badge: t('detail.alternate_badge_sandy') || 'Sandy',
      gradient: 'from-amber-500/20 to-yellow-500/20',
      border: 'border-amber-400/30',
      borderHover: 'group-hover:border-amber-400/60',
      shadow: 'group-hover:shadow-[0_0_20px_rgba(245,158,11,0.3)]',
      innerGradient: 'from-amber-400/10 to-yellow-400/10',
      dropShadow: 'drop-shadow-[0_0_10px_rgba(245,158,11,0.4)]',
      badgeBg: 'bg-amber-500/20',
      badgeText: 'text-amber-400',
      badgeBorder: 'border-amber-500/30',
      textHover: 'group-hover:text-amber-400',
    },
    trash: {
      badge: t('detail.alternate_badge_trash') || 'Trash',
      gradient: 'from-stone-500/20 to-neutral-500/20',
      border: 'border-stone-400/30',
      borderHover: 'group-hover:border-stone-400/60',
      shadow: 'group-hover:shadow-[0_0_20px_rgba(168,162,158,0.3)]',
      innerGradient: 'from-stone-400/10 to-neutral-400/10',
      dropShadow: 'drop-shadow-[0_0_10px_rgba(168,162,158,0.4)]',
      badgeBg: 'bg-stone-500/20',
      badgeText: 'text-stone-400',
      badgeBorder: 'border-stone-500/30',
      textHover: 'group-hover:text-stone-400',
    },
    sun: {
      badge: t('detail.alternate_badge_sun') || 'Sun',
      gradient: 'from-yellow-500/20 to-orange-500/20',
      border: 'border-yellow-400/30',
      borderHover: 'group-hover:border-yellow-400/60',
      shadow: 'group-hover:shadow-[0_0_20px_rgba(234,179,8,0.3)]',
      innerGradient: 'from-yellow-400/10 to-orange-400/10',
      dropShadow: 'drop-shadow-[0_0_10px_rgba(234,179,8,0.4)]',
      badgeBg: 'bg-yellow-500/20',
      badgeText: 'text-yellow-400',
      badgeBorder: 'border-yellow-500/30',
      textHover: 'group-hover:text-yellow-400',
    },
    moon: {
      badge: t('detail.alternate_badge_moon') || 'Moon',
      gradient: 'from-indigo-500/20 to-violet-500/20',
      border: 'border-indigo-400/30',
      borderHover: 'group-hover:border-indigo-400/60',
      shadow: 'group-hover:shadow-[0_0_20px_rgba(99,102,241,0.3)]',
      innerGradient: 'from-indigo-400/10 to-violet-400/10',
      dropShadow: 'drop-shadow-[0_0_10px_rgba(99,102,241,0.4)]',
      badgeBg: 'bg-indigo-500/20',
      badgeText: 'text-indigo-400',
      badgeBorder: 'border-indigo-500/30',
      textHover: 'group-hover:text-indigo-400',
    },
    dusk: {
      badge: t('detail.alternate_badge_dusk') || 'Dusk',
      gradient: 'from-purple-500/20 to-indigo-500/20',
      border: 'border-purple-400/30',
      borderHover: 'group-hover:border-purple-400/60',
      shadow: 'group-hover:shadow-[0_0_20px_rgba(168,85,247,0.3)]',
      innerGradient: 'from-purple-400/10 to-indigo-400/10',
      dropShadow: 'drop-shadow-[0_0_10px_rgba(168,85,247,0.4)]',
      badgeBg: 'bg-purple-500/20',
      badgeText: 'text-purple-400',
      badgeBorder: 'border-purple-500/30',
      textHover: 'group-hover:text-purple-400',
    },
    dawn: {
      badge: t('detail.alternate_badge_dawn') || 'Dawn',
      gradient: 'from-orange-500/20 to-pink-500/20',
      border: 'border-orange-400/30',
      borderHover: 'group-hover:border-orange-400/60',
      shadow: 'group-hover:shadow-[0_0_20px_rgba(249,115,22,0.3)]',
      innerGradient: 'from-orange-400/10 to-pink-400/10',
      dropShadow: 'drop-shadow-[0_0_10px_rgba(249,115,22,0.4)]',
      badgeBg: 'bg-orange-500/20',
      badgeText: 'text-orange-400',
      badgeBorder: 'border-orange-500/30',
      textHover: 'group-hover:text-orange-400',
    },
    midnight: {
      badge: t('detail.alternate_badge_midnight') || 'Midnight',
      gradient: 'from-indigo-500/20 to-slate-500/20',
      border: 'border-indigo-400/30',
      borderHover: 'group-hover:border-indigo-400/60',
      shadow: 'group-hover:shadow-[0_0_20px_rgba(99,102,241,0.3)]',
      innerGradient: 'from-indigo-400/10 to-slate-400/10',
      dropShadow: 'drop-shadow-[0_0_10px_rgba(99,102,241,0.4)]',
      badgeBg: 'bg-indigo-500/20',
      badgeText: 'text-indigo-400',
      badgeBorder: 'border-indigo-500/30',
      textHover: 'group-hover:text-indigo-400',
    },
    erosion: {
      badge: t('detail.alternate_badge_erosion') || 'Erosion',
      gradient: 'from-stone-500/20 to-amber-500/20',
      border: 'border-stone-400/30',
      borderHover: 'group-hover:border-stone-400/60',
      shadow: 'group-hover:shadow-[0_0_20px_rgba(168,162,158,0.3)]',
      innerGradient: 'from-stone-400/10 to-amber-400/10',
      dropShadow: 'drop-shadow-[0_0_10px_rgba(168,162,158,0.4)]',
      badgeBg: 'bg-stone-500/20',
      badgeText: 'text-stone-400',
      badgeBorder: 'border-stone-500/30',
      textHover: 'group-hover:text-stone-400',
    },
    valiant: {
      badge: t('detail.alternate_badge_valiant') || 'Valiant',
      gradient: 'from-blue-500/20 to-cyan-500/20',
      border: 'border-blue-400/30',
      borderHover: 'group-hover:border-blue-400/60',
      shadow: 'group-hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]',
      innerGradient: 'from-blue-400/10 to-cyan-400/10',
      dropShadow: 'drop-shadow-[0_0_10px_rgba(59,130,246,0.4)]',
      badgeBg: 'bg-blue-500/20',
      badgeText: 'text-blue-400',
      badgeBorder: 'border-blue-500/30',
      textHover: 'group-hover:text-blue-400',
    },
    blade: {
      badge: t('detail.alternate_badge_blade') || 'Blade',
      gradient: 'from-slate-500/20 to-gray-500/20',
      border: 'border-slate-400/30',
      borderHover: 'group-hover:border-slate-400/60',
      shadow: 'group-hover:shadow-[0_0_20px_rgba(100,116,139,0.3)]',
      innerGradient: 'from-slate-400/10 to-gray-400/10',
      dropShadow: 'drop-shadow-[0_0_10px_rgba(100,116,139,0.4)]',
      badgeBg: 'bg-slate-500/20',
      badgeText: 'text-slate-400',
      badgeBorder: 'border-slate-500/30',
      textHover: 'group-hover:text-slate-400',
    },
    stand: {
      badge: t('detail.alternate_badge_stand') || 'Stand',
      gradient: 'from-yellow-500/20 to-amber-500/20',
      border: 'border-yellow-400/30',
      borderHover: 'group-hover:border-yellow-400/60',
      shadow: 'group-hover:shadow-[0_0_20px_rgba(234,179,8,0.3)]',
      innerGradient: 'from-yellow-400/10 to-amber-400/10',
      dropShadow: 'drop-shadow-[0_0_10px_rgba(234,179,8,0.4)]',
      badgeBg: 'bg-yellow-500/20',
      badgeText: 'text-yellow-400',
      badgeBorder: 'border-yellow-500/30',
      textHover: 'group-hover:text-yellow-400',
    },
    baile: {
      badge: t('detail.alternate_badge_baile') || 'Baile',
      gradient: 'from-orange-500/20 to-red-500/20',
      border: 'border-orange-400/30',
      borderHover: 'group-hover:border-orange-400/60',
      shadow: 'group-hover:shadow-[0_0_20px_rgba(249,115,22,0.3)]',
      innerGradient: 'from-orange-400/10 to-red-400/10',
      dropShadow: 'drop-shadow-[0_0_10px_rgba(249,115,22,0.4)]',
      badgeBg: 'bg-orange-500/20',
      badgeText: 'text-orange-400',
      badgeBorder: 'border-orange-500/30',
      textHover: 'group-hover:text-orange-400',
    },
    pompom: {
      badge: t('detail.alternate_badge_pompom') || 'Pompom',
      gradient: 'from-pink-500/20 to-rose-500/20',
      border: 'border-pink-400/30',
      borderHover: 'group-hover:border-pink-400/60',
      shadow: 'group-hover:shadow-[0_0_20px_rgba(236,72,153,0.3)]',
      innerGradient: 'from-pink-400/10 to-rose-400/10',
      dropShadow: 'drop-shadow-[0_0_10px_rgba(236,72,153,0.4)]',
      badgeBg: 'bg-pink-500/20',
      badgeText: 'text-pink-400',
      badgeBorder: 'border-pink-500/30',
      textHover: 'group-hover:text-pink-400',
    },
    pawget: {
      badge: t('detail.alternate_badge_pawget') || 'Pawget',
      gradient: 'from-brown-500/20 to-amber-500/20',
      border: 'border-brown-400/30',
      borderHover: 'group-hover:border-brown-400/60',
      shadow: 'group-hover:shadow-[0_0_20px_rgba(180,83,9,0.3)]',
      innerGradient: 'from-brown-400/10 to-amber-400/10',
      dropShadow: 'drop-shadow-[0_0_10px_rgba(180,83,9,0.4)]',
      badgeBg: 'bg-brown-500/20',
      badgeText: 'text-brown-400',
      badgeBorder: 'border-brown-500/30',
      textHover: 'group-hover:text-brown-400',
    },
    bravel: {
      badge: t('detail.alternate_badge_bravel') || 'Bravel',
      gradient: 'from-yellow-500/20 to-orange-500/20',
      border: 'border-yellow-400/30',
      borderHover: 'group-hover:border-yellow-400/60',
      shadow: 'group-hover:shadow-[0_0_20px_rgba(234,179,8,0.3)]',
      innerGradient: 'from-yellow-400/10 to-orange-400/10',
      dropShadow: 'drop-shadow-[0_0_10px_rgba(234,179,8,0.4)]',
      badgeBg: 'bg-yellow-500/20',
      badgeText: 'text-yellow-400',
      badgeBorder: 'border-yellow-500/30',
      textHover: 'group-hover:text-yellow-400',
    },
    standard: {
      badge: t('detail.alternate_badge_standard') || 'Form',
      gradient: 'from-blue-500/20 to-cyan-500/20',
      border: 'border-blue-400/30',
      borderHover: 'group-hover:border-blue-400/60',
      shadow: 'group-hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]',
      innerGradient: 'from-blue-400/10 to-cyan-400/10',
      dropShadow: 'drop-shadow-[0_0_10px_rgba(59,130,246,0.4)]',
      badgeBg: 'bg-blue-500/20',
      badgeText: 'text-blue-400',
      badgeBorder: 'border-blue-500/30',
      textHover: 'group-hover:text-blue-400',
    },
  }), [t]);

  const config = formConfig[form.formType] || formConfig.standard;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center">
        <div className="w-24 h-24 md:w-32 md:h-32 bg-secondary/30 border border-border/40 rounded-sm flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary/40" />
        </div>
      </div>
    );
  }

  if (isError || !pokemonData) {
    return (
      <div className="flex flex-col items-center">
        <div className="w-24 h-24 md:w-32 md:h-32 bg-secondary/30 border border-border/40 rounded-sm flex items-center justify-center">
          <AlertCircle className="w-6 h-6 text-red-400/60" />
        </div>
        <span className="mt-2 text-[10px] sm:text-[11px] font-black text-red-400/60 uppercase tracking-wider">
          {t('detail.load_error', { defaultValue: 'Error' })}
        </span>
      </div>
    );
  }

  return (
    <Link href={`/pokemon/${form.name}`} className="relative z-10 hover:z-20">
      <motion.div
        whileHover={{ y: -5, scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="flex flex-col items-center cursor-pointer group"
      >
        <div className={`w-24 h-24 md:w-32 md:h-32 bg-gradient-to-br ${config.gradient} border ${config.border} rounded-sm flex items-center justify-center p-4 ${config.borderHover} ${config.shadow} transition-all duration-500 relative overflow-hidden`}>
          <div className={`absolute inset-0 bg-gradient-to-tr ${config.innerGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
          {sprite ? (
            <Image
              src={sprite}
              alt={displayName}
              width={128}
              height={128}
              className={`w-full h-full object-contain filter ${config.dropShadow} group-hover:scale-110 transition-transform duration-500 relative z-10`}
            />
          ) : (
            <Loader2 className="w-6 h-6 animate-spin text-foreground/20" />
          )}
        </div>
        <div className="mt-3 text-center">
          <span className={`px-2 py-0.5 ${config.badgeBg} ${config.badgeText} text-[10px] sm:text-[11px] font-black uppercase tracking-wider rounded-full border ${config.badgeBorder} mb-1 inline-block`}>
            {config.badge}
          </span>
          <span className="text-[10px] font-black text-foreground/30 uppercase tracking-[0.2em] block mb-0.5">
            {pokemonData ? formatId(pokemonData.id) : ''}
          </span>
          <span className={`text-xs font-black capitalize text-foreground/80 ${config.textHover} transition-colors tracking-tight`}>
            {displayName}
          </span>
        </div>
      </motion.div>
    </Link>
  );
}

function AlternateFormsSection({ allForms, isLoading }: { allForms: AlternateForm[]; isLoading: boolean }) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="mt-12 pt-8 border-t border-border/60 flex items-center justify-center gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-primary/40" />
        <span className="text-sm font-bold text-foreground/40 uppercase tracking-wider">
          {t('detail.loading_forms', { defaultValue: 'Loading alternate forms...' })}
        </span>
      </div>
    );
  }

  if (allForms.length === 0) {
    return null;
  }

  return (
    <div className="mt-12 pt-8 border-t border-border/60">
      <div className="flex items-center justify-center gap-3 mb-8">
        <Layers className="w-5 h-5 text-purple-400" />
        <h3 className="text-lg font-black uppercase tracking-wider text-foreground/80">
          {t('detail.alternate_forms')}
        </h3>
        <Layers className="w-5 h-5 text-purple-400" />
      </div>
      <div className="flex flex-wrap justify-center gap-8 md:gap-12">
        {allForms.map((form) => (
          <AlternateFormItem key={form.name} form={form} />
        ))}
      </div>
    </div>
  );
}

function ChainNode({ node, currentSpeciesName, allForms }: { node: ChainLink; currentSpeciesName?: string; allForms?: AlternateForm[] }) {
  const isCurrent = currentSpeciesName ? node.species.name === currentSpeciesName : false;
  const formType = allForms?.find(f => f.name === node.species.name)?.formType;
  const isAlternateForm = !!formType && formType !== 'standard';
  
  return (
    <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
      {isAlternateForm ? (
        <AlternateFormItem form={{ name: node.species.name, id: 0, formType }} />
      ) : (
        <EvolutionItem name={node.species.name} isCurrent={isCurrent} />
      )}

      {node.evolves_to.length > 0 && (
        <div className="flex flex-col gap-12 md:gap-16 relative">
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-card/50 md:hidden -translate-x-1/2 -z-10" />
          
          {node.evolves_to.map((evolution) => (
            <div key={evolution.species.name} className="flex flex-col md:flex-row items-center gap-8 md:gap-12 relative">
              <div className="p-3 bg-secondary/40 rounded-full border border-border/60 text-foreground/30 shadow-inner z-10 group-hover:text-primary/50 transition-colors">
                <ArrowRight className="w-5 h-5 rotate-90 md:rotate-0" />
              </div>
              <ChainNode node={evolution} currentSpeciesName={currentSpeciesName} allForms={allForms} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


export function EvolutionChain({ url, currentSpeciesName, speciesData }: EvolutionChainProps) {
  const { t } = useTranslation();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['evolutionChain', url],
    queryFn: async () => {
      const path = url.replace(REST_API_BASE, '');
      const { data } = await apiClient.get<ChainResponse>(path);
      return data;
    },
    staleTime: 30 * 60 * 1000,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  });

  const allSpeciesNames = useMemo(() => {
    if (!data?.chain) return [];
    return collectAllSpeciesNames(data.chain);
  }, [data]);

  const speciesQueries = useQueries({
    queries: allSpeciesNames.map((baseName) => ({
      queryKey: ['species-forms', baseName],
      queryFn: () => getPokemonSpecies(baseName),
      staleTime: Infinity,
      enabled: allSpeciesNames.length > 0,
    })),
  });

  const allFormsLoading = speciesQueries.some(q => q.isLoading);

  const speciesQueryData = speciesQueries.map(q => q.data);

  const allForms = useMemo(() => {
    const collected: AlternateForm[] = [];

    const addFormsFromSpecies = (species: { varieties?: { pokemon: { name: string; url: string } }[] } | null | undefined) => {
      if (!species?.varieties) {
        return;
      }
      for (const v of species.varieties) {
        const formType = detectFormType(v.pokemon.name);
        if (formType !== 'standard') {
          collected.push({
            name: v.pokemon.name,
            id: parseInt(v.pokemon.url.split('/').filter(Boolean).pop() || '0'),
            formType,
          });
        }
      }
    };

    if (speciesData) addFormsFromSpecies(speciesData);
    for (const queryData of speciesQueryData) {
      if (queryData) addFormsFromSpecies(queryData);
    }

    const seen = new Set<string>();
    return collected.filter((f) => {
      if (seen.has(f.name)) return false;
      seen.add(f.name);
      return true;
    });
  }, [speciesData, speciesQueryData]);

  if (isLoading) {
    return (
      <div className="p-12 min-h-[300px] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary/40" />
      </div>
    );
  }

  if (isError || !data?.chain) {
    return (
      <div className="p-12 min-h-[300px] flex flex-col items-center justify-center gap-4">
        <AlertCircle className="w-10 h-10 text-red-400/60" />
        <p className="text-foreground/50 font-bold uppercase tracking-widest text-sm">
          {t('detail.evolution_chain_error', { defaultValue: 'Failed to load evolution chain' })}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-12 scrollbar-hide">
      <div className="flex flex-col items-center min-w-max px-8 py-4">
        <div className="flex justify-center w-full">
          <ChainNode node={data.chain} currentSpeciesName={currentSpeciesName} allForms={allForms} />
        </div>
        <AlternateFormsSection allForms={allForms} isLoading={allFormsLoading} />
      </div>
    </div>
  );
}
