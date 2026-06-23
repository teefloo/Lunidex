'use client';

import { useState } from 'react';
import { Egg, Dna } from 'lucide-react';
import { BreedingCalculator } from '@/components/breeding/BreedingCalculator';
import { EggMoveExplorer } from '@/components/breeding/EggMoveExplorer';
import { cn } from '@/lib/utils';

interface BreedingPageClientProps {
  initialPokemon?: string;
  initialTab?: string;
}

const TABS = [
  { id: 'calculator', label: 'IV Calculator', icon: Dna },
  { id: 'egg-moves', label: 'Egg Move Explorer', icon: Egg },
] as const;

type TabId = typeof TABS[number]['id'];

export function BreedingPageClient({ initialPokemon, initialTab }: BreedingPageClientProps) {
  const [activeTab, setActiveTab] = useState<TabId>(
    (initialTab as TabId) ?? 'calculator',
  );
  const [explorerPokemon, setExplorerPokemon] = useState(initialPokemon ?? '');
  const [explorerInput, setExplorerInput] = useState(initialPokemon ?? '');

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
          Breeding Calculator
        </h1>
        <p className="text-sm text-foreground/50 font-medium max-w-lg mx-auto">
          Gen 6+ rules — Destiny Knot, Everstone, Power Items.
          Compatible with Gen 9 Picnic Breeding.
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
                'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-sm text-[10px] font-black uppercase tracking-[0.15em] transition-all',
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
                <p className="text-sm font-bold text-foreground/50">Enter a Pokémon to see its egg moves</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={explorerInput}
                    onChange={e => setExplorerInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && explorerInput && setExplorerPokemon(explorerInput.toLowerCase().trim())}
                    placeholder="e.g. charizard"
                    className="flex-1 px-3 h-10 rounded-sm border border-border/60 bg-background/50 text-sm font-semibold placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                  <button
                    type="button"
                    disabled={!explorerInput.trim()}
                    onClick={() => setExplorerPokemon(explorerInput.toLowerCase().trim())}
                    className="px-4 h-10 rounded-sm text-[11px] font-black uppercase tracking-wider bg-primary text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-all"
                  >
                    Search
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
                  className="text-[10px] font-black uppercase tracking-wider text-foreground/40 hover:text-foreground/70 transition-colors"
                >
                  Change Pokémon
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
