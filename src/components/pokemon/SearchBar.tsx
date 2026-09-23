'use client';

import { usePrimeDexStore } from '@/store/primedex';
import { Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/lib/i18n';
import { capturePostHogEvent } from '@/lib/posthog-client';
import { POSTHOG_EVENTS } from '@/lib/posthog-events';
import { getPokemonSearchFromUrl, shouldCommitPokemonSearch } from '@/lib/pokemon-filter-utils';
import { shouldFocusPokedexSearchOnSlash } from '@/lib/focus-management';

export default function SearchBar() {
  const searchTerm = usePrimeDexStore(s => s.searchTerm);
  const setSearchTerm = usePrimeDexStore(s => s.setSearchTerm);
  const [localSearch, setLocalSearch] = useState(searchTerm);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingUserSearchRef = useRef<string | null>(null);
  const pendingSearchTimerRef = useRef<number | null>(null);
  const { t } = useTranslation();
  const searchPlaceholder = t('search.placeholder');
  const searchAriaLabel = t('search.placeholder');
  const clearLabel = t('search.clear');

  useEffect(() => {
    if (pendingUserSearchRef.current !== null) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Sync the input with URL-driven store changes.
    setLocalSearch(searchTerm);
  }, [searchTerm]);

  useEffect(() => {
    if (!shouldCommitPokemonSearch(localSearch, pendingUserSearchRef.current)) return;
    const nextSearch = localSearch;
    const timer = window.setTimeout(() => {
      pendingSearchTimerRef.current = null;
      if (!shouldCommitPokemonSearch(nextSearch, pendingUserSearchRef.current)) return;
      pendingUserSearchRef.current = null;
      setSearchTerm(nextSearch);
      const length = nextSearch.trim().length;
      capturePostHogEvent(POSTHOG_EVENTS.pokemonSearchSubmitted, {
        query_length_bucket: length === 0 ? 'empty' : length <= 3 ? '1_3' : length <= 8 ? '4_8' : '9_plus',
      });
    }, 300);
    pendingSearchTimerRef.current = timer;
    return () => {
      window.clearTimeout(timer);
      if (pendingSearchTimerRef.current === timer) pendingSearchTimerRef.current = null;
    };
  }, [localSearch, setSearchTerm]);

  useEffect(() => {
    const syncSearchFromHistory = () => {
      if (pendingSearchTimerRef.current !== null) {
        window.clearTimeout(pendingSearchTimerRef.current);
        pendingSearchTimerRef.current = null;
      }
      pendingUserSearchRef.current = null;
      setLocalSearch(getPokemonSearchFromUrl(window.location.search));
    };

    window.addEventListener('popstate', syncSearchFromHistory);
    return () => window.removeEventListener('popstate', syncSearchFromHistory);
  }, []);

  useEffect(() => {
    // "/" focuses this input; Cmd/Ctrl+K belongs exclusively to the global
    // command palette handled in AppContent, which would otherwise fight for
    // focus with this field on /pokedex.
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== '/') return;

      const target = e.target;
      const targetIsEditable = target instanceof HTMLElement && (
        target.isContentEditable
        || target.matches('input, textarea, select, [role="textbox"], [contenteditable="true"]')
      );

      if (shouldFocusPokedexSearchOnSlash({
        searchIsFocused: document.activeElement === inputRef.current,
        targetIsEditable,
      })) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div
      className="pokedex-searchbar relative flex w-full items-center group"
    >
      <div className="relative w-full">
        <div className="pokedex-searchbar__icon pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 transition-colors duration-300">
          <Search className={`w-5 h-5 transition-colors duration-300 ${isFocused ? 'text-foreground' : 'text-muted-foreground'}`} />
        </div>

        <Input
          ref={inputRef}
          type="text"
          placeholder={searchPlaceholder}
          name="pokemon-search"
          autoComplete="off"
          spellCheck={false}
          value={localSearch}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onChange={(e) => {
            const nextSearch = e.target.value;
            pendingUserSearchRef.current = nextSearch;
            setLocalSearch(nextSearch);
          }}
          className="pokedex-search-input glass-control w-full py-6 pl-12 pr-12 text-base font-medium text-foreground placeholder:text-muted-foreground focus-visible:border-primary/30 focus-visible:ring-2 focus-visible:ring-primary/30 md:text-lg"
          aria-label={searchAriaLabel}
          id="pokemon-search"
        />
      </div>

      {localSearch && (
        <button
          type="button"
          onClick={() => {
            if (pendingSearchTimerRef.current !== null) {
              window.clearTimeout(pendingSearchTimerRef.current);
              pendingSearchTimerRef.current = null;
            }
            pendingUserSearchRef.current = null;
            setLocalSearch('');
            setSearchTerm('');
          }}
          className="pokedex-search-clear absolute right-6 z-10 rounded-sm p-3 text-muted-foreground transition-all duration-100 hover:bg-primary/10 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={clearLabel}
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
