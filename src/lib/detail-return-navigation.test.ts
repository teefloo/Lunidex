// @vitest-environment jsdom

import type { MouseEvent as ReactMouseEvent } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { DETAIL_RETURN_TARGET_KEY, recordDetailReturnOrigin } from './detail-return-navigation';
import { clearDetailReturnCountFromCurrentUrl } from './pokemon-filter-url';

function clickEvent(overrides: Partial<ReactMouseEvent<HTMLAnchorElement>> = {}) {
  const anchor = document.createElement('a');
  return {
    defaultPrevented: false,
    button: 0,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    currentTarget: anchor,
    ...overrides,
  } as ReactMouseEvent<HTMLAnchorElement>;
}

describe('detail return origin tracking', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/fr/pokedex?q=pikachu');
    window.sessionStorage.clear();
  });

  it('records the validated source fragment on the current history entry for a same-tab click', () => {
    const target = '/fr/pokedex?q=pikachu#pokemon-25';
    const existingRouterState = { preserved: 'router-history-state' };
    window.history.replaceState(existingRouterState, '', '/fr/pokedex?q=pikachu');

    expect(recordDetailReturnOrigin(clickEvent(), target)).toBe(true);
    expect(`${window.location.pathname}${window.location.search}${window.location.hash}`).toBe(target);
    expect(window.sessionStorage.getItem(DETAIL_RETURN_TARGET_KEY)).toBe(target);
    expect(window.history.state).toEqual(existingRouterState);
  });

  it('adds only the bounded display-count context while preserving the source filters', () => {
    const target = '/fr/pokedex?q=pikachu&returnCount=40#pokemon-25';

    expect(recordDetailReturnOrigin(clickEvent(), target)).toBe(true);
    expect(`${window.location.pathname}${window.location.search}${window.location.hash}`).toBe(target);
    expect(window.sessionStorage.getItem(DETAIL_RETURN_TARGET_KEY)).toBe(target);
  });

  it.each([
    { label: 'control click', ctrlKey: true },
    { label: 'command click', metaKey: true },
    { label: 'shift click', shiftKey: true },
    { label: 'alt click', altKey: true },
    { label: 'middle click', button: 1 },
    { label: 'prevented click', defaultPrevented: true },
  ])('does not update history or set a marker for a $label', ({ ...overrides }) => {
    window.sessionStorage.setItem(DETAIL_RETURN_TARGET_KEY, '/fr/pokedex?q=pikachu#pokemon-25');
    const event = clickEvent(overrides);

    expect(recordDetailReturnOrigin(event, '/fr/pokedex?q=pikachu#pokemon-25')).toBe(false);
    expect(`${window.location.pathname}${window.location.search}${window.location.hash}`).toBe('/fr/pokedex?q=pikachu');
    expect(window.sessionStorage.getItem(DETAIL_RETURN_TARGET_KEY)).toBeNull();
  });

  it('does not mark links that open another browsing context or point away from the current list', () => {
    window.sessionStorage.setItem(DETAIL_RETURN_TARGET_KEY, '/fr/pokedex?q=pikachu#pokemon-25');
    const newTab = clickEvent();
    newTab.currentTarget.target = '_blank';
    expect(recordDetailReturnOrigin(newTab, '/fr/pokedex?q=pikachu#pokemon-25')).toBe(false);
    expect(recordDetailReturnOrigin(clickEvent(), '/fr/items?q=burn#item-1')).toBe(false);
    expect(recordDetailReturnOrigin(clickEvent(), 'https://evil.example/')).toBe(false);
    expect(window.sessionStorage.getItem(DETAIL_RETURN_TARGET_KEY)).toBeNull();
  });

  it('clears stale display context without changing filters, fragments, or history state', () => {
    const existingState = { router: 'preserved' };
    window.history.replaceState(existingState, '', '/fr/items?q=burn&returnCount=96#item-12');

    clearDetailReturnCountFromCurrentUrl();

    expect(`${window.location.pathname}${window.location.search}${window.location.hash}`).toBe('/fr/items?q=burn#item-12');
    expect(window.history.state).toEqual(existingState);
  });
});
