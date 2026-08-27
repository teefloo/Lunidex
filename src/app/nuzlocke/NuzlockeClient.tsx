'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import { Plus, Trash2, Skull, Heart, Package, Trophy, Search } from 'lucide-react';
import Header from '@/components/layout/Header';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import { useMounted } from '@/hooks/useMounted';
import { usePrimeDexStore } from '@/store/primedex';
import { getAllPokemonSearchIndex } from '@/lib/api/graphql';
import { pokemonKeys } from '@/lib/api/keys';
import { useClientLanguage } from '@/hooks/useLocaleHref';
import { formatName, cn } from '@/lib/utils';
import type { NuzlockeEncounterStatus } from '@/types/nuzlocke';

const STATUS_CONFIG: Record<NuzlockeEncounterStatus, { icon: typeof Heart; color: string; labelKey: string; fallback: string }> = {
  alive: { icon: Heart, color: 'text-green-500', labelKey: 'nuzlocke.status_alive', fallback: 'Alive' },
  dead: { icon: Skull, color: 'text-red-500', labelKey: 'nuzlocke.status_dead', fallback: 'Dead' },
  boxed: { icon: Package, color: 'text-foreground/40', labelKey: 'nuzlocke.status_boxed', fallback: 'Boxed' },
};

export default function NuzlockeClient() {
  const { t } = useTranslation();
  const mounted = useMounted();
  const runs = usePrimeDexStore((s) => s.nuzlockeRuns);
  const createRun = usePrimeDexStore((s) => s.createNuzlockeRun);
  const deleteRun = usePrimeDexStore((s) => s.deleteNuzlockeRun);
  const addEncounter = usePrimeDexStore((s) => s.addNuzlockeEncounter);
  const updateStatus = usePrimeDexStore((s) => s.updateNuzlockeEncounterStatus);
  const removeEncounter = usePrimeDexStore((s) => s.removeNuzlockeEncounter);
  const resolvedLang = useClientLanguage();

  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [newRunName, setNewRunName] = useState('');
  const [newRunGame, setNewRunGame] = useState('');
  const [routeName, setRouteName] = useState('');
  const [pokemonSearch, setPokemonSearch] = useState('');
  const [selectedPokemon, setSelectedPokemon] = useState<{ id: number; name: string; displayName: string } | null>(null);

  const selectedRun = runs.find((r) => r.id === selectedRunId) ?? null;

  const { data: allPokemon } = useQuery({
    queryKey: pokemonKeys.allSearchIndex(),
    queryFn: () => getAllPokemonSearchIndex(),
    enabled: mounted && pokemonSearch.trim().length > 0,
    staleTime: 24 * 60 * 60 * 1000,
  });

  const pokemonResults = useMemo(() => {
    const query = pokemonSearch.trim().toLowerCase();
    if (!query || !allPokemon) return [];
    return allPokemon
      .filter((p) => {
        const localized = p.pokemon_v2_pokemonspecy?.pokemon_v2_pokemonspeciesnames.find((n) => n.pokemon_v2_language?.name === resolvedLang);
        const name = (localized?.name || p.name).toLowerCase();
        return name.includes(query) || p.name.includes(query);
      })
      .slice(0, 6);
  }, [pokemonSearch, allPokemon, resolvedLang]);

  const stats = useMemo(() => {
    if (!selectedRun) return { alive: 0, dead: 0, boxed: 0, total: 0 };
    return {
      alive: selectedRun.encounters.filter((e) => e.status === 'alive').length,
      dead: selectedRun.encounters.filter((e) => e.status === 'dead').length,
      boxed: selectedRun.encounters.filter((e) => e.status === 'boxed').length,
      total: selectedRun.encounters.length,
    };
  }, [selectedRun]);

  const handleCreateRun = () => {
    const name = newRunName.trim() || t('nuzlocke.default_run_name', { defaultValue: 'New Run' });
    const id = createRun(name, newRunGame.trim() || 'Unknown');
    setSelectedRunId(id);
    setNewRunName('');
    setNewRunGame('');
  };

  const handleAddEncounter = () => {
    if (!selectedRun || !routeName.trim() || !selectedPokemon) return;
    const routeExists = selectedRun.encounters.some(
      (e) => e.routeName.toLowerCase() === routeName.trim().toLowerCase(),
    );
    if (routeExists) return;

    addEncounter(selectedRun.id, {
      routeName: routeName.trim(),
      pokemonId: selectedPokemon.id,
      pokemonName: selectedPokemon.name,
      nickname: null,
      status: 'alive',
    });
    setRouteName('');
    setPokemonSearch('');
    setSelectedPokemon(null);
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <Header />

      <main className="page-shell pb-20 pt-8">
        <PageHeader
          title={t('nuzlocke.title', { defaultValue: 'Nuzlocke Tracker' })}
          subtitle={t('nuzlocke.subtitle', { defaultValue: 'Track your Nuzlocke run: one catch per route, permadeath on faint' })}
          eyebrow={t('nuzlocke.eyebrow', { defaultValue: 'Challenge Mode' })}
          icon={Trophy}
        />

        <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="page-surface p-4 space-y-4 xl:sticky xl:top-24 xl:h-fit">
            <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-foreground/35">
              {t('nuzlocke.my_runs', { defaultValue: 'My Runs' })}
            </h3>
            <div className="space-y-2">
              <input
                type="text"
                value={newRunName}
                onChange={(e) => setNewRunName(e.target.value)}
                placeholder={t('nuzlocke.run_name_placeholder', { defaultValue: 'Run name...' })}
                className="h-9 w-full rounded-sm border border-border/70 bg-muted/40 px-3 text-xs text-foreground placeholder:text-foreground/30 focus:border-primary/40 focus:outline-none"
              />
              <input
                type="text"
                value={newRunGame}
                onChange={(e) => setNewRunGame(e.target.value)}
                placeholder={t('nuzlocke.game_placeholder', { defaultValue: 'Game (e.g. Emerald)...' })}
                className="h-9 w-full rounded-sm border border-border/70 bg-muted/40 px-3 text-xs text-foreground placeholder:text-foreground/30 focus:border-primary/40 focus:outline-none"
              />
              <Button size="sm" className="w-full" onClick={handleCreateRun}>
                <Plus className="h-3.5 w-3.5" />
                {t('nuzlocke.create_run', { defaultValue: 'Create Run' })}
              </Button>
            </div>
            <div className="space-y-1.5">
              {runs.length === 0 ? (
                <p className="text-xs text-foreground/40">{t('nuzlocke.no_runs', { defaultValue: 'No runs yet.' })}</p>
              ) : (
                runs.map((run) => (
                  <div
                    key={run.id}
                    className={cn(
                      'flex items-center justify-between gap-2 rounded-sm border px-3 py-2 cursor-pointer transition-colors',
                      selectedRunId === run.id
                        ? 'border-primary/40 bg-primary/10'
                        : 'border-border/60 bg-card/40 hover:border-border/90',
                    )}
                    onClick={() => setSelectedRunId(run.id)}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-foreground/85">{run.name}</p>
                      <p className="text-[11px] text-foreground/40">{run.game} · {run.encounters.length} {t('nuzlocke.encounters', { defaultValue: 'encounters' })}</p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteRun(run.id);
                        if (selectedRunId === run.id) setSelectedRunId(null);
                      }}
                      className="shrink-0 text-foreground/30 hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </aside>

          <section className="space-y-6">
            {!selectedRun ? (
              <div className="page-surface flex flex-col items-center justify-center gap-3 p-12 text-center">
                <Trophy className="h-8 w-8 text-foreground/20" />
                <p className="text-sm text-foreground/50">
                  {t('nuzlocke.select_run_hint', { defaultValue: 'Create or select a run to start tracking encounters.' })}
                </p>
              </div>
            ) : (
              <>
                <div className="page-surface p-4 grid grid-cols-4 gap-3 text-center">
                  <div>
                    <p className="text-2xl font-black text-foreground/90">{stats.total}</p>
                    <p className="text-[11px] font-bold uppercase text-foreground/40">{t('nuzlocke.total', { defaultValue: 'Total' })}</p>
                  </div>
                  <div>
                    <p className="text-2xl font-black text-green-500">{stats.alive}</p>
                    <p className="text-[11px] font-bold uppercase text-foreground/40">{t('nuzlocke.status_alive', { defaultValue: 'Alive' })}</p>
                  </div>
                  <div>
                    <p className="text-2xl font-black text-red-500">{stats.dead}</p>
                    <p className="text-[11px] font-bold uppercase text-foreground/40">{t('nuzlocke.status_dead', { defaultValue: 'Dead' })}</p>
                  </div>
                  <div>
                    <p className="text-2xl font-black text-foreground/50">{stats.boxed}</p>
                    <p className="text-[11px] font-bold uppercase text-foreground/40">{t('nuzlocke.status_boxed', { defaultValue: 'Boxed' })}</p>
                  </div>
                </div>

                <div className="page-surface p-4 space-y-3">
                  <h3 className="text-[11px] font-black uppercase tracking-[0.18em] text-foreground/35">
                    {t('nuzlocke.add_encounter', { defaultValue: 'Add Encounter' })}
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      type="text"
                      value={routeName}
                      onChange={(e) => setRouteName(e.target.value)}
                      placeholder={t('nuzlocke.route_placeholder', { defaultValue: 'Route / location name...' })}
                      className="h-10 rounded-sm border border-border/70 bg-muted/40 px-3 text-sm text-foreground placeholder:text-foreground/30 focus:border-primary/40 focus:outline-none"
                    />
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-3">
                        <Search className="h-4 w-4 text-foreground/30" />
                      </div>
                      <input
                        type="text"
                        value={selectedPokemon ? selectedPokemon.displayName : pokemonSearch}
                        onChange={(e) => {
                          setPokemonSearch(e.target.value);
                          setSelectedPokemon(null);
                        }}
                        placeholder={t('nuzlocke.pokemon_placeholder', { defaultValue: 'Search Pokémon caught...' })}
                        className="h-10 w-full rounded-sm border border-border/70 bg-muted/40 pl-9 pr-3 text-sm text-foreground placeholder:text-foreground/30 focus:border-primary/40 focus:outline-none"
                      />
                      {pokemonResults.length > 0 && !selectedPokemon && (
                        <div className="absolute z-20 mt-1 w-full rounded-sm border border-border/70 bg-card shadow-lg">
                          {pokemonResults.map((p) => {
                            const localized = p.pokemon_v2_pokemonspecy?.pokemon_v2_pokemonspeciesnames.find((n) => n.pokemon_v2_language?.name === resolvedLang);
                            const displayName = localized?.name || formatName(p.name);
                            return (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => {
                                  setSelectedPokemon({ id: p.id, name: p.name, displayName });
                                  setPokemonSearch('');
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/50"
                              >
                                {displayName} <span className="text-foreground/30 text-xs">#{String(p.id).padStart(3, '0')}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleAddEncounter}
                    disabled={!routeName.trim() || !selectedPokemon}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {t('nuzlocke.add_encounter', { defaultValue: 'Add Encounter' })}
                  </Button>
                </div>

                <div className="page-surface p-4">
                  <h3 className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-foreground/35">
                    {t('nuzlocke.encounter_list', { defaultValue: 'Encounters' })}
                  </h3>
                  {selectedRun.encounters.length === 0 ? (
                    <p className="text-sm text-foreground/40">
                      {t('nuzlocke.no_encounters', { defaultValue: 'No encounters logged yet.' })}
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {selectedRun.encounters.map((encounter) => {
                        return (
                          <div
                            key={encounter.id}
                            className="flex items-center justify-between gap-3 rounded-sm border border-border/60 bg-background/40 px-3 py-2"
                          >
                            <div className="flex min-w-0 flex-1 items-center gap-3">
                              <Image
                                src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${encounter.pokemonId}.png`}
                                alt={encounter.pokemonName}
                                width={32}
                                height={32}
                                className="shrink-0"
                                unoptimized
                              />
                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-foreground/85">
                                  {formatName(encounter.pokemonName)}
                                </p>
                                <p className="truncate text-[11px] text-foreground/40">{encounter.routeName}</p>
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-1.5">
                              {(['alive', 'dead', 'boxed'] as const).map((status) => {
                                const Icon = STATUS_CONFIG[status].icon;
                                const active = encounter.status === status;
                                return (
                                  <button
                                    key={status}
                                    type="button"
                                    onClick={() => updateStatus(selectedRun.id, encounter.id, status)}
                                    title={t(STATUS_CONFIG[status].labelKey, { defaultValue: STATUS_CONFIG[status].fallback })}
                                    className={cn(
                                      'flex h-7 w-7 items-center justify-center rounded-sm border transition-colors',
                                      active
                                        ? `border-current bg-current/10 ${STATUS_CONFIG[status].color}`
                                        : 'border-border/50 text-foreground/25 hover:text-foreground/50',
                                    )}
                                  >
                                    <Icon className="h-3.5 w-3.5" />
                                  </button>
                                );
                              })}
                              <button
                                type="button"
                                onClick={() => removeEncounter(selectedRun.id, encounter.id)}
                                className="ml-1 text-foreground/25 hover:text-destructive"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
