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
  const searchTerm = usePrimeDexStore(s => s.searchTerm);
  const setSearchTerm = usePrimeDexStore(s => s.setSearchTerm);
  const [localSearch, setLocalSearch] = useState('');
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

  const prevSearchTermRef = useRef(searchTerm);

  useEffect(() => {
    if (prevSearchTermRef.current !== searchTerm) {
      prevSearchTermRef.current = searchTerm;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Valid pattern: sync local state from external store
      setLocalSearch(searchTerm);
    }
  }, [searchTerm]);

  useEffect(() => {
    if (localSearch === searchTerm) return;
    const timer = setTimeout(() => {
      setSearchTerm(localSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, searchTerm, setSearchTerm]);

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
      className="relative my-4 md:my-6 flex w-full items-center group"
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
          className="absolute right-6 z-10 rounded-sm p-3 text-foreground/60 transition-all duration-100 hover:bg-primary/10 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={clearLabel}
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
