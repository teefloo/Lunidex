'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import { Egg, Dna, Search } from 'lucide-react';
import { BreedingCalculator } from '@/components/breeding/BreedingCalculator';
import { EggMoveExplorer } from '@/components/breeding/EggMoveExplorer';
import { getAllPokemonSearchIndex } from '@/lib/api/graphql';
import { pokemonKeys } from '@/lib/api/keys';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import i18n from '@/lib/i18n';

interface BreedingPageClientProps {
  initialPokemon?: string;
  initialTab?: string;
}

type TabId = 'calculator' | 'egg-moves';

export function BreedingPageClient({ initialPokemon, initialTab }: BreedingPageClientProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabId>(
    (initialTab as TabId) ?? 'calculator',
  );
  const [explorerPokemon, setExplorerPokemon] = useState(initialPokemon ?? '');
  const [explorerInput, setExplorerInput] = useState(initialPokemon ?? '');
  const [explorerOpen, setExplorerOpen] = useState(false);

  const { data: explorerAllPokemon } = useQuery({
    queryKey: pokemonKeys.allSearchIndex(),
    queryFn: getAllPokemonSearchIndex,
    staleTime: 24 * 60 * 60 * 1000,
    enabled: explorerOpen || explorerInput.length > 0,
  });

  const explorerResults = useMemo(() => {
    if (!explorerInput.trim() || !explorerAllPokemon) return [];
    const q = explorerInput.toLowerCase();
    return explorerAllPokemon
      .filter(p => {
        if (p.name.toLowerCase().includes(q)) return true;
        const species = p.pokemon_v2_pokemonspecy;
        if (species?.pokemon_v2_pokemonspeciesnames) {
          return species.pokemon_v2_pokemonspeciesnames.some(nameObj => nameObj.name.toLowerCase().includes(q));
        }
        return String(p.id).includes(q);
      })
      .slice(0, 8);
  }, [explorerInput, explorerAllPokemon]);

  const selectExplorerPokemon = (name: string) => {
    setExplorerPokemon(name);
    setExplorerInput(name);
    setExplorerOpen(false);
  };

  const TABS = [
    { id: 'calculator' as TabId, label: t('breeding.tab_calculator'), icon: Dna },
    { id: 'egg-moves' as TabId, label: t('breeding.tab_egg_moves'), icon: Egg },
  ];

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="p-3 bg-primary/10 rounded-sm border border-primary/20">
            <Egg className="h-7 w-7 text-primary" />
          </div>
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-foreground/90">
          {t('breeding.title')}
        </h1>
        <p className="text-sm text-foreground/50 font-medium max-w-lg mx-auto">
          {t('breeding.subtitle')}
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 bg-secondary/30 rounded-sm border border-border/40 max-w-sm mx-auto">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'touch-target flex min-h-11 flex-1 items-center justify-center gap-2 rounded-sm text-[10px] font-black uppercase tracking-[0.15em] transition-[color,background-color,box-shadow]',
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-foreground/50 hover:text-foreground/80',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'calculator' && (
        <BreedingCalculator initialPokemon={initialPokemon} />
      )}

      {activeTab === 'egg-moves' && (
        <div className="glass-panel p-6 md:p-8 rounded-sm space-y-5">
          {/* Pokémon input */}
          {!explorerPokemon ? (
            <div className="flex flex-col items-center gap-5 py-8">
              <Egg className="h-12 w-12 text-foreground/15" />
              <div className="w-full max-w-sm space-y-3 text-center">
                <p className="text-sm font-bold text-foreground/50">{t('breeding.egg_move_prompt')}</p>
                <div className="relative flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground/40" />
                    <input
                      type="text"
                      value={explorerInput}
                      onChange={e => { setExplorerInput(e.target.value); setExplorerOpen(true); }}
                      onFocus={() => setExplorerOpen(true)}
                      onBlur={() => setTimeout(() => setExplorerOpen(false), 150)}
                      onKeyDown={e => e.key === 'Enter' && explorerInput && setExplorerPokemon(explorerInput.toLowerCase().trim())}
                      placeholder={t('breeding.egg_move_placeholder')}
                      name="egg-move-pokemon"
                      autoComplete="off"
                      className="touch-target w-full rounded-sm border border-border/60 bg-background/50 pl-9 pr-3 text-sm font-semibold placeholder:text-foreground/55 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-[border-color,box-shadow]"
                    />
                    {explorerOpen && explorerResults.length > 0 && (
                      <div className="absolute z-50 top-full mt-1 w-full rounded-sm border border-border/60 bg-card shadow-lg overflow-hidden text-left">
                        {explorerResults.map(p => {
                          const currentLang = i18n.language || 'en';
                          const localizedNameObj = p.pokemon_v2_pokemonspecy?.pokemon_v2_pokemonspeciesnames
                            .find(nameObj => nameObj.pokemon_v2_language.name === currentLang);
                          const displayName = localizedNameObj?.name || p.name;

                          return (
                            <button
                              key={p.id}
                              type="button"
                              onMouseDown={() => selectExplorerPokemon(p.name)}
                              className="touch-target flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/60 transition-colors"
                            >
                              <Image
                                src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png`}
                                alt={displayName}
                                width={32}
                                height={32}
                                className="object-contain"
                                unoptimized
                              />
                              <span className="font-semibold text-sm capitalize text-foreground/85">{displayName}</span>
                              <span className="ml-auto font-mono text-[10px] text-foreground/40">#{String(p.id).padStart(3, '0')}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={!explorerInput.trim()}
                    onClick={() => setExplorerPokemon(explorerInput.toLowerCase().trim())}
                    className="touch-target min-h-11 rounded-sm bg-primary px-4 text-[11px] font-black uppercase tracking-wider text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40 hover:bg-primary/90 transition-[background-color]"
                  >
                    {t('breeding.search_btn')}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div />
                <button
                  type="button"
                  onClick={() => { setExplorerPokemon(''); setExplorerInput(''); }}
                  className="touch-target inline-flex items-center text-[10px] font-black uppercase tracking-wider text-foreground/55 hover:text-foreground/80 transition-colors"
                >
                  {t('breeding.change_pokemon')}
                </button>
              </div>
              <EggMoveExplorer pokemonName={explorerPokemon} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
