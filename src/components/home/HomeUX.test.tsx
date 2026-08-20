import type { ReactNode } from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const homeStore = vi.hoisted(() => ({ ownedCount: 0 }));
const homeAuth = vi.hoisted(() => ({ user: null as unknown, loading: false }));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock('@/hooks/useMounted', () => ({ useMounted: () => true }));
vi.mock('@/lib/neon/AuthProvider', () => ({ useAuth: () => homeAuth }));
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key,
  }),
}));
vi.mock('@/store/primedex', () => ({
  usePrimeDexStore: (selector: (state: { _hasHydrated: boolean; tcgOwnedCards: string[] }) => unknown) => (
    selector({ _hasHydrated: true, tcgOwnedCards: Array.from({ length: homeStore.ownedCount }, (_, index) => `card-${index}`) })
  ),
}));

import { HomeCollectionEntry } from './HomeCollectionEntry';
import HomeHeaderMobileMenu from './HomeHeaderMobileMenu';
import { HomeFieldLabMotion } from './HomeFieldLabMotion';
import { HomeWordReveal } from './HomeWordReveal';

function createWorld(chapterTops?: number[]): HTMLElement {
  const world = document.createElement('div');
  world.dataset.fieldWorld = 'true';
  const stage = document.createElement('div');
  stage.dataset.fieldStage = 'true';
  Object.defineProperty(world, 'offsetHeight', { configurable: true, value: 2_000 });
  vi.spyOn(world, 'getBoundingClientRect').mockReturnValue({ top: 0 } as DOMRect);

  for (let index = 0; index < 5; index += 1) {
    const layer = document.createElement('div');
    layer.dataset.fieldLayerIndex = String(index);
    stage.append(layer);

    const chapter = document.createElement('section');
    chapter.dataset.fieldChapterIndex = String(index);
    if (chapterTops) {
      vi.spyOn(chapter, 'getBoundingClientRect').mockReturnValue({
        top: chapterTops[index] ?? 0,
        height: window.innerHeight,
      } as DOMRect);
    }
    world.append(chapter);

  }

  world.append(stage);
  document.body.append(world);
  return world;
}

function mockMediaQueries({ reduced = false, compact = false } = {}) {
  const queries = new Map<string, { matches: boolean; addEventListener: ReturnType<typeof vi.fn>; removeEventListener: ReturnType<typeof vi.fn>; addListener: ReturnType<typeof vi.fn>; removeListener: ReturnType<typeof vi.fn> }>();
  vi.stubGlobal('matchMedia', (query: string) => {
    const value = {
      matches: query.includes('prefers-reduced-motion') ? reduced : compact,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    };
    queries.set(query, value);
    return value as unknown as MediaQueryList;
  });
  return queries;
}

afterEach(() => {
  document.body.innerHTML = '';
  Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
  homeStore.ownedCount = 0;
  homeAuth.user = null;
  homeAuth.loading = false;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('home collection entry', () => {
  it('starts onboarding without local cards and resumes the collection when cards exist', () => {
    const { rerender } = render(
      <HomeCollectionEntry locale="fr" startLabel="Commencer" resumeLabel="Reprendre" />,
    );

    expect(screen.getByRole('link')).toHaveAttribute('href', '/fr/tcg/start?source=home_cta');
    expect(screen.getByRole('link')).toHaveTextContent('Commencer');

    homeStore.ownedCount = 2;
    rerender(<HomeCollectionEntry locale="fr" startLabel="Commencer" resumeLabel="Reprendre" />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/fr/tcg/collection');
    expect(screen.getByRole('link')).toHaveTextContent('Reprendre');
  });

  it('opens the collection for a signed-in user even without local cards', () => {
    homeAuth.user = { id: 'user-1' };

    render(
      <HomeCollectionEntry locale="fr" startLabel="Commencer" resumeLabel="Reprendre" />,
    );

    expect(screen.getByRole('link')).toHaveAttribute('href', '/fr/tcg/collection');
    expect(screen.getByRole('link')).toHaveTextContent('Collection');
  });

  it('keeps the server-provided signed-in state during hydration', () => {
    homeAuth.loading = true;

    render(
      <HomeCollectionEntry
        locale="fr"
        startLabel="Commencer"
        resumeLabel="Reprendre"
        initialSignedIn
      />,
    );

    expect(screen.getByRole('link')).toHaveAttribute('href', '/fr/tcg/collection');
    expect(screen.getByRole('link')).toHaveTextContent('Collection');
  });

  it('falls back to onboarding during hydration without a server state', () => {
    homeAuth.loading = true;

    render(
      <HomeCollectionEntry locale="fr" startLabel="Commencer" resumeLabel="Reprendre" />,
    );

    expect(screen.getByRole('link')).toHaveAttribute('href', '/fr/tcg/start?source=home_cta');
    expect(screen.getByRole('link')).toHaveTextContent('Commencer');
  });

  it('prefers the signed-in state over local cards during hydration', () => {
    homeAuth.loading = true;
    homeStore.ownedCount = 2;

    render(
      <HomeCollectionEntry
        locale="fr"
        startLabel="Commencer"
        resumeLabel="Reprendre"
        initialSignedIn
      />,
    );

    expect(screen.getByRole('link')).toHaveAttribute('href', '/fr/tcg/collection');
    expect(screen.getByRole('link')).toHaveTextContent('Collection');
  });

  it('resolves to the client session once loading finishes', () => {
    homeAuth.loading = true;

    const { rerender } = render(
      <HomeCollectionEntry
        locale="fr"
        startLabel="Commencer"
        resumeLabel="Reprendre"
        initialSignedIn
      />,
    );
    expect(screen.getByRole('link')).toHaveTextContent('Collection');

    homeAuth.loading = false;
    homeAuth.user = null;
    rerender(<HomeCollectionEntry locale="fr" startLabel="Commencer" resumeLabel="Reprendre" />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/fr/tcg/start?source=home_cta');
    expect(screen.getByRole('link')).toHaveTextContent('Commencer');
  });
});

describe('home mobile menu', () => {
  it('closes on links, outside pointer, Escape, and restores focus', () => {
    render(
      <HomeHeaderMobileMenu
        links={[{ href: '/fr/pokedex', label: 'Pokédex' }]}
        menuLabel="Ouvrir le menu"
        navigationLabel="Navigation principale"
        closeLabel="Fermer"
        collectionStartLabel="Commencer"
        collectionResumeLabel="Reprendre"
        githubLabel="GitHub"
        githubUrl="https://github.com/example"
        locale="fr"
      />,
    );

    const trigger = screen.getByRole('button', { name: 'Ouvrir le menu' });
    fireEvent.click(trigger);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(within(screen.getByRole('dialog')).getByRole('button', { name: 'Fermer' })).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();

    fireEvent.click(trigger);
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(trigger);
    const pokedexLink = screen.getByRole('link', { name: /Pokédex/ });
    pokedexLink.addEventListener('click', (event) => event.preventDefault(), { once: true });
    fireEvent.click(pokedexLink);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does not reopen when the trigger is clicked while the menu is open', () => {
    render(
      <HomeHeaderMobileMenu
        links={[]}
        menuLabel="Ouvrir le menu"
        navigationLabel="Navigation principale"
        closeLabel="Fermer"
        collectionStartLabel="Commencer"
        collectionResumeLabel="Reprendre"
        githubLabel="GitHub"
        githubUrl="https://github.com/example"
        locale="fr"
      />,
    );

    const trigger = screen.getByRole('button', { name: 'Ouvrir le menu' });
    fireEvent.click(trigger);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.pointerDown(trigger);
    fireEvent.click(trigger);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});

describe('home word reveal', () => {
  it('segments unspaced CJK headings into wrap-safe visual tokens', () => {
    mockMediaQueries();
    const { container } = render(
      <>
        <HomeWordReveal text="カードを集めよう。ポケモンを探そう。" locale="ja" />
        <HomeWordReveal text="收集卡牌。探索宝可梦。组建队伍。" locale="zh" />
      </>,
    );

    const reveals = container.querySelectorAll('.home-word-reveal-visual');
    expect(reveals).toHaveLength(2);
    expect(reveals[0]?.querySelectorAll('.home-word-reveal-word').length).toBeGreaterThan(1);
    expect(reveals[1]?.querySelectorAll('.home-word-reveal-word').length).toBeGreaterThan(1);
  });

  it('keeps punctuation attached to the preceding word in spaced locales', () => {
    mockMediaQueries();
    const { container } = render(<HomeWordReveal text="Track your cards. Explore Pokémon." locale="en" />);
    const tokens = [...container.querySelectorAll('.home-word-reveal-word')].map((token) => token.textContent);

    expect(tokens).toEqual(['Track', 'your', 'cards.', 'Explore', 'Pokémon.']);
  });
});

describe('home Field Lab motion', () => {
  it('uses five chapters and switches to a static presentation on compact viewports', () => {
    mockMediaQueries({ compact: true });
    const world = createWorld();
    render(<HomeFieldLabMotion />);

    expect(world.querySelectorAll('[data-field-layer-index]')).toHaveLength(5);
    expect(world.querySelectorAll('[data-field-chapter-index]')).toHaveLength(5);
    expect(world).toHaveAttribute('data-field-static');
    expect(world).not.toHaveAttribute('data-field-reduced-motion');
    expect(world).toHaveAttribute('data-field-active-index', '0');
  });

  it('keeps the first terminal layer isolated at the top of the page', () => {
    mockMediaQueries();
    const world = createWorld([100, 600, 1_100, 1_600, 2_100]);
    render(<HomeFieldLabMotion />);

    const firstLayer = world.querySelector('[data-field-layer-index="0"]');
    const secondLayer = world.querySelector('[data-field-layer-index="1"]');
    expect(firstLayer).toHaveStyle('--field-layer-focus: 1.0000; --field-layer-z: 100');
    expect(secondLayer).toHaveStyle('--field-layer-focus: 0.0000; --field-layer-z: 0');
  });

  it('keeps the current chapter until the next measured activation point', () => {
    mockMediaQueries();
    const world = createWorld([100, 600, 1_100, 1_600, 2_100]);
    const callbacks: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callbacks.push(callback);
      return callbacks.length;
    });
    render(<HomeFieldLabMotion />);
    callbacks.shift()?.(0);

    Object.defineProperty(window, 'scrollY', { configurable: true, value: 1_000 });
    act(() => { window.dispatchEvent(new Event('scroll')); });
    for (let frame = 0; frame < 60; frame += 1) callbacks.shift()?.(16);

    expect(world).toHaveAttribute('data-field-active-index', '1');
    expect(world.querySelector('[data-field-layer-active]')).toHaveAttribute('data-field-layer-index', '1');

    Object.defineProperty(window, 'scrollY', { configurable: true, value: 1_200 });
    act(() => { window.dispatchEvent(new Event('scroll')); });
    for (let frame = 0; frame < 60; frame += 1) callbacks.shift()?.(16);

    expect(world).toHaveAttribute('data-field-active-index', '2');
    expect(world.querySelector('[data-field-layer-active]')).toHaveAttribute('data-field-layer-index', '2');
    expect(world.querySelector('[data-field-chapter-index="2"]')).toHaveAttribute('data-field-active');
  });

  it('uses the same static presentation for reduced motion and cleans the RAF/listeners', () => {
    mockMediaQueries({ reduced: true });
    const staticWorld = createWorld();
    const { unmount: unmountStatic } = render(<HomeFieldLabMotion />);
    expect(staticWorld).toHaveAttribute('data-field-static');
    expect(staticWorld).toHaveAttribute('data-field-reduced-motion');
    unmountStatic();

    document.body.innerHTML = '';
    vi.restoreAllMocks();
    mockMediaQueries();
    const rafCallbacks = new Map<number, FrameRequestCallback>();
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      rafCallbacks.set(1, callback);
      return 1;
    });
    const cancel = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
    const removeEventListener = vi.spyOn(window, 'removeEventListener');
    createWorld();
    const { unmount } = render(<HomeFieldLabMotion />);
    expect(raf).toHaveBeenCalled();
    expect(rafCallbacks.has(1)).toBe(true);
    unmount();
    expect(cancel).toHaveBeenCalledWith(1);
    expect(removeEventListener).toHaveBeenCalledWith('scroll', expect.any(Function));
    expect(removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
    expect(removeEventListener).toHaveBeenCalledWith('load', expect.any(Function));
  });

  it('advances the cached conductor to the fifth chapter at the end of the scene', () => {
    mockMediaQueries();
    const world = createWorld();
    const callbacks: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callbacks.push(callback);
      return callbacks.length;
    });
    render(<HomeFieldLabMotion />);
    callbacks.shift()?.(0);
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 2_000 - window.innerHeight });
    act(() => { window.dispatchEvent(new Event('scroll')); });
    for (let frame = 0; frame < 60; frame += 1) callbacks.shift()?.(16);
    expect(world).toHaveAttribute('data-field-active-index', '4');
    const activeLayers = [...world.querySelectorAll('[data-field-layer-active]')];
    expect(activeLayers).toHaveLength(1);
    expect(activeLayers[0]).toHaveAttribute('data-field-layer-index', '4');
  });
});
