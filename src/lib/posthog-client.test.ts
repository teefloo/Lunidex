import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockPostHog = vi.hoisted(() => {
  const state = {
    optedIn: false,
    optedOut: false,
    initOptedIn: false,
    initOptedOut: true,
  };
  const instance = {
    capture: vi.fn(),
    captureException: vi.fn(),
    has_opted_in_capturing: vi.fn(() => state.optedIn),
    has_opted_out_capturing: vi.fn(() => state.optedOut),
    identify: vi.fn(),
    init: vi.fn(() => {
      state.optedIn = state.initOptedIn;
      state.optedOut = state.initOptedOut;
    }),
    opt_in_capturing: vi.fn(() => {
      state.optedIn = true;
      state.optedOut = false;
    }),
    opt_out_capturing: vi.fn(() => {
      state.optedIn = false;
      state.optedOut = true;
    }),
    register: vi.fn(),
    reset: vi.fn(),
    set_config: vi.fn(),
    startExceptionAutocapture: vi.fn(),
    startSessionRecording: vi.fn(),
    stopExceptionAutocapture: vi.fn(),
    stopSessionRecording: vi.fn(),
  };

  return {
    instance,
    reset() {
      state.optedIn = false;
      state.optedOut = false;
      state.initOptedIn = false;
      state.initOptedOut = true;
      for (const method of Object.values(instance)) {
        if (typeof method === 'function' && 'mockClear' in method) method.mockClear();
      }
    },
    setInitConsent(optedIn: boolean, optedOut: boolean) {
      state.initOptedIn = optedIn;
      state.initOptedOut = optedOut;
    },
  };
});

vi.mock('posthog-js', () => ({ default: mockPostHog.instance }));

describe('PostHog client consent ordering', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_POSTHOG_ENABLED = 'true';
    process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN = 'test-project-token';
    process.env.NEXT_PUBLIC_POSTHOG_HOST = 'https://eu.i.posthog.com';
    mockPostHog.reset();
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        location: { hostname: 'lunidex.app', pathname: '/en/pokedex' },
      },
    });
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: { documentElement: { lang: 'en' } },
    });
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_POSTHOG_ENABLED;
    delete process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
    delete process.env.NEXT_PUBLIC_POSTHOG_HOST;
    delete (globalThis as { window?: unknown }).window;
    delete (globalThis as { document?: unknown }).document;
  });

  it('applies consent that arrives before PostHog initialization', async () => {
    vi.resetModules();
    const { capturePostHogEvent, initializePostHog, syncPostHogConsent } = await import('./posthog-client');

    syncPostHogConsent({
      audiencePerformance: 'denied',
      chosenAt: '2026-09-19T00:00:00.000Z',
      policyVersion: '2026-09-19',
      productMeasurement: 'granted',
      version: 3,
    });
    initializePostHog();
    capturePostHogEvent('pokemon_search_submitted', { query_length_bucket: '4_8' });

    expect(mockPostHog.instance.opt_in_capturing).toHaveBeenCalledWith({ captureEventName: false });
    expect(mockPostHog.instance.capture).toHaveBeenCalledWith(
      'pokemon_search_submitted',
      expect.objectContaining({ query_length_bucket: '4_8' }),
    );
  });

  it('uses cookie persistence so a full application localStorage cannot block consent', async () => {
    vi.resetModules();
    const { initializePostHog } = await import('./posthog-client');

    initializePostHog();

    expect(mockPostHog.instance.init).toHaveBeenCalledWith(
      'test-project-token',
      expect.objectContaining({
        opt_out_capturing_persistence_type: 'cookie',
        persistence: 'cookie',
      }),
    );
  });

  it('restarts capture when a persisted opt-in is already present at initialization', async () => {
    mockPostHog.setInitConsent(true, false);
    vi.resetModules();
    const { initializePostHog, syncPostHogConsent } = await import('./posthog-client');

    syncPostHogConsent({
      audiencePerformance: 'denied',
      chosenAt: '2026-09-19T00:00:00.000Z',
      policyVersion: '2026-09-19',
      productMeasurement: 'granted',
      version: 3,
    });
    initializePostHog();

    expect(mockPostHog.instance.opt_in_capturing).toHaveBeenCalledWith({ captureEventName: false });
  });

  it('captures a user-reported visual problem as an exception after consent', async () => {
    vi.resetModules();
    const {
      capturePostHogException,
      initializePostHog,
      syncPostHogConsent,
    } = await import('./posthog-client');

    syncPostHogConsent({
      audiencePerformance: 'denied',
      chosenAt: '2026-09-19T00:00:00.000Z',
      policyVersion: '2026-09-19',
      productMeasurement: 'granted',
      version: 3,
    });
    initializePostHog();
    capturePostHogException(new Error('A user reported a visual problem'), {
      feature: 'visual-feedback',
      operation: 'visual-problem-submitted',
      route: '/fr/pokedex',
    });

    expect(mockPostHog.instance.captureException).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'A user reported a visual problem',
      }),
      expect.objectContaining({
        feature: 'visual-feedback',
        operation: 'visual-problem-submitted',
        route: '/pokedex',
      }),
    );
    expect(mockPostHog.instance.capture).toHaveBeenCalledWith(
      'feature_error',
      expect.objectContaining({
        feature: 'visual-feedback',
        operation: 'visual-problem-submitted',
        error_type: 'Error',
      }),
    );
  });
});
