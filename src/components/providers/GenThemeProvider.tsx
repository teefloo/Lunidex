'use client';

import { useEffect } from 'react';
import { usePrimeDexStore } from '@/store/primedex';
import { getThemeForGeneration } from '@/lib/generation-themes';
import type { GenTheme } from '@/lib/generation-themes';

/**
 * Reads the active genTheme from the store and sets the `data-gen` attribute
 * on <html> so that the CSS variable overrides in globals.css apply.
 */
export function GenThemeProvider({ children }: { children: React.ReactNode }) {
  const genTheme = usePrimeDexStore((s) => s.genTheme);
  const _hasHydrated = usePrimeDexStore((s) => s._hasHydrated);

  useEffect(() => {
    if (!_hasHydrated) return;

    const root = document.documentElement;
    if (genTheme === 'default') {
      root.removeAttribute('data-gen');
    } else {
      root.setAttribute('data-gen', genTheme);
    }
  }, [genTheme, _hasHydrated]);

  return <>{children}</>;
}

/**
 * Hook that automatically switches the active gen theme when
 * `autoGenTheme` is enabled. Call it with the generation number
 * from the Pokémon species data (1–9).
 */
export function useAutoGenTheme(pokemonGeneration: number | null | undefined) {
  const autoGenTheme = usePrimeDexStore((s) => s.autoGenTheme);
  const setGenTheme = usePrimeDexStore((s) => s.setGenTheme);

  useEffect(() => {
    if (!autoGenTheme) return;
    if (pokemonGeneration == null) return;

    const theme: GenTheme = getThemeForGeneration(pokemonGeneration);
    setGenTheme(theme);
  }, [autoGenTheme, pokemonGeneration, setGenTheme]);
}
