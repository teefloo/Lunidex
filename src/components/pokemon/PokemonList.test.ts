// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

const fixture = vi.hoisted(() => ({
  state: { searchTerm: '', selectedTypes: [], selectedGeneration: null, showFavoritesOnly: false, favorites: [], sortBy: 'id-asc',
    isLegendary: null, isMythical: null, selectedEggGroups: [], selectedColors: [], selectedShapes: [], minBaseStats: 0,
    minAttack: 0, minDefense: 0, minSpeed: 0, minHp: 0, heightRange: [0, 25], weightRange: [0, 1200], showCaughtOnly: 'all', caughtPokemon: [], _hasHydrated: false },
  fetchNextPage: vi.fn(),
}));
vi.mock('@/store/primedex', () => ({ usePrimeDexStore: (selector: (value: typeof fixture.state) => unknown) => selector(fixture.state) }));
vi.mock('@tanstack/react-query', () => ({
  keepPreviousData: (data: unknown) => data,
  useQuery: () => ({ data: undefined, isLoading: false, error: null }),
  useInfiniteQuery: () => ({ data: { pages: [{ results: Array.from({ length: 40 }, (_, index) => ({ name: `pokemon-${index + 1}`, url: `https://pokeapi.co/api/v2/pokemon/${index + 1}/` })) }] },
    fetchNextPage: fixture.fetchNextPage, hasNextPage: true, isFetchingNextPage: false, isLoading: false, error: null, refetch: vi.fn() }),
}));
vi.mock('@/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/hooks/useLocaleHref', () => ({ useClientLanguage: () => 'en' }));
vi.mock('./PokemonCard', () => ({ PokemonCard: ({ name }: { name: string }) => createElement('a', { href: `/pokemon/${name}` }, name), PokemonCardSkeleton: () => null }));
import PokemonList from './PokemonList';

describe('PokemonList pagination hydration', () => {
  it('does not expose an enabled server-rendered load-more control before handlers are ready', () => {
    fixture.state._hasHydrated = false;
    const markup = renderToStaticMarkup(createElement(PokemonList));
    expect(markup).toMatch(/<button[^>]*disabled=""[^>]*aria-label="list.load_more"/);
  });
  it('enables pagination after hydration and preserves the additional cards on rerender', async () => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    fixture.fetchNextPage.mockClear(); fixture.state._hasHydrated = false;
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
});
