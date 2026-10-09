// @vitest-environment jsdom

import { act, createElement, type AnchorHTMLAttributes } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TCGSetAlbumData } from '@/types/tcg';

const mocks = vi.hoisted(() => ({
  auth: { enabled: true, loading: false, user: null as null | { id: string } },
  track: vi.fn().mockResolvedValue(true),
  queryEnabled: [] as boolean[],
  queryRetry: [] as (boolean | undefined)[],
  queryError: false,
  album: null as TCGSetAlbumData | null,
  consent: { productMeasurement: 'granted' },
  search: '',
}));

vi.mock('@/lib/neon/AuthProvider', () => ({ useAuth: () => mocks.auth }));
vi.mock('@/hooks/useMounted', () => ({ useMounted: () => true }));
vi.mock('@/hooks/useLocaleHref', () => ({ useClientLanguage: () => 'en', useLocaleHref: () => (path: string) => `/en${path}` }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }), usePathname: () => '/en/tcg/start', useSearchParams: () => new URLSearchParams(mocks.search) }));
vi.mock('next/link', () => ({ default: ({ children, href, className }: AnchorHTMLAttributes<HTMLAnchorElement>) => createElement('a', { href, className }, children) }));
vi.mock('next/dynamic', () => ({ default: () => ({ initialMode, onOpenChange }: { initialMode?: string; onOpenChange?: (open: boolean) => void }) => initialMode ? createElement('div', { role: 'dialog', 'data-mode': initialMode }, createElement('button', { onClick: () => onOpenChange?.(false) }, 'Close signup')) : null }));
vi.mock('@tanstack/react-query', () => ({ useQuery: (options: { queryKey: string[]; enabled?: boolean; retry?: boolean }) => {
  mocks.queryEnabled.push(Boolean(options.enabled));
  mocks.queryRetry.push(options.retry);
  const isAlbumQuery = options.queryKey.includes('collection-set-album-v2');
  const isError = isAlbumQuery && mocks.queryError;
  return { data: isError ? null : isAlbumQuery ? mocks.album : options.queryKey.includes('activation-sets') ? [mocks.album?.set] : null, isPending: false, isLoading: false, isError, isFetching: false };
} }));
vi.mock('@/lib/i18n', async () => {
  const { createInstance } = await import('i18next');
  const { default: en } = await import('@/lib/i18n/en');
  const instance = createInstance();
  await instance.init({ lng: 'en', resources: { en }, interpolation: { escapeValue: false } });
  return { useTranslation: () => ({ t: instance.t.bind(instance) }) };
});
vi.mock('@/lib/product-measurement', () => ({
  getProductConsent: () => mocks.consent, getServerProductConsent: () => mocks.consent,
  subscribeProductConsent: () => () => {}, setProductTrackingIdentity: vi.fn(),
  trackProductEvent: mocks.track, trackReturnAfterActivation: vi.fn(), trackTcgStartOpened: vi.fn(),
}));
vi.mock('@/lib/toast', () => ({ toast: { success: vi.fn() } }));
vi.mock('@/components/layout/Header', () => ({ default: () => null }));
vi.mock('@/components/auth/SyncRequiredPanel', () => ({ SyncRequiredPanel: () => createElement('p', null, 'Account required') }));
vi.mock('@/components/auth/SyncStatusPanel', () => ({ SyncStatusPanel: ({ status }: { status: string }) => createElement('p', null, `Sync ${status}`) }));
vi.mock('./TCGCardImage', () => ({ TCGCardImage: () => null }));
vi.mock('./TCGImageWithFallback', () => ({ TCGImageWithFallback: () => null }));
vi.mock('./TCGHolographicCard', () => ({ TCGHolographicCard: () => null }));
vi.mock('./TCGCollectionLanguageDialog', () => ({ TCGCollectionLanguageDialog: () => null }));
vi.mock('./TCGLanguageSelector', () => ({ TCGLanguageSelector: () => null }));
vi.mock('./TCGPageTabs', () => ({ TCGPageTabs: () => null }));
vi.mock('./TCGCollectionVariantSheet', () => ({ TCGCollectionVariantSheet: () => null }));

import { TCGSetAlbumPage } from '@/app/tcg/collection/[language]/TCGSetAlbumPage';
import { TCGStartPage } from '@/app/tcg/start/TCGStartPage';
import { TCGCollectionPage } from '@/app/tcg/collection/TCGCollectionPage';
import { usePrimeDexStore } from '@/store/primedex';
import { onSyncAccessRequired, setSyncAccessStatus } from '@/store/sync-access';
import { encodeTCGCollectionKey } from '@/lib/tcg-collections';

function album(setId = 'base1'): TCGSetAlbumData {
  return { set: { id: setId, name: 'Base Set', totalCards: 2 }, dataLanguage: 'en', cards: [
    { id: `${setId}-1`, localId: '1', name: 'Alakazam', rarity: 'Rare' },
    { id: `${setId}-2`, localId: '2', name: 'Bulbasaur', rarity: 'Common' },
  ] };
}

describe('TCG demo and account boundaries', () => {
  let container: HTMLDivElement;
  let root: Root;
  const render = async (setId = 'base1', language = 'en', attribution?: { source?: string; campaign?: string }) => act(async () => root.render(createElement(TCGSetAlbumPage, { setId, language, activation: true, ...attribution })));
  const click = async (button: Element | null | undefined) => {
    expect(button).toBeInstanceOf(HTMLButtonElement);
    await act(async () => (button as HTMLButtonElement).click());
  };
  const cardButton = (name: string, owned = false) => container.querySelector(`[aria-label="Demo: mark ${name} as ${owned ? 'missing' : 'owned'}"]`);
  const progress = () => container.querySelector('[aria-atomic="true"]')?.textContent;

  beforeEach(() => {
    vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} });
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    vi.clearAllMocks(); mocks.auth.user = null; mocks.auth.loading = false; mocks.auth.enabled = true;
    mocks.queryEnabled = []; mocks.queryRetry = []; mocks.queryError = false; mocks.album = album(); mocks.search = '';
    usePrimeDexStore.setState({ _hasHydrated: true, tcgBrowseLanguage: 'en', tcgCollections: [], tcgCollectionCards: [], tcgActiveCollections: [], tcgLegacyOwnedCards: [], tcgOwnedCards: [] });
    setSyncAccessStatus('unauthenticated');
    container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  });
  afterEach(() => { act(() => root.unmount()); container.remove(); setSyncAccessStatus('checking'); vi.unstubAllGlobals(); });

  it('opens a real set, toggles cards and filters missing cards without a store write or signup prompt', async () => {
    const writes = vi.fn(); const unsubscribe = usePrimeDexStore.subscribe(writes);
    const prompt = vi.fn(); const stopPrompt = onSyncAccessRequired(prompt);
    try {
      await render();
      expect(progress()).toBe('Owned 0 / 2 · Progress 0%');
      await click(cardButton('Alakazam'));
      expect(progress()).toBe('Owned 1 / 2 · Progress 50%');
      expect(cardButton('Alakazam', true)?.getAttribute('aria-pressed')).toBe('true');
      await click(Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.includes('Missing')));
      expect(cardButton('Alakazam', true)).toBeNull();
      await click(cardButton('Bulbasaur'));
      expect(progress()).toBe('Owned 2 / 2 · Progress 100%');
      expect(writes).not.toHaveBeenCalled(); expect(prompt).not.toHaveBeenCalled();
      expect(document.querySelector('[role="dialog"]')).toBeNull();
      expect(mocks.track.mock.calls.filter(([event]) => event === 'tcg_demo_first_interaction')).toHaveLength(1);
      expect(mocks.track.mock.calls.some(([event]) => event === 'tcg_first_value_reached' || event === 'tcg_activation_completed')).toBe(false);
    } finally { unsubscribe(); stopPrompt(); }
  });

  it('shares temporary ownership with the detail dialog and can mark a card missing there', async () => {
    await render(); await click(cardButton('Alakazam'));
    await click(container.querySelector('article button:last-of-type'));
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    await click(document.querySelector('[role="dialog"] [aria-label="Demo: mark Alakazam as missing"]'));
    expect(progress()).toBe('Owned 0 / 2 · Progress 0%');
    expect(usePrimeDexStore.getState().tcgCollectionCards).toEqual([]);
    await click(document.querySelector('[role="dialog"] [aria-label="Close"]'));
  });

  it('resets on set/language changes and a fresh mount after refresh', async () => {
    await render(); await click(cardButton('Alakazam'));
    mocks.album = album('base2'); await render('base2'); expect(progress()).toContain('Owned 0 / 2');
    mocks.album = album(); await render(); expect(progress()).toContain('Owned 0 / 2');
    await click(cardButton('Alakazam')); await render('base1', 'fr'); expect(progress()).toContain('Owned 0 / 2');
    await click(cardButton('Alakazam'));
    act(() => root.unmount()); root = createRoot(container); await render('base1', 'fr');
    expect(progress()).toContain('Owned 0 / 2');
  });

  it('opens signup only through the CTA and keeps the demo if the dialog is dismissed', async () => {
    await render(); await click(cardButton('Alakazam'));
    await click(Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Create an account to save my progress'));
    expect(container.querySelector('[role="dialog"]')?.getAttribute('data-mode')).toBe('signup');
    expect(progress()).toContain('Owned 1 / 2');
    expect(mocks.track).toHaveBeenCalledWith('tcg_demo_signup_clicked', undefined, undefined, { set_id: 'base1', tcg_language: 'en' });
    await click(container.querySelector('[role="dialog"] button'));
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(progress()).toContain('Owned 1 / 2');
  });

  it('discards the demo on login and preserves existing quantities before allowing real collection edits', async () => {
    setSyncAccessStatus('ready');
    const key = encodeTCGCollectionKey('en', 'base1')!;
    usePrimeDexStore.getState().setTCGCollectionVariantQuantity(key, 'base1-1', 'reverse', 3);
    const original = [...usePrimeDexStore.getState().tcgCollectionCards];
    setSyncAccessStatus('unauthenticated');
    await render(); expect(progress()).toContain('Owned 0 / 2'); await click(cardButton('Bulbasaur'));
    mocks.auth.user = { id: 'account-a' }; setSyncAccessStatus('loading'); await render();
    expect(container.textContent).toContain('Sync loading'); expect(container.textContent).not.toContain('Demo checklist');
    setSyncAccessStatus('ready'); await render();
    expect(container.textContent).toContain('Demo changes were discarded');
    expect(container.textContent).toContain('1/2');
    expect(usePrimeDexStore.getState().tcgCollectionCards).toEqual(original);
    await click(container.querySelector('[aria-label="Add Bulbasaur to my collection"]'));
    expect(usePrimeDexStore.getState().isTCGCollectionCardOwned(key, 'base1-2')).toBe(true);
    expect(usePrimeDexStore.getState().tcgCollectionCards).toEqual(expect.arrayContaining(original));
    expect(container.textContent).not.toContain('Demo checklist');
    mocks.auth.user = null; setSyncAccessStatus('unauthenticated'); await render();
    expect(progress()).toContain('Owned 0 / 2');
  });

  it('retains the authenticated unavailable state instead of showing a demo', async () => {
    mocks.auth.user = { id: 'account-a' }; setSyncAccessStatus('unavailable'); await render();
    expect(container.textContent).toContain('Sync unavailable'); expect(progress()).toBeUndefined();
    expect(mocks.queryEnabled.at(-1)).toBe(false);
  });

  it('keeps the cold anonymous demo interactive while session verification is pending', async () => {
    mocks.auth.loading = true;
    setSyncAccessStatus('ready');
    const collectionKey = encodeTCGCollectionKey('en', 'base1')!;
    usePrimeDexStore.getState().setTCGCollectionVariantQuantity(collectionKey, 'base1-1', 'reverse', 3);
    const storedBefore = [...usePrimeDexStore.getState().tcgCollectionCards];
    setSyncAccessStatus('checking');
    const storeWrite = vi.fn();
    const unsubscribe = usePrimeDexStore.subscribe(storeWrite);
    try {
      await render();
      expect(cardButton('Alakazam')).not.toBeNull();
      expect(progress()).toBe('Owned 0 / 2 · Progress 0%');
      expect(mocks.queryEnabled.at(-1)).toBe(true);
      await click(cardButton('Alakazam'));
      expect(progress()).toBe('Owned 1 / 2 · Progress 50%');
      expect(usePrimeDexStore.getState().tcgCollectionCards).toEqual(storedBefore);
      expect(storeWrite).not.toHaveBeenCalled();
      expect(mocks.auth.loading).toBe(true);

      mocks.auth.user = { id: 'account-a' };
      mocks.auth.loading = false;
      setSyncAccessStatus('ready');
      await render();
      expect(cardButton('Alakazam')).toBeNull();
      expect(container.querySelector('[aria-atomic="true"]')).toBeNull();
      expect(usePrimeDexStore.getState().isTCGCollectionCardOwned(collectionKey, 'base1-1')).toBe(true);
      expect(usePrimeDexStore.getState().tcgCollectionCards).toEqual(storedBefore);
    } finally { unsubscribe(); }
  });

  it('keeps campaign attribution when a visitor selects a set and returns from its album', async () => {
    const campaign = 'reddit-spd-20261011-lunidex';
    mocks.search = `source=campaign&campaign=${campaign}`;
    await act(async () => root.render(createElement(TCGStartPage)));

    const setLink = container.querySelector<HTMLAnchorElement>('a[href*="/tcg/collection/en/base1"]');
    expect(setLink).not.toBeNull();
    const albumUrl = new URL(setLink!.href, 'https://lunidex.app');
    expect(albumUrl.searchParams.get('source')).toBe('campaign');
    expect(albumUrl.searchParams.get('campaign')).toBe(campaign);

    mocks.search = albumUrl.searchParams.toString();
    await render('base1', 'en', { source: 'campaign', campaign });
    const startLinks = [...container.querySelectorAll<HTMLAnchorElement>('a[href*="/tcg/start?"]')];
    expect(startLinks.length).toBeGreaterThan(0);
    for (const link of startLinks) {
      const startUrl = new URL(link.href, 'https://lunidex.app');
      expect(startUrl.searchParams.get('source')).toBe('campaign');
      expect(startUrl.searchParams.get('campaign')).toBe(campaign);
    }
  });

  it('does not expose the demo when an authenticated account is being verified', async () => {
    mocks.auth.user = { id: 'account-a' };
    mocks.auth.loading = true;
    setSyncAccessStatus('loading');
    await render();

    expect(cardButton('Alakazam')).toBeNull();
    expect(container.textContent).not.toContain('Demo checklist');
    expect(mocks.queryEnabled.at(-1)).toBe(false);
  });

  it('shows a retryable album error instead of leaving an API failure on a loader', async () => {
    mocks.queryError = true;
    await render();

    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Unable to load');
    expect(container.querySelector('[aria-busy="true"]')).toBeNull();
    expect(mocks.queryRetry.at(-1)).toBe(false);
  });

  it('allows the public set selector and demo when account creation is not configured', async () => {
    mocks.auth.enabled = false;
    await act(async () => root.render(createElement(TCGStartPage)));
    expect(container.textContent).toContain('Try a real set checklist');
    expect(container.querySelector('a[href="/en/tcg/collection/en/base1?activation=1"]')).not.toBeNull();
    expect(mocks.queryEnabled.at(-1)).toBe(true);
    await render(); await click(cardButton('Alakazam'));
    expect(progress()).toContain('Owned 1 / 2');
    expect(container.querySelector<HTMLButtonElement>('button:disabled')?.textContent).toBe('Create an account to save my progress');
  });

  it('offers a demo from the collection gate while keeping personal collections behind authentication', async () => {
    await act(async () => root.render(createElement(TCGCollectionPage)));
    expect(container.textContent).toContain('Account required');
    expect(container.querySelector('a[href="/en/tcg/start?tcgLang=en"]')).not.toBeNull();
    expect(mocks.queryEnabled.at(-1)).toBe(false);
  });
});
