import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LunidexArchiveMotion } from './LunidexArchiveMotion';

describe('LunidexArchiveMotion', () => {
  let frameCallbacks: FrameRequestCallback[];
  let nextFrameId: number;

  beforeEach(() => {
    frameCallbacks = [];
    nextFrameId = 0;
    document.body.innerHTML = '<div class="lunidex-world-backdrop"></div>';

    Object.defineProperty(document.documentElement, 'scrollHeight', {
      configurable: true,
      value: 2000,
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 1000,
    });
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      writable: true,
      value: 0,
    });

    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frameCallbacks.push(callback);
      nextFrameId += 1;
      return nextFrameId;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.stubGlobal('matchMedia', () => ({
      matches: false,
      media: '(prefers-reduced-motion: reduce)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('maps scroll progress to the archive field CSS variables', () => {
    render(<LunidexArchiveMotion />);

    const flushFrames = () => {
      let frameCount = 0;

      while (frameCallbacks.length > 0 && frameCount < 100) {
        const callback = frameCallbacks.shift();
        if (!callback) continue;
        act(() => callback(frameCount * 16));
        frameCount += 1;
      }

      expect(frameCallbacks).toHaveLength(0);
    };

    flushFrames();
    const backdrop = document.querySelector<HTMLElement>('.lunidex-world-backdrop');
    expect(backdrop?.style.getPropertyValue('--archive-field-halo-y')).toBe('0vh');

    act(() => {
      window.scrollY = 500;
      window.dispatchEvent(new Event('scroll'));
    });
    flushFrames();

    expect(backdrop?.style.getPropertyValue('--archive-field-halo-y')).toBe('-5vh');
    expect(backdrop?.style.getPropertyValue('--archive-field-wide-rotate')).toBe('3.5deg');
    expect(backdrop?.style.getPropertyValue('--archive-field-tall-x')).toBe('2vw');
  });
});
