'use client';

import { useQuery, useQueries } from '@tanstack/react-query';
import { getPokemonDetail, getPokemonSpecies, getTypeRelations, getAbilityDetail } from '@/lib/api';
import { getRecommendedItems } from '@/lib/held-items';
import { useParams, useRouter } from 'next/navigation';
import { useLocaleHref } from '@/hooks/useLocaleHref';
import {
  Loader2,
  ArrowLeft,
  Ruler,
  Weight,
  Swords,
  ShieldAlert,
  ShieldCheck,
  Zap,
  Star,
  Heart,
  Volume2,
  Play,
  MapPin,
  Sparkles,
  Images,
  Egg,
  ExternalLink,
} from 'lucide-react';
import { PokemonDetail, PokemonSpecies, PokemonEncounter, TYPE_COLORS } from '@/types/pokemon';
import { motion, AnimatePresence } from 'framer-motion';
import { usePrimeDexStore } from '@/store/primedex';
import { cn, formatId, formatName } from '@/lib/utils';
import { getBaseSpeciesName, getFormDisplayName } from '@/lib/form-names';
import React, { useState, useMemo, useEffect, type CSSProperties } from 'react';
import dynamic from 'next/dynamic';
import { useMounted } from '@/hooks/useMounted';
import { useAutoGenTheme } from '@/components/providers/GenThemeProvider';

interface LocalizedGqlData {
  pokemon_v2_pokemonspeciesnames: { 
    name: string;
    pokemon_v2_language: { name: string };
  }[];
  pokemon_v2_pokemonspeciesflavortexts: { 
    flavor_text: string;
    pokemon_v2_language: { name: string };
  }[];
}

const EvolutionChain = dynamic(() => import('@/components/pokemon/EvolutionChain').then(m => m.EvolutionChain), {
  loading: () => <div className="h-40 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary/20" /></div>
});
const AdvancedInfo = dynamic(() => import('@/components/pokemon/AdvancedInfo').then(m => m.AdvancedInfo), {
  loading: () => <div className="h-40 animate-pulse bg-card/50 rounded-sm" />
});
const PokemonBuilds = dynamic(() => import('@/components/pokemon/PokemonBuilds').then(m => m.PokemonBuilds), {
  loading: () => <div className="h-40 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary/20" /></div>
});
const HeightComparison = dynamic(() => import('@/components/pokemon/HeightComparison').then(m => m.HeightComparison), {
  loading: () => <div className="h-40 animate-pulse bg-card/50 rounded-sm" />
});
const PokemonCards = dynamic(() => import('@/components/pokemon/PokemonCards').then(m => m.PokemonCards), {
  loading: () => <div className="h-40 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary/20" /></div>
});
const PokemonMoves = dynamic(() => import('@/components/pokemon/PokemonMoves').then(m => m.PokemonMoves), {
  loading: () => <div className="h-40 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary/20" /></div>
});
const EncounterLocations = dynamic(() => import('@/components/pokemon/EncounterLocations').then(m => m.EncounterLocations), {
  loading: () => <div className="h-40 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary/20" /></div>
});
const SpriteGallery = dynamic(() => import('@/components/pokemon/SpriteGallery').then(m => m.SpriteGallery), {
  loading: () => <div className="h-40 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary/20" /></div>
});

import { Button } from '@/components/ui/button';
import { ShareButton } from '@/components/share/ShareButton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from '@/lib/i18n';
import { getLocalizedPokemonData } from '@/lib/api';
import type { AbilityBattleDesc } from '@/lib/ability-battle-descriptions';
import { HeldItem } from '@/lib/held-items';

import Image from 'next/image';
import Link from 'next/link';
import { ShinyIcon } from '@/components/ui/ShinyIcon';
import { PokeballIcon } from '@/components/ui/PokeballIcon';

const EggMoveExplorer = dynamic(() => import('@/components/breeding/EggMoveExplorer').then(m => m.EggMoveExplorer), {
  loading: () => <div className="h-40 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary/20" /></div>
});
const CompetitiveMeta = dynamic(() => import('@/components/pokemon/CompetitiveMeta').then(m => m.CompetitiveMeta), {
  loading: () => <div className="h-40 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary/20" /></div>
});

function ItemCard({ item, language }: { item: HeldItem; language: string }) {
  const [imgError, setImgError] = useState(false);
  const itemName = item.name[language as 'en' | 'fr'] || item.name.en;
  const itemDesc = item.description[language as 'en' | 'fr'] || item.description.en;

  return (
    <div className="flex gap-3 p-4 bg-secondary/20 border border-border/40 rounded-sm group hover:bg-secondary/40 transition-colors">
      <div className="flex-shrink-0 w-12 h-12 bg-background/50 rounded-sm flex items-center justify-center p-2 border border-border/40 overflow-hidden">
        {!imgError ? (
          <Image 
            src={item.iconUrl} 
            alt={itemName} 
            width={48}
            height={48}
            className="w-full h-full object-contain filter group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] transition-all"
            onError={() => setImgError(true)}
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-foreground/30">
            <PokeballIcon className="w-5 h-5" aria-hidden="true" />
          </div>
        )}
      </div>
      <div className="flex flex-col flex-1 min-w-0 justify-center">
        <span className="font-black text-sm text-foreground/90 truncate group-hover:text-primary transition-colors">
          {itemName}
        </span>
        <span className="text-[11px] text-foreground/60 leading-tight mt-1 line-clamp-2">
          {itemDesc}
        </span>
      </div>
    </div>
  );
}

const POKE_COLORS: Record<string, string> = {
  black: '#2E2E2E', blue: '#3B82F6', brown: '#92400E', gray: '#6B7280',
  green: '#16A34A', pink: '#EC4899', purple: '#9333EA', red: '#DC2626',
  white: '#F9FAFB', yellow: '#EAB308'
};

interface PokemonDetailClientProps {
  initialPokemon: PokemonDetail;
  initialSpecies: PokemonSpecies | null;
  initialLocalized: LocalizedGqlData | null;
  initialEncounters: PokemonEncounter[];
}

export function PokemonDetailClient({ 
  initialPokemon, 
  initialSpecies, 
  initialLocalized, 
  initialEncounters 
}: PokemonDetailClientProps) {
  const { t } = useTranslation();
  const params = useParams();
  const name = params?.name as string;
  const router = useRouter();
  const localeHref = useLocaleHref();
  const [showShiny, setShowShiny] = useState(false);
  const [playingCry, setPlayingCry] = useState<'latest' | 'legacy' | null>(null);
  const { 
    isFavorite, addFavorite, removeFavorite, 
    toggleCaught, isCaught, 
    addToCompare, removeFromCompare, isInCompare,
    addToTeam, removeFromTeam, isInTeam,
    addToHistory, language, systemLanguage, team,
    soundEnabled
  } = usePrimeDexStore();
  const mounted = useMounted();

  const [abilityDescs, setAbilityDescs] = useState<Record<string, AbilityBattleDesc> | null>(null);
  useEffect(() => {
    import('@/lib/ability-battle-descriptions').then(m => setAbilityDescs(m.ABILITY_BATTLE_DESCRIPTIONS));
  }, []);

  const resolvedLang = mounted 
    ? (language === 'auto' ? systemLanguage : language) 
    : 'en';

  const statLabels: Record<string, string> = {
    'hp': t('stats.hp_short'),
    'attack': t('stats.attack_short'),
    'defense': t('stats.defense_short'),
    'special-attack': t('stats.special_attack_short'),
    'special-defense': t('stats.special_defense_short'),
    'speed': t('stats.speed_short'),
  };

  const { data, isLoading } = useQuery({
    queryKey: ['pokemon-full-detail', name, resolvedLang],
    queryFn: async () => {
      const langId = usePrimeDexStore.getState().getLanguageId();
      const baseName = getBaseSpeciesName(name);
      const [pokemon, species, localized] = await Promise.all([
        getPokemonDetail(name),
        getPokemonSpecies(baseName).catch(() => null),
        getLocalizedPokemonData(name, langId).catch(() => null)
      ]);

      return { pokemon, species, localized: localized as LocalizedGqlData | null };
    },
    initialData: () => {
      const fetchedLang = initialLocalized?.pokemon_v2_pokemonspeciesnames?.[0]?.pokemon_v2_language?.name;
      // If the localized language passed from server does not match our current client language,
      // return undefined so that React Query fetches fresh localized data while showing a loader
      const isMatching = !initialLocalized || fetchedLang === resolvedLang || (!fetchedLang && resolvedLang === 'en');

      if (isMatching) {
        return {
          pokemon: initialPokemon,
          species: initialSpecies,
          localized: initialLocalized as LocalizedGqlData | null,
        };
      }
      return undefined;
    },
    enabled: !!name,
  });

  const pokemon = data?.pokemon;
  const species = data?.species;
  const localized = data?.localized;

  // Add to history when pokemon data is loaded
  useEffect(() => {
    if (pokemon) {
      addToHistory({ id: pokemon.id, name: pokemon.name });
    }
  }, [pokemon, addToHistory]);

  // Auto-switch generation theme based on the Pokémon's dex number
  const pokemonGeneration = pokemon
    ? pokemon.id <= 151 ? 1
    : pokemon.id <= 251 ? 2
    : pokemon.id <= 386 ? 3
    : pokemon.id <= 493 ? 4
    : pokemon.id <= 649 ? 5
    : pokemon.id <= 721 ? 6
    : pokemon.id <= 809 ? 7
    : pokemon.id <= 905 ? 8
    : 9
    : null;
  useAutoGenTheme(pokemonGeneration);

  // Fetch type relations for all types of the pokemon
  const typeRelationsQueries = useQueries({
    queries: (pokemon?.types || []).map(t => ({
      queryKey: ['typeRelations', t.type.name],
      queryFn: () => getTypeRelations(t.type.name),
      staleTime: 24 * 60 * 60 * 1000,
    }))
  });

  const abilityQueries = useQueries({
    queries: (pokemon?.abilities || []).map(a => ({
      queryKey: ['abilityDetail', a.ability.name],
      queryFn: () => getAbilityDetail(a.ability.name),
      staleTime: 24 * 60 * 60 * 1000,
    }))
  });

  const effectiveness = useMemo(() => {
    if (typeRelationsQueries.some(q => q.isLoading) || typeRelationsQueries.length === 0) return null;

    const relations = typeRelationsQueries.map(q => q.data?.damage_relations);
    const table: Record<string, number> = {};

    // Initialize table with 1x for all types
    Object.keys(TYPE_COLORS).forEach(type => {
      table[type] = 1;
    });

    relations.forEach(rel => {
      if (!rel) return;
      rel.double_damage_from.forEach(t => { table[t.name] *= 2; });
      rel.half_damage_from.forEach(t => { table[t.name] *= 0.5; });
      rel.no_damage_from.forEach(t => { table[t.name] *= 0; });
    });

    const weaknesses = Object.entries(table).filter(([, val]) => val > 1).sort((a, b) => b[1] - a[1]);
    const resistances = Object.entries(table).filter(([, val]) => val < 1 && val > 0).sort((a, b) => a[1] - b[1]);
    const immunities = Object.entries(table).filter(([, val]) => val === 0);

    return { weaknesses, resistances, immunities };
  }, [typeRelationsQueries]);

  if (isLoading || !pokemon) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-16 h-16 animate-spin text-primary" />
      </div>
    );
  }

  const isFav = pokemon ? isFavorite(pokemon.id) : false;
  const mainType = pokemon.types[0].type.name;
  const color = TYPE_COLORS[mainType] || '#A8A77A';
  
  const pokemonLanguageCode = resolvedLang === 'zh' ? 'zh-Hans' : resolvedLang;
  const baseLocalizedName = localized?.pokemon_v2_pokemonspeciesnames?.find((entry) => entry.pokemon_v2_language.name === pokemonLanguageCode)?.name
    || localized?.pokemon_v2_pokemonspeciesnames?.find((entry) => entry.pokemon_v2_language.name === 'en')?.name
    || species?.names?.find(n => n.language.name === pokemonLanguageCode)?.name
    || species?.names?.find(n => n.language.name === 'en')?.name
    || getBaseSpeciesName(pokemon.name);
  const displayName = pokemon.name.includes('-')
    ? getFormDisplayName(pokemon.name, baseLocalizedName, resolvedLang)
    : baseLocalizedName;

  const flavorText = localized?.pokemon_v2_pokemonspeciesflavortexts?.find((entry) => entry.pokemon_v2_language.name === pokemonLanguageCode)?.flavor_text?.replace(/\f/g, ' ')
    || localized?.pokemon_v2_pokemonspeciesflavortexts?.find((entry) => entry.pokemon_v2_language.name === 'en')?.flavor_text?.replace(/\f/g, ' ')
    || species?.flavor_text_entries.find((entry) => entry.language.name === pokemonLanguageCode)?.flavor_text.replace(/\f/g, ' ')
    || species?.flavor_text_entries.find((entry) => entry.language.name === 'en')?.flavor_text.replace(/\f/g, ' ');

  const genus = species?.genera.find(
    (g) => g.language.name === resolvedLang
  )?.genus || species?.genera.find(
    (g) => g.language.name === 'en'
  )?.genus;

  const totalStats = pokemon.stats.reduce((sum, s) => sum + s.base_stat, 0);
  const gameIndices = pokemon.game_indices || [];
  const heldItems = pokemon.held_items || [];
  const forms = pokemon.forms || [];
  const genderRate = species?.gender_rate ?? null;
  const femaleGenderRate = genderRate === null || genderRate === -1 ? null : (genderRate / 8) * 100;
  const maleGenderRate = femaleGenderRate === null ? null : 100 - femaleGenderRate;

  const artwork = showShiny 
    ? (pokemon.sprites.other?.['official-artwork']?.front_shiny || pokemon.sprites.front_shiny)
    : (pokemon.sprites.other?.['official-artwork']?.front_default || pokemon.sprites.front_default);

  const playCry = async (type: 'latest' | 'legacy') => {
    if (!soundEnabled) return;
    const cryUrl = pokemon?.cries?.[type];
    if (!cryUrl) {
      console.warn(`No cry data for type: ${type}`);
      return;
    }
    setPlayingCry(type);
    try {
      const audio = new Audio();
      audio.onended = () => setPlayingCry(null);
      audio.onerror = () => {
        console.error(`Failed to load/play cry: ${type}`, cryUrl);
        setPlayingCry(null);
      };
      audio.src = cryUrl;
      await audio.play();
    } catch (err) {
      console.error('Audio playback failed:', err);
      setPlayingCry(null);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-28 sm:pb-20 overflow-x-hidden relative">

      {/* Hero Section */}
      <div className="relative min-h-[50vh] w-full flex flex-col items-center justify-end pb-16 pt-28">
        <button
          onClick={() => router.push(localeHref('/pokedex'))}
          className="fixed top-[calc(6rem+env(safe-area-inset-top))] left-4 md:left-12 p-3 min-w-[44px] min-h-[44px] flex items-center justify-center bg-card/55  rounded-full border border-border/50 z-50 text-foreground/50 hover:text-foreground hover:bg-card/75 hover:border-border/70 hover:scale-105 transition-all duration-300 shadow-lg"
          aria-label={t('common.back') || 'Go back'}
        >
          <ArrowLeft className="w-6 h-6" />
        </button>

      {/* Floating Action Buttons — sidebar on desktop, hidden on mobile */}
      <div className="hidden md:flex fixed right-8 top-1/2 -translate-y-1/2 z-50 flex-col items-center justify-center gap-3" >
          <ShareButton
            url={localeHref(`/pokemon/${name}?utm_source=share&utm_medium=social`)}
            title={t('detail.share_title', { name: displayName ?? name })}
            description={t('detail.share_text', { name: displayName ?? name })}
            label={t('detail.share')}
            variant="outline"
            className="rounded-full transition-all h-12 w-12 bg-card/55 border-border/50 text-foreground/60 hover:bg-card/75 hover:border-border/70 p-0 flex items-center justify-center"
          />

          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowShiny(!showShiny)}
            className={cn(
              "rounded-full transition-all h-12 w-12",
              showShiny 
                ? "bg-yellow-500/15 border-yellow-500/30 text-yellow-400 shadow-[0_4px_16px_-4px_rgba(234,179,8,0.3)]" 
                : "bg-card/55 border-border/50 text-foreground/50 "
            )}
            title={t('detail.shiny')}
            aria-label={showShiny ? t('detail.show_normal') || 'Show normal version' : t('detail.show_shiny') || 'Show shiny version'}
            aria-pressed={showShiny}
          >
            <ShinyIcon className={cn("w-5 h-5", showShiny && "fill-current")} />
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={() => toggleCaught(pokemon.id)}
            className={cn(
              "rounded-full transition-all h-12 w-12",
              isCaught(pokemon.id)
                ? "bg-primary text-primary-foreground shadow-[0_4px_16px_rgba(227,53,13,0.4)]"
                : "bg-card/55 border-border/50 text-foreground/40 hover:text-foreground/70"
            )}
            title={isCaught(pokemon.id) ? t('card.caught') : t('card.mark_caught')}
            aria-label={isCaught(pokemon.id) ? t('card.caught') : t('card.mark_caught')}
            aria-pressed={isCaught(pokemon.id)}
          >
            <Zap className={cn("w-5 h-5", isCaught(pokemon.id) && "fill-current")} />
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={() => isFav ? removeFavorite(pokemon.id) : addFavorite(pokemon.id)}
            style={{ '--chip': 'var(--action-favorite)' } as CSSProperties}
            className={cn(
              "rounded-full transition-all h-12 w-12",
              isFav
                ? "border-[color-mix(in_oklab,var(--chip)_42%,transparent)] bg-[color-mix(in_oklab,var(--chip)_15%,transparent)] text-[var(--chip)] shadow-[0_4px_16px_-4px_color-mix(in_oklab,var(--chip)_30%,transparent)] hover:brightness-110"
                : "bg-card/55 border-border/50 text-foreground/40 hover:text-foreground/70 "
            )}
            title={isFav ? t('card.remove_favorite') : t('card.add_favorite')}
            aria-label={isFav ? t('card.remove_favorite') || 'Remove from favorites' : t('card.add_favorite') || 'Add to favorites'}
            aria-pressed={isFav}
          >
            <Heart className={cn("w-5 h-5 transition-transform", isFav && "fill-current scale-110")} />
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={() => isInCompare(pokemon.id) ? removeFromCompare(pokemon.id) : addToCompare(pokemon.id)}
            style={{ '--chip': 'var(--action-compare)' } as CSSProperties}
            className={cn(
              "rounded-full transition-all h-12 w-12",
              isInCompare(pokemon.id)
                ? "border-[color-mix(in_oklab,var(--chip)_42%,transparent)] bg-[color-mix(in_oklab,var(--chip)_15%,transparent)] text-[var(--chip)]"
                : "bg-card/55 border-border/50 text-foreground/40 hover:text-foreground/70"
            )}
            title={isInCompare(pokemon.id) ? t('card.remove_compare') : t('card.add_compare')}
            aria-label={isInCompare(pokemon.id) ? t('card.remove_compare') : t('card.add_compare')}
            aria-pressed={isInCompare(pokemon.id)}
          >
            <Swords className={cn("w-5 h-5", isInCompare(pokemon.id) && "fill-current")} />
          </Button>

          <Button
            variant="outline"
            size="icon"
            disabled={!isInTeam(pokemon.id) && team.length >= 6}
            onClick={() => isInTeam(pokemon.id) ? removeFromTeam(pokemon.id) : addToTeam(pokemon.id)}
            style={{ '--chip': 'var(--action-team)' } as CSSProperties}
            className={cn(
              "rounded-full transition-all h-12 w-12",
              isInTeam(pokemon.id)
                ? "border-[color-mix(in_oklab,var(--chip)_42%,transparent)] bg-[color-mix(in_oklab,var(--chip)_15%,transparent)] text-[var(--chip)]"
                : "bg-card/55 border-border/50 text-foreground/40 hover:text-foreground/70"
            )}
            title={isInTeam(pokemon.id) ? t('card.remove_team') : t('card.add_team')}
            aria-label={isInTeam(pokemon.id) ? t('card.remove_team') : t('card.add_team')}
            aria-pressed={isInTeam(pokemon.id)}
          >
            <Star className={cn("w-5 h-5", isInTeam(pokemon.id) && "fill-current")} />
          </Button>
        </div>

        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[6rem] sm:text-[10rem] md:text-[16rem] font-black opacity-5 tracking-tighter select-none z-0 overflow-hidden w-full text-center"
          style={{ color }}
        >
          {formatId(pokemon.id)}
        </div>

        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={showShiny ? 'shiny' : 'normal'}
            initial={{ y: 50, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -20, opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
            className="relative w-72 h-72 md:w-96 md:h-96 z-20 group"
          >
            <Image
              src={artwork}
              alt={t('detail.artwork_alt', { name: displayName }) || `Official artwork of ${displayName}`}
              width={400}
              height={400}
              sizes="(min-width: 768px) 384px, 288px"
              className="w-full h-full object-contain relative z-10 transition-transform duration-700 group-hover:scale-110 group-hover:-translate-y-4"
              priority
              unoptimized
            />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="container mx-auto px-4 md:px-6 relative z-30 max-w-6xl">
        <motion.div
          initial={false}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-16"
        >
          <h1 className="text-3xl sm:text-5xl md:text-7xl font-black text-foreground capitalize mb-4 tracking-tight drop-shadow-sm">
            {displayName}
          </h1>

          {species && (
            <div className="flex flex-col items-center gap-2 mb-8">
              {genus && <p className="text-sm md:text-base text-foreground/60 font-bold uppercase tracking-[0.2em]">{genus}</p>}
              <div className="flex gap-2 flex-wrap justify-center">
                {species.habitat ? (
                  <p className="text-xs text-foreground/40 font-semibold uppercase tracking-widest bg-secondary/40 px-3 py-1 rounded-full border border-border/40 flex items-center gap-2">
                    <MapPin className="w-3 h-3" />
                    <span>{t(`habitats.${species.habitat.name}`)}</span>
                  </p>
                ) : (
                  <p className="text-xs text-foreground/40 font-semibold uppercase tracking-widest bg-secondary/40 px-3 py-1 rounded-full border border-border/40 flex items-center gap-2">
                    <MapPin className="w-3 h-3" />
                    <span>{t('detail.unknown_habitat')}</span>
                  </p>
                )}
                {species.color && POKE_COLORS[species.color.name] && (
                  <div className="flex items-center gap-2 text-xs text-foreground/40 font-semibold uppercase tracking-widest bg-secondary/40 px-3 py-1 rounded-full border border-border/40">
                    <div className="w-3 h-3 rounded-full border border-border/70 shadow-sm" style={{ backgroundColor: POKE_COLORS[species.color.name] }} />
                    <span>{t(`colors.${species.color.name}`)}</span>
                  </div>
                )}
                {species.is_legendary && (
                  <p className="text-xs text-yellow-500 font-black uppercase tracking-widest bg-yellow-500/10 px-3 py-1 rounded-full border border-yellow-500/20">
                    {t('detail.legendary')}
                  </p>
                )}
                {species.is_mythical && (
                  <p className="text-xs text-purple-500 font-black uppercase tracking-widest bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
                    {t('detail.mythical')}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-center flex-wrap">
            {pokemon.types.map((typeItem) => (
              <span
                key={typeItem.type.name}
                className="glass-tag type-accent px-6 py-2 text-sm shadow-lg"
                style={{ '--type-color': TYPE_COLORS[typeItem.type.name] } as React.CSSProperties}
              >
                {t(`types.${typeItem.type.name}`)}
              </span>
            ))}
          </div>

          {/* Cries / Audio */}
          {pokemon.cries && (pokemon.cries.latest || pokemon.cries.legacy) && (
            <div className="flex gap-4 justify-center mt-6">
              {pokemon.cries.latest && (
                <Button 
                  variant="outline" 
                   aria-label={t('detail.cry_latest_aria') || 'Play latest cry'}
                  onClick={() => playCry('latest')}
                  className={cn("rounded-full gap-2 transition-all", playingCry === 'latest' && "border-primary text-primary bg-primary/10")}
                >
                  {playingCry === 'latest' ? <Volume2 className="w-4 h-4 animate-pulse" /> : <Play className="w-4 h-4" />} {t('detail.cry_latest')}
                </Button>
              )}
              {pokemon.cries.legacy && (
                <Button 
                  variant="outline" 
                  aria-label={t('detail.cry_legacy_aria') || 'Play legacy cry'}
                  onClick={() => playCry('legacy')}
                  className={cn("rounded-full gap-2 transition-all", playingCry === 'legacy' && "border-primary text-primary bg-primary/10")}
                >
                  {playingCry === 'legacy' ? <Volume2 className="w-4 h-4 animate-pulse" /> : <Play className="w-4 h-4" />} {t('detail.cry_legacy')}
                </Button>
              )}
            </div>
          )}

        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="max-w-4xl mx-auto"
        >          <Tabs defaultValue="about" className="w-full relative">
            <div className="relative mb-8 -mx-4 px-4 md:mx-0 md:px-0 pb-4 overflow-visible">
              <TabsList className="flex overflow-x-visible scrollbar-hide w-full min-h-[3.5rem] rounded-sm bg-secondary/30 p-1 border border-border/40 gap-1 justify-start md:grid md:grid-cols-5 lg:grid-cols-10 overflow-x-scroll">
                <TabsTrigger value="about" className="whitespace-nowrap px-3 py-2.5 md:px-6 md:flex-1 rounded-sm text-[11px] md:text-xs font-black uppercase transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  {t('detail.about')}
                </TabsTrigger>
                <TabsTrigger value="stats" className="whitespace-nowrap px-3 py-2.5 md:px-6 md:flex-1 rounded-sm text-[11px] md:text-xs font-black uppercase transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  {t('detail.stats')}
                </TabsTrigger>
                <TabsTrigger value="evolution" className="whitespace-nowrap px-3 py-2.5 md:px-6 md:flex-1 rounded-sm text-[11px] md:text-xs font-black uppercase transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  {t('detail.evolution')}
                </TabsTrigger>
                <TabsTrigger value="moves" className="whitespace-nowrap px-3 py-2.5 md:px-6 md:flex-1 rounded-sm text-[11px] md:text-xs font-black uppercase transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  {t('detail.moveset')}
                </TabsTrigger>
                <TabsTrigger value="breeding" className="whitespace-nowrap px-3 py-2.5 md:px-6 md:flex-1 rounded-sm text-[11px] md:text-xs font-black uppercase transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  {t('detail.breeding')}
                </TabsTrigger>
                <TabsTrigger value="builds" className="whitespace-nowrap px-3 py-2.5 md:px-6 md:flex-1 rounded-sm text-[11px] md:text-xs font-black uppercase transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  {t('detail.builds')}
                </TabsTrigger>
                <TabsTrigger value="locations" className="whitespace-nowrap px-3 py-2.5 md:px-6 md:flex-1 rounded-sm text-[11px] md:text-xs font-black uppercase transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  {t('detail.where_to_find')}
                </TabsTrigger>
                <TabsTrigger value="cards" className="whitespace-nowrap px-3 py-2.5 md:px-6 md:flex-1 rounded-sm text-[11px] md:text-xs font-black uppercase transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  {t('detail.cards')}
                </TabsTrigger>
                <TabsTrigger value="sprites" className="whitespace-nowrap px-3 py-2.5 md:px-6 md:flex-1 rounded-sm text-[11px] md:text-xs font-black uppercase transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Images className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1" /> {t('detail.sprites')}
                </TabsTrigger>
                <TabsTrigger value="competitive" className="whitespace-nowrap px-3 py-2.5 md:px-6 md:flex-1 rounded-sm text-[11px] md:text-xs font-black uppercase transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  {t('competitive.title')}
                </TabsTrigger>
              </TabsList>
              {/* Mobile scroll indicator */}
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none md:hidden z-10 opacity-40">
                <div className="w-1 h-8 bg-gradient-to-b from-transparent via-primary to-transparent rounded-full" />
              </div>
            </div>
            
            {/* About Tab */}
            <TabsContent value="about" className="space-y-6">
              <div className="glass-panel p-6 md:p-8 rounded-sm">
                <h2 className="text-xl font-black mb-4 text-foreground/90 border-b border-border/60 pb-4">{t('detail.entry')}</h2>
                {!species ? (
                  <div className="h-24 animate-pulse bg-card/50 rounded-sm" />
                ) : (
                  <p className="text-base text-foreground/70 leading-relaxed font-medium">
                    {flavorText || t('detail.no_description')}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-3 mt-6">
                  <div className="bg-secondary/30 border border-border/40 p-4 rounded-sm flex flex-col items-center justify-center text-center group hover:bg-secondary/50 transition-colors">
                    <Weight className="w-5 h-5 text-foreground/40 mb-2 group-hover:text-primary transition-colors" />
                    <p className="text-[11px] text-foreground/50 uppercase font-bold tracking-widest mb-1">{t('detail.weight')}</p>
                    <p className="text-lg font-black text-foreground/90">{pokemon.weight / 10} kg</p>
                  </div>
                  <div className="bg-secondary/30 border border-border/40 p-4 rounded-sm flex flex-col items-center justify-center text-center group hover:bg-secondary/50 transition-colors">
                    <Ruler className="w-5 h-5 text-foreground/40 mb-2 group-hover:text-primary transition-colors" />
                    <p className="text-[11px] text-foreground/50 uppercase font-bold tracking-widest mb-1">{t('detail.height')}</p>
                    <p className="text-lg font-black text-foreground/90">{pokemon.height / 10} m</p>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-border/60">
                  <h3 className="text-[11px] text-foreground/40 font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-primary" /> {t('detail.pokedex_data')}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-secondary/20 border border-border/40 p-4 rounded-sm flex flex-col gap-2">
                      <p className="text-[11px] text-foreground/50 uppercase font-bold tracking-widest">{t('detail.order')}</p>
                      <p className="text-lg font-black text-foreground/90">#{pokemon.order}</p>
                    </div>
                    <div className="bg-secondary/20 border border-border/40 p-4 rounded-sm flex flex-col gap-2">
                      <p className="text-[11px] text-foreground/50 uppercase font-bold tracking-widest">{t('detail.default_form')}</p>
                      <p className="text-lg font-black text-foreground/90">{pokemon.is_default ? t('detail.yes') : t('detail.no')}</p>
                    </div>
                    <div className="bg-secondary/20 border border-border/40 p-4 rounded-sm md:col-span-2 flex flex-col gap-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[11px] text-foreground/50 uppercase font-bold tracking-widest">{t('detail.forms')}</p>
                        <span className="text-[11px] font-black text-foreground/40 uppercase tracking-widest">{forms.length}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {forms.map((form) => (
                          <span
                            key={form.name}
                            className="px-3 py-1.5 rounded-sm bg-background/40 border border-border/40 text-xs font-black text-foreground/80"
                          >
                            {getFormDisplayName(form.name, baseLocalizedName, resolvedLang)}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="bg-secondary/20 border border-border/40 p-4 rounded-sm md:col-span-2 flex flex-col gap-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[11px] text-foreground/50 uppercase font-bold tracking-widest">{t('detail.game_indices')}</p>
                        <span className="text-[11px] font-black text-foreground/40 uppercase tracking-widest">
                          {gameIndices.length} {t('detail.game_appearances')}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pr-1">
                        {gameIndices.map((entry) => (
                          <span
                            key={`${entry.version.name}-${entry.game_index}`}
                            className="px-3 py-1.5 rounded-sm bg-background/40 border border-border/40 text-xs font-black text-foreground/80"
                          >
                            {formatName(entry.version.name)} · #{entry.game_index}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="bg-secondary/20 border border-border/40 p-4 rounded-sm md:col-span-2 flex flex-col gap-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[11px] text-foreground/50 uppercase font-bold tracking-widest">{t('detail.held_items')}</p>
                        <span className="text-[11px] font-black text-foreground/40 uppercase tracking-widest">{heldItems.length}</span>
                      </div>
                      {heldItems.length > 0 ? (
                        <div className="space-y-3">
                          {heldItems.map((heldItem) => (
                            <div key={heldItem.item.name} className="rounded-sm border border-border/40 bg-background/35 p-3">
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-sm font-black text-foreground/85">{formatName(heldItem.item.name)}</span>
                              </div>
                              <div className="flex flex-wrap gap-2 mt-3">
                                {heldItem.version_details.map((detail) => (
                                  <span
                                    key={`${heldItem.item.name}-${detail.version.name}`}
                                    className="px-2.5 py-1 rounded-lg bg-secondary/40 text-[11px] font-bold text-foreground/70 border border-border/40"
                                  >
                                    {formatName(detail.version.name)} · {detail.rarity}%
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-sm border border-dashed border-border/60 bg-background/20 p-4 text-center text-xs text-foreground/50">
                          {t('detail.no_held_items')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-border/60">
                  <h3 className="text-[11px] text-foreground/40 font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-primary" /> {t('detail.abilities')}
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    {pokemon.abilities.map((_, i) => i).sort((a, b) => pokemon.abilities[a].ability.name.localeCompare(pokemon.abilities[b].ability.name)).map((originalIdx) => {
                      const a = pokemon.abilities[originalIdx];
                      const abilityData = abilityQueries[originalIdx]?.data;
                      let description = t('detail.no_ability_desc');
                      let localizedName = formatName(a.ability.name);
                      let battleDesc = '';
                      if (abilityData) {
                        const nameEntry = abilityData.names.find(n => n.language.name === resolvedLang)
                                       || abilityData.names.find(n => n.language.name === 'en');
                        if (nameEntry) localizedName = nameEntry.name;

                        const langEffect = abilityData.effect_entries.find(e => e.language.name === resolvedLang);
                        const langFlavor = abilityData.flavor_text_entries.find(e => e.language.name === resolvedLang);
                        const enEffect = abilityData.effect_entries.find(e => e.language.name === 'en');
                        const enFlavor = abilityData.flavor_text_entries.find(e => e.language.name === 'en');
                        
                        description = langEffect?.short_effect 
                                   || langFlavor?.flavor_text 
                                   || langEffect?.effect 
                                   || enEffect?.short_effect 
                                   || enFlavor?.flavor_text 
                                   || enEffect?.effect 
                                   || description;

                        const battleMapping = abilityDescs?.[a.ability.name];
                        if (battleMapping) {
                          battleDesc = battleMapping[resolvedLang as keyof typeof battleMapping] 
                                    || battleMapping.en;
                        }
                      }

                      return (
                        <div key={a.ability.name} className="flex flex-col gap-2 p-4 bg-secondary/20 border border-border/40 rounded-sm group hover:bg-secondary/40 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-sm text-foreground/80 group-hover:text-primary transition-colors">{localizedName}</span>
                              {a.is_hidden && <span className="px-1.5 py-0.5 bg-primary/20 text-[11px] md:text-[11px] font-black text-primary uppercase tracking-tighter rounded">{t('detail.hidden')}</span>}
                            </div>
                            {abilityQueries[originalIdx]?.isLoading && <Loader2 className="w-3 h-3 animate-spin text-primary/50" />}
                          </div>
                          {battleDesc && (
                            <div className="flex items-start gap-2 p-2.5 bg-primary/5 border border-primary/10 rounded-sm">
                              <Zap className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                              <p className="text-xs text-primary/90 leading-relaxed font-medium">
                                {battleDesc}
                              </p>
                            </div>
                          )}
                          <p className="text-xs text-foreground/60 leading-relaxed">
                            {description.replace(/\n|\f/g, ' ')}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-border/60">
                  <h3 className="text-[11px] text-foreground/40 font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-primary" /> {t('detail.recommended_items')}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(() => {
                      const items = getRecommendedItems(pokemon);
                      if (!items.length) {
                        return <div className="col-span-full p-4 text-center text-xs text-foreground/50 bg-secondary/20 rounded-sm border border-border/40">{t('detail.no_items')}</div>;
                      }
                      return items.map(item => (
                        <ItemCard key={item.id} item={item} language={language} />
                      ));
                    })()}
                  </div>
                </div>
              </div>

              {species && <AdvancedInfo pokemon={pokemon} species={species} />}

              <div className="glass-panel p-6 md:p-8 rounded-sm">
                <HeightComparison 
                  pokemonHeight={pokemon.height} 
                  pokemonName={displayName} 
                  pokemonImage={pokemon.sprites.other?.['official-artwork']?.front_default || pokemon.sprites.front_default}
                />
              </div>
            </TabsContent>

            {/* Stats Tab */}
            <TabsContent value="stats" className="space-y-6">
              <div className="glass-panel p-6 md:p-8 rounded-sm">
                <div className="flex justify-between items-center mb-8 pb-4 border-b border-border/60">
                  <h3 className="text-2xl font-black text-foreground/90 flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-sm">
                      <Swords className="w-6 h-6 text-primary" />
                    </div>
                    {t('detail.combat_stats')}
                  </h3>
                  <div className="text-right">
                    <p className="text-xs text-foreground/50 font-bold uppercase tracking-widest mb-1">{t('detail.total')}</p>
                    <span className="text-xl font-black text-foreground/90">{totalStats}</span>
                  </div>
                </div>
                
                <div className="space-y-6">
                  {pokemon.stats.map((s) => (
                    <div key={s.stat.name} className="flex items-center gap-4 group">
                      <span className="w-16 font-bold uppercase text-foreground/50 text-xs tracking-wider group-hover:text-foreground/80 transition-colors">
                        {statLabels[s.stat.name] || s.stat.name}
                      </span>
                      <span className="w-10 font-black text-right text-foreground/90 tabular-nums">
                        {s.base_stat}
                      </span>
                      <div className="flex-1 h-3.5 rounded-full bg-secondary/50 overflow-hidden border border-border/40 relative">
                        <div className="absolute inset-0 bg-muted/30 shadow-inner" />
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min((s.base_stat / 255) * 100, 100)}%` }}
                          transition={{ duration: 1.2, ease: "easeOut", delay: 0.1 }}
                          className="h-full rounded-full relative"
                          style={{
                            backgroundColor: color,
                            boxShadow: `0 0 10px ${color}, inset 0 0 5px rgba(255,255,255,0.5)`
                          }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                        </motion.div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-panel p-6 md:p-8 rounded-sm">
                <h3 className="text-2xl font-black text-foreground/90 flex items-center gap-3 mb-8 pb-4 border-b border-border/60">
                  <div className="p-2 bg-blue-500/10 rounded-sm">
                    <ShieldCheck className="w-6 h-6 text-blue-500" />
                  </div>
                  {t('detail.defensive_coverage')}
                </h3>

                {!effectiveness ? (
                  <div className="flex justify-center p-8">
                    <Loader2 className="w-8 h-8 animate-spin text-primary/40" />
                  </div>
                ) : (
                  <div className="space-y-8">
                    {effectiveness.weaknesses.length > 0 && (
                      <div>
                        <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-red-500/60 mb-4 flex items-center gap-2">
                          <ShieldAlert className="w-3 h-3" /> {t('detail.receives_double')}
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {effectiveness.weaknesses.map(([type, multiplier]) => (
                            <div key={type} className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-border/40 bg-secondary/20">
                              <span className="text-[11px] font-black uppercase tracking-wider" style={{ color: TYPE_COLORS[type] }}>{t(`types.${type}`)}</span>
                              <span className="text-[11px] md:text-[11px] font-black opacity-40">x{multiplier}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {effectiveness.resistances.length > 0 && (
                      <div>
                        <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-green-500/60 mb-4 flex items-center gap-2">
                          <ShieldCheck className="w-3 h-3" /> {t('detail.resists_damage')}
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {effectiveness.resistances.map(([type, multiplier]) => (
                            <div key={type} className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-border/40 bg-secondary/20">
                              <span className="text-[11px] font-black uppercase tracking-wider" style={{ color: TYPE_COLORS[type] }}>{t(`types.${type}`)}</span>
                              <span className="text-[11px] md:text-[11px] font-black opacity-40">x{multiplier}</span>
                            </div>
                          ))}
                          {effectiveness.immunities.map(([type]) => (
                            <div key={type} className="flex items-center justify-between p-2 rounded-sm bg-background/40 border border-blue-500/20">
                              <span className="text-[11px] font-bold uppercase truncate" style={{ color: TYPE_COLORS[type] }}>{t(`types.${type}`)}</span>
                              <span className="text-[11px] md:text-[11px] font-black text-blue-400">{t('detail.immune')}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {effectiveness.immunities.length > 0 && (
                      <div>
                        <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-500/60 mb-4 flex items-center gap-2">
                          <Zap className="w-3 h-3" /> {t('detail.immunities')}
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {effectiveness.immunities.map(([type]) => (
                            <div key={type} className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-border/40 bg-secondary/20">
                              <span className="text-[11px] font-black uppercase tracking-wider" style={{ color: TYPE_COLORS[type] }}>{t(`types.${type}`)}</span>
                              <span className="text-[11px] md:text-[11px] font-black opacity-40">x0</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Moves Tab */}
            <TabsContent value="moves" className="space-y-6">
              <PokemonMoves pokemonName={pokemon.name} />
            </TabsContent>

            {/* Evolution Tab */}
            <TabsContent value="evolution" className="space-y-6">
              {species?.evolution_chain?.url ? (
                <div className="glass-panel p-6 md:p-8 rounded-sm">
                  <h3 className="text-xl font-black mb-8 text-foreground/90 border-b border-border/60 pb-4 text-center">{t('detail.evolution_chain')}</h3>
                  <EvolutionChain url={species.evolution_chain.url} currentSpeciesName={name.split('-')[0] || name} speciesData={species} />
                </div>
              ) : (
                <div className="glass-panel p-6 md:p-8 rounded-sm flex items-center justify-center min-h-[200px]">
                  <p className="text-foreground/50 font-bold uppercase tracking-widest text-sm">{t('detail.no_evolution')}</p>
                </div>
              )}
            </TabsContent>

            {/* Breeding Tab */}
            <TabsContent value="breeding" className="space-y-6">
              {species ? (
                <>
                  <div className="glass-panel p-6 md:p-8 rounded-sm space-y-6">
                    <div className="flex items-center justify-between pb-4 border-b border-border/60">
                      <h3 className="text-xl font-black text-foreground/90">{t('detail.breeding')}</h3>
                      <Link
                        href={localeHref(`/breeding?pokemon=${pokemon.name}`)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-sm text-[11px] font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all"
                      >
                        <Egg className="h-3.5 w-3.5" /> Breeding Calculator
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-secondary/30 p-4 rounded-sm border border-border/40">
                        <p className="text-[11px] text-foreground/50 uppercase font-bold tracking-widest mb-2">{t('detail.egg_groups')}</p>
                        <p className="text-sm font-black text-foreground/90">
                          {species.egg_groups?.map(g => t(`egg_groups.${g.name}`)).join(', ') || t('detail.no_evolution')}
                        </p>
                      </div>
                      <div className="bg-secondary/30 p-4 rounded-sm border border-border/40">
                        <p className="text-[11px] text-foreground/50 uppercase font-bold tracking-widest mb-2">{t('detail.gender_ratio')}</p>
                        <p className="text-sm font-black text-foreground/90">
                          {genderRate !== null ? (
                            genderRate === -1
                              ? t('detail.genderless')
                              : `♂ ${maleGenderRate?.toFixed(1)}% / ♀ ${femaleGenderRate?.toFixed(1)}%`
                          ) : '-'}
                        </p>
                      </div>
                      <div className="bg-secondary/30 p-4 rounded-sm border border-border/40">
                        <p className="text-[11px] text-foreground/50 uppercase font-bold tracking-widest mb-2">{t('detail.catch_rate')}</p>
                        <p className="text-sm font-black text-foreground/90">{species.capture_rate || '-'}</p>
                      </div>
                      <div className="bg-secondary/30 p-4 rounded-sm border border-border/40">
                        <p className="text-[11px] text-foreground/50 uppercase font-bold tracking-widest mb-2">{t('detail.base_happiness')}</p>
                        <p className="text-sm font-black text-foreground/90">{species.base_happiness || '-'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/60">
                      <div className="bg-secondary/30 p-4 rounded-sm border border-border/40">
                        <p className="text-[11px] text-foreground/50 uppercase font-bold tracking-widest mb-2">{t('detail.growth_rate')}</p>
                        <p className="text-sm font-black text-foreground/90">{species.growth_rate ? t(`growth_rates.${species.growth_rate.name}`) : '-'}</p>
                      </div>
                      <div className="bg-secondary/30 p-4 rounded-sm border border-border/40">
                        <p className="text-[11px] text-foreground/50 uppercase font-bold tracking-widest mb-2">{t('detail.base_exp')}</p>
                        <p className="text-sm font-black text-foreground/90">{pokemon.base_experience || '-'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Egg Move Explorer inline */}
                  <div className="glass-panel p-6 md:p-8 rounded-sm">
                    <EggMoveExplorer pokemonName={pokemon.name} />
                  </div>
                </>
              ) : (
                <div className="glass-panel p-6 md:p-8 rounded-sm flex items-center justify-center min-h-[200px]">
                  <p className="text-foreground/50 font-bold uppercase tracking-widest text-sm">{t('detail.no_evolution')}</p>
                </div>
              )}
            </TabsContent>

            {/* Builds Tab */}
            <TabsContent value="builds" className="space-y-6">
              <PokemonBuilds pokemon={pokemon} />
            </TabsContent>

            {/* Locations Tab */}
            <TabsContent value="locations" className="space-y-6">
              <EncounterLocations
                pokemonId={pokemon.id}
                pokemonName={displayName}
                initialEncounters={initialEncounters}
              />
            </TabsContent>

            {/* Cards Tab */}
            <TabsContent value="cards" className="space-y-6">
              <PokemonCards name={pokemon.name} localizedName={displayName} lang={resolvedLang} />
            </TabsContent>

            {/* Sprites Tab */}
            <TabsContent value="sprites" className="space-y-6">
              <SpriteGallery pokemon={pokemon} />
            </TabsContent>

            {/* Competitive Tab */}
            <TabsContent value="competitive" className="space-y-6">
              <CompetitiveMeta pokemon={pokemon} displayName={displayName} />
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
      {/* Mobile Fixed Bottom Action Bar */}
      <div className="md:hidden fixed bottom-6 left-4 right-4 z-[100] animate-in fade-in slide-in-from-bottom-10 duration-700">
        <div className="glass-toolbar p-2 flex items-center justify-between gap-1.5">
          {/* Catch Toggle */}
          <Button
            variant="outline"
            size="default"
            onClick={(e) => { e.stopPropagation(); if (pokemon?.id) toggleCaught(pokemon.id); }}
            className={cn(
              "flex-1 h-12 rounded-sm transition-all gap-2 border-0",
              pokemon?.id && isCaught(pokemon.id)
                ? "bg-primary text-primary-foreground shadow-[0_4px_16px_rgba(227,53,13,0.4)]"
                : "bg-card/50 text-foreground/70"
            )}
            aria-label={pokemon?.id && isCaught(pokemon.id) ? t('card.caught') : t('card.mark_caught')}
            aria-pressed={!!(pokemon?.id && isCaught(pokemon.id))}
          >
            <Zap className={cn("w-4 h-4", pokemon?.id && isCaught(pokemon.id) && "fill-current")} />
            <span className="text-[11px] font-black uppercase tracking-widest leading-none">
              {pokemon?.id && isCaught(pokemon.id) ? t('card.caught') : t('card.mark_caught')}
            </span>
          </Button>

          {/* Favorite Toggle */}
          <Button
            variant="outline"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              if (pokemon?.id) {
                if (isFavorite(pokemon.id)) {
                  removeFavorite(pokemon.id);
                } else {
                  addFavorite(pokemon.id);
                }
              }
            }}
            style={{ '--chip': 'var(--action-favorite)' } as CSSProperties}
            className={cn(
              "h-12 w-12 rounded-sm transition-all border-0",
              pokemon?.id && isFavorite(pokemon.id)
                ? "bg-[color-mix(in_oklab,var(--chip)_15%,transparent)] text-[var(--chip)]"
                : "bg-card/50 text-foreground/40"
            )}
            aria-label={pokemon?.id && isFavorite(pokemon.id) ? t('card.remove_favorite') : t('card.add_favorite')}
            aria-pressed={!!(pokemon?.id && isFavorite(pokemon.id))}
          >
            <Heart className={cn("w-5 h-5", pokemon?.id && isFavorite(pokemon.id) && "fill-current")} />
          </Button>

          {/* Compare Toggle */}
          <Button
            variant="outline"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              if (pokemon?.id) {
                if (isInCompare(pokemon.id)) {
                  removeFromCompare(pokemon.id);
                } else {
                  addToCompare(pokemon.id);
                }
              }
            }}
            style={{ '--chip': 'var(--action-compare)' } as CSSProperties}
            className={cn(
              "h-12 w-12 rounded-sm transition-all border-0",
              pokemon?.id && isInCompare(pokemon.id)
                ? "bg-[color-mix(in_oklab,var(--chip)_15%,transparent)] text-[var(--chip)]"
                : "bg-card/50 text-foreground/40"
            )}
            aria-label={pokemon?.id && isInCompare(pokemon.id) ? t('card.remove_compare') : t('card.add_compare')}
            aria-pressed={!!(pokemon?.id && isInCompare(pokemon.id))}
          >
            <Swords className={cn("w-5 h-5", pokemon?.id && isInCompare(pokemon.id) && "fill-current")} />
          </Button>

          {/* Team Toggle */}
          <Button
            variant="outline"
            size="icon"
            disabled={!!(pokemon?.id && !isInTeam(pokemon.id) && team.length >= 6)}
            onClick={(e) => {
              e.stopPropagation();
              if (pokemon?.id) {
                if (isInTeam(pokemon.id)) {
                  removeFromTeam(pokemon.id);
                } else {
                  addToTeam(pokemon.id);
                }
              }
            }}
            style={{ '--chip': 'var(--action-team)' } as CSSProperties}
            className={cn(
              "h-12 w-12 rounded-sm transition-all border-0",
              pokemon?.id && isInTeam(pokemon.id)
                ? "bg-[color-mix(in_oklab,var(--chip)_15%,transparent)] text-[var(--chip)]"
                : "bg-card/50 text-foreground/40"
            )}
            aria-label={pokemon?.id && isInTeam(pokemon.id) ? t('card.remove_team') : t('card.add_team')}
            aria-pressed={!!(pokemon?.id && isInTeam(pokemon.id))}
          >
            <Star className={cn("w-5 h-5", pokemon?.id && isInTeam(pokemon.id) && "fill-current")} />
          </Button>
        </div>
      </div>
    </div>
  );
}
