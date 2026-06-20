import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { usePrimeDexStore } from '@primedex/core';
import { darkPalette, lightPalette, type ThemePalette } from './colors';

interface ThemeContextValue {
  palette: ThemePalette;
  /** The user's stored preference: 'light' | 'dark' | 'system'. */
  preference: 'light' | 'dark' | 'system';
  setPreference: (theme: 'light' | 'dark' | 'system') => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Resolves the active palette from the shared store's `theme` preference,
 * falling back to the OS color scheme when set to 'system'. The preference is
 * the same store field the web app persists, so theme choice syncs across
 * platforms for signed-in users.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const preference = usePrimeDexStore((s) => s.theme);
  const setPreference = usePrimeDexStore((s) => s.setTheme);

  const value = useMemo<ThemeContextValue>(() => {
    const resolved =
      preference === 'system' ? (systemScheme ?? 'light') : preference;
    return {
      palette: resolved === 'dark' ? darkPalette : lightPalette,
      preference,
      setPreference,
    };
  }, [preference, systemScheme, setPreference]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within <ThemeProvider>');
  return ctx;
}

/** Convenience hook when only the palette is needed. */
export function usePalette(): ThemePalette {
  return useTheme().palette;
}
