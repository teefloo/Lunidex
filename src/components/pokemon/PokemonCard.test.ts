// @vitest-environment jsdom
import { act, createElement, Profiler, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

const fixture = vi.hoisted(() => ({
  state: {
    favorites: [] as number[],
    compareList: [] as number[],
    team: [] as number[],
    caughtPokemon: [] as number[],
    animatedSprites: false,
    mounted: false,
    addFavorite: () => undefined,
    removeFavorite: () => undefined,
    addToCompare: () => undefined,
    removeFromCompare: () => undefined,
    addToTeam: () => undefined,
    removeFromTeam: () => undefined,
    toggleCaught: () => undefined,
  },
  listeners: new Set<() => void>(),
  mountedListeners: new Set<() => void>(),
  notify() {
    for (const listener of this.listeners) listener();
  },
  notifyMounted() {
    for (const listener of this.mountedListeners) listener();
  },
}));

vi.mock('@/store/primedex', () => ({
  usePrimeDexStore: (selector: (state: typeof fixture.state) => unknown) => useSyncExternalStore(
    (listener) => {
      fixture.listeners.add(listener);
      return () => fixture.listeners.delete(listener);
    },
    () => selector(fixture.state),
    () => selector(fixture.state),
  ),
}));
vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: undefined, isLoading: false, isError: false, isFetching: false, error: null, refetch: vi.fn() }),
  useQueryClient: () => ({ prefetchQuery: vi.fn() }),
}));
vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => createElement('img', { src, alt }),
}));
vi.mock('next/navigation', () => ({ usePathname: () => '/en/pokedex', useSearchParams: () => new URLSearchParams() }));
vi.mock('@/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/hooks/useMounted', () => ({
  useMounted: () => useSyncExternalStore(
    (listener) => {
      fixture.mountedListeners.add(listener);
      return () => fixture.mountedListeners.delete(listener);
    },
    () => fixture.state.mounted,
    () => false,
  ),
}));
vi.mock('@/hooks/useLocaleHref', () => ({ useClientLanguage: () => 'en', useLocaleHref: () => (path: string) => path }));
vi.mock('@/components/layout/DetailOriginLink', () => ({
  DetailOriginLink: ({ href, returnTarget, ...props }: { href: string; returnTarget: string; [key: string]: unknown }) => {
    void returnTarget;
    return createElement('a', { href, ...props });
  },
}));
vi.mock('@/lib/posthog-client', () => ({ capturePostHogEvent: vi.fn() }));

import { PokemonCard } from './PokemonCard';

afterEach(() => {
  fixture.state.favorites = [];
  fixture.state.compareList = [];
  fixture.state.team = [];
  fixture.state.caughtPokemon = [];
  fixture.state.mounted = false;
  fixture.listeners.clear();
  fixture.mountedListeners.clear();
});

describe('PokemonCard collection subscriptions', () => {
  it('rerenders only when mounted card collection values change', async () => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const renderPhases: string[] = [];
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    try {
      act(() => {
        root.render(createElement(Profiler, {
          id: 'pokemon-card',
          onRender: (_id, phase) => renderPhases.push(phase),
        }, createElement(PokemonCard, {
          name: 'pikachu',
          initialData: {
            pokemon: {
              id: 25,
              name: 'pikachu',
              types: [{ slot: 1, type: { name: 'electric', url: '' } }],
            },
          },
        })));
      });
      expect(renderPhases).toEqual(['mount']);

      await act(async () => {
        fixture.state.favorites = [26];
        fixture.state.compareList = [26];
        fixture.state.team = [26];
        fixture.state.caughtPokemon = [26];
        fixture.notify();
      });

      expect(renderPhases).toEqual(['mount']);

      await act(async () => {
        fixture.state.favorites = [25];
        fixture.state.compareList = [25];
        fixture.state.team = [25];
        fixture.state.caughtPokemon = [25];
        fixture.notify();
      });

      expect(renderPhases).toEqual(['mount']);
      expect(container.querySelector('[aria-label="card.add_favorite"]')).not.toBeNull();
      expect(container.querySelector('[aria-label="card.add_compare"]')).not.toBeNull();
      expect(container.querySelector('[aria-label="card.add_team"]')).not.toBeNull();
      expect(container.querySelector('[aria-label="card.mark_caught"]')).not.toBeNull();

      await act(async () => {
        fixture.state.mounted = true;
        fixture.notifyMounted();
      });

      expect(renderPhases).toEqual(['mount', 'update']);
      expect(container.querySelector('[aria-label="card.remove_favorite"]')).not.toBeNull();
      expect(container.querySelector('[aria-label="card.remove_compare"]')).not.toBeNull();
      expect(container.querySelector('[aria-label="card.remove_team"]')).not.toBeNull();
      expect(container.querySelector('[aria-label="card.caught"]')).not.toBeNull();

      await act(async () => {
        fixture.state.favorites = [25, 26];
        fixture.state.compareList = [25, 26];
        fixture.state.team = [25, 26];
        fixture.state.caughtPokemon = [25, 26];
        fixture.notify();
      });

      expect(renderPhases).toEqual(['mount', 'update']);
      expect(container.querySelector('[aria-label="card.remove_favorite"]')).not.toBeNull();

      await act(async () => {
        fixture.state.favorites = [26];
        fixture.notify();
      });

      expect(renderPhases).toEqual(['mount', 'update', 'update']);
      expect(container.querySelector('[aria-label="card.add_favorite"]')).not.toBeNull();
    } finally {
      act(() => root.unmount());
      container.remove();
    }
  });

  it('keeps membership actions available at their collection limits', async () => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    fixture.state.mounted = true;
    fixture.state.team = [25, 1, 2, 3, 4, 5];
    fixture.state.compareList = [25, 1, 2];
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    try {
      await act(async () => {
        root.render(createElement(PokemonCard, {
          name: 'pikachu',
          initialData: {
            pokemon: {
              id: 25,
              name: 'pikachu',
              types: [{ slot: 1, type: { name: 'electric', url: '' } }],
            },
          },
        }));
      });

      expect((container.querySelector('[aria-label="card.remove_team"]') as HTMLButtonElement).disabled).toBe(false);
      expect((container.querySelector('[aria-label="card.remove_compare"]') as HTMLButtonElement).disabled).toBe(false);

      await act(async () => {
        fixture.state.team = [1, 2, 3, 4, 5, 6];
        fixture.state.compareList = [1, 2, 3];
        fixture.notify();
      });

      expect((container.querySelector('[aria-label="card.add_team"]') as HTMLButtonElement).disabled).toBe(true);
      expect((container.querySelector('[aria-label="card.add_compare"]') as HTMLButtonElement).disabled).toBe(true);
    } finally {
      act(() => root.unmount());
      fixture.state.mounted = false;
      container.remove();
    }
  });
});
