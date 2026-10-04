'use client';

import { useEffect, useState, type ComponentType } from 'react';

import { scheduleIdleTask } from '@/lib/idle-scheduler';

type DeferredComponents = {
  NeonSyncBridge: ComponentType | null;
  RegisterPWA: ComponentType | null;
  SentryConsentBridge: ComponentType | null;
  PostHogConsentBridge: ComponentType | null;
  PostHogIdentityBridge: ComponentType | null;
  VercelInsights: ComponentType | null;
};

function fulfilled<T>(result: PromiseSettledResult<T>): T | null {
  return result.status === 'fulfilled' ? result.value : null;
}

const OPTIONAL_SERVICES_MIN_DELAY_MS = 6_000;

/**
 * Loads service-worker, sync and measurement bridges only after the first
 * render has had a chance to settle. The bridges remain mounted for the rest
 * of the session once their chunks are available.
 */
export function IdleClientServices() {
  const [components, setComponents] = useState<DeferredComponents | null>(null);

  useEffect(() => {
    let active = true;
    const cancel = scheduleIdleTask(() => {
      const hasPostHog = process.env.NEXT_PUBLIC_POSTHOG_ENABLED === 'true'
        && Boolean(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN);
      void Promise.allSettled([
        process.env.NEXT_PUBLIC_NEON_AUTH_URL ? import('@/components/NeonSyncBridge') : Promise.resolve(null),
        import('@/components/pwa/RegisterPWA'),
        process.env.NEXT_PUBLIC_SENTRY_DSN ? import('@/components/analytics/SentryConsentBridge') : Promise.resolve(null),
        hasPostHog ? import('@/components/analytics/PostHogConsentBridge') : Promise.resolve(null),
        hasPostHog ? import('@/components/analytics/PostHogIdentityBridge') : Promise.resolve(null),
        import('@/components/analytics/VercelInsights'),
      ]).then(([sync, pwa, sentry, posthogConsent, posthogIdentity, vercel]) => {
        if (!active) return;
        setComponents({
          NeonSyncBridge: fulfilled(sync)?.NeonSyncBridge ?? null,
          RegisterPWA: fulfilled(pwa)?.RegisterPWA ?? null,
          SentryConsentBridge: fulfilled(sentry)?.SentryConsentBridge ?? null,
          PostHogConsentBridge: fulfilled(posthogConsent)?.PostHogConsentBridge ?? null,
          PostHogIdentityBridge: fulfilled(posthogIdentity)?.PostHogIdentityBridge ?? null,
          VercelInsights: fulfilled(vercel)?.VercelInsights ?? null,
        });
      }).catch(() => {
        // Optional bridges must never block or destabilize the application.
      });
    }, undefined, { minDelayMs: OPTIONAL_SERVICES_MIN_DELAY_MS });

    return () => {
      active = false;
      cancel();
    };
  }, []);

  if (!components) return null;

  const {
    NeonSyncBridge,
    RegisterPWA,
    SentryConsentBridge,
    PostHogConsentBridge,
    PostHogIdentityBridge,
    VercelInsights,
  } = components;

  return (
    <>
      {NeonSyncBridge && <NeonSyncBridge />}
      {RegisterPWA && <RegisterPWA />}
      {SentryConsentBridge && <SentryConsentBridge />}
      {PostHogConsentBridge && <PostHogConsentBridge />}
      {PostHogIdentityBridge && <PostHogIdentityBridge />}
      {VercelInsights && <VercelInsights />}
    </>
  );
}
