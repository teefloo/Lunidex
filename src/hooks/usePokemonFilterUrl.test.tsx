import { renderHook } from '@testing-library/react';
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

const push = vi.fn();
const replace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: (): AppRouterInstance => ({
    push,
    replace,
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
    refresh: vi.fn(),
  }) as AppRouterInstance,
  usePathname: () => '/en/pokedex',
}));

import { usePokemonFilterUrl } from './usePokemonFilterUrl';
import { usePrimeDexStore } from '@/store/primedex';
import { setSyncAccessStatus } from '@/store/sync-access';

const initialState = usePrimeDexStore.getInitialState();

function navigate(search: string): void {
  window.history.replaceState(null, '', `${window.location.pathname}${search}`);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

describe('usePokemonFilterUrl', () => {
  afterEach(() => {
    usePrimeDexStore.setState(initialState, true);
    setSyncAccessStatus('checking');
    push.mockClear();
    replace.mockClear();
  });

  function renderFilterHook(): void {
    usePrimeDexStore.setState({ _hasHydrated: true });
    renderHook(() => usePokemonFilterUrl());
  }

  it('applies shared filter URLs into the store without sync access', () => {
    setSyncAccessStatus('unauthenticated');
    window.history.replaceState(null, '', '/en/pokedex?types=fire&sort=name-asc');

    renderFilterHook();

    expect(usePrimeDexStore.getState().selectedTypes).toEqual(['fire']);
    expect(usePrimeDexStore.getState().sortBy).toBe('name-asc');
  });

  it('restores the previous filters on browser Back instead of rewriting the URL', async () => {
    setSyncAccessStatus('unauthenticated');
    window.history.replaceState(null, '', '/en/pokedex?types=fire');

    renderFilterHook();
    expect(usePrimeDexStore.getState().selectedTypes).toEqual(['fire']);

    await act(async () => {
      navigate('?types=water');
    });
    expect(usePrimeDexStore.getState().selectedTypes).toEqual(['water']);
    expect(push).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();

    // Going back to a filter-less URL resets the store-owned filter too.
    await act(async () => {
      navigate('');
    });
    expect(usePrimeDexStore.getState().selectedTypes).toEqual([]);
    expect(push).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });
});
