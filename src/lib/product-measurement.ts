'use client';

import { POSTHOG_EVENTS as EVENTS, type PostHogProperties } from '@/lib/posthog-events';
import { getTcgStartAttribution, parseTcgJourney, resolveTcgJourney, normalizeTrackingSetId, TCG_ATTRIBUTION_KEY, type TcgJourney } from '@/lib/tcg-attribution';
import { isTCGCardLanguage } from '@/lib/tcg-language';
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
let measurementEpoch = 0;
let cachedSerializedConsent: string | null | undefined;

export type ProductEvent =
  | typeof EVENTS.tcgCampaignLanded
  | typeof EVENTS.tcgFirstCardInteracted
  | typeof EVENTS.tcgStartOpened
  | typeof EVENTS.tcgSetSearchUsed
  | typeof EVENTS.tcgSetSelected
  | typeof EVENTS.tcgAlbumOpened
  | typeof EVENTS.tcgDemoOpened
  | typeof EVENTS.tcgDemoFirstInteraction
  | typeof EVENTS.tcgDemoSignupClicked
  | typeof EVENTS.tcgFirstValueReached
  | typeof EVENTS.tcgActivationCompleted
  | typeof EVENTS.tcgSyncPromptShown
  | typeof EVENTS.tcgSyncPromptActioned
  | typeof EVENTS.tcgReturnedAfterActivation
  | typeof EVENTS.tcgActivationError;

export { getTcgStartAttribution } from '@/lib/tcg-attribution';
export type { TcgStartAttribution, TcgStartSource } from '@/lib/tcg-attribution';
export function getTcgStartSource(search: string) { return getTcgStartAttribution(search)?.source; }

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
  if (next.productMeasurement !== 'granted') measurementEpoch += 1;
  try {
    window.localStorage.setItem(CONSENT_KEY, JSON.stringify(next));
    cachedSerializedConsent = JSON.stringify(next);
    cachedConsent = next;
    if (next.productMeasurement !== 'granted') {
      window.localStorage.removeItem(ACTIVATED_KEY);
      window.localStorage.removeItem(TCG_ATTRIBUTION_KEY);
      journey = undefined;
      memorySession = undefined;
      window.sessionStorage.removeItem(SESSION_KEY);
      window.sessionStorage.removeItem(OAUTH_KEY);
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

interface MeasurementSession { emitted: string[]; lastActivity: number; activated: boolean }
let memorySession: MeasurementSession | undefined;
let journey: TcgJourney | undefined;
let trackingUserId: string | null = null;
const pendingEvents = new Set<string>();
const OAUTH_KEY = 'primedex-tcg-oauth-pending';

export function rememberProductOauth(method: string, started: boolean): void {
  if (typeof window === 'undefined' || getProductConsent().productMeasurement !== 'granted') return;
  try {
    if (started && !trackingUserId && (method === 'google' || method === 'github')) window.sessionStorage.setItem(OAUTH_KEY, JSON.stringify({ method, at: Date.now() }));
    else window.sessionStorage.removeItem(OAUTH_KEY);
  } catch {}
}
export function consumeProductOauth(): string | undefined {
  if (typeof window === 'undefined' || getProductConsent().productMeasurement !== 'granted') return;
  try {
    const raw = window.sessionStorage.getItem(OAUTH_KEY);
    if (!raw) return;
    window.sessionStorage.removeItem(OAUTH_KEY);
    const saved = JSON.parse(raw) as { method?: unknown; at?: unknown };
    if ((saved.method === 'google' || saved.method === 'github') && typeof saved.at === 'number'
      && Date.now() >= saved.at && Date.now() - saved.at <= SESSION_TIMEOUT_MS) return saved.method;
  } catch {}
}

function currentSession(): MeasurementSession {
  const now = Date.now();
  let saved = memorySession;
  try { saved = JSON.parse(window.sessionStorage.getItem(SESSION_KEY) ?? 'null') ?? saved; } catch {}
  if (saved && Array.isArray(saved.emitted) && typeof saved.lastActivity === 'number'
    && now >= saved.lastActivity && now - saved.lastActivity <= SESSION_TIMEOUT_MS) {
    return { emitted: saved.emitted.filter((event) => typeof event === 'string'), lastActivity: now, activated: saved.activated === true };
  }
  return { emitted: [], lastActivity: now, activated: false };
}
function saveSession(session: MeasurementSession): void {
  memorySession = session;
  try { window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch {}
}

export function setProductTrackingIdentity(userId: string | null): void {
  if (trackingUserId && trackingUserId !== userId) {
    measurementEpoch += 1;
    journey = undefined;
    memorySession = undefined;
    try { window.localStorage.removeItem(TCG_ATTRIBUTION_KEY); window.sessionStorage.removeItem(SESSION_KEY); } catch {}
  }
  trackingUserId = userId;
}

export function touchProductMeasurementSession(): void {
  if (typeof window !== 'undefined' && getProductConsent().productMeasurement === 'granted') saveSession(currentSession());
}

export function getTcgTrackingContext(properties: PostHogProperties = {}): PostHogProperties {
  if (typeof window === 'undefined' || getProductConsent().productMeasurement !== 'granted') return {};
  const now = Date.now();
  saveSession(currentSession());
  try { journey = parseTcgJourney(window.localStorage.getItem(TCG_ATTRIBUTION_KEY), now) ?? journey; } catch {}
  journey = resolveTcgJourney(journey, window.location.pathname, window.location.search, now);
  const setId = normalizeTrackingSetId(properties.set_id);
  const language = isTCGCardLanguage(properties.tcg_language) ? properties.tcg_language : undefined;
  if (setId) journey.set_id = setId;
  if (language) journey.tcg_language = language;
  try { window.localStorage.setItem(TCG_ATTRIBUTION_KEY, JSON.stringify(journey)); } catch {}
  return { source: journey.source, campaign: journey.campaign ?? null, entry_path: journey.entry_path,
    locale: typeof document !== 'undefined' ? document.documentElement.lang : undefined,
    tcg_language: language ?? journey.tcg_language ?? null, set_id: setId ?? journey.set_id ?? null,
    authenticated: Boolean(trackingUserId), tracking_version: 2 };
}

const milestoneEvents = new Set<ProductEvent>([
  EVENTS.tcgCampaignLanded, EVENTS.tcgStartOpened, EVENTS.tcgSetSearchUsed,
  EVENTS.tcgSetSelected, EVENTS.tcgAlbumOpened, EVENTS.tcgFirstCardInteracted,
  EVENTS.tcgFirstValueReached, EVENTS.tcgActivationCompleted, EVENTS.tcgSyncPromptShown,
  EVENTS.tcgReturnedAfterActivation,
  EVENTS.tcgDemoOpened, EVENTS.tcgDemoFirstInteraction,
]);
// Demo telemetry never writes progression or extends the legacy aggregate schema.
const postHogOnlyEvents = new Set<ProductEvent>([
  EVENTS.tcgCampaignLanded, EVENTS.tcgFirstCardInteracted,
  EVENTS.tcgDemoOpened, EVENTS.tcgDemoFirstInteraction, EVENTS.tcgDemoSignupClicked,
]);
function semanticProperties(event: ProductEvent, a?: string, b?: string): PostHogProperties {
  switch (event) {
    case EVENTS.tcgSetSearchUsed: return { query_length_bucket: a };
    case EVENTS.tcgSetSelected: return { selection_method: a };
    case EVENTS.tcgAlbumOpened: return { surface: a };
    case EVENTS.tcgActivationCompleted: return { activation_method: a };
    case EVENTS.tcgSyncPromptActioned: return { action: a };
    case EVENTS.tcgReturnedAfterActivation: return { return_age_bucket: a, action: b };
    case EVENTS.tcgActivationError: return { operation: a, error_type: b };
    default: return {};
  }
}

/** No pre-consent queue. Reserve milestones during the optional SDK import. */
export async function trackProductEvent(event: ProductEvent, propertyA?: string, propertyB?: string, properties: PostHogProperties = {}): Promise<boolean> {
  if (typeof window === 'undefined' || getProductConsent().productMeasurement !== 'granted') return false;
  const epoch = measurementEpoch;
  const context = getTcgTrackingContext(properties);
  const attributionKey = `${context.source}:${context.campaign}:${context.entry_path}`;
  const key = event === EVENTS.tcgCampaignLanded || event === EVENTS.tcgStartOpened || event === EVENTS.tcgFirstCardInteracted || event === EVENTS.tcgDemoFirstInteraction
    ? `${event}:${attributionKey}`
    : event === EVENTS.tcgSetSelected || event === EVENTS.tcgAlbumOpened || event === EVENTS.tcgDemoOpened
      ? `${event}:${attributionKey}:${context.tcg_language}:${context.set_id}` : event;
  if (milestoneEvents.has(event) && (currentSession().emitted.includes(key) || pendingEvents.has(`${epoch}:${key}`))) return false;
  const reservation = `${epoch}:${key}`;
  pendingEvents.add(reservation);
  try {
    let captured = false;
    try {
      const client = await import('@/lib/posthog-client');
      if (epoch !== measurementEpoch || getProductConsent().productMeasurement !== 'granted') return false;
      client.initializePostHog();
      client.syncPostHogConsent(getProductConsent());
      captured = client.capturePostHogEvent(event, { ...semanticProperties(event, propertyA, propertyB), ...context, ...properties });
    } catch {
      // The existing Neon counters also work when the optional SDK is unavailable.
    }
    if (epoch !== measurementEpoch || getProductConsent().productMeasurement !== 'granted') return false;
    const session = currentSession();
    if (captured && milestoneEvents.has(event)) session.emitted.push(key);
    const aggregateKey = `aggregate:${key}`;
    if (!postHogOnlyEvents.has(event)
      && (!milestoneEvents.has(event) || !session.emitted.includes(aggregateKey))) {
      const a = event === EVENTS.tcgStartOpened ? String(context.source) : propertyA;
      const b = event === EVENTS.tcgStartOpened && typeof context.campaign === 'string' ? context.campaign : propertyB;
      // The historical aggregate database accepts at most 32 characters per dimension.
      if (!b || b.length <= 32) {
        const body = JSON.stringify({ event, ...(a ? { propertyA: a } : {}), ...(b ? { propertyB: b } : {}) });
        void fetch('/api/analytics/product', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => undefined);
      }
      if (milestoneEvents.has(event)) session.emitted.push(aggregateKey);
    }
    saveSession(session);
    return captured;
  } finally { pendingEvents.delete(reservation); }
}

interface ActivationRecord { at: number; owner: string; context: PostHogProperties }
function activationRecord(): ActivationRecord | undefined {
  try {
    const saved = JSON.parse(window.localStorage.getItem(ACTIVATED_KEY) ?? 'null') as Partial<ActivationRecord> | null;
    if (saved && typeof saved.at === 'number' && saved.at > 0 && typeof saved.owner === 'string'
      && saved.context && typeof saved.context === 'object') return saved as ActivationRecord;
  } catch {}
}
export async function trackTcgPersistedValue(properties: PostHogProperties, userId: string): Promise<void> {
  if (typeof window === 'undefined' || getProductConsent().productMeasurement !== 'granted') return;
  setProductTrackingIdentity(userId);
  if (activationRecord()?.owner === userId) return;
  const epoch = measurementEpoch;
  const context = { ...getTcgTrackingContext(properties), authenticated: true, persistence: 'neon' };
  await trackProductEvent(EVENTS.tcgFirstValueReached, undefined, undefined, context);
  if (epoch !== measurementEpoch || trackingUserId !== userId || getProductConsent().productMeasurement !== 'granted') return;
  if (await trackProductEvent(EVENTS.tcgActivationCompleted, 'first_persisted_card', undefined, context)) {
    if (epoch !== measurementEpoch || trackingUserId !== userId || getProductConsent().productMeasurement !== 'granted') return;
    const session = currentSession(); session.activated = true; saveSession(session);
    try { window.localStorage.setItem(ACTIVATED_KEY, JSON.stringify({ at: Date.now(), owner: userId, context })); } catch {}
  }
}
export async function trackReturnAfterActivation(action: 'owned_add' | 'owned_remove' | 'album_open' | 'wishlist_open'): Promise<boolean> {
  if (typeof window === 'undefined' || getProductConsent().productMeasurement !== 'granted') return false;
  const saved = activationRecord();
  if (!saved || saved.owner !== trackingUserId || currentSession().activated || Date.now() - saved.at < SESSION_TIMEOUT_MS) return false;
  const days = (Date.now() - saved.at) / 86_400_000;
  const bucket = days <= 7 ? 'day_0_7' : days <= 30 ? 'day_8_30' : days <= 90 ? 'day_31_90' : 'day_91_plus';
  return trackProductEvent(EVENTS.tcgReturnedAfterActivation, bucket, action, { ...saved.context, authenticated: true });
}

/** Campaign landing happens on the redirected page, never on a server redirect/prefetch. */
export async function trackTcgStartOpened(properties: PostHogProperties = {}): Promise<void> {
  if (typeof window === 'undefined' || getProductConsent().productMeasurement !== 'granted') return;
  const epoch = measurementEpoch;
  const attribution = getTcgStartAttribution(window.location.search);
  if (attribution?.campaign) await trackProductEvent(EVENTS.tcgCampaignLanded, undefined, undefined, properties);
  if (epoch !== measurementEpoch) return;
  const context = getTcgTrackingContext(properties);
  await trackProductEvent(EVENTS.tcgStartOpened, String(context.source), typeof context.campaign === 'string' ? context.campaign : undefined, properties);
}
