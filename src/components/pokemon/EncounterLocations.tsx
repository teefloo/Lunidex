'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, MapPin, Gamepad2 } from 'lucide-react';
import { getPokemonEncounters } from '@/lib/api';
import { pokemonKeys } from '@/lib/api/keys';
import { useTranslation } from '@/lib/i18n';
import { formatName, formatLocationName } from '@/lib/utils';
import {
  groupEncountersByVersionGroup,
  VERSION_GROUP_LABELS,
} from '@/lib/encounter-utils';
import EmptyState from '@/components/ui/EmptyState';
import type { PokemonEncounter } from '@/types/pokemon';

interface EncounterLocationsProps {
  pokemonId: number;
  /** Localized Pokémon name, used in the empty-state copy. */
  pokemonName: string;
  /** Encounters fetched on the server, used to seed the query cache. */
  initialEncounters?: PokemonEncounter[];
}

export function EncounterLocations({
  pokemonId,
  pokemonName,
  initialEncounters,
}: EncounterLocationsProps) {
  const { t } = useTranslation();

  // The server already fetched encounters and passes them as `initialEncounters`,
  // so seed the cache and skip the client fetch entirely. Only query when the
  // SSR data is absent (component reused outside the detail page).
  const hasInitial = initialEncounters !== undefined;

  const { data, isLoading, isError } = useQuery({
    queryKey: pokemonKeys.encounters(pokemonId),
    queryFn: () => getPokemonEncounters(pokemonId),
    enabled: !hasInitial,
    initialData: initialEncounters,
    staleTime: 24 * 60 * 60 * 1000,
  });

  const versionGroups = useMemo(
    () => groupEncountersByVersionGroup(data ?? []),
    [data]
  );

  const methodLabel = (method: string) =>
    t(`detail.encounter.methods.${method}`, { defaultValue: formatName(method) });

  const versionGroupLabel = (group: string) =>
    VERSION_GROUP_LABELS[group] ?? formatName(group);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary/40" />
      </div>
    );
  }

  if (isError || versionGroups.length === 0) {
    return (
      <EmptyState
        icon={MapPin}
        title={t('detail.encounter.empty_title')}
        description={t('detail.encounter.empty_desc', { name: pokemonName })}
      />
    );
  }

  return (
    <div className="space-y-6">
      {versionGroups.map((group) => (
        <div key={group.versionGroup} className="glass-panel p-6 md:p-8 rounded-sm">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border/60">
            <div className="p-2 bg-green-500/10 rounded-sm">
              <Gamepad2 className="w-5 h-5 text-green-500" />
            </div>
            <h3 className="text-lg md:text-xl font-black text-foreground/90">
              {versionGroupLabel(group.versionGroup)}
            </h3>
            <span className="ml-auto text-[10px] font-black uppercase tracking-widest text-foreground/40">
              {group.locations.length} {t('detail.encounter.areas')}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {group.locations.map((location) => (
              <div
                key={location.locationArea}
                className="p-5 bg-secondary/20 border border-border/40 rounded-sm space-y-4"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-background/40 rounded-sm">
                    <MapPin className="w-4 h-4 text-primary" />
                  </div>
                  <span className="font-black text-base text-foreground/80">
                    {formatLocationName(location.locationArea)}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {location.entries.map((entry, ei) => (
                    <div
                      key={`${entry.version}-${entry.method}-${ei}`}
                      className="p-4 bg-background/40 rounded-sm border border-border/40 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground/70 text-xs capitalize">
                          {methodLabel(entry.method)}
                        </span>
                        <span className="font-black text-foreground/90 text-xs tabular-nums">
                          {entry.chance}%
                        </span>
                      </div>

                      <div className="h-1.5 rounded-full bg-secondary/50 overflow-hidden border border-border/40">
                        <div
                          className="h-full rounded-full bg-green-500 transition-all duration-500"
                          style={{ width: `${Math.min(entry.chance, 100)}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] text-foreground/50 font-bold uppercase tracking-wider">
                          {entry.minLevel === entry.maxLevel
                            ? t('detail.encounter.level', { level: entry.minLevel })
                            : t('detail.encounter.level_range', {
                                min: entry.minLevel,
                                max: entry.maxLevel,
                              })}
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-wider text-green-500/70">
                          {formatName(entry.version)}
                        </span>
                      </div>

                      {entry.conditions.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {entry.conditions.map((condition) => (
                            <span
                              key={condition}
                              className="px-2 py-0.5 rounded-sm bg-primary/10 border border-primary/20 text-[10px] font-bold text-primary/80"
                            >
                              {formatName(condition)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default EncounterLocations;
