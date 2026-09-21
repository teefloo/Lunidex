'use client';

import { normalizeCampaignSlug } from '@/lib/campaigns';
import { POSTHOG_EVENTS } from '@/lib/posthog-events';
import {
  createUnsetProductConsent,
  PRODUCT_CONSENT_POLICY_VERSION,
  PRODUCT_CONSENT_VERSION,
  PRODUCT_MEASUREMENT_CONSENT_COOKIE,
  PRODUCT_MEASUREMENT_CONSENT_COOKIE_MAX_AGE,
  type ProductConsent,
  type ProductMeasurementConsent,
} from '@/lib/posthog-consent';

export type { ProductConsent, ProductMeasurementConsent } from '@/lib/posthog-consent';

const CONSENT_KEY = 'primedex-consent-v2';
const SESSION_KEY = 'primedex-product-measurement-session';
const ACTIVATED_KEY = 'primedex-product-measurement-activated-at';
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
let cachedSerializedConsent: string | null | undefined;

export type ProductEvent =
  | typeof POSTHOG_EVENTS.tcgStartOpened
  | typeof POSTHOG_EVENTS.tcgSetSearchUsed
  | typeof POSTHOG_EVENTS.tcgSetSelected
  | typeof POSTHOG_EVENTS.tcgAlbumOpened
  | typeof POSTHOG_EVENTS.tcgFirstValueReached
  | typeof POSTHOG_EVENTS.tcgActivationCompleted
  | typeof POSTHOG_EVENTS.tcgSyncPromptShown
  | typeof POSTHOG_EVENTS.tcgSyncPromptActioned
  | typeof POSTHOG_EVENTS.tcgReturnedAfterActivation
  | typeof POSTHOG_EVENTS.tcgActivationError;

export type TcgStartSource = 'home_cta' | 'catalog' | 'direct' | 'seo' | 'campaign';

export interface TcgStartAttribution {
  source: TcgStartSource;
  campaign?: string;
}

export function getTcgStartSource(search: string): TcgStartSource | undefined {
  return getTcgStartAttribution(search)?.source;
}

export function getTcgStartAttribution(search: string): TcgStartAttribution | undefined {
  const params = new URLSearchParams(search);
  const source = params.get('source');

  if (source === 'campaign') {
    const campaign = normalizeCampaignSlug(params.get('campaign'));
    return campaign ? { source, campaign } : undefined;
  }

  return source === 'home_cta' || source === 'catalog' || source === 'direct' || source === 'seo'
    ? { source }
    : undefined;
}

const defaultConsent = createUnsetProductConsent();

export function getProductConsent(): ProductConsent {
  if (typeof window === 'undefined') return defaultConsent;
  try {
    const serialized = window.localStorage.getItem(CONSENT_KEY);
    if (serialized === cachedSerializedConsent) return cachedConsent;
    cachedSerializedConsent = serialized;
    const value = JSON.parse(serialized ?? 'null') as Partial<ProductConsent> | null;
    if (value?.version === PRODUCT_CONSENT_VERSION && value.policyVersion === PRODUCT_CONSENT_POLICY_VERSION && typeof value.chosenAt === 'string' && isConsent(value.audiencePerformance) && isConsent(value.productMeasurement)) {
      cachedConsent = value as ProductConsent;
      return cachedConsent;
    }
  } catch {
    cachedSerializedConsent = undefined;
  }
  cachedConsent = defaultConsent;
  return cachedConsent;
}

/** Stable snapshot used by useSyncExternalStore while React hydrates. */
export function getServerProductConsent(): ProductConsent {
  return defaultConsent;
}

let cachedConsent: ProductConsent = defaultConsent;

export function setProductConsent(next: ProductConsent): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CONSENT_KEY, JSON.stringify(next));
    cachedSerializedConsent = JSON.stringify(next);
    cachedConsent = next;
    if (next.productMeasurement !== 'granted') {
      window.localStorage.removeItem(ACTIVATED_KEY);
      window.sessionStorage.removeItem(SESSION_KEY);
    }
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    if (next.productMeasurement === 'unset') {
      document.cookie = `${PRODUCT_MEASUREMENT_CONSENT_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
    } else {
      document.cookie = `${PRODUCT_MEASUREMENT_CONSENT_COOKIE}=${next.productMeasurement}; Path=/; Max-Age=${PRODUCT_MEASUREMENT_CONSENT_COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
    }
    window.dispatchEvent(new Event('primedex-consent-changed'));
  } catch {}
}

export function subscribeProductConsent(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('primedex-consent-changed', listener);
  return () => window.removeEventListener('primedex-consent-changed', listener);
}

function isConsent(value: unknown): value is ProductMeasurementConsent {
  return value === 'granted' || value === 'denied' || value === 'unset';
}

function currentSession(): { emitted: ProductEvent[]; lastActivity: number; activated: boolean } {
  const now = Date.now();
  try {
    const saved = JSON.parse(window.sessionStorage.getItem(SESSION_KEY) ?? 'null') as { emitted?: unknown; lastActivity?: unknown; activated?: unknown } | null;
    if (typeof saved?.lastActivity === 'number' && now - saved.lastActivity <= SESSION_TIMEOUT_MS && Array.isArray(saved.emitted)) {
      return { emitted: saved.emitted.filter((event): event is ProductEvent => typeof event === 'string'), lastActivity: now, activated: saved.activated === true };
    }
  } catch {}
  return { emitted: [], lastActivity: now, activated: false };
}

function saveSession(session: { emitted: ProductEvent[]; lastActivity: number; activated: boolean }): void {
  try { window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch {}
}

const milestoneEvents = new Set<ProductEvent>([
  POSTHOG_EVENTS.tcgStartOpened,
  POSTHOG_EVENTS.tcgSetSearchUsed,
  POSTHOG_EVENTS.tcgFirstValueReached,
  POSTHOG_EVENTS.tcgActivationCompleted,
  POSTHOG_EVENTS.tcgSyncPromptShown,
  POSTHOG_EVENTS.tcgReturnedAfterActivation,
]);

export function trackProductEvent(event: ProductEvent, propertyA?: string, propertyB?: string): void {
  if (typeof window === 'undefined' || getProductConsent().productMeasurement !== 'granted') return;
  const session = currentSession();
  if (milestoneEvents.has(event) && session.emitted.includes(event)) return;
  if (milestoneEvents.has(event)) session.emitted.push(event);
  saveSession(session);
  const body = JSON.stringify({ event, ...(propertyA ? { propertyA } : {}), ...(propertyB ? { propertyB } : {}) });
  void import('@/lib/posthog-client')
    .then(({ capturePostHogEvent }) => capturePostHogEvent(event, {
      ...(propertyA ? { source: propertyA } : {}),
      ...(propertyB ? { detail: propertyB } : {}),
    }))
    .catch(() => {
      // Optional product telemetry must never block the product flow.
    });
  void fetch('/api/analytics/product', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => undefined);
}

export function markProductActivation(): void {
  if (typeof window === 'undefined' || getProductConsent().productMeasurement !== 'granted') return;
  try { window.localStorage.setItem(ACTIVATED_KEY, String(Date.now())); const session = currentSession(); session.activated = true; saveSession(session); } catch {}
}

export function trackReturnAfterActivation(action: 'owned_add' | 'owned_remove' | 'album_open' | 'wishlist_open'): void {
  if (typeof window === 'undefined' || getProductConsent().productMeasurement !== 'granted') return;
  try {
    const session = currentSession();
    if (session.activated) return;
    const activatedAt = Number(window.localStorage.getItem(ACTIVATED_KEY));
    if (!Number.isFinite(activatedAt) || activatedAt <= 0) return;
    const days = (Date.now() - activatedAt) / 86_400_000;
    const bucket = days <= 7 ? 'day_0_7' : days <= 30 ? 'day_8_30' : days <= 90 ? 'day_31_90' : 'day_91_plus';
    trackProductEvent(POSTHOG_EVENTS.tcgReturnedAfterActivation, bucket, action);
  } catch {}
}
