'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';

import {
  getProductConsent,
  getServerProductConsent,
  subscribeProductConsent,
} from '@/lib/product-measurement';
import {
  capturePostHogPageview,
  initializePostHog,
  syncPostHogConsent,
} from '@/lib/posthog-client';

export function PostHogConsentBridge() {
  const pathname = usePathname();
  const consent = useSyncExternalStore(
    subscribeProductConsent,
    getProductConsent,
    getServerProductConsent,
  );
  const capturedPathRef = useRef<string | null>(null);

  useEffect(() => {
    initializePostHog();
    syncPostHogConsent(consent);
  }, [consent]);

  useEffect(() => {
    if (consent.productMeasurement !== 'granted') {
      capturedPathRef.current = null;
      return;
    }

    const currentPath = pathname || '/';
    if (capturedPathRef.current === currentPath) return;
    capturedPathRef.current = currentPath;
    capturePostHogPageview(currentPath);
  }, [consent.productMeasurement, pathname]);

  return null;
}
