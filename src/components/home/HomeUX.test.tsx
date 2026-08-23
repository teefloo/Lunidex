import type { ReactNode } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
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
import { HomeMotionSection } from './HomeMotionSection';
import { HomeWordReveal } from './HomeWordReveal';

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

    render(<HomeCollectionEntry locale="fr" startLabel="Commencer" resumeLabel="Reprendre" />);

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

    render(<HomeCollectionEntry locale="fr" startLabel="Commencer" resumeLabel="Reprendre" />);

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

describe('home word reveal and reduced motion', () => {
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

  it('reveals content immediately when reduced motion is requested', () => {
    mockMediaQueries({ reduced: true });
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0);
      return 1;
    });

    const { container } = render(
      <HomeMotionSection>
        <p>Reduced motion content</p>
      </HomeMotionSection>,
    );

    expect(container.querySelector('[style*="opacity"]')).toHaveStyle({ opacity: '1', transform: 'translate(0, 0)' });
  });
});
