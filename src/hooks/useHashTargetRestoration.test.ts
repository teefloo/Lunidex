// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useHashTargetRestoration } from './useHashTargetRestoration';

function HashRestorationHarness() {
  useHashTargetRestoration();
  return createElement('div');
}

describe('useHashTargetRestoration', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    window.history.replaceState(null, '', '/fr/pokedex#pokemon-25');
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    window.history.replaceState(null, '', '/');
  });

  it('scrolls and focuses a hash target once a lazy list card is rendered', async () => {
    await act(async () => root.render(createElement(HashRestorationHarness)));
    const scrollIntoView = vi.fn();
    const target = document.createElement('div');
    target.id = 'pokemon-25';
    target.tabIndex = -1;
    target.scrollIntoView = scrollIntoView;

    await act(async () => {
      document.body.appendChild(target);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start' });
    expect(document.activeElement).toBe(target);
  });
});
