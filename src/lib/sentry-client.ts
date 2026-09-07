'use client';

import * as Sentry from '@sentry/nextjs';

import { getProductConsent, type ProductConsent } from '@/lib/product-measurement';
import { scrubSentryEvent } from '@/lib/sentry-common';

type ReplayIntegration = {
  name: string;
  stop: (options?: { flush?: boolean }) => Promise<void>;
};

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const hasDsn = Boolean(dsn);
const productionTraceSampleRate = 0.1;
const developmentTraceSampleRate = 1;
const replaySessionSampleRate = 0.05;

let initialized = false;

function getEnvironment(): string {
  return process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT
    ?? process.env.VERCEL_ENV
    ?? process.env.NODE_ENV
    ?? 'development';
}

function isPerformanceConsentGranted(consent: ProductConsent): boolean {
  return consent.audiencePerformance === 'granted';
}

function getTraceSampleRate(): number {
  return process.env.NODE_ENV === 'production'
    ? productionTraceSampleRate
    : developmentTraceSampleRate;
}

export function initializeSentryClient(): void {
  if (initialized || !hasDsn) return;

  Sentry.init({
    dsn,
    enabled: true,
    environment: getEnvironment(),
    sendDefaultPii: false,
    // The integrations themselves are added only after consent. Keeping the
    // rates configured here lets Sentry initialize Replay lazily later.
    tracesSampleRate: getTraceSampleRate(),
    replaysSessionSampleRate: replaySessionSampleRate,
    replaysOnErrorSampleRate: 1,
    beforeSend: scrubSentryEvent,
    integrations: [],
    initialScope: {
      tags: {
        app: 'lunidex',
        runtime: 'browser',
      },
    },
  });

  initialized = true;
  syncSentryPerformance(getProductConsent());
}

/**
 * Enable or stop optional browser performance features when the existing
 * Lunidex audience/performance consent changes.
 */
export function syncSentryPerformance(consent: ProductConsent): void {
  if (!initialized) initializeSentryClient();

  const client = Sentry.getClient();
  if (!client) return;

  const enabled = isPerformanceConsentGranted(consent);
  const options = client.getOptions() as {
    tracesSampleRate?: number;
    replaysSessionSampleRate?: number;
    replaysOnErrorSampleRate?: number;
  };
  options.tracesSampleRate = enabled ? getTraceSampleRate() : 0;
  options.replaysSessionSampleRate = enabled ? replaySessionSampleRate : 0;
  options.replaysOnErrorSampleRate = enabled ? 1 : 0;

  if (enabled && !client.getIntegrationByName('BrowserTracing')) {
    client.addIntegration(Sentry.browserTracingIntegration());
  }

  const replay = client.getIntegrationByName<ReplayIntegration>('Replay');
  if (enabled && !replay) {
    client.addIntegration(Sentry.replayIntegration({
      maskAllText: true,
      maskAllInputs: true,
      blockAllMedia: true,
      networkCaptureBodies: false,
    }));
  } else if (!enabled && replay) {
    void replay.stop({ flush: false });
  }
}
