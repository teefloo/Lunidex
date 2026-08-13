import { act, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HomeFaqAnchorBehavior } from './HomeFaqAnchorBehavior';

describe('HomeFaqAnchorBehavior', () => {
  afterEach(() => {
    window.history.replaceState(null, '', '/');
    document.body.innerHTML = '';
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('opens and scrolls to a FAQ detail addressed by the URL hash', () => {
    window.history.replaceState(null, '', '/en#faq-storage');
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLDetailsElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    document.body.innerHTML = '<details id="faq-storage"><summary>Where are my cards saved?</summary><div>On this device.</div></details>';

    act(() => {
      render(<HomeFaqAnchorBehavior />);
    });

    expect(document.getElementById('faq-storage')).toHaveAttribute('open');
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start' });
  });
});
