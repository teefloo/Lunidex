'use client';

import { usePrimeDexStore } from '@/store/primedex';
import { GENERATION_THEMES, GEN_THEME_ORDER } from '@/lib/generation-themes';
import type { GenTheme } from '@/lib/generation-themes';
import { Palette } from 'lucide-react';

export function GenThemeSelector() {
  const genTheme = usePrimeDexStore((s) => s.genTheme);
  const setGenTheme = usePrimeDexStore((s) => s.setGenTheme);
  const autoGenTheme = usePrimeDexStore((s) => s.autoGenTheme);
  const setAutoGenTheme = usePrimeDexStore((s) => s.setAutoGenTheme);

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center gap-4 mb-4">
        <div className="p-2.5 rounded-sm text-foreground/70 bg-secondary/30 border border-border/50">
          <Palette className="w-5 h-5" />
        </div>
        <span className="font-bold text-foreground/80">Thème de génération</span>
      </div>

      {/* Theme grid */}
      <div className="glass-card grid grid-cols-2 gap-2 p-2">
        {GEN_THEME_ORDER.map((id: GenTheme) => {
          const theme = GENERATION_THEMES[id];
          const isActive = genTheme === id;

          return (
            <button
              key={id}
              onClick={() => setGenTheme(id)}
              aria-pressed={isActive}
              title={`${theme.name} — ${theme.game}`}
              className={`relative flex items-center gap-2.5 py-2 px-3 rounded-sm text-xs font-bold transition-all duration-200 text-left ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                  : 'text-foreground/60 hover:bg-muted/55 hover:text-foreground/90'
              }`}
            >
              {/* Color swatch */}
              <span
                className="shrink-0 w-4 h-4 rounded-sm border-2 border-black/10"
                style={{ backgroundColor: theme.primaryColor }}
                aria-hidden="true"
              />
              <span className="flex flex-col min-w-0">
                <span className="truncate leading-tight">
                  {id === 'default' ? 'Défaut' : `Gen ${theme.generation} — ${theme.name}`}
                </span>
                <span
                  className={`text-[11px] font-normal truncate leading-tight ${
                    isActive ? 'text-primary-foreground/70' : 'text-foreground/40'
                  }`}
                >
                  {theme.game}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Auto-theme toggle */}
      <div className="glass-card flex items-center justify-between p-4">
        <div className="flex flex-col gap-0.5">
          <span className="font-bold text-foreground/80 text-sm">Thème auto selon le Pokémon</span>
          <span className="text-[11px] text-foreground/40">
            Change automatiquement selon la génération consultée
          </span>
        </div>
        <button
          onClick={() => setAutoGenTheme(!autoGenTheme)}
          className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${
            autoGenTheme ? 'bg-primary' : 'bg-muted/70'
          }`}
          aria-label={
            autoGenTheme
              ? 'Désactiver le thème automatique'
              : 'Activer le thème automatique'
          }
          role="switch"
          aria-checked={autoGenTheme}
        >
          <span
            className={`absolute top-1 w-5 h-5 rounded-full bg-primary-foreground shadow-sm transition-all duration-300 ${
              autoGenTheme ? 'left-8' : 'left-1'
            }`}
          />
        </button>
      </div>
    </div>
  );
}
