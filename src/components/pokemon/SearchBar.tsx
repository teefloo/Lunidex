'use client';

import { usePrimeDexStore } from '@/store/primedex';
import { Search, X } from 'lucide-react';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/lib/i18n';
import { useQueryClient } from '@tanstack/react-query';
import { pokemonKeys } from '@/lib/api/keys';
import { getAllPokemonSearchIndex } from '@/lib/api';
import { useMounted } from '@/hooks/useMounted';

export default function SearchBar() {
  const { searchTerm, setSearchTerm } = usePrimeDexStore();
  const [localSearch, setLocalSearch] = useState(searchTerm);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();
  const mounted = useMounted();
  const queryClient = useQueryClient();
  const searchPlaceholder = mounted ? t('search.placeholder') : 'Search Pokémon (name or id)...';
  const searchAriaLabel = mounted ? t('search.placeholder') : 'Search Pokémon (name or id)...';
  const clearLabel = mounted ? t('search.clear') : 'Clear search';

  const prefetchIndex = useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: pokemonKeys.allSearchIndex(),
      queryFn: () => getAllPokemonSearchIndex(),
      staleTime: 24 * 60 * 60 * 1000,
    });
  }, [queryClient]);

  useEffect(() => {
    setLocalSearch(searchTerm);
  }, [searchTerm]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(localSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, setSearchTerm]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || e.key === '/') {
        if (document.activeElement !== inputRef.current) {
          e.preventDefault();
          inputRef.current?.focus();
        } else if (e.key === 'k') {
          // If already in input, still prevent default browser action for Cmd+K / Ctrl+K
          e.preventDefault();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div
      className="relative mx-auto my-6 flex w-full max-w-2xl items-center px-4 group"
    >
      <div className="relative w-full">
        <div className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 transition-colors duration-300">
          <Search className={`w-5 h-5 transition-colors duration-300 ${isFocused ? 'text-primary' : 'text-foreground/60'}`} />
        </div>

        <Input
          ref={inputRef}
          type="text"
          placeholder={searchPlaceholder}
          value={localSearch}
          onFocus={() => { setIsFocused(true); prefetchIndex(); }}
          onBlur={() => setIsFocused(false)}
          onChange={(e) => {
            setLocalSearch(e.target.value);
            prefetchIndex();
          }}
          className="glass-control w-full py-6 pl-12 pr-12 text-base font-medium text-foreground placeholder:text-foreground/60 focus-visible:border-primary/30 focus-visible:ring-2 focus-visible:ring-primary/30 md:text-lg"
          aria-label={searchAriaLabel}
          id="pokemon-search"
        />
      </div>

      {localSearch && (
        <button
          type="button"
          onClick={() => {
            setLocalSearch('');
            setSearchTerm('');
          }}
          className="absolute right-6 z-10 rounded-full p-2 text-foreground/60 transition-all duration-300 hover:bg-primary/10 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={clearLabel}
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
