'use client';

import posthog from 'posthog-js';

import type { ProductConsent } from '@/lib/product-measurement';
import {
  POSTHOG_EVENTS,
  type PostHogEventName,
  type PostHogProperties,
} from '@/lib/posthog-events';
import {
  normalizePostHogRoute,
  sanitizePostHogEvent,
  sanitizePostHogProperties,
  sanitizePostHogUrl,
} from '@/lib/posthog-privacy';

const POSTHOG_PROJECT_TOKEN = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com';
const POSTHOG_ENABLED = process.env.NEXT_PUBLIC_POSTHOG_ENABLED === 'true';
const POSTHOG_ENVIRONMENT = process.env.NEXT_PUBLIC_POSTHOG_ENVIRONMENT
  || process.env.VERCEL_ENV
  || (process.env.NODE_ENV === 'production' ? 'production' : 'development');
const POSTHOG_RELEASE = process.env.NEXT_PUBLIC_APP_RELEASE
  || process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA
  || 'local';
const EXCLUDED_ROUTE_PREFIXES = ['/auth', '/api/'];
const MAX_RECENT_EVENTS = 256;
const EVENT_DEDUPLICATION_WINDOW_MS = 750;

let initialized = false;
let featuresStarted = false;
let lastIdentifiedUserId: string | null = null;
let pendingConsent: ProductConsent | null = null;
const recentEvents = new Map<string, number>();

function isConfigured(): boolean {
  return Boolean(POSTHOG_ENABLED && POSTHOG_PROJECT_TOKEN);
}

function currentLocale(): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const candidate = document.documentElement.lang || navigator.language.split('-')[0];
  return candidate || undefined;
}

function isExcludedPath(pathname: string): boolean {
  const route = normalizePostHogRoute(pathname);
  return EXCLUDED_ROUTE_PREFIXES.some((prefix) => route === prefix || route.startsWith(`${prefix}/`));
}

function getSessionReplaySampleRate(): number {
  const configured = Number(process.env.NEXT_PUBLIC_POSTHOG_REPLAY_SAMPLE_RATE);
  if (Number.isFinite(configured)) return Math.min(1, Math.max(0, configured));
  if (POSTHOG_ENVIRONMENT === 'production') return 0.1;
  if (POSTHOG_ENVIRONMENT === 'preview') return 0.25;
  return 1;
}

function maskCapturedNetworkRequest<T extends { name: string }>(data: T): T | null {
  if (isExcludedPath(data.name)) return null;
  const sanitizedUrl = sanitizePostHogUrl(data.name);
  if (!sanitizedUrl) return null;

  const sanitized = { ...data, name: sanitizedUrl };
  for (const property of ['requestHeaders', 'responseHeaders', 'requestBody', 'responseBody'] as const) {
    if (property in sanitized) delete (sanitized as Record<string, unknown>)[property];
  }
  return sanitized;
}

function contextProperties(properties: PostHogProperties = {}): PostHogProperties {
  return {
    app_environment: POSTHOG_ENVIRONMENT,
    app_release: POSTHOG_RELEASE,
    app_locale: currentLocale(),
    ...properties,
  };
}

function eventKey(event: string, properties: PostHogProperties): string {
  return `${event}:${JSON.stringify(properties)}`;
}

function isDuplicateEvent(key: string): boolean {
  const now = Date.now();
  const previous = recentEvents.get(key);
  if (previous !== undefined && now - previous < EVENT_DEDUPLICATION_WINDOW_MS) return true;

  recentEvents.set(key, now);
  if (recentEvents.size > MAX_RECENT_EVENTS) {
    const oldest = recentEvents.keys().next().value;
    if (typeof oldest === 'string') recentEvents.delete(oldest);
  }
  return false;
}

function startConsentFeatures(): void {
  if (!initialized || featuresStarted) return;

  posthog.register(contextProperties());
  posthog.set_config({
    disable_external_dependency_loading: false,
    disable_session_recording: false,
    capture_performance: {
      web_vitals: true,
      network_timing: false,
      web_vitals_allowed_metrics: ['LCP', 'CLS', 'INP', 'FCP'],
      web_vitals_attribution: ['LCP', 'INP'],
      web_vitals_delayed_flush_ms: 5000,
    },
    capture_exceptions: true,
  });
  posthog.startExceptionAutocapture({
    capture_unhandled_errors: true,
    capture_unhandled_rejections: true,
    capture_console_errors: false,
  });
  posthog.startSessionRecording();
  featuresStarted = true;
}

function stopConsentFeatures(): void {
  if (!initialized) return;

  posthog.stopExceptionAutocapture();
  posthog.stopSessionRecording();
  posthog.set_config({
    disable_external_dependency_loading: true,
    disable_session_recording: true,
    capture_performance: false,
    capture_exceptions: false,
  });
  featuresStarted = false;
}

export function initializePostHog(): void {
  if (typeof window === 'undefined' || initialized || !isConfigured()) return;

  posthog.init(POSTHOG_PROJECT_TOKEN as string, {
    api_host: POSTHOG_HOST,
    defaults: '2026-05-30',
    opt_out_capturing_by_default: true,
    opt_out_persistence_by_default: true,
    opt_out_capturing_persistence_type: 'localStorage',
    persistence: 'localStorage+cookie',
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
    person_profiles: 'identified_only',
    tracing_headers: [window.location.hostname],
    session_recording: {
      maskAllInputs: true,
      maskAllElementAttributes: true,
      maskTextSelector: '[data-ph-mask], .ph-mask',
      blockClass: 'ph-no-capture',
      blockSelector: '[data-ph-no-capture], .ph-no-capture',
      captureJsonLd: false,
      recordHeaders: false,
      recordBody: false,
      sampleRate: getSessionReplaySampleRate(),
      maskCapturedNetworkRequestFn: maskCapturedNetworkRequest,
    },
    before_send: sanitizePostHogEvent,
  });

  initialized = true;
  if (pendingConsent) {
    const consent = pendingConsent;
    pendingConsent = null;
    applyPostHogConsent(consent);
  }
}

function applyPostHogConsent(consent: ProductConsent): void {
  if (consent.productMeasurement === 'granted') {
    if (!posthog.has_opted_in_capturing()) {
      posthog.opt_in_capturing({ captureEventName: false });
    }
    startConsentFeatures();
    return;
  }

  const hadConsent = posthog.has_opted_in_capturing();
  stopConsentFeatures();
  if (hadConsent) {
    posthog.opt_out_capturing();
    posthog.reset({ resetDeviceID: true });
  } else if (!posthog.has_opted_out_capturing()) {
    posthog.opt_out_capturing();
  }
  lastIdentifiedUserId = null;
}

export function syncPostHogConsent(consent: ProductConsent): void {
  pendingConsent = consent;
  if (!initialized) return;

  pendingConsent = null;
  applyPostHogConsent(consent);
}

export function syncPostHogIdentity(
  userId: string | null,
  properties: { locale?: string } = {},
): void {
  if (!initialized || !posthog.has_opted_in_capturing()) return;

  if (!userId) {
    if (!lastIdentifiedUserId) return;
    posthog.reset({ resetDeviceID: true });
    posthog.opt_in_capturing({ captureEventName: false });
    startConsentFeatures();
    lastIdentifiedUserId = null;
    return;
  }

  if (lastIdentifiedUserId && lastIdentifiedUserId !== userId) {
    posthog.reset({ resetDeviceID: true });
    posthog.opt_in_capturing({ captureEventName: false });
    startConsentFeatures();
  }

  if (lastIdentifiedUserId !== userId) {
    posthog.identify(userId, contextProperties({
      account_type: 'authenticated',
      app_locale: properties.locale || currentLocale(),
    }));
    lastIdentifiedUserId = userId;
  }
}

export function capturePostHogEvent(
  event: PostHogEventName,
  properties: PostHogProperties = {},
): void {
  if (typeof window === 'undefined' || !initialized || !posthog.has_opted_in_capturing()) return;
  if (isExcludedPath(window.location.pathname)) return;

  const safeProperties = sanitizePostHogProperties(contextProperties(properties));
  const key = eventKey(event, safeProperties);
  if (isDuplicateEvent(key)) return;
  posthog.capture(event, safeProperties);
}

export function capturePostHogPageview(pathname: string): void {
  if (typeof window === 'undefined' || !initialized || !posthog.has_opted_in_capturing()) return;
  if (isExcludedPath(pathname)) return;

  const normalizedPath = normalizePostHogRoute(pathname || '/');
  const currentUrl = new URL(normalizedPath, window.location.origin).toString();
  posthog.capture('$pageview', sanitizePostHogProperties(contextProperties({
    $current_url: currentUrl,
    $pathname: normalizedPath,
  })));
}

export function capturePostHogNavigationStart(
  url: string,
  navigationType: string,
): void {
  if (typeof window === 'undefined') return;
  capturePostHogEvent(POSTHOG_EVENTS.navigationStarted, {
    from_path: window.location.pathname,
    to_path: url,
    navigation_type: navigationType,
  });
}

export function capturePostHogException(
  error: unknown,
  properties: PostHogProperties = {},
): void {
  if (typeof window === 'undefined' || !initialized || !posthog.has_opted_in_capturing()) return;
  if (isExcludedPath(window.location.pathname)) return;

  const candidate = error instanceof Error ? error : new Error('Observed exception');
  const safeMessage = sanitizePostHogProperties({ message: candidate.message }).message;
  const safeError = new Error(typeof safeMessage === 'string' ? safeMessage : 'Observed exception');
  safeError.name = typeof candidate.name === 'string' ? candidate.name.slice(0, 80) : 'Error';
  posthog.captureException(safeError, sanitizePostHogProperties(contextProperties(properties)));
  capturePostHogEvent(POSTHOG_EVENTS.featureError, {
    feature: typeof properties.feature === 'string' ? properties.feature : 'unknown',
    operation: typeof properties.operation === 'string' ? properties.operation : 'exception',
    error_type: safeError.name,
  });
}

export function capturePostHogFeatureError(
  properties: PostHogProperties,
): void {
  capturePostHogEvent(POSTHOG_EVENTS.featureError, properties);
}

export function isPostHogActive(): boolean {
  return initialized && posthog.has_opted_in_capturing();
}

export function resetPostHogStateForTests(): void {
  initialized = false;
  featuresStarted = false;
  lastIdentifiedUserId = null;
  pendingConsent = null;
  recentEvents.clear();
}

void (POSTHOG_EVENTS satisfies Record<string, PostHogEventName>);
