'use client';

import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import { getFormDisplayName } from '@/lib/form-names';
import type { GraphQLPokemonSearchIndex } from '@/types/pokemon';
import type { SupportedLanguage } from '@/lib/languages';

type HeaderSearchPokemon = GraphQLPokemonSearchIndex;

interface HeaderSearchProps {
  allPokemon?: HeaderSearchPokemon[];
  compact?: boolean;
  isVisible: boolean;
  isSearchFocused: boolean;
  localSearch: string;
  prefetchPokemonSearchIndex: () => void;
  resolvedLang: SupportedLanguage;
  searchAriaLabel: string;
  searchPlaceholder: string;
  setIsSearchFocused: (value: boolean) => void;
  setLocalSearch: (value: string) => void;
  setSearchTerm: (value: string) => void;
  router: {
    push: (href: string) => void;
  };
}

const SEARCH_LISTBOX_ID = 'header-search-listbox';

export function HeaderSearch({
  allPokemon,
  compact = false,
  isVisible,
  isSearchFocused,
  localSearch,
  prefetchPokemonSearchIndex,
  resolvedLang,
  searchAriaLabel,
  searchPlaceholder,
  setIsSearchFocused,
  setLocalSearch,
  setSearchTerm,
  router,
}: HeaderSearchProps) {
  const [activeIndex, setActiveIndex] = useState(-1);

  const searchResults = useMemo(() => {
    if (!localSearch || !allPokemon) return [];
    const searchLower = localSearch.toLowerCase();

    return allPokemon
      .filter((pokemon) => {
        const speciesNames = pokemon.pokemon_v2_pokemonspecy?.pokemon_v2_pokemonspeciesnames || [];
        const localized = speciesNames.find((speciesName) => speciesName.pokemon_v2_language?.name === resolvedLang);
        const name = (localized?.name || pokemon.name).toLowerCase();
        return name.includes(searchLower) || pokemon.name.includes(searchLower);
      })
      .slice(0, 5);
  }, [allPokemon, localSearch, resolvedLang]);

  const selectPokemon = (pokemon: HeaderSearchPokemon) => {
    router.push(`/pokemon/${pokemon.name}`);
    setLocalSearch('');
    setSearchTerm('');
    setIsSearchFocused(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!searchResults.length) {
      if (event.key === 'Escape') {
        setIsSearchFocused(false);
      }
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setIsSearchFocused(true);
      setActiveIndex((current) => (current + 1) % searchResults.length);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setIsSearchFocused(true);
      setActiveIndex((current) => (current <= 0 ? searchResults.length - 1 : current - 1));
      return;
    }

    if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      const activePokemon = searchResults[activeIndex];
      if (activePokemon) {
        selectPokemon(activePokemon);
      }
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      setIsSearchFocused(false);
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={cn(
        'hidden md:flex flex-none flex-col relative group',
        compact ? 'w-[clamp(180px,14vw,260px)]' : 'w-[clamp(240px,20vw,360px)]'
      )}
    >
      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40 transition-colors duration-300 group-hover:text-primary" />
        <input
          id="header-search"
          type="text"
          placeholder={searchPlaceholder}
          value={localSearch || ''}
          onChange={(event) => {
            setLocalSearch(event.target.value);
            prefetchPokemonSearchIndex();
            setActiveIndex(0);
          }}
          onFocus={() => {
            setIsSearchFocused(true);
            prefetchPokemonSearchIndex();
            setActiveIndex(0);
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
          aria-label={searchAriaLabel}
          aria-autocomplete="list"
          aria-controls={isSearchFocused && localSearch && searchResults.length > 0 ? SEARCH_LISTBOX_ID : undefined}
          aria-expanded={Boolean(isSearchFocused && localSearch && searchResults.length > 0)}
          aria-activedescendant={
            isSearchFocused && localSearch && activeIndex >= 0 && searchResults[activeIndex]
              ? `${SEARCH_LISTBOX_ID}-option-${activeIndex}`
              : undefined
          }
          role="combobox"
          className="w-full min-w-0 rounded-full border border-border/60 bg-card/60 py-2 pl-9 pr-4 text-left text-[11px] font-semibold text-foreground shadow-[0_10px_24px_-24px_rgba(24,36,54,0.28)]  transition-all duration-300 placeholder:text-foreground/35 focus:border-primary/35 focus:bg-card/80 focus:outline-none focus:ring-2 focus:ring-primary/20 sm:text-xs"
        />
      </div>

      <AnimatePresence>
        {isSearchFocused && localSearch && searchResults.length > 0 && (
          <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="glass-surface absolute left-0 top-full z-50 mt-2 w-64 !overflow-hidden rounded-sm p-2"
        >
            <div id={SEARCH_LISTBOX_ID} role="listbox" aria-label={searchPlaceholder} className="flex flex-col gap-1">
              {searchResults.map((pokemon, index) => {
                const speciesNames = pokemon.pokemon_v2_pokemonspecy?.pokemon_v2_pokemonspeciesnames || [];
                const localized = speciesNames.find((speciesName) => speciesName.pokemon_v2_language?.name === resolvedLang);
                const baseLocalizedName = localized?.name || pokemon.name;
                const displayName = pokemon.name.includes('-')
                  ? getFormDisplayName(pokemon.name, baseLocalizedName, resolvedLang)
                  : baseLocalizedName;
                const isActive = index === activeIndex;

                return (
                  <button
                    key={pokemon.name}
                    id={`${SEARCH_LISTBOX_ID}-option-${index}`}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => selectPokemon(pokemon)}
                  className={cn(
                      'group/item flex w-full cursor-pointer items-center gap-3 rounded-sm p-2.5 text-left transition-colors',
                      isActive ? 'bg-muted/80 ring-1 ring-primary/30' : 'hover:bg-muted/70'
                    )}
                  >
                    <div className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-border/50 bg-muted/45 p-1">
                      <Image
                        src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`}
                        alt={displayName}
                        width={32}
                        height={32}
                        className="object-contain drop-shadow-md group-hover/item:scale-110 transition-transform"
                        unoptimized
                      />
                    </div>
                    <span className="text-xs font-black capitalize flex-1 truncate text-foreground/80 group-hover/item:text-primary">
                      {displayName}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
