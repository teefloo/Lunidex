'use client';

import { Analytics } from '@vercel/analytics/react';
import type { ComponentProps } from 'react';
import { useSyncExternalStore } from 'react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { getProductConsent, getServerProductConsent, subscribeProductConsent } from '@/lib/product-measurement';

type AnalyticsEvent = Parameters<NonNullable<ComponentProps<typeof Analytics>['beforeSend']>>[0];

function redact(event: AnalyticsEvent): AnalyticsEvent | null {
  const url = new URL(event.url);
  const path = url.pathname;
  if (path === '/auth' || path.startsWith('/auth/') || path.startsWith('/api/')) return null;
  url.search = '';
  url.hash = '';
  url.pathname = path.replace(/^\/([a-z]{2})\/u\/[^/]+$/, '/$1/u/[handle]').replace(/^\/([a-z]{2})\/friends\/[^/]+$/, '/$1/friends/[friendId]');
  return { ...event, url: url.toString() };
}

export function VercelInsights() {
  const consent = useSyncExternalStore(subscribeProductConsent, getProductConsent, getServerProductConsent);
  if (consent.audiencePerformance !== 'granted') return null;
  return <><Analytics beforeSend={redact} /><SpeedInsights /></>;
}
