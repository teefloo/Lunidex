'use client';

import { useEffect, useSyncExternalStore } from 'react';

import {
  getProductConsent,
  getServerProductConsent,
  subscribeProductConsent,
} from '@/lib/product-measurement';
import { syncSentryPerformance } from '@/lib/sentry-client';

export function SentryConsentBridge() {
  const consent = useSyncExternalStore(
    subscribeProductConsent,
    getProductConsent,
    getServerProductConsent,
  );

  useEffect(() => {
    syncSentryPerformance(consent);
  }, [consent]);

  return null;
}
