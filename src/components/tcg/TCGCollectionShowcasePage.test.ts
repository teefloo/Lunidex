// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ useQuery: vi.fn() }));

vi.mock('@tanstack/react-query', () => ({ useQuery: mocks.useQuery }));
vi.mock('@/hooks/useLocaleHref', () => ({ useClientLanguage: () => 'en' }));
vi.mock('@/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('./TCGCardImage', () => ({ TCGCardImage: () => null }));

import { TCGCollectionShowcasePage } from './TCGCollectionShowcasePage';

describe('TCG collection showcase query', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    mocks.useQuery.mockReturnValue({
      data: null,
      isPending: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.clearAllMocks();
  });

  it('does not poll Supabase while keeping mount and focus refreshes available', async () => {
    await act(async () => {
      root.render(createElement(TCGCollectionShowcasePage, { token: 'share-token' }));
      await Promise.resolve();
    });

    expect(mocks.useQuery).toHaveBeenCalledWith(expect.objectContaining({
      queryKey: ['tcg', 'showcase', 'share-token', 1],
      staleTime: 0,
      refetchOnWindowFocus: true,
      retry: false,
    }));
    expect(mocks.useQuery.mock.calls[0]?.[0]).not.toHaveProperty('refetchInterval');
  });
});
