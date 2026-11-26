'use client';

import { useEffect, useSyncExternalStore } from 'react';

import { usePathname } from 'next/navigation';
import { useClientLanguage } from '@/hooks/useLocaleHref';
import { useAuth } from '@/lib/neon/AuthProvider';
import {
  getProductConsent,
  getServerProductConsent,
  subscribeProductConsent,
} from '@/lib/product-measurement';
import { syncPostHogIdentity } from '@/lib/posthog-client';

export function PostHogIdentityBridge() {
  const { user, loading } = useAuth();
  const locale = useClientLanguage();
  const pathname = usePathname();
  const consent = useSyncExternalStore(
    subscribeProductConsent,
    getProductConsent,
    getServerProductConsent,
  );

  useEffect(() => {
    if (loading || consent.productMeasurement !== 'granted') return;
    syncPostHogIdentity(user?.id ?? null, { locale });
  }, [consent.productMeasurement, loading, locale, pathname, user?.id]);

  return null;
}
