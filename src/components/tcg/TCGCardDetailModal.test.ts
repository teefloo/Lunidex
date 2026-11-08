// @vitest-environment jsdom
import { act, createElement, type MouseEvent } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/dynamic', () => ({ default: () => () => null }));
vi.mock('@tanstack/react-query', () => ({ useQuery: () => ({ data: null, isFetching: false }) }));
vi.mock('@/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/hooks/useLocaleHref', () => ({ useLocaleHref: () => (path: string) => path, useClientLanguage: () => 'en' }));
vi.mock('@/store/primedex', () => {
  const state = {
    tcgCollections: [], tcgCompareList: [], tcgCollectionCards: {}, tcgBrowseLanguage: 'en', tcgDisplayCurrency: 'EUR',
    tcgCustomCollections: [], tcgCustomCollectionCards: [], tcgOwnedCards: [],
    addTCGCustomCollectionCard: () => false, removeTCGCustomCollectionCard: () => false,
  };
  return { usePrimeDexStore: (selector?: (store: typeof state) => unknown) => selector ? selector(state) : state };
});
vi.mock('./TCGHolographicCard', () => ({
  TCGHolographicCard: ({ card, onClick, actionLabel }: {
    card: { id: string; name: string };
    onClick?: (card: { id: string; name: string }, trigger: HTMLButtonElement) => void;
    actionLabel?: string;
  }) => createElement('button', {
    type: 'button',
    'aria-label': actionLabel ?? 'test-card-image',
    onClick: (event: MouseEvent<HTMLButtonElement>) => onClick?.(card, event.currentTarget),
  }),
}));
vi.mock('./TCGCollectionVariantSheet', () => ({ TCGCollectionVariantSheet: () => null }));
import { TCGCardDetailModal } from './TCGCardDetailModal';

describe('TCG modal first client mount', () => {
  it('focuses the close button after hydration and restores the launcher when closing', async () => {
    vi.stubGlobal('IntersectionObserver', class {
      observe() {}
      disconnect() {}
    });
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const launcher = document.createElement('button'); document.body.append(launcher); launcher.focus();
    const container = document.createElement('div'); document.body.append(container);
    const root = createRoot(container);
    const card = { id: 'base1-1', localId: '1', name: 'Alakazam' };
    try {
      await act(async () => {
        root.render(createElement(TCGCardDetailModal, { card, isOpen: true, onClose: vi.fn() }));
        await new Promise(resolve => setTimeout(resolve, 40));
      });
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 40)); });
      expect(document.activeElement?.getAttribute('aria-label')).toBe('common.close');
      expect(document.body.style.overflow).toBe('hidden');
      await act(async () => { root.render(createElement(TCGCardDetailModal, { card, isOpen: false, onClose: vi.fn() })); });
      expect(document.activeElement).toBe(launcher);
      expect(document.body.style.overflow).toBe('');
    } finally {
      act(() => root.unmount()); container.remove(); launcher.remove(); vi.unstubAllGlobals();
    }
  });

  it('opens the card image viewer and closes it with Escape without closing card details', async () => {
    vi.stubGlobal('IntersectionObserver', class {
      observe() {}
      disconnect() {}
    });
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const onClose = vi.fn();
    const container = document.createElement('div'); document.body.append(container);
    const root = createRoot(container);
    const card = { id: 'base1-1', localId: '1', name: 'Alakazam' };

    try {
      await act(async () => {
        root.render(createElement(TCGCardDetailModal, { card, isOpen: true, onClose }));
        await new Promise(resolve => setTimeout(resolve, 40));
      });
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 40)); });

      const cardImageButton = document.querySelector<HTMLButtonElement>('[aria-label="tcg.view_card_image"]');
      expect(cardImageButton).not.toBeNull();
      await act(async () => { cardImageButton?.click(); });
      const viewer = document.querySelector<HTMLElement>('[data-testid="tcg-card-image-viewer"]');
      expect(viewer).not.toBeNull();
      expect(viewer?.parentElement).toBe(document.body);

      await act(async () => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      });
      expect(document.querySelector('[data-testid="tcg-card-image-viewer"]')).toBeNull();
      expect(onClose).not.toHaveBeenCalled();
    } finally {
      act(() => root.unmount()); container.remove(); vi.unstubAllGlobals();
    }
  });

  it('closes the image viewer immediately through its visible close button', async () => {
    vi.stubGlobal('IntersectionObserver', class {
      observe() {}
      disconnect() {}
    });
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const onClose = vi.fn();
    const container = document.createElement('div'); document.body.append(container);
    const root = createRoot(container);
    const card = { id: 'base1-1', localId: '1', name: 'Alakazam' };

    try {
      await act(async () => {
        root.render(createElement(TCGCardDetailModal, { card, isOpen: true, onClose }));
        await new Promise(resolve => setTimeout(resolve, 40));
      });
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 40)); });

      await act(async () => {
        document.querySelector<HTMLButtonElement>('[aria-label="tcg.view_card_image"]')?.click();
      });
      const viewer = document.querySelector<HTMLElement>('[data-testid="tcg-card-image-viewer"]');
      expect(viewer?.getAttribute('role')).toBe('dialog');
      const closeButton = viewer?.querySelector<HTMLButtonElement>('button[aria-label="common.close"]');
      expect(closeButton).not.toBeNull();

      await act(async () => { closeButton?.click(); });

      expect(document.querySelector('[data-testid="tcg-card-image-viewer"]')).toBeNull();
      expect(document.body.style.overflow).toBe('hidden');
      expect(onClose).not.toHaveBeenCalled();
    } finally {
      act(() => root.unmount()); container.remove(); vi.unstubAllGlobals();
    }
  });
});
