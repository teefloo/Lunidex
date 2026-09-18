'use client';

import { useEffect, useSyncExternalStore } from 'react';

import { useClientLanguage } from '@/hooks/useLocaleHref';
import { useAuth } from '@/lib/neon/AuthProvider';
import {
  getProductConsent,
  getServerProductConsent,
  subscribeProductConsent,
} from '@/lib/product-measurement';
import { syncPostHogIdentity } from '@/lib/posthog-client';

export function PostHogIdentityBridge() {
  const { user } = useAuth();
  const locale = useClientLanguage();
  const consent = useSyncExternalStore(
    subscribeProductConsent,
    getProductConsent,
    getServerProductConsent,
  );

  useEffect(() => {
    if (consent.productMeasurement !== 'granted') return;
    syncPostHogIdentity(user?.id ?? null, { locale });
  }, [consent.productMeasurement, locale, user?.id]);

  return null;
}
