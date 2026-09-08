'use client';

import * as Sentry from '@sentry/nextjs';

import { getProductConsent, type ProductConsent } from '@/lib/product-measurement';
import { scrubSentryEvent, scrubSentryFeedback } from '@/lib/sentry-common';

type ReplayIntegration = {
  name: string;
  stop: (options?: { flush?: boolean }) => Promise<void>;
};

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const hasDsn = Boolean(dsn);
const release = process.env.NEXT_PUBLIC_SENTRY_RELEASE
  ?? process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA
  ?? process.env.VERCEL_GIT_COMMIT_SHA;
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
    release,
    environment: getEnvironment(),
    sendDefaultPii: false,
    // Tracing and Replay integrations are added only after consent. Keeping
    // their rates configured here lets Sentry enable them lazily later.
    tracesSampleRate: getTraceSampleRate(),
    replaysSessionSampleRate: replaySessionSampleRate,
    replaysOnErrorSampleRate: 1,
    beforeSend: scrubSentryEvent,
    integrations: [
      Sentry.globalHandlersIntegration(),
      Sentry.browserApiErrorsIntegration(),
      Sentry.dedupeIntegration(),
      Sentry.breadcrumbsIntegration({
        console: false,
        dom: false,
        fetch: true,
        history: false,
        sentry: false,
        xhr: true,
      }),
      Sentry.httpClientIntegration({
        failedRequestStatusCodes: [[500, 599]],
        failedRequestTargets: [
          /\/api\//,
          /^https:\/\/pokeapi\.co\//,
          /^https:\/\/beta\.pokeapi\.co\//,
          /^https:\/\/api\.tcgdex\.net\//,
        ],
      }),
      // The integration is inert until a user explicitly opens the form from
      // the footer. No automatic feedback widget or user data is collected.
      Sentry.feedbackIntegration({
        autoInject: false,
        colorScheme: 'system',
        enableScreenshot: true,
        isEmailRequired: false,
        isNameRequired: false,
        showEmail: false,
        showName: false,
        triggerLabel: 'Report a problem',
        triggerAriaLabel: 'Report a problem',
      }),
    ],
    initialScope: {
      tags: {
        app: 'lunidex',
        runtime: 'browser',
      },
    },
  });

  initialized = true;
  Sentry.getClient()?.on('beforeSendFeedback', scrubSentryFeedback);
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
