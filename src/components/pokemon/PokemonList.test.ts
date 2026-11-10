// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

const fixture = vi.hoisted(() => ({
  state: { searchTerm: '', selectedTypes: [], selectedGeneration: null, showFavoritesOnly: false, favorites: [], sortBy: 'id-asc',
    isLegendary: null, isMythical: null, selectedEggGroups: [], selectedColors: [], selectedShapes: [], minBaseStats: 0,
    minAttack: 0, minDefense: 0, minSpeed: 0, minHp: 0, heightRange: [0, 25], weightRange: [0, 1200], showCaughtOnly: 'all', caughtPokemon: [], _hasHydrated: false },
  infiniteQuery: { data: { pages: [{ results: Array.from({ length: 40 }, (_, index) => ({ name: `pokemon-${index + 1}`, url: `https://pokeapi.co/api/v2/pokemon/${index + 1}/` })) }] } as null | { pages: Array<{ results: Array<{ name: string; url: string }> }> }, hasNextPage: true, isFetchingNextPage: false, isLoading: false, error: null },
  activeSearch: '',
  fetchNextPage: vi.fn(),
}));
vi.mock('@/store/primedex', () => ({ usePrimeDexStore: (selector: (value: typeof fixture.state) => unknown) => selector(fixture.state) }));
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(fixture.activeSearch) }));
vi.mock('@tanstack/react-query', () => ({
  keepPreviousData: (data: unknown) => data,
  useQuery: () => ({ data: undefined, isLoading: false, error: null }),
  useInfiniteQuery: () => ({ ...fixture.infiniteQuery, fetchNextPage: fixture.fetchNextPage, refetch: vi.fn() }),
}));
vi.mock('@/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/hooks/useLocaleHref', () => ({ useClientLanguage: () => 'en' }));
vi.mock('./PokemonCard', () => ({
  PokemonCard: ({ name }: { name: string }) => {
    const id = Number(name.replace('pokemon-', ''));
    return createElement('div', { id: `pokemon-${id}`, tabIndex: -1 }, createElement('a', { href: `/pokemon/${name}` }, name));
  },
  PokemonCardSkeleton: () => null,
}));
import PokemonList from './PokemonList';

describe('PokemonList pagination hydration', () => {
  it('does not expose an enabled server-rendered load-more control before handlers are ready', () => {
    fixture.state._hasHydrated = false;
    fixture.activeSearch = '';
    const markup = renderToStaticMarkup(createElement(PokemonList));
    expect(markup).toMatch(/<button[^>]*disabled=""[^>]*aria-label="list.load_more"/);
  });
  it('enables pagination after hydration and preserves the additional cards on rerender', async () => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    fixture.fetchNextPage.mockClear(); fixture.state._hasHydrated = false;
    fixture.activeSearch = '';
    const container = document.createElement('div'); document.body.append(container); const root = createRoot(container);
    try {
      act(() => { root.render(createElement(PokemonList)); });
      const button = () => container.querySelector<HTMLButtonElement>('[aria-label="list.load_more"]')!;
      expect(button().disabled).toBe(true);
      act(() => button().click()); expect(fixture.fetchNextPage).not.toHaveBeenCalled();
      fixture.state._hasHydrated = true;
      act(() => { root.render(createElement(PokemonList)); });
      expect(button().disabled).toBe(false);
      act(() => button().click()); expect(fixture.fetchNextPage).toHaveBeenCalledTimes(1);
      expect(container.querySelectorAll('.pokemon-grid-item')).toHaveLength(40);
      act(() => { root.render(createElement(PokemonList)); });
      expect(container.querySelectorAll('.pokemon-grid-item')).toHaveLength(40);
    } finally { act(() => root.unmount()); container.remove(); }
  });

  it('restores the requested displayed card count from a detail return context', () => {
    fixture.state._hasHydrated = true;
    fixture.activeSearch = 'returnCount=40';
    const markup = renderToStaticMarkup(createElement(PokemonList, { initialDisplayCount: 40 }));
    expect((markup.match(/class="pokemon-grid-item"/g) ?? []).length).toBe(40);
  });

  it('keeps the requested count until the hydrated infinite pages can supply the target card', async () => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    fixture.state._hasHydrated = true;
    fixture.activeSearch = 'returnCount=40';
    fixture.infiniteQuery.data = null;
    fixture.infiniteQuery.hasNextPage = true;
    fixture.infiniteQuery.isLoading = false;
    fixture.fetchNextPage.mockReset();
    fixture.fetchNextPage.mockImplementation(() => {
      fixture.infiniteQuery.data = {
        pages: [
          { results: Array.from({ length: 20 }, (_, index) => ({ name: `pokemon-${index + 1}`, url: `https://pokeapi.co/api/v2/pokemon/${index + 1}/` })) },
          { results: Array.from({ length: 20 }, (_, index) => ({ name: `pokemon-${index + 21}`, url: `https://pokeapi.co/api/v2/pokemon/${index + 21}/` })) },
        ],
      };
    });
    const container = document.createElement('div'); document.body.append(container); const root = createRoot(container);
    try {
      act(() => { root.render(createElement(PokemonList, { initialDisplayCount: 40 })); });
      expect(container.querySelectorAll('.pokemon-grid-item')).toHaveLength(0);

      fixture.infiniteQuery.data = {
        pages: [{ results: Array.from({ length: 20 }, (_, index) => ({ name: `pokemon-${index + 1}`, url: `https://pokeapi.co/api/v2/pokemon/${index + 1}/` })) }],
      };
      act(() => { root.render(createElement(PokemonList, { initialDisplayCount: 40 })); });
      expect(fixture.fetchNextPage).toHaveBeenCalledTimes(1);

      act(() => { root.render(createElement(PokemonList, { initialDisplayCount: 40 })); });
      expect(container.querySelectorAll('.pokemon-grid-item')).toHaveLength(40);
      expect(container.querySelector('#pokemon-25')).not.toBeNull();
    } finally { act(() => root.unmount()); container.remove(); }
  });

  it('loads beyond the single server-hydrated page before restoring a card below it', () => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    fixture.state._hasHydrated = true;
    fixture.activeSearch = 'returnCount=40';
    fixture.infiniteQuery.data = {
      pages: [{ results: Array.from({ length: 20 }, (_, index) => ({ name: `pokemon-${index + 1}`, url: `https://pokeapi.co/api/v2/pokemon/${index + 1}/` })) }],
    };
    fixture.infiniteQuery.hasNextPage = true;
    fixture.infiniteQuery.isLoading = false;
    fixture.fetchNextPage.mockReset();
    fixture.fetchNextPage.mockImplementation(() => {
      fixture.infiniteQuery.data = {
        pages: [
          { results: Array.from({ length: 20 }, (_, index) => ({ name: `pokemon-${index + 1}`, url: `https://pokeapi.co/api/v2/pokemon/${index + 1}/` })) },
          { results: Array.from({ length: 20 }, (_, index) => ({ name: `pokemon-${index + 21}`, url: `https://pokeapi.co/api/v2/pokemon/${index + 21}/` })) },
        ],
      };
    });
    const container = document.createElement('div'); document.body.append(container); const root = createRoot(container);
    try {
      act(() => { root.render(createElement(PokemonList, { initialDisplayCount: 40 })); });
      expect(fixture.fetchNextPage).toHaveBeenCalledTimes(1);

      act(() => { root.render(createElement(PokemonList, { initialDisplayCount: 40 })); });
      expect(container.querySelectorAll('.pokemon-grid-item')).toHaveLength(40);
      expect(container.querySelector('#pokemon-25')).not.toBeNull();
    } finally { act(() => root.unmount()); container.remove(); }
  });

  it('synchronizes the display count from the active URL when the server prop is stale', () => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    fixture.state._hasHydrated = true;
    fixture.activeSearch = '';
    fixture.infiniteQuery.data = {
      pages: [{ results: Array.from({ length: 40 }, (_, index) => ({ name: `pokemon-${index + 1}`, url: `https://pokeapi.co/api/v2/pokemon/${index + 1}/` })) }],
    };
    fixture.infiniteQuery.hasNextPage = true;
    fixture.infiniteQuery.isLoading = false;
    const container = document.createElement('div'); document.body.append(container); const root = createRoot(container);
    try {
      act(() => { root.render(createElement(PokemonList, { initialDisplayCount: 20 })); });
      expect(container.querySelectorAll('.pokemon-grid-item')).toHaveLength(20);

      // The browser returns to an entry whose URL was replaced with
      // `returnCount=40`, while the reused RSC prop remains 20.
      fixture.activeSearch = 'returnCount=40';
      act(() => { root.render(createElement(PokemonList, { initialDisplayCount: 20 })); });
      expect(container.querySelectorAll('.pokemon-grid-item')).toHaveLength(40);
      expect(container.querySelector('#pokemon-25')).not.toBeNull();
    } finally { act(() => root.unmount()); container.remove(); }
  });
});
