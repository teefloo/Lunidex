// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/link', async () => {
  const { createElement } = await import('react');
  return {
    default: ({ href, children, onClick, ...props }: {
      href: string;
      children?: React.ReactNode;
      onClick?: React.MouseEventHandler<HTMLAnchorElement>;
    }) => createElement('a', {
      ...props,
      href,
      onClick: (event: React.MouseEvent<HTMLAnchorElement>) => {
        onClick?.(event);
        event.preventDefault();
      },
    }, children),
  };
});
vi.mock('next/image', async () => {
  const { createElement } = await import('react');
  return {
    default: ({ fill, unoptimized, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; unoptimized?: boolean }) => {
      void fill;
      void unoptimized;
      return createElement('img', props);
    },
  };
});
vi.mock('@/hooks/useLocaleHref', () => ({ useLocaleHref: () => (path: string) => `/fr${path}` }));

import MoveLearnerGrid from './MoveLearnerGrid';

describe('MoveLearnerGrid', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    window.history.replaceState({ router: 'state' }, '', '/fr/moves/tackle?from=%2Ffr%2Fmoves%3Fq%3Dfire');
    window.sessionStorage.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('returns from a learner detail to the move page and its validated prior list context', async () => {
    const moveDetailTarget = '/fr/moves/tackle?from=%2Ffr%2Fmoves%3Fq%3Dfire';
    await act(async () => root.render(createElement(MoveLearnerGrid, {
      learners: [{
        id: 1,
        name: 'bulbasaur',
        localizedName: 'Bulbizarre',
        types: ['grass', 'poison'],
        learnMethod: 'level-up',
        level: 1,
      }],
      moveName: 'Charge',
      returnTarget: moveDetailTarget,
      labels: {
        title: 'Pokémon who learn {{moveName}}',
        byLevel: 'Level',
        byTm: 'TM',
        byEgg: 'Egg',
        byTutor: 'Tutor',
        showAll: 'Show {{count}}',
        noLearners: 'No Pokémon learn this move',
      },
    })));

    const link = container.querySelector<HTMLAnchorElement>('a[href^="/fr/pokemon/bulbasaur"]');
    expect(link).not.toBeNull();
    expect(link?.getAttribute('tabindex')).not.toBe('-1');
    const fromTarget = new URL(link!.href).searchParams.get('from');
    expect(fromTarget).toBe(`${moveDetailTarget}#move-pokemon-1`);

    await act(async () => link?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 })));

    expect(`${window.location.pathname}${window.location.search}${window.location.hash}`).toBe(fromTarget);
    expect(window.sessionStorage.getItem('lunidex:detail-return-target')).toBe(fromTarget);
    expect(window.history.state).toEqual({ router: 'state' });
  });

  it('encodes expanded learner-grid count and restores links beyond the default 50', async () => {
    const learners = Array.from({ length: 55 }, (_, index) => ({
      id: index + 1,
      name: `pokemon-${index + 1}`,
      localizedName: `Pokémon ${index + 1}`,
      types: ['normal'],
      learnMethod: 'level-up',
      level: index + 1,
    }));
    await act(async () => root.render(createElement(MoveLearnerGrid, {
      learners,
      moveName: 'Charge',
      returnTarget: '/fr/moves/tackle?from=%2Ffr%2Fmoves%3Fq%3Dfire',
      labels: {
        title: 'Pokémon who learn {{moveName}}',
        byLevel: 'Level',
        byTm: 'TM',
        byEgg: 'Egg',
        byTutor: 'Tutor',
        showAll: 'Show {{count}}',
        noLearners: 'No Pokémon learn this move',
      },
    })));

    const showAll = [...container.querySelectorAll('button')].find((button) => button.textContent === 'Show 55');
    expect(showAll).toBeDefined();
    await act(async () => showAll?.dispatchEvent(new MouseEvent('click', { bubbles: true })));

    const learnerLink = container.querySelector<HTMLAnchorElement>('a[href^="/fr/pokemon/pokemon-55"]');
    expect(learnerLink).not.toBeNull();
    expect(learnerLink?.getAttribute('tabindex')).not.toBe('-1');
    const fromTarget = new URL(learnerLink!.href).searchParams.get('from');
    expect(fromTarget).toBe('/fr/moves/tackle?from=%2Ffr%2Fmoves%3Fq%3Dfire&returnCount=55#move-pokemon-55');

    await act(async () => learnerLink?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 })));
    expect(`${window.location.pathname}${window.location.search}${window.location.hash}`).toBe(fromTarget);
  });

  it('reopens a previously expanded learner grid from its return count', async () => {
    const moveDetailTarget = '/fr/moves/tackle?from=%2Ffr%2Fmoves%3Fq%3Dfire&returnCount=55';
    const learners = Array.from({ length: 55 }, (_, index) => ({
      id: index + 1,
      name: `pokemon-${index + 1}`,
      localizedName: `Pokémon ${index + 1}`,
      types: ['normal'],
      learnMethod: 'level-up',
      level: index + 1,
    }));
    await act(async () => root.render(createElement(MoveLearnerGrid, {
      learners,
      moveName: 'Charge',
      returnTarget: moveDetailTarget,
      initialDisplayCount: 55,
      labels: {
        title: 'Pokémon who learn {{moveName}}',
        byLevel: 'Level',
        byTm: 'TM',
        byEgg: 'Egg',
        byTutor: 'Tutor',
        showAll: 'Show {{count}}',
        noLearners: 'No Pokémon learn this move',
      },
    })));

    expect(container.querySelector('a[href^="/fr/pokemon/pokemon-55"]')).not.toBeNull();
    expect([...container.querySelectorAll('button')].some((button) => button.textContent === 'Show 55')).toBe(false);
  });
});
