// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/dynamic', () => ({ default: () => () => null }));
vi.mock('@tanstack/react-query', () => ({ useQuery: () => ({ data: null, isFetching: false }) }));
vi.mock('@/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/hooks/useLocaleHref', () => ({ useLocaleHref: () => (path: string) => path, useClientLanguage: () => 'en' }));
vi.mock('@/store/primedex', () => ({ usePrimeDexStore: () => ({ tcgCollections: [], tcgCompareList: [], tcgCollectionCards: {}, tcgBrowseLanguage: 'en', tcgDisplayCurrency: 'EUR' }) }));
vi.mock('./TCGHolographicCard', () => ({ TCGHolographicCard: () => null }));
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
});
