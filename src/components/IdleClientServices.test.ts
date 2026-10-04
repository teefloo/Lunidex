// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

const loads = vi.hoisted(() => ({ neon: vi.fn(), posthog: vi.fn(), sentry: vi.fn() }));
vi.mock('@/lib/idle-scheduler', () => ({ scheduleIdleTask: (task: () => void) => { task(); return () => {}; } }));
vi.mock('@/components/NeonSyncBridge', () => { loads.neon(); return { NeonSyncBridge: () => createElement('span', null, 'sync') }; });
vi.mock('@/components/pwa/RegisterPWA', () => ({ RegisterPWA: () => createElement('span', null, 'pwa') }));
vi.mock('@/components/analytics/VercelInsights', () => ({ VercelInsights: () => createElement('span', null, 'insights') }));
vi.mock('@/components/analytics/PostHogConsentBridge', () => { loads.posthog(); return { PostHogConsentBridge: () => null }; });
vi.mock('@/components/analytics/PostHogIdentityBridge', () => ({ PostHogIdentityBridge: () => null }));
vi.mock('@/components/analytics/SentryConsentBridge', () => { loads.sentry(); throw new Error('Optional chunk unavailable'); });

import { IdleClientServices } from './IdleClientServices';

describe('optional client services', () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

  async function renderServices(assert: (container: HTMLElement) => void) {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const container = document.createElement('div');
    const root = createRoot(container);
    try {
      await act(async () => { root.render(createElement(IdleClientServices)); await new Promise(resolve => setTimeout(resolve, 20)); });
      assert(container);
    } finally {
      await act(async () => root.unmount());
    }
  }

  it('does not import unconfigured cloud or measurement services', async () => {
    vi.stubEnv('NEXT_PUBLIC_NEON_AUTH_URL', '');
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', '');
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_ENABLED', 'false');
    await renderServices(container => {
      expect(container.textContent).toBe('pwainsights');
      expect(loads.neon).not.toHaveBeenCalled();
      expect(loads.sentry).not.toHaveBeenCalled();
      expect(loads.posthog).not.toHaveBeenCalled();
    });
  });

  it('keeps PWA and sync available when an optional measurement chunk fails', async () => {
    vi.stubEnv('NEXT_PUBLIC_NEON_AUTH_URL', 'http://localhost/test');
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'configured-test-value');
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_ENABLED', 'false');
    await renderServices(container => {
      expect(container.textContent).toBe('syncpwainsights');
      expect(loads.sentry).toHaveBeenCalledTimes(1);
    });
  });
});
