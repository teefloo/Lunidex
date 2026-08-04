'use client';

export type ProductMeasurementConsent = 'granted' | 'denied' | 'unset';

const CONSENT_KEY = 'primedex-consent-v2';
const SESSION_KEY = 'primedex-product-measurement-session';
const ACTIVATED_KEY = 'primedex-product-measurement-activated-at';
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
let cachedSerializedConsent: string | null | undefined;

export type ProductEvent =
  | 'tcg_start_opened'
  | 'tcg_set_search_used'
  | 'tcg_set_selected'
  | 'tcg_album_opened'
  | 'tcg_first_value_reached'
  | 'tcg_activation_completed'
  | 'tcg_sync_prompt_shown'
  | 'tcg_sync_prompt_actioned'
  | 'tcg_returned_after_activation'
  | 'tcg_activation_error';

export type TcgStartSource = 'home_cta' | 'catalog' | 'direct' | 'seo';

export function getTcgStartSource(search: string): TcgStartSource | undefined {
  const source = new URLSearchParams(search).get('source');
  return source === 'home_cta' || source === 'catalog' || source === 'direct' || source === 'seo' ? source : undefined;
}

export interface ProductConsent {
  version: 2;
  policyVersion: '2026-07-29';
  chosenAt: string;
  audiencePerformance: ProductMeasurementConsent;
  productMeasurement: ProductMeasurementConsent;
}

const defaultConsent: ProductConsent = { version: 2, policyVersion: '2026-07-29', chosenAt: '', audiencePerformance: 'unset', productMeasurement: 'unset' };

export function getProductConsent(): ProductConsent {
  if (typeof window === 'undefined') return defaultConsent;
  try {
    const serialized = window.localStorage.getItem(CONSENT_KEY);
    if (serialized === cachedSerializedConsent) return cachedConsent;
    cachedSerializedConsent = serialized;
    const value = JSON.parse(serialized ?? 'null') as Partial<ProductConsent> | null;
    if (value?.version === 2 && value.policyVersion === '2026-07-29' && typeof value.chosenAt === 'string' && isConsent(value.audiencePerformance) && isConsent(value.productMeasurement)) {
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
  'tcg_start_opened', 'tcg_set_search_used', 'tcg_first_value_reached', 'tcg_activation_completed',
  'tcg_sync_prompt_shown', 'tcg_returned_after_activation',
]);

export function trackProductEvent(event: ProductEvent, propertyA?: string, propertyB?: string): void {
  if (typeof window === 'undefined' || getProductConsent().productMeasurement !== 'granted') return;
  const session = currentSession();
  if (milestoneEvents.has(event) && session.emitted.includes(event)) return;
  if (milestoneEvents.has(event)) session.emitted.push(event);
  saveSession(session);
  const body = JSON.stringify({ event, ...(propertyA ? { propertyA } : {}), ...(propertyB ? { propertyB } : {}) });
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
    trackProductEvent('tcg_returned_after_activation', bucket, action);
  } catch {}
}
