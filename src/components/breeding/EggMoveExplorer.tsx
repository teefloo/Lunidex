'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Search, ChevronDown, ChevronUp, Egg, ExternalLink, Info } from 'lucide-react';
import { getPokemonDetail, getPokemonSpecies } from '@/lib/api/rest';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/lib/i18n';
import { useLocaleHref } from '@/hooks/useLocaleHref';

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

function useEggMoves(pokemonName: string) {
  return useQuery({
    queryKey: ['egg-moves', pokemonName],
    queryFn: async () => {
      const detail = await getPokemonDetail(pokemonName);
      const eggMoves = detail.moves
        .filter(m => m.version_group_details.some(vgd => vgd.move_learn_method.name === 'egg'))
        .map(m => ({
          name: m.move.name,
          url: m.move.url,
        }));
      return eggMoves;
    },
    staleTime: Infinity,
    enabled: !!pokemonName,
  });
}

function usePokemonEggGroups(pokemonName: string) {
  return useQuery({
    queryKey: ['egg-groups', pokemonName],
    queryFn: async () => {
      const species = await getPokemonSpecies(pokemonName);
      return {
        eggGroups: species.egg_groups.map(g => g.name),
        isLegendary: species.is_legendary,
        isMythical: species.is_mythical,
      };
    },
    staleTime: Infinity,
    enabled: !!pokemonName,
  });
}

// ---------------------------------------------------------------------------
// Egg Move Row
// ---------------------------------------------------------------------------

interface EggMoveRowProps {
  moveName: string;
  pokemonName: string;
  eggGroups: string[];
}

function EggMoveRow({ moveName, pokemonName, eggGroups }: EggMoveRowProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-border/40 rounded-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="flex items-center justify-between w-full px-4 py-3 hover:bg-muted/40 transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-secondary/40 rounded-sm">
            <Egg className="h-3.5 w-3.5 text-primary/70" />
          </div>
          <span className="font-black text-sm capitalize text-foreground/85 group-hover:text-primary transition-colors">
            {moveName.replace(/-/g, ' ')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-black uppercase tracking-wider text-foreground/40">
            {expanded ? t('breeding.sources_hide') : t('breeding.sources_show')}
          </span>
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5 text-foreground/40" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-foreground/40" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-border/40 bg-secondary/10 space-y-3">
          <div className="flex items-start gap-2 p-3 rounded-sm bg-blue-500/10 border border-blue-500/20">
            <Info className="h-3.5 w-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-foreground/60">
              {t('breeding.breed_tip', {
                move: moveName.replace(/-/g, ' '),
                pokemon: pokemonName,
                groups: eggGroups.join(', '),
              })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {eggGroups.map(group => (
              <Badge key={group} variant="outline" className="text-[11px] font-black capitalize border-primary/20 text-primary/70">
                {t('breeding.group_badge', { group })}
              </Badge>
            ))}
          </div>
          <Link
            href={`https://bulbapedia.bulbagarden.net/wiki/${moveName.replace(/-/g, '_').replace(/\b\w/g, c => c.toUpperCase())}_(move)`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-foreground/50 hover:text-primary transition-colors"
          >
            {t('breeding.view_bulbapedia')} <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

interface EggMoveExplorerProps {
  pokemonName: string;
}

export function EggMoveExplorer({ pokemonName }: EggMoveExplorerProps) {
  const { t } = useTranslation();
  const localeHref = useLocaleHref();
  const [search, setSearch] = useState('');

  const { data: eggMoves, isLoading: movesLoading, error: movesError } = useEggMoves(pokemonName);
  const { data: speciesData, isLoading: speciesLoading } = usePokemonEggGroups(pokemonName);

  const isLoading = movesLoading || speciesLoading;
  const eggGroups = speciesData?.eggGroups ?? [];

  const filteredMoves = useMemo(() => {
    if (!eggMoves) return [];
    const q = search.toLowerCase();
    return eggMoves.filter(m => !q || m.name.includes(q));
  }, [eggMoves, search]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-sm" />
        ))}
      </div>
    );
  }

  if (movesError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-foreground/40 gap-2">
        <Egg className="h-8 w-8 opacity-30" />
        <p className="text-sm font-bold uppercase tracking-widest">{t('breeding.error_loading')}</p>
      </div>
    );
  }

  const moveCount = filteredMoves.length;
  const moveCountLabel = moveCount === 1
    ? t('breeding.move_count', { count: moveCount })
    : t('breeding.move_count_plural', { count: moveCount });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="font-black text-lg text-foreground/90 capitalize">
            {t('breeding.egg_moves_title', { name: pokemonName })}
          </h3>
          <p className="text-xs text-foreground/50 mt-0.5">
            {eggGroups.length > 0 ? (
              <>{t('breeding.egg_groups_label')}: <span className="font-bold">{eggGroups.join(', ')}</span></>
            ) : t('breeding.egg_groups_unknown')}
          </p>
        </div>
        <Badge variant="outline" className="self-start sm:self-auto font-black text-sm border-primary/20 text-primary/80 px-3 py-1">
          {moveCountLabel}
        </Badge>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground/40" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('breeding.filter_placeholder')}
          className="w-full pl-9 pr-3 h-10 rounded-sm border border-border/60 bg-background/50 text-sm font-semibold placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
        />
      </div>

      {/* Move list */}
      {filteredMoves.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-foreground/30 gap-3">
          <Egg className="h-10 w-10 opacity-20" />
          {eggMoves?.length === 0 ? (
            <>
              <p className="font-black text-sm uppercase tracking-wider">{t('breeding.no_egg_moves')}</p>
              <p className="text-xs text-center max-w-xs">
                {speciesData?.isLegendary || speciesData?.isMythical
                  ? t('breeding.no_egg_moves_legendary')
                  : t('breeding.no_egg_moves_pokemon', { name: pokemonName })}
              </p>
            </>
          ) : (
            <p className="font-black text-sm uppercase tracking-wider">{t('breeding.no_moves_search')}</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredMoves.map(move => (
            <EggMoveRow
              key={move.name}
              moveName={move.name}
              pokemonName={pokemonName}
              eggGroups={eggGroups}
            />
          ))}
        </div>
      )}

      {/* Link to full breeding calculator */}
      <div className="pt-2 border-t border-border/40">
        <Link
          href={localeHref(`/breeding?pokemon=${pokemonName}`)}
          className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.15em] text-primary/70 hover:text-primary transition-colors"
        >
          <Egg className="h-3.5 w-3.5" /> {t('breeding.open_calculator', { name: pokemonName })}
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
