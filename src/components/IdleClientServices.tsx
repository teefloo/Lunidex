'use client';

import { useEffect, useState, type ComponentType } from 'react';

import { scheduleIdleTask } from '@/lib/idle-scheduler';

type DeferredComponents = {
  NeonSyncBridge: ComponentType;
  RegisterPWA: ComponentType;
  SentryConsentBridge: ComponentType;
  PostHogConsentBridge: ComponentType;
  PostHogIdentityBridge: ComponentType;
  VercelInsights: ComponentType;
};

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
      void Promise.all([
        import('@/components/NeonSyncBridge'),
        import('@/components/pwa/RegisterPWA'),
        import('@/components/analytics/SentryConsentBridge'),
        import('@/components/analytics/PostHogConsentBridge'),
        import('@/components/analytics/PostHogIdentityBridge'),
        import('@/components/analytics/VercelInsights'),
      ]).then(([sync, pwa, sentry, posthogConsent, posthogIdentity, vercel]) => {
        if (!active) return;
        setComponents({
          NeonSyncBridge: sync.NeonSyncBridge,
          RegisterPWA: pwa.RegisterPWA,
          SentryConsentBridge: sentry.SentryConsentBridge,
          PostHogConsentBridge: posthogConsent.PostHogConsentBridge,
          PostHogIdentityBridge: posthogIdentity.PostHogIdentityBridge,
          VercelInsights: vercel.VercelInsights,
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
      <NeonSyncBridge />
      <RegisterPWA />
      <SentryConsentBridge />
      <PostHogConsentBridge />
      <PostHogIdentityBridge />
      <VercelInsights />
    </>
  );
}
