'use client';

import posthog, { type CaptureResult } from 'posthog-js';

import type { ProductConsent } from '@/lib/product-measurement';

const POSTHOG_PROJECT_TOKEN = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com';
const LOCALE_PREFIX = /^\/(?:en|fr|es|de|it|ja|ko|zh)(?=\/|$)/;
const URL_PROPERTIES = ['$current_url', '$initial_current_url', '$referrer', '$initial_referrer', '$session_entry_url'];

let initialized = false;

function withoutLocale(pathname: string): string {
  return pathname.replace(LOCALE_PREFIX, '') || '/';
}

function normalizePath(pathname: string): string {
  return pathname
    .replace(/(\/u\/)[^/]+(?=\/|$)/, '$1[handle]')
    .replace(/(\/friends\/)[^/]+(?=\/|$)/, '$1[friendId]');
}

function isExcludedPath(pathname: string): boolean {
  const path = withoutLocale(pathname);
  return path === '/auth' || path.startsWith('/auth/') || path.startsWith('/api/');
}

function sanitizeUrl(value: string): string | null {
  try {
    const url = new URL(value, 'https://lunidex.app');
    url.search = '';
    url.hash = '';
    url.pathname = normalizePath(url.pathname);
    return url.toString();
  } catch {
    return null;
  }
}

function sanitizeEvent(event: CaptureResult | null): CaptureResult | null {
  if (!event) return null;

  const properties = { ...event.properties };
  for (const propertyName of URL_PROPERTIES) {
    const value = properties[propertyName];
    if (typeof value !== 'string') continue;

    const sanitized = sanitizeUrl(value);
    if (sanitized) {
      properties[propertyName] = sanitized;
    } else {
      delete properties[propertyName];
    }
  }

  if (typeof properties.$pathname === 'string') {
    properties.$pathname = normalizePath(properties.$pathname);
  }

  const currentPath = typeof properties.$pathname === 'string'
    ? properties.$pathname
    : typeof properties.$current_url === 'string'
      ? new URL(properties.$current_url).pathname
      : null;
  if (currentPath && isExcludedPath(currentPath)) return null;

  return { ...event, properties };
}

export function initializePostHog(): void {
  if (typeof window === 'undefined' || initialized || !POSTHOG_PROJECT_TOKEN) return;

  posthog.init(POSTHOG_PROJECT_TOKEN, {
    api_host: POSTHOG_HOST,
    defaults: '2026-05-30',
    opt_out_capturing_by_default: true,
    opt_out_persistence_by_default: true,
    opt_out_capturing_persistence_type: 'localStorage',
    persistence: 'memory',
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
    capture_performance: false,
    capture_exceptions: false,
    disable_session_recording: true,
    disable_external_dependency_loading: true,
    disable_surveys: true,
    disable_product_tours: true,
    disable_conversations: true,
    advanced_disable_decide: true,
    advanced_disable_feature_flags: true,
    disable_capture_url_hashes: true,
    save_referrer: false,
    save_campaign_params: false,
    respect_dnt: true,
    ip: false,
    person_profiles: 'never',
    before_send: sanitizeEvent,
  });

  initialized = true;
}

export function syncPostHogConsent(consent: ProductConsent): void {
  if (!initialized) return;

  if (consent.productMeasurement === 'granted') {
    if (!posthog.has_opted_in_capturing()) posthog.opt_in_capturing();
    return;
  }

  if (!posthog.has_opted_out_capturing()) posthog.opt_out_capturing();
}

type PostHogEventProperties = Record<string, string | number | boolean | null | undefined>;

export function capturePostHogEvent(event: string, properties?: PostHogEventProperties): void {
  if (typeof window === 'undefined' || !initialized || !posthog.has_opted_in_capturing()) return;
  if (isExcludedPath(window.location.pathname)) return;
  posthog.capture(event, properties);
}

export function capturePostHogPageview(pathname: string): void {
  if (typeof window === 'undefined' || !initialized || !posthog.has_opted_in_capturing()) return;
  if (isExcludedPath(pathname)) return;

  const normalizedPath = normalizePath(pathname || '/');
  const currentUrl = new URL(normalizedPath, window.location.origin).toString();
  posthog.capture('$pageview', {
    $current_url: currentUrl,
    $pathname: normalizedPath,
  });
}
